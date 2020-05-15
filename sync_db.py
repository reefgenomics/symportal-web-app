#!/usr/bin/env python3
"""
This script will be run when we transfer a datbase version from the remote symportal instance
to the symportal.org server. This transfer will always be in one directrion. From the symportal
instance, to the symportal server. This transfer will most often occur when we are adding a new study and or user
to the SymPortal.org collection of studies.
The first thing to do will be to drop the current database, create a newone and then restore with the new back.
I think we should keep a total of 3 .bak files. We can keep the original names, but append a 0, 1 or 2 to them
so that the 0 is the newest, the 1 is the next newest etc. If a 2 exists at the point of transfer, we will delete this.
One the new database has been restored from the .bak, we will sync the database using the published_articles_sp
that will also have been sent up. I think it will be a good idea to have a common part of the name between the 
published articles sp json and the database. I think date and time are probably a good idea. Like the .bak, we
can keep some versions of the published articles sp json.

User objects and Study objects will only every be added to the
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
"""

from sp_app import db
# The User is the class from the symportal.org database, i.e. the one that houses the passwords
# The SPUser is the User class from the symportal_database
from sp_app.models import SPDataSet, DataSetSample, Study, SPUser, User, ReferenceSequence, DataSetSampleSequencePM, DataSetSampleSequence, Study__DataSetSample
import sys
from sqlalchemy.orm.exc import NoResultFound
from datetime import datetime
import json
import pickle
import os
import subprocess
from time import time
import argparse
import ntpath
import shutil
import hashlib

