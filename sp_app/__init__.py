from flask import Flask
from config import Config, basedir
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
import os

app = Flask(__name__)
app.config.from_object(Config)
with open(os.path.join(basedir, 'sp_app', 'password.txt'), 'r') as f:
    password = f.read().rstrip()
app.config['SQLALCHEMY_BINDS'] = {'symportal_database': f'postgresql://humebc:{password}@134.34.126.43:5432/symportal_database'}
db = SQLAlchemy(app)
migrate = Migrate(app,db)
login = LoginManager(app)
login.login_view = 'login'

from sp_app import routes, models
