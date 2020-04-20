"""This script will be run when we transfer a datbase version from the remote symportal instance
to the symportal.org server. This transfer will always be in one directrion. From the symportal
instance, to the symportal server. User objects and Study objects will only every be added to the
database during the sync performed by this script that will only every be run on a symportal.org
server. As such every time a sync happens, all the User and Study objects will be recreated 
using this script. The list of Study and User instances that should exist will be stored in the
published_articles_sp.json. Each of the User objects in the symportal_database will have an
associated User object in the symportal.org database. Currently the symportal.org database
also contains a DataSet object but we will be getting rid of this. The only reason we keep a
'copy' of the User object in the symportal.org database is because the user passwords are
stored there and the users can change these at any time.
When the syncing happens, the User objects will be created first and these will look for 
associated user objects in the symportal.org database. If it can't find an associated User
it will create one (after checking that there are no superflous users in the database).
Next it will create Study objects that will be linked to datasetsample objects. Finally, the 
Study objects will be linked to the datasetsample objects.

Once this is completed, the symportal.org code will be able to work from the newly synced db.

In addition to syncing the database we should update the fasta resources on the index page.
We want to have three different resources here.
pre_MED
post_MED
DIVs
Each of these will be a fasta file. for pre_MED and post_MED we want all the reference sqeuences found in
all published Studies. DataSetSampleSequencePM and DataSetSampleSeqeunce respectively.
For the DIVs, we have some named sequences in the SP database that may not have
been found in a sample yet (because we initially populated the SP database with named sequences).
As such to make this fasta we will output all named sequences, unless they a given sequences is
only found in unpublished Studies. I.e. If the sequences is not found in a DataSetSample, then
we put it in the fasta, if it is found in a number of DataSetSamples, and any of them are published
then we put it in the fasta.
"""

from sp_app import db
# The User is the class from the symportal.org database, i.e. the one that houses the passwords
# The SPUser is the User class from the symportal_database
from sp_app.models import SPDataSet, DataSetSample, Study, SPUser, User, ReferenceSequence, DataSetSampleSequencePM, DataSetSampleSequence, Study__DataSetSample
import json
import sys
from sqlalchemy.orm.exc import NoResultFound
from datetime import datetime
import json
import pickle
import os

