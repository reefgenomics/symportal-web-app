from flask import render_template
from sp_app import app

@app.route('/')
@app.route('/index')
def index():
    return "Hello, world!"
