from flask import render_template, request
from sp_app import app
import os
@app.route('/', methods=['GET','POST'])
@app.route('/index', methods=['GET','POST'])
def index():
    if request.method == 'GET':
        return render_template('index.html')
    elif request.method == 'POST':
        # get the google maps api key to be used
        map_key_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'static', 'utils', 'google_maps_api_key.txt')
        with open(map_key_path) as f:
            map_key = f.read().rstrip()
        return render_template('data_explorer.html', study_to_load=request.form.get('study_to_load'), map_key=map_key)
    else:
        return render_template('index.html')

@app.route('/submit_data_learn_more')
def submit_data_learn_more():
    return render_template('submit_data_learn_more.html')