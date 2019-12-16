from sp_app import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    datasets = db.relationship('DataSet', backref='author', lazy='dynamic')

    def __repr__(self):
        return '<User {}>'.format(self.username)

class DataSet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    data_name = db.Column(db.String(64), index=True, unique=True) # e.g. 20190214_damjanovic
    study_name = db.Column(db.String(64), index=True, unique=True) # e.g. Damjanovic et al 2019a
    study_to_load_str = db.Column(db.String(64), index=True, unique=True) # e.g. Damjanovic_et_al_2019a
    title = db.Column(db.String(500), index=True, unique=True)
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