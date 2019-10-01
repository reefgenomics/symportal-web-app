from flask import render_template
from sp_app import app

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/submit_data_learn_more')
def submit_data_learn_more():
    return render_template('submit_data_learn_more.html')

@app.route('/d_test')
def d_test():
    return render_template('data_explorer.html', study_to_load='20171017_tullia')
