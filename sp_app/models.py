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


class DataSetSample(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_datasetsample'
    id = db.Column(db.Integer, primary_key=True)
    data_submission_from_id = db.Column(db.Integer, db.ForeignKey('dbApp_dataset.id'), nullable=False)
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

class DataAnalysis(db.Model):
    __bind_key__ = 'symportal_database'
    __tablename__ = 'dbApp_dataanalysis'
    id = db.Column(db.Integer, primary_key=True)
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