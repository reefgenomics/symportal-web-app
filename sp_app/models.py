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

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    datasets = db.relationship('DataSet', secondary=datasets, lazy='dynamic',
     backref=db.backref('authors', lazy='dynamic'))
    

    def __repr__(self):
        return '<User {}>'.format(self.username)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def add_dataset(self, dataset):
        if not self.has_authored(dataset):
            self.datasets.append(dataset)
        else:
            print(f'{dataset} is already in the datasets list of {self}. Cannot add.')
    
    def remove_dataset(self, dataset):
        if self.has_authored(dataset):
            self.datasets.remove(dataset)
        else:
            print(f'{dataset} is not in the datasets list of {self}. Cannot remove.')
    
    def has_authored(self, dataset):
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
    upload_timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)

    def __repr__(self):
        return f'<DataSet {self.data_name}>'

    def add_author(self, user):
        if not self.authored_by(user):
            self.authors.append(user)
        else:
            print(f'{user} already in authors of {self}. Cannot add.')
    
    def remove_author(self, user):
        if self.authored_by(user):
            self.authors.remove(user)
        else:
            print(f'{user} is not in authors of {self}. Cannot remove.')
    
    def authored_by(self, user):
        # NB this will thow an error about 'filter' not being a method
        # if you have the wrong type of lazy set
        # https://www.reddit.com/r/flask/comments/52p0pl/af_sqlalchemy_manytomany_question/
        # I changed to lazy = dynamic and all is good.
        return self.authors.filter(datasets.c.user_id == user.id).count() > 0