from flask import Flask

app = Flask(__name__)

from sp_app import routes
