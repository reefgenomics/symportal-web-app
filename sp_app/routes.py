from flask import render_template, request, redirect, flash, url_for
from sp_app import app, db
import os
from sp_app.forms import LoginForm, ChangePassword
from flask_login import current_user, login_user, logout_user
from sp_app.models import User, DataSet
from werkzeug.urls import url_parse
from sqlalchemy import or_

@app.route('/', methods=['GET','POST'])
@app.route('/index', methods=['GET','POST'])
def index():
    if request.method == 'GET':
        # get the datasets that will be loaded into the published data set table
        published_datasets = DataSet.query.filter_by(is_published=True).all()
        # get the datasets that belong to the user that are not yet published
        user_unpublished_datasets = [ds for ds in DataSet.query.filter_by(is_published=False) if current_user in ds.users_with_access]
        print(user_unpublished_datasets)
        return render_template('index.html', published_datasets=published_datasets, user_unpublished_datasets=user_unpublished_datasets)
    elif request.method == 'POST':
        # get the google maps api key to be used
        map_key_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'static', 'utils', 'google_maps_api_key.txt')
        with open(map_key_path) as f:
            map_key = f.read().rstrip()
        # Here we are going to load the data_explorer page
        # We will need to provide the database object that represents the study_to_load string
        # provided by the request.
        # We will also need to provide a list of studies to load in the dataexplorer drop
        # down that allows users to switch between the DataSet that they are viewing
        dataset_to_load = DataSet.query.filter_by(study_to_load_str=request.form.get('study_to_load')).first()
        # The other datasets should be those that are:
        # a - published
        # b - have dataexplorer data
        # c - are unpublished but have the current user in their users_with_access list
        # We also want to exclude the dataset_to_load dataset.
        if current_user.is_anonymous:
            published_and_authorised_datasets = db.session.query(DataSet)\
                .filter(DataSet.data_explorer==True, DataSet.is_published==True).all()
        else:
            published_and_authorised_datasets = db.session.query(DataSet).filter(DataSet.data_explorer==True)\
                .filter(or_(DataSet.is_published==True, DataSet.users_with_access.contains(current_user)))\
                .filter(DataSet.study_to_load_str != dataset_to_load.study_to_load_str).all()
        return render_template('data_explorer.html', dataset_to_load=dataset_to_load,
                               published_and_authorised_datasets=published_and_authorised_datasets ,map_key=map_key)
    

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

@app.route('/change_password', methods=['GET', 'POST'])
def change_password():
    if current_user.is_anonymous:
        return redirect(url_for('index'))
    form=ChangePassword()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.current_password.data):
            print("Invalid username or password")
            flash("Invalid username or password")
            return redirect(url_for('change_password'))
        else:
            # Then the password username was good and we should change the password for the user
            user.set_password(form.new_password.data)
            db.session.commit()
            flash("Password successfully changed")
            print("Password successfully changed")
            return redirect(url_for('index'))
    # We reach here if this is the first navigation to this page
    return render_template('change_password.html', form=form)

@app.route('/profile', methods=['GET'])
def profile():
    if current_user.is_anonymous:
        return redirect(url_for('index'))
    # We will populate a table that shows the datasets that the user is authorised for
    authorised_datasets = list(db.session.query(DataSet).filter(DataSet.users_with_access.contains(current_user)).all())
    print(authorised_datasets)
    for study in authorised_datasets:
        print(study)
    return render_template('profile.html', authorised_datasets=authorised_datasets)