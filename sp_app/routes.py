from flask import render_template, request, redirect, flash, url_for
from sp_app import app
import os
from sp_app.forms import LoginForm
from flask_login import current_user, login_user, logout_user
from sp_app.models import User, DataSet
from werkzeug.urls import url_parse

@app.route('/', methods=['GET','POST'])
@app.route('/index', methods=['GET','POST'])
def index():
    if request.method == 'GET':
        published_datasets = DataSet.query.filter_by(is_published=True).all()
        return render_template('index.html', published_datasets=published_datasets)
    elif request.method == 'POST':
        # get the google maps api key to be used
        map_key_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'static', 'utils', 'google_maps_api_key.txt')
        with open(map_key_path) as f:
            map_key = f.read().rstrip()
        return render_template('data_explorer.html', study_to_load=request.form.get('study_to_load'), map_key=map_key)
    else:
        published_datasets = DataSet.query.filter_by(is_published=True).all()
        return render_template('index.html', published_datasets=published_datasets)

@app.route('/submit_data_learn_more')
def submit_data_learn_more():
    return render_template('submit_data_learn_more.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash("Invalid username or password")
            return redirect(url_for('login'))
        login_user(user, remember=form.remember_me.data)
        next_page = request.args.get('next')
        if not next_page or url_parse(next_page).netloc != '':
            next_page = url_for('index')
        return redirect(next_page)
    return render_template('login.html', form=form)

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))