class DBSync:
    def __init__(self):
        self.path_to_json = 'published_articles_sp.json'
        self.published_articles_sp_dict = self._get_json_array()
        self.json_study_objects = self.published_articles_sp_dict["studies"]
        self.json_user_objects = self.published_articles_sp_dict["users"]
        # We will do a first and second pass of the user objects as described in
        # _create_and_associate_user_objects
        self._first_user_pass = True
        self._spo_users_to_create = []
        # This will be dict of spd_new_user to spo_existing_user
        self._spd_to_spo_user_dict = {}
        # This is a list of strings that detail the proposed modifications
        self._modification_strings = []
        

        # The Studies to be created
        self._spd_studies_to_create = []
        # New associations
        self.spd_user_study_associations = []


    def sync(self):
        self._create_and_associate_user_objects()
        self._create_and_associate_study_objects()
        self._associate_users_to_studies()
        print('Sync complete.')

    def _get_json_array(self):
        with open(self.path_to_json, 'r') as f:
            return json.load(f)

    def _associate_users_to_studies(self):
        """Now that all of the Study objects and User objects should have been created in the symportal_database
        we can make the associations between the two.
        Go User by User, get the list of the associated Study objects. If none are associated, do association.
        If associations already exist, then check to see if they need modifying. Similar to above, keep
        track of these two situations seperately. We should generally expect there to not already be associations."""
        self._modification_strings = []
        for json_user in self.json_user_objects:
            # Get the the user
            spd_user = SPUser.query.filter(SPUser.name==json_user["name"]).one()
            if spd_user is None:
                raise RuntimeError(f'User object with the name {json_user["name"]} not found.')
            # Whether associations do or do not already exist, we will need to have a 
            # set of studies that should exist
            studies_that_should_exist = list(Study.query.filter(Study.name.in_(json_user["studies"])).all())
            if list(spd_user.studies):
                # If there are already associations, check they are the same as what they should be
                studies_that_do_exist = list(spd_user.studies)
                if set(studies_that_do_exist) == set(studies_that_should_exist):
                    # Then there is nothing to do
                    pass
                else:
                    # Then we need to update the association
                    spd_user.studies = studies_that_should_exist
                    db.session.add(spd_user)
                    self._modification_strings.append(spd_user)
            else:
                # Then there is no current association and so we should create one
                spd_user.studies.extend(studies_that_should_exist)
                db.session.add(spd_user)
                self.spd_user_study_associations.append(spd_user)
        self._confirm_spd_user_study_associations()
        

    def _create_and_associate_study_objects(self):
        """Here we will check to see if the Study objects in the json file already exist
        and if they don't we will create them. If they already exist we will check
        to see that they are associated with the correct set of DataSetSample objects.
        Each of the JSON Study objects has either a list of datasets or dataset objects
        to make the associations from."""
        # Clear the modifcation string list and reuse
        self._modification_strings = []
        for json_study in self.json_study_objects:
            try:
                self._check_or_modify_study_association(json_study)
                
            except NoResultFound:
                # The study does not yet exist and we should create it and make the association.
                self._create_study_and_associations(json_study)
        self._confirm_spd_study_creation_and_modification()

    def _check_or_modify_study_association(self, json_study):
        spd_study = Study.query.filter(Study.name==json_study["name"]).one()

        # Then the spd Study object already exists
        # Check to see that the data_set_sample association has already been made
        dss_that_should_be_associated = self._get_dss_objects_for_obj(json_study)
        dss_that_are_associated = spd_study.data_set_samples
        if set(dss_that_are_associated) == set(dss_that_should_be_associated):
            # Then the association is correct
            pass
        else:
            # Then the assocation is not correct and we should update
            spd_study.data_set_samples = dss_that_should_be_associated
            db.session.add(spd_study)
            self._modification_strings.append(spd_study)

    def _create_study_and_associations(self, json_study):
        # The study does not yet exist and we should create it and make the association.
        dss = self._get_dss_objects_for_obj(json_study)
        new_study = Study(
        name=json_study["name"], title=json_study["title"], is_published=json_study["is_published"], 
        location=json_study["location"], run_type=json_study["run_type"], 
        article_url=json_study["article_url"], data_url=json_study["data_url"], 
        data_explorer=json_study["data_explorer"], analysis=json_study["analysis"], 
        author_list_string=json_study["author_list_string"], 
        additional_markers=json_study["additional_markers"]
        )
        new_study.data_set_samples.extend(dss)
        db.session.add(new_study)
        self._spd_studies_to_create.append(new_study)
        
    def _get_dss_objects_for_obj(self, json_study):
        if not json_study["data_sets"] and not json_study["data_set_samples"]:
            raise SystemExit(
                f"""The json study object {json_study["name"]} has no data set samples or 
                datasets supplied to make associations from.""")
        elif json_study["data_sets"] and json_study["data_set_samples"]:
            raise SystemExit(
                f"""The json study object {json_study["name"]} has both data set samples and 
                datasets supplied to make associations from.""")
        else:
            if json_study["data_sets"]:
                # Then we are working with a number of specificed data_sets
                # we need to get the DataSet objects and then the associated DataSetSample
                # objects and associate these to the Study
                # The DataSets
                spds = SPDataSet.query.filter(SPDataSet.id.in_(json_study["data_sets"])).all()
                return self._dss_list_from_ds_list(spds)
    
            elif json_study["data_set_samples"]:
                # Then we are working with a number of datasetsample ids
                return DataSetSample.query.filter(DataSetSample.id.in_(json_study["data_set_samples"])).all()
                
    def _dss_list_from_ds_list(self, ds_list):
        # The DataSetSamples
        data_set_sample_obj_list = []
        for dataset in ds_list:
            data_set_sample_obj_list.extend(list(DataSetSample.query.filter(DataSetSample.dataset==dataset).all()))
        # Just as a santiy check make sure that there are no duplicate data_set_samples in the list
        assert len(data_set_sample_obj_list) == len(set(data_set_sample_obj_list))
        return data_set_sample_obj_list

    def _create_and_associate_user_objects(self):
        # For each User object in the json list,
        # check to see if there is an exact match in the symportal.org users
        # We will do two passes, the first pass will look to see
        # which User objects need to be created in the spo db.
        # We will then confirm with the user that these should be created.
        # We will then do the second pass where we create the SPUser objects
        # in the spd db. We do it this way as we need to have the IDs of the
        # User objects in the spo db to assign to the SPUser objects.
        self._one_pass_user_objects()
        self._confirm_spo_user_creation()
        self._first_user_pass = False
        self._one_pass_user_objects()
        self._confirm_spd_user_association()
        
        # Here we whould have all of the User objects created for both
        # The spd and spo dbs.
        
    def _one_pass_user_objects(self):
        for json_user in self.json_user_objects:
            # Search to see if a corresponding symportal_org user exists
            try:
                spo_user = User.query.filter(User.username==json_user["name"]).one()
                # Then the user exists and a symportal_database User object should be created
                # That is linked to this user.
                if self._first_user_pass:
                    # If first pass then we are only interested in finding spo User objects
                    # that need to be created so simply pass here.
                    pass
                elif self._first_user_pass is False:
                    # First check to make sure that the spd User does not already exist
                    try:
                        # We don't expect to have this work
                        spd_user = SPUser.query.filter(SPUser.name==json_user["name"]).one()
                        # If we get here, then the user exists.
                        # Check if associated and if association is correct
                        if not spd_user.app_db_key_is_set:
                            # Then we should associate to the given spo user
                            self._modification_strings.append(f"{spd_user} will be associated to {spo_user}")
                            spd_user.app_db_key_is_set = True
                            spd_user.app_db_key_id = spo_user.id
                            db.session.add(spd_user)
                        else:
                            # Then this spd_user is already associated and we should check that the IDs match
                            if not spd_user.app_db_key_id == spo_user.id:
                                matched_spo_user = User.query.get(spd_usr.app_db_key_id)
                                raise RuntimeError(
                                    f"{spd_user} is associated to {matched_spo_user}, but matches the name of {spo_user}"
                                )
                            else:
                                # Then all is good 
                                pass
                    except NoResultFound:
                        # The user doesn't exist, associate to the spo user
                        spd_user = SPUser(name=json_user["name"], app_db_key_is_set=True, app_db_key_id=spo_user.id)
                        db.session.add(spd_user)
                        self._spd_to_spo_user_dict[spd_user] = spo_user
            except NoResultFound:
                if first_pass is False:
                    raise RuntimeError('A user was not found in the spo db on the second run')
                # Then the user doesn't yet exist in the spo db.
                # We need to create the spo version first and then 
                # we can link in the second run to the spd db object
                spo_user = User(username=json_user["name"], is_admin=json_user["is_admin"])
                db.session.add(spo_usr)
                self._spo_users_to_create.append(spo_user)

    def _confirm_spo_user_creation(self):
        if self._spo_users_to_create:
            # If there are objects to create then verify with the user that they should be
            # created.
            print("The following User objects were not found in the symportal_org database:")
            for u in self._spo_users_to_create:
                print(f"\t{u}")
            commit_y_n = input("These objects will be created. Continue with commit? (y/n):")
            if commit_y_n == 'y':
                print('Creating new objects')
                # TODO it may be that we need to create a new session after performing this commit
                db.session.commit()
            if commit_y_n == 'n':
                raise SystemExit('No new User objects have been created. Exiting')
        else:
            # There are no new objects to create
            print("All symportal.org User objects already exist")
            print("Associating symportal_database User objects")

    def _confirm_spd_user_association(self):
        # Need to print out the new spd user objects to create and associate
        # and the spd user objects that need to be modified (if any)
        if self._spd_to_spo_user_dict or self._modification_strings:
            print("The following symportal_database User objects will be created and associated to symportal_org db Users:")
            for spd_user, spo_user in self._spd_to_spo_user_dict.items():
                print(f"{spd_user} --> {spo_user}")
            if self._modification_strings:
                print("\nThe following symportal_database User ojects will be modified")
                for mod in self._modification_strings:
                    print(mod)
            commit_y_n = input("Continue with commit? (y/n):")
            if commit_y_n == 'y':
                print('Commiting')
                # TODO this may fail due to already having done a commit.
                db.session.commit()
            else:
                raise SystemExit("""No symportal_database User objects were created or modified.
                                    However, symportal_org database User objects may have been 
                                    created previously in this session.""")

    def _confirm_spd_study_creation_and_modification(self):
        # Here we should have created or checked all of the Studies from the published_articles_sp.json
        # Now get confimation from the user to commit the changes
        if self._spd_studies_to_create or self._modification_strings:
            print("The following Study objects will be created in the symportal_database:")
            for spd_study in self._spd_studies_to_create:
                dss_list_str_rep = ''
                for i, dss in enumerate(spd_study.data_set_samples):
                    if i == 3:
                        break
                    if i ==2:
                        dss_list_str_rep += str(dss) + '...'
                    else:
                        dss_list_str_rep += str(dss) + ', '
                print(f'{spd_study} with associations to:')
                print(f'\t{dss_list_str_rep}')
            print()
            if self._modification_strings:
                print("The following existing Study objects will have their associations modified:")
                for spd_study in self._modification_strings:
                    print(f'\t{spd_study}')
            commit_y_n = input("Continue with commit? (y/n):")
            if commit_y_n == 'y':
                db.session.commit()
            else:
                raise SystemExit('No symportal_database Study objects have been created or modified.')

    def _confirm_spd_user_study_associations(self):
        # Here we should have created all of the associations
        # Now confirm with the user that we should commit
        if self.spd_user_study_associations or self._modification_strings:
            print("The following new associations will be created")
            for spd_user in self.spd_user_study_associations:
                print(f'{spd_user}:')
                print('\t' + ', '.join([str(_) for _ in list(spd_user.studies)]))
            
            if self._modification_strings:
                print("The following Users will have their associations modified:")
                for spd_user in self._modification_strings:
                    print(f'{spd_user}:')
                    for study in spd_user.studies:
                        sys.stdout.write(f', {study}')
            commit_y_n = input("Continue with commit? (y/n):")
            if commit_y_n == 'y':
                db.session.commit()
            else:
                raise SystemExit("""No symportal_database User-Study associations have been modified""")



