from flask import render_template, request, redirect, flash, url_for
from sp_app import app
import os
from sp_app.forms import LoginForm
@app.route('/', methods=['GET','POST'])
@app.route('/index', methods=['GET','POST'])
def index():
    if request.method == 'GET':
        user = {'username': 'Guest'}
        return render_template('index.html', user=user)
    elif request.method == 'POST':
        # get the google maps api key to be used
        map_key_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'static', 'utils', 'google_maps_api_key.txt')
        with open(map_key_path) as f:
            map_key = f.read().rstrip()
        return render_template('data_explorer.html', study_to_load=request.form.get('study_to_load'), map_key=map_key)
    else:
        user = {'username': 'Guest'}
        return render_template('index.html', user=user)

@app.route('/submit_data_learn_more')
def submit_data_learn_more():
    return render_template('submit_data_learn_more.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        flash('Login requested for user {}, remember_me={}'.format(
            form.username.data, form.remember_me.data))
        return redirect(url_for('index'))
    return render_template('login.html', form=form)