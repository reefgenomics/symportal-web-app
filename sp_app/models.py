from sp_app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from sp_app import login

@login.user_loader
def load_user(id):
    return User.query.get(int(id))

datasets = db.Table('datasets',
                db.Column('dataset_id', db.Integer, db.ForeignKey('data_set.id'), primary_key=True),
                db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True))

cladeCollectionType = db.Table('dbApp_cladecollectiontype',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('analysis_type_of_id', db.Integer, db.ForeignKey('dbApp_analysistype.id'), primary_key=True),
    db.Column('clade_collection_found_in_id', db.Integer, db.ForeignKey('dbApp_cladecollection.id'), primary_key=True)
)

Study__DataSetSample = db.Table('dbApp_study_data_set_samples', 
    db.Column('id', db.Integer, primary_key=True),
    db.Column('datasetsample_id', db.Integer, db.ForeignKey('dbApp_datasetsample.id'), primary_key=True),
    db.Column('study_id', db.Integer, db.ForeignKey('dbApp_study.id'), primary_key=True)
    )

SPUser__Study = db.Table('dbApp_user_studies',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('study_id', db.Integer, db.ForeignKey('dbApp_study.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('dbApp_user.id'), primary_key=True)
    )

class SPDataSet(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_dataset'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(30), nullable=False)
    reference_fasta_database_used = db.Column(db.String(60), nullable=False)
    submitting_user = db.Column(db.String(100), nullable=False)
    submitting_user_email = db.Column(db.String(100), nullable=False)
    working_directory = db.Column(db.String(300), nullable=False)
    time_stamp = db.Column(db.String(100), nullable=False)
    loading_complete_time_stamp = db.Column(db.String(100), nullable=False)
    data_set_samples = db.relationship('DataSetSample', backref='dataset')
    def __str__(self):
        return self.name

class DataSetSample(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_datasetsample'
    id = db.Column(db.Integer, primary_key=True)
    data_submission_from_id = db.Column(db.Integer, db.ForeignKey('dbApp_dataset.id'), nullable=False)
    clade_collections = db.relationship('CladeCollection', backref='dataset_sample')
    name = db.Column(db.String(200), nullable=False)
    # This is the absolute number of sequences after make.contigs
    num_contigs = db.Column(db.Integer, default=0)
    # store the aboslute number of sequences after inital mothur QC i.e. before tax and size screening
    post_qc_absolute_num_seqs = db.Column(db.Integer, default=0)
    # This is the unique number of sequences after inital mothur QC i.e. before tax and size screening
    post_qc_unique_num_seqs = db.Column(db.Integer, default=0)
    # Absolute number of sequences after sequencing QC and screening for Symbiodinium (i.e. Symbiodinium only)
    absolute_num_sym_seqs = db.Column(db.Integer, default=0)
    # Same as above but the number of unique seqs
    unique_num_sym_seqs = db.Column(db.Integer, default=0)
    # store the abosolute number of sequenes that were not considered Symbiodinium
    non_sym_absolute_num_seqs = db.Column(db.Integer, default=0)
    # This is the number of unique sequences that were not considered Symbiodinium
    non_sym_unique_num_seqs = db.Column(db.Integer, default=0)
    # store the abosulte number of sequences that were lost during the size selection
    size_violation_absolute = db.Column(db.Integer, default=0)
    # store the unique number of sequences that were lost during the size screening
    size_violation_unique = db.Column(db.Integer, default=0)
    # store the number of absolute sequences remaining after MED
    post_med_absolute = db.Column(db.Integer, default=0)
    # store the number of unique sequences remaining after MED (nodes)
    post_med_unique = db.Column(db.Integer, default=0)
    error_in_processing = db.Column(db.Boolean, default=False)
    error_reason = db.Column(db.String(100), nullable=False)
    cladal_seq_totals = db.Column(db.String(5000), nullable=False)
    # Meta data for the sample
    sample_type = db.Column(db.String(50), nullable=False)
    host_phylum = db.Column(db.String(50), nullable=False)
    host_class = db.Column(db.String(50), nullable=False)
    host_order = db.Column(db.String(50), nullable=False)
    host_family = db.Column(db.String(50), nullable=False)
    host_genus = db.Column(db.String(50), nullable=False)
    host_species = db.Column(db.String(50), nullable=False)
    collection_latitude = db.Column(db.Numeric(11,8), nullable=False)
    collection_longitude = db.Column(db.Numeric(11,8), nullable=False)
    # do not use the django date field as this causes problems when trying to dump and load the database
    collection_date = db.Column(db.String(40), nullable=False)
    # store a string rather than a number as this may be given as a range e.g. 6 - 12
    collection_date = db.Column(db.String(40), nullable=False)

    def __str__(self):
        return self.name

class Study(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_study'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), index=True, unique=True, nullable=False)
    title = db.Column(db.String(250), nullable=True)
    is_published = db.Column(db.Boolean, default=False)
    location = db.Column(db.String(50), nullable=True)
    run_type = db.Column(db.String(50), default='remote')
    article_url = db.Column(db.String(250), nullable=True)
    data_url = db.Column(db.String(250), nullable=True)
    data_explorer = db.Column(db.Boolean, default=False)
    analysis = db.Column(db.Boolean, default=True)
    author_list_string = db.Column(db.String(500))
    additional_markers = db.Column(db.String(200))
    creation_time_stamp = db.Column(db.String(100), default=str(datetime.now()).replace(' ', '_').replace(':', '-'))
    data_set_samples = db.relationship('DataSetSample', secondary=Study__DataSetSample, lazy='dynamic',
     backref=db.backref('studies', lazy='dynamic'))

class SPUser(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_user'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), index=True, unique=True, nullable=False)
    studies = db.relationship('Study', secondary=SPUser__Study, lazy='dynamic',
     backref=db.backref('studies', lazy='dynamic'))
    # This is set to False when User is created. Upon upload to symportal.org
    # a user that matches this name will be searched for in the app.db database.
    # If no matching user if found, an error will be thrown. If a user is found,
    # This value will be set to true, and the ID of the User in the app.db database
    # will be stored in app_db_key below.
    # The id of this object will also be stored in the app.db User object that matches
    app_db_key_is_set = db.Column(db.Boolean, default=False)
    app_db_key_id = db.Column(db.Integer, nullable=True)

class DataAnalysis(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_dataanalysis'
    id = db.Column(db.Integer, primary_key=True)
    analysis_types = db.relationship('AnalysisType', backref='data_analysis')
    # This will be a jsoned list of uids of the dataSubmissions that are included in this analysis
    list_of_data_set_uids = db.Column(db.String(500), nullable=True)
    # within_clade_cutoff = models.FloatField(default=0.04)
    within_clade_cutoff = db.Column(db.Float(), nullable=False)
    name = db.Column(db.String(500), nullable=True)
    # name = models.CharField(max_length=100, null=True)
    # description = models.CharField(max_length=5000, null=True)
    description = db.Column(db.String(5000), nullable=True)
    time_stamp = db.Column(db.String(100), nullable=False)
    submitting_user = db.Column(db.String(100), nullable=False)
    submitting_user_email = db.Column(db.String(100), nullable=False)
    analysis_complete_time_stamp = db.Column(db.String(100), nullable=False)

    # def get_clade_collections(self):
    #     list_of_uids = [int(x) for x in self.list_of_data_set_uids.split(',')]
    #     clade_collections = []
    #     for uid_list in general.chunks(list_of_uids):
    #         clade_collections.extend(list(CladeCollection.objects.filter(data_set_sample_from__data_submission_from__in=uid_list)))
    #     return clade_collections

class CladeCollection(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_cladecollection'
    id = db.Column(db.Integer, primary_key=True)
    data_set_sample_from_id = db.Column(db.Integer, db.ForeignKey('dbApp_datasetsample.id'), nullable=False)
    analysis_types = db.relationship('AnalysisType', secondary=cladeCollectionType, backref=db.backref('clade_collections'))
    # data_set_sample_from = models.ForeignKey(DataSetSample, on_delete=models.CASCADE, null=True)
    clade = db.Column(db.String(1), nullable=False)
    # the method below to get the footprint of the clade_collection_object is incredibly slow.
    # Hopefully a much faster way will be to store the ID's of the refseqs that make up the footprint
    # I will therefore store the reference uids in the field below
    footprint = db.Column(db.String(100000), nullable=False)

    # # This will return the foot print of the analysedSampleSequences that are found above the given percentage cutoff
    # def cutoff_footprint(self, cutoff):
    #     # get total seqs in cladeCollection
    #     total = 0

    #     for dsss in DataSetSampleSequence.objects.filter(clade_collection_found_in=self):
    #         total += dsss.abundance
    #     sequence_number_cutoff = cutoff * total
    #     frset = set([])
    #     for dsss in DataSetSampleSequence.objects.filter(clade_collection_found_in=self):
    #         if dsss.abundance > sequence_number_cutoff:
    #             frset.add(dsss.reference_sequence_of)
    #     return frozenset(frset)

    def __str__(self):
        return self.datasetsample.name

class AnalysisType(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_analysistype'
    id = db.Column(db.Integer, primary_key=True)
    data_analysis_from_id = db.Column(db.Integer, db.ForeignKey('dbApp_dataanalysis.id'), nullable=False)
    # This should be a frozen set of referenceSequences
    # As this is not possible in a django field or jsonable
    # I will instead make it a string of reference sequence uids
    # I will make set and get methods for the footprint
    # This will be a list of refSeqs that make up the footprint in order of their abundance when type first defined
    # This is a commar separated string of the uids of the ref seqs that define the type
    ordered_footprint_list = db.Column(db.String(200), nullable=True)
    # Same for listOfMajs
    # set() of refseqs that are Majs in each of the CCs this type was initially identified in.
    # Note that this is therefore in no particular order
    majority_reference_sequence_set = db.Column(db.String(40), nullable=True)

    list_of_clade_collections = db.Column(db.String(100000), nullable=True)
    # This is a 2D list, a list for each clade collection in order of the listofCladeCollections
    # Within each list the absolute abundances of the defining seqs in order of ordered_footprint_list
    footprint_sequence_abundances = db.Column(db.String(100000), nullable=True)

    # Same as above but the proportion of the seqs to each other in the cladecollection.
    footprint_sequence_ratios = db.Column(db.String(100000), nullable=True)

    clade = db.Column(db.String(1), nullable=False)
    co_dominant = db.Column(db.Boolean, default=False)

    name = db.Column(db.String(1000), nullable=True)

    # The list of speceis that this type is associated with
    species = db.Column(db.String(200), nullable=True)

    # this list will keep track of which of the defining intras of this type are 'unlocked' i.e. at least one
    # of the instances of that intra were found at <5%. We will use this list to the 'artefact type creation'
    # This artefact_intras will hold a char string of comma separated ints that represent the id's of the
    # refseqs that are unlocked
    artefact_intras = db.Column(db.String(5000), default='')

    def get_ratio_list(self):
        return json.loads(self.footprint_sequence_ratios)

    # def get_clade_collections(self):
    #     uids_for_query = [int(x) for x in self.list_of_clade_collections.split(',')]
    #     cc_objs_list = []
    #     for uid_list in general.chunks(uids_for_query):
    #         cc_objs_list.extend(list(CladeCollection.objects.filter(id__in=uid_list)))
    #     return cc_objs_list

    def __str__(self):
        return self.name

class ReferenceSequence(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_referencesequence'
    id = db.Column(db.Integer, primary_key=True)
    # name = models.CharField(max_length=30, default='noName')
    name = db.Column(db.String(30), default='noName')
    # has_name = models.BooleanField(default=False)
    has_name = db.Column(db.Boolean, default=False)
    # clade = models.CharField(max_length=30)
    clade = db.Column(db.String(30))
    # sequence = models.CharField(max_length=500)
    # sequence = db.Column(db.String(500))
    # accession = models.CharField(max_length=50, null=True)
    accession = db.Column(db.String(50), nullable=True)

    def __str__(self):
        if self.has_name:
            return self.name
        else:
            return f'{self.id}_{self.clade}'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    # Temporarily remove the email field do reduce risk of emails being intercepted
    # We can reinstate this once we have https setup.
    # email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    datasets = db.relationship('DataSet', secondary=datasets, lazy='dynamic',
     backref=db.backref('users_with_access', lazy='dynamic'))
    

    def __repr__(self):
        return '<User {}>'.format(self.username)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def add_authorisation_for_dataset(self, dataset):
        if not self.is_authorised_to_access_dataset(dataset):
            self.datasets.append(dataset)
            return True
        else:
            print(f'{dataset} is already in the datasets list of {self}. Cannot add.')
            return False
    
    def remove_authorisation_for_dataset(self, dataset):
        if self.is_authorised_to_access_dataset(dataset):
            self.datasets.remove(dataset)
            return True
        else:
            print(f'{dataset} is not in the datasets list of {self}. Cannot remove.')
            return False
    
    def is_authorised_to_access_dataset(self, dataset):
        return self.datasets.filter(datasets.c.dataset_id == dataset.id).count() > 0

class DataSet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data_name = db.Column(db.String(64), index=True, unique=True) # e.g. 20190214_damjanovic
    study_name = db.Column(db.String(64), index=True, unique=True) # e.g. Damjanovic et al 2019a
    study_to_load_str = db.Column(db.String(64), index=True, unique=True) # e.g. Damjanovic_et_al_2019a
    title = db.Column(db.String(500))
    location = db.Column(db.String(64))
    num_samples = db.Column(db.Integer)
    additional_markers = db.Column(db.String(200))
    is_published = db.Column(db.Boolean, default=False)
    run_type = db.Column(db.String(64))
    article_url = db.Column(db.String(200))
    seq_data_url = db.Column(db.String(200))
    data_explorer = db.Column(db.Boolean, default=False)
    # This is a string that is the authors that will be listed on the DataExplorer page
    # It is not the list that is used to keep track of which sp users hav access
    # to this dataset. That is 'users_with_access'.
    author_list_string = db.Column(db.String(500), default='No aurthor details')
    analysis = db.Column(db.Boolean, default=True)
    upload_timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)

    def __repr__(self):
        return f'<DataSet {self.data_name}>'

    def add_user_authorisation(self, user):
        if not self.is_an_authorised_user(user):
            self.users_with_access.append(user)
            return True
        else:
            print(f'{user} already in users_with_access of {self}. Cannot add.')
            return False
    
    def remove_user_authorisation(self, user):
        if self.is_an_authorised_user(user):
            self.users_with_access.remove(user)
            return True
        else:
            print(f'{user} is not in users_with_access of {self}. Cannot remove.')
            return False
    
    def is_an_authorised_user(self, user):
        # NB this will thow an error about 'filter' not being a method
        # if you have the wrong type of lazy set
        # https://www.reddit.com/r/flask/comments/52p0pl/af_sqlalchemy_manytomany_question/
        # I changed to lazy = dynamic and all is good.
        return self.users_with_access.filter(datasets.c.user_id == user.id).count() > 0