class OutputResourceFastas:
    """
    In addition to syncing the database we should update the fasta resources on the index page.
    We want to have three different resources here.
    pre_MED
    post_MED
    DIVs
    Each of these will be a fasta file. for pre_MED and post_MED we want all the reference sqeuences found in
    all published Studies. DataSetSampleSequencePM and DataSetSampleSeqeunce respectively.
    For the DIVs, we have some named sequences in the SP database that may not have
    been found in a sample yet (because we initially populated the SP database with named sequences).
    As such to make this fasta we will output all named sequences, unless they a given sequences is
    only found in unpublished Studies. I.e. If the sequences is not found in a DataSetSample, then
    we put it in the fasta, if it is found in a number of DataSetSamples, and any of them are published
    then we put it in the fasta.

    Pseudo-code:
    Every time we run the sync, we can overwite the three fastas that are currently available.
    As well as the three fasta files we can also output an associated json info file.
    This json info file can hold as a dictionary the name of the resource, the description,
    the number of sequences, the number of published studies and the update date.
    """
    def __init__(self, cache=False):
        self.resource_dir = os.path.join(os.getcwd(), 'sp_app', 'static', 'resources')
        self.cache_dir = os.path.join(self.resource_dir, 'cache')
        # NB!! This cache system I've made may be useless as we are doing lazy loads and so associated
        # objects are likely not cached. If we were to do joined loads, then the objects would be massive
        self.cache = cache
        if self.cache:
            try:
                # Try to load them and if it fails then do it from scratch
                self.pre_med_reference_sequences_published = pickle.load(open(os.path.join(self.cache_dir, 'pre_med_reference_sequences.p'), 'rb'))
                self.post_med_reference_sequences_published = pickle.load(open(os.path.join(self.cache_dir, 'post_med_reference_sequences.p'), 'rb'))
                self.pre_med_reference_sequences_unpublished = pickle.load(open(os.path.join(self.cache_dir, 'pre_med_reference_sequences_unpublished.p'), 'rb'))
            
            # self.published_studies = self._get_object_from_cache('published_studies.p', self._get_published_studies_from_db)
            # self.unpublished_studies = self._get_object_from_cache('unpublished_studies.p', self._get_unpublished_studies_from_db)
            # self.published_data_set_samples = self._get_object_from_cache('published_data_set_samples.p', self._get_published_data_set_samples_from_db)
            # self.unpublished_data_set_samples = self._get_object_from_cache('unpublished_data_set_samples.p', self._get_unpublished_data_set_samples_from_db)
            # self.published_data_set_sample_sequence = self._get_object_from_cache('published_data_set_sample_sequence.p', self._get_data_set_sample_sequence_from_db)
            # self.published_data_set_sample_sequence_pm =  self._get_object_from_cache('published_data_set_sample_sequences_pm.p', self._get_data_set_sample_sequence_pm_from_db)
            # self.unpublished_data_set_sample_sequence_pm = self._get_object_from_cache('unpublished_data_set_sample_sequences_pm.p', self._get_data_set_sample_sequence_pm_unpublished_from_db)
            # self.pre_med_reference_sequences = self._get_object_from_cache('pre_med_reference_sequences.p', self._get_pre_med_representative_reference_sequences_from_db)
            # self.post_med_reference_sequences = self._get_object_from_cache('post_med_reference_sequences.p', self._get_post_med_representative_reference_sequences_from_db)
            except FileNotFoundError:
                self._get_objects_from_db()
        else:
            self._get_objects_from_db()
                
        self.pre_med_fasta_path = os.path.join(self.resource_dir, 'published_pre_med.fasta')
        self.post_med_fasta_path = os.path.join(self.resource_dir, 'published_post_med.fasta')
        self.div_fasta_path = os.path.join(self.resource_dir, 'published_div.fasta')
        self.json_path = os.path.join(self.resource_dir, 'resource_info.json')
        self.json_dict = {}
        
    def _get_objects_from_db(self):
        self.published_studies = self._get_published_studies_from_db()
        self.unpublished_studies = self._get_unpublished_studies_from_db()
        self.published_data_set_samples = self._get_published_data_set_samples_from_db()
        self.unpublished_data_set_samples = self._get_unpublished_data_set_samples_from_db()
        self.published_data_set_sample_sequence = self._get_data_set_sample_sequence_from_db()
        self.published_data_set_sample_sequence_pm =  self._get_data_set_sample_sequence_pm_from_db()
        self.unpublished_data_set_sample_sequence_pm = self._get_data_set_sample_sequence_pm_unpublished_from_db()
        self.pre_med_reference_sequences = self._get_pre_med_representative_reference_sequences_from_db()
        self.post_med_reference_sequences = self._get_post_med_representative_reference_sequences_from_db()
        self.pre_med_reference_sequences_unpublished = self._get_pre_med_representative_reference_sequences_unpublished_from_db()
    
    def _get_pre_med_representative_reference_sequences_unpublished_from_db(self):
        print('Retrieving pre_MED ReferenceSeqeunces from unpublished DataSetSampleSequencePMs')
        retr_rs = [rs for rs in [_.referencesequence for _ in self.unpublished_data_set_sample_sequence_pm] if rs.has_name]
        print(f'Retrieved {len(retr_rs)} ReferenceSequences')
        if self.cache:
            self._pickle_dump_obj(pre_med_reference_sequences, 'pre_med_reference_sequences_unpublished.p')
        return retr_rs

    def make_fasta_resources(self):
        self._pre_med()
        self._post_med()
        self._div()
        self._populate_and_write_json_dict()

    def _populate_and_write_json_dict(self):
        """
        Populate the json dict with the information that we will display in the resources section
        for each of the alignments giving the number of samples and datasets and that sort of thing
        """
        self.json_dict['number_published_studies'] = len(self.published_studies)
        self.json_dict['published_data_set_samples'] = len(self.published_data_set_samples)
        self.json_dict['update_date'] = str(datetime.now())
        self.json_dict['num_pre_med_seqs'] = len(self.pre_med_reference_sequences)
        self.json_dict['num_post_med_seqs'] = len(self.post_med_reference_sequences)
        json.dump(self.json_dict, self.json_path)
        

    def _pre_med(self):
        print('Creating pre_MED_fasta')
        self._write_ref_seqs_to_path(path=self.pre_med_fasta_path, ref_seqs=self.pre_med_reference_sequences)

    def _post_med(self):
        print('\n\nCreating post_MED_fasta')
        self._write_ref_seqs_to_path(path=self.post_med_fasta_path)

    def _div(self):
        """The DIVs are a little more tricky.
        1 - Get all named seqs
        2 - Get all named seqs found in published studies
        3 - remove 2 from 1. This leaves us with unpublished and starter DIVs
        4 - Get divs from all unpublished studies (Will be massive)
        5 - for each DIV in 3, if not in 4, then this is safe to use
        """
        print('\n\nCreating DIV_fasta')
        #1
        all_named_ref_seqs = list(ReferenceSequence.query.filter(ReferenceSequence.has_name==True).all())
        #2
        published_named_ref_seqs = [_ for _ in self.pre_med_reference_sequences if _.has_name]
        #3
        unpub_and_starter = list(set(all_named_ref_seqs).difference(published_named))
        #4
        # It is unreasonable to work with every DataSet that is in the symportal_database,
        # Rather we will work with the unpublised Study objects. As symportal progresses
        # every submitted dataset will become a Study object
        divs_in_ubpublished_studies = [rs for rs in [_.referencesequence for _ in self.unpublished_data_set_sample_sequence_pm] if rs.has_name]

        # add the good DIVS directly to the published_named_ref_seqs_list
        for div in unpub_and_starter:
            if div not in divs_in_ubpublished_studies:
                published_named_ref_seqs.append(div)
        
        self.json_dict['num_div_seqs'] = len(published_named_ref_seqs)
        self._write_ref_seqs_to_path(path=self.div_fasta_path, ref_seqs=published_named_ref_seqs)

    def _write_ref_seqs_to_path(self, path, ref_seqs):
        with open(path, 'w') as f:
            for rs_obj in ref_seqs:
                f.write('>{rs_obj}')
                f.write(rs_obj.sequence)
    
    def _get_pre_med_representative_reference_sequences_from_db(self):
        print('\nRetrieving pre_MED representative ReferenceSequences')
        pre_med_reference_sequences = list(set([_.referencesequence for _ in self.published_data_set_sample_sequence_pm]))
        print(f'{len(pre_med_reference_sequences)} published pre_MED ReferenceSeqeunces retrieved')
        if self.cache:
            self._pickle_dump_obj(pre_med_reference_sequences, 'pre_med_reference_sequences.p')
        return pre_med_reference_sequences

    def _get_post_med_representative_reference_sequences_from_db(self):
        print('\nRetrieving post_MED representative ReferenceSequences')
        post_med_reference_sequences = list(set([_.referencesequence for _ in self.published_data_set_sample_sequence]))
        print(f'{len(post_med_reference_sequences)} published post_MED ReferenceSeqeunces retrieved')
        if self.cache:
            self._pickle_dump_obj(post_med_reference_sequences, 'post_med_reference_sequences.p')
        return post_med_reference_sequences

    def _get_data_set_sample_sequence_from_db(self):
        print('Retrieving DataSetSampleSeqeuence objects from published DataSetSamples')
        published_data_set_sample_sequence = set()
        for dss in self.published_data_set_samples:
            ret_dsss = list(dss.data_set_sample_sequences)
            sys.stdout.write(f'\r{dss}: {len(ret_dsss)} DataSetSampleSequences'.ljust(100))
            published_data_set_sample_sequence.update(ret_dsss)
        published_data_set_sample_sequence = list(published_data_set_sample_sequence)
        print(f'\n{len(published_data_set_sample_sequence)} published DataSetSampleSequences retrieved')
        if self.cache:
            self._pickle_dump_obj(published_data_set_sample_sequence, 'published_data_set_sample_sequence.p')
        return published_data_set_sample_sequence
    
    def _get_data_set_sample_sequence_pm_from_db(self):
        print('Retrieving DataSetSampleSequencePM objects from published DataSetSamples')
        published_data_set_sample_sequences_pm = set()
        for dss in self.published_data_set_samples:
            ret_dssspm = list(dss.data_set_sample_sequences_pm)
            sys.stdout.write(f'\r{dss}: {len(ret_dssspm)} DataSetSampleSequencePMs'.ljust(100))
            published_data_set_sample_sequences_pm.update(ret_dssspm)
        published_data_set_sample_sequences_pm = list(published_data_set_sample_sequences_pm)
        print(f'\n{len(published_data_set_sample_sequences_pm)} published DataSetSampleSequencePMs retrieved')
        if self.cache:
            self._pickle_dump_obj(published_data_set_sample_sequences_pm, 'published_data_set_sample_sequences_pm.p')
        return published_data_set_sample_sequences_pm

    def _get_data_set_sample_sequence_pm_unpublished_from_db(self):
        print('Retrieving DataSetSampleSequencePM objects from unpublished DataSetSamples')
        unpublished_data_set_sample_sequences_pm = set()
        for dss in self.unpublished_data_set_samples:
            ret_dssspm = list(dss.data_set_sample_sequences_pm)
            sys.stdout.write(f'\r{dss}: {len(ret_dssspm)} DataSetSampleSequencePMs'.ljust(100))
            unpublished_data_set_sample_sequences_pm.update(ret_dssspm)
        unpublished_data_set_sample_sequences_pm = list(unpublished_data_set_sample_sequences_pm)
        print(f'\n{len(unpublished_data_set_sample_sequences_pm)} unpublished DataSetSampleSequencePMs retrieved')
        if self.cache:
            self._pickle_dump_obj(unpublished_data_set_sample_sequences_pm, 'unpublished_data_set_sample_sequences_pm.p')
        return unpublished_data_set_sample_sequences_pm

    def _get_published_data_set_samples_from_db(self):
        print('Retrieving DataSetSample objects from published studies')
        published_data_set_samples = set()
        for study in self.published_studies:
            ret_dss = list(study.data_set_samples)
            sys.stdout.write(f"\r{study}: {len(ret_dss)} DataSetSamples".ljust(50))
            published_data_set_samples.update(ret_dss)
        published_data_set_samples = list(published_data_set_samples)
        print(f'\n{len(published_data_set_samples)} published DataSetSamples retrieved')
        if self.cache:
            self._pickle_dump_obj(published_data_set_samples, 'published_data_set_samples.p')
        return published_data_set_samples
    
    def _get_unpublished_data_set_samples_from_db(self):
        print('Retrieving unpublished DataSetSample objects')
        unpublished_data_set_samples = set()
        for study in self.unpublished_studies:
            ret_dss = list(study.data_set_samples)
            sys.stdout.write(f"\r{study}: {len(ret_dss)} DataSetSamples".ljust(50))
            unpublished_data_set_samples.update(ret_dss)
        unpublished_data_set_samples = list(unpublished_data_set_samples)
        # We need to take into account that just because a dss is in an unpublished
        # study doesn't mean it might not be published in another study.
        unpublished_data_set_samples = [_ for _ in unpublished_data_set_samples if _ not in self.published_data_set_samples]
        print(f'\n{len(unpublished_data_set_samples)} unpublished DataSetSamples retrieved')
        if self.cache:
            self._pickle_dump_obj(unpublished_data_set_samples, 'unpublished_data_set_samples.p')
        return unpublished_data_set_samples

    def _get_published_studies_from_db(self):
        print('Retrieving published studies')
        published_studies = Study.query.filter(Study.is_published==True).all()
        print(f'{len(published_studies)} published studies retrieved')
        if self.cache:
            self._pickle_dump_obj(published_studies, 'published_studies.p')
        return published_studies

    def _get_unpublished_studies_from_db(self):
        print('Retrieving unpublished studies from db')
        unpublished_studies = Study.query.filter(Study.is_published==False).all()
        print(f'{len(unpublished_studies)} unpublished studies retrieved')
        if self.cache:
            self._pickle_dump_obj(unpublished_studies, 'unpublished_studies.p')
        return unpublished_studies

    def _pickle_dump_obj(self, obj, pickle_name):
        pickle.dump(obj, open(os.path.join(self.cache_dir, pickle_name), 'wb'))

    def _get_object_from_cache(self, pickle_name, db_method):
        try:
            print(f'Attempting to retrieve {pickle_name} studies from cache')
            obj = pickle.load(open(os.path.join(self.cache_dir, pickle_name), 'rb'))
            print(f'Retrieved {len(obj)} objects')
            return obj
        except FileNotFoundError:
            print(f'Failed to retrieve {pickle_name} from cache')
            return db_method()

orf = OutputResourceFastas(cache=False).make_fasta_resources()
foo = 'bar'
sync = DBSync()
sync.sync()