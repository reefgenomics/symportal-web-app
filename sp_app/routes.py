from flask import render_template, request
from sp_app import app

@app.route('/', methods=['GET','POST'])
@app.route('/index', methods=['GET','POST'])
def index():
    if request.method == 'GET':
        return render_template('index.html')
    elif request.method == 'POST':
        return render_template('data_explorer.html', study_to_load=request.form.get('study_to_load'))
    else:
        return render_template('index.html')

@app.route('/submit_data_learn_more')
def submit_data_learn_more():
    return render_template('submit_data_learn_more.html')

@app.route('/data_explorer')
def d_test():
    return render_template('data_explorer.html', study_to_load='Terraneo_et_al_2019')