class DBSync:
    def __init__(self):
        self.parser = argparse.ArgumentParser()
        self._define_args()
        self.args = self.parser.parse_args()
        self.json_archive_dir = self.args.json_archive_dir
        self.bak_archive_dir = self.args.bak_archive_dir
        self.path_to_new_bak = self.args.path_to_new_bak
        self.path_to_new_sp_json = self.args.path_to_new_sp_json
        self.psql_user = self.args.psql_user 
        self.prompt = self.args.no_prompt

    def _define_args(self):
        self.parser.add_argument('--path_to_new_sp_json', help='The path to the new published_articles_sp.json on this web server.', required=True)
        self.parser.add_argument('--path_to_new_bak', help='The path to the new .bak file that will be used to create the new symportal_database version.', required=True)
        self.parser.add_argument('--json_archive_dir', help="The path to the directory that holds the archived published_articles_sp.json files", default='/home/humebc/symportal.org/published_articles_archive')
        self.parser.add_argument('--bak_archive_dir', help="The path to the directory that holds the archived .bak symportal_database files", default="/home/humebc/symportal.org/symportal_database_versions")
        self.parser.add_argument('--psql_user', help="Username for postgresql commands", default='humebc')
        self.parser.add_argument('-y', '--no_prompt', help="Do not prompt before making commits", action='store_false', default=True)

    def _init_vars_for_sync(self):
        # All the variables to do with the actual syncing need to happen after
        # tHe new .bak and .json files have been put in their place.
        # I.e. here.
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
        self._archive_bak_and_json()
        # self._restore_from_bak()
        self._init_vars_for_sync()
        self._create_and_associate_user_objects()
        self._create_and_associate_study_objects()
        self._associate_users_to_studies()
        print('Sync complete.')

    def _archive_bak_and_json(self):
        """
        In the symportal_database_archive_dir and in the json_archive_dir there should be up to three
        files that have been prefixed eith 0, 1, 2 depending on which order they were up load.
        Here we want to add the new json and bak files to these archives and update the namings accordingly.
        """
        bak_file_name = ntpath.basename(self.path_to_new_bak)
        sp_json_file_name = ntpath.basename(self.path_to_new_sp_json)
        self.new_archived_json_path = os.path.join(self.json_archive_dir, f'0_{sp_json_file_name}')
        self.new_archived_bak_path = os.path.join(self.bak_archive_dir, f'0_{bak_file_name}')
        
        # Check to see that the new .json and the new .bak have not already been updated
        if not os.path.isfile(self.new_archived_json_path):
            # Make sure that the new json file is where it should be 
            if os.path.isfile(os.path.join(self.json_archive_dir, sp_json_file_name)):
                pass
            else:
                shutil.move(self.path_to_new_sp_json, os.path.join(self.json_archive_dir, sp_json_file_name))
            # Then update the namings
            # We will need to grab the names and then update outside of for loop
            # below to prevent renaming 1 -- > 2 before deleteing the old 2.
            one_file_name_json = None
            zero_file_name_json = None
            for json_archive_file in os.listdir(self.json_archive_dir):
                if json_archive_file.startswith('2_') and json_archive_file.endswith('.json'):
                    # Then this is the oldest file and it needs to be removed
                    os.remove(os.path.join(self.json_archive_dir, json_archive_file))
                elif json_archive_file.startswith('1_') and json_archive_file.endswith('.json'):
                    one_file_name_json = json_archive_file
                elif json_archive_file.startswith('0_') and json_archive_file.endswith('.json'):
                    zero_file_name_json = json_archive_file
            
            # now do the renaming.
            if one_file_name_json is not None:
                shutil.move(os.path.join(self.json_archive_dir, one_file_name_json), os.path.join(self.json_archive_dir, one_file_name_json.replace('1_', '2_')))
            if zero_file_name_json is not None:
                shutil.move(os.path.join(self.json_archive_dir, zero_file_name_json), os.path.join(self.json_archive_dir, zero_file_name_json.replace('0_', '1_'))) 
            # finally, rename the new json file
            shutil.move(os.path.join(self.json_archive_dir, sp_json_file_name), self.new_archived_json_path)
        else:
            pass

        # BAK
        if not os.path.isfile(self.new_archived_bak_path):
            if os.path.isfile(os.path.join(self.bak_archive_dir, bak_file_name)):
                pass
            else:
                shutil.move(self.path_to_new_bak, os.path.join(self.bak_archive_dir, bak_file_name))
            # Then update the namings
            # We will need to grab the names and then update outside of for loop
            # below to prevent renaming 1 -- > 2 before deleteing the old 2.
            one_file_name_bak = None
            zero_file_name_bak = None
            for bak_archive_file in os.listdir(self.bak_archive_dir):
                if bak_archive_file.startswith('2_') and bak_archive_file.endswith('.json'):
                    # Then this is the oldest file and it needs to be removed
                    os.remove(os.path.join(self.bak_archive_dir, bak_archive_file))
                elif bak_archive_file.startswith('1_') and bak_archive_file.endswith('.json'):
                    one_file_name_bak = bak_archive_file
                elif bak_archive_file.startswith('0_') and bak_archive_file.endswith('.json'):
                    zero_file_name_bak = bak_archive_file
            
            # now do the renaming.
            if one_file_name_bak is not None:
                shutil.move(os.path.join(self.bak_archive_dir, one_file_name_bak), os.path.join(self.bak_archive_dir, one_file_name_bak.replace('1_', '2_')))
            if zero_file_name_bak is not None:
                shutil.move(os.path.join(self.bak_archive_dir, zero_file_name_bak), os.path.join(self.bak_archive_dir, zero_file_name_bak.replace('0_', '1_'))) 
            # finally, rename the new json file
            shutil.move(os.path.join(self.bak_archive_dir, bak_file_name), os.path.join(self.bak_archive_dir, f'0_{bak_file_name}'))
    
    def _restore_from_bak(self):
        # Passing a password can be done: https://newfivefour.com/postgresql-pgpass-password-file.html
        # But I don't think it will be necessary as I think psql will be identifying using peer authentication
        # (I.e. the fact that we are already logged in)
        
        # Drop the db
        result = subprocess.run(['dropdb', '-U', self.psql_user, '-w', 'symportal_database'], check=True)
        # Remake the db
        result = subprocess.run(['createdb', '-U', self.psql_user, '-O', self.psql_user, '-w', 'symportal_database'], check=True)
        # Restore the db from the .bak
        result = subprocess.run(['pg_restore', '-U', self.psql_user, '-w', '-d', 'symportal_database', '-Fc', self.new_archived_bak_path])
    
    def _get_json_array(self):
        with open(self.new_archived_json_path, 'r') as f:
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
                if self._first_user_pass is False:
                    raise RuntimeError(f'A user ({json_user["name"]}) was not found in the spo db on the second run')
                # Then the user doesn't yet exist in the spo db.
                # We need to create the spo version first and then 
                # we can link in the second run to the spd db object
                spo_user = User(username=json_user["name"], is_admin=json_user["is_admin"])
                if len(json_user["studies"]) != 1:
                    raise RuntimeError('Studies is > 1 so we dont know which study to generate the password from')
                # Set the initial password for the user
                sum_numbers_from_study_name_as_str = str(sum([int(i) for i in list(json_user["studies"][0]) if i.isdigit()]))
                to_hash = f'{json_user["name"]}{sum_numbers_from_study_name_as_str}'.encode('utf-8')
                u_pass = hashlib.md5(to_hash).hexdigest()
                spo_user.set_password(u_pass)
                db.session.add(spo_user)
                self._spo_users_to_create.append((spo_user, u_pass))

    def _confirm_spo_user_creation(self):
        if self._spo_users_to_create:
            # If there are objects to create then verify with the user that they should be
            # created.
            print("The following User objects were not found in the symportal_org database:")
            for u in self._spo_users_to_create:
                print(f"\tnew user {u[0]}: {u[1]}")
            if self.prompt:
                commit_y_n = input("These objects will be created. Continue with commit? (y/n):")
                if commit_y_n == 'y':
                    print('Creating new objects')
                    db.session.commit()
                else:
                    raise SystemExit('No new User objects have been created. Exiting')
            else:
                print('Creating new objects')
                db.session.commit()

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
            if self.prompt:
                commit_y_n = input("Continue with commit? (y/n):")
                if commit_y_n == 'y':
                    print('Commiting')
                    db.session.commit()
                else:
                    raise SystemExit("""No symportal_database User objects were created or modified.
                                        However, symportal_org database User objects may have been 
                                        created previously in this session.""")
            else:
                print('Commiting')
                db.session.commit()

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
            if self.prompt:
                commit_y_n = input("Continue with commit? (y/n):")
                if commit_y_n == 'y':
                    db.session.commit()
                else:
                    raise SystemExit('No symportal_database Study objects have been created or modified.')
            else:
                db.session.commit()

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
            if self.prompt:
                commit_y_n = input("Continue with commit? (y/n):")
                if commit_y_n == 'y':
                    db.session.commit()
                else:
                    raise SystemExit("""No symportal_database User-Study associations have been modified""")
            else:
                db.session.commit()

    @staticmethod
    def md5sum(filename):
        with open(filename, mode='rb') as f:
            d = hashlib.md5()
            for buf in iter(partial(f.read, 128), b''):
                d.update(buf)
        return d.hexdigest()

sync = DBSync()
sync.sync()