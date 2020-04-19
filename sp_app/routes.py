from flask import render_template, request, redirect, flash, url_for
from sp_app import app, db
import os
from sp_app.forms import LoginForm, ChangePassword
from flask_login import current_user, login_user, logout_user
from sp_app.models import User, DataSet, ReferenceSequence, SPDataSet, DataSetSample, DataAnalysis, CladeCollection, AnalysisType, Study, SPUser
from werkzeug.urls import url_parse
from sqlalchemy import or_

@app.route('/', methods=['GET','POST'])
@app.route('/index', methods=['GET','POST'])
def index():
    if request.method == 'GET':
        # get the studies that will be loaded into the published data set table
        published_studies = Study.query.filter(Study.is_published==True).all()
        
        # get the studies that belong to the user that are not yet published
        try:
            sp_user = SPUser.query.filter(SPUser.app_db_key_id==current_user.id).one()
            user_unpublished_studies = [study for study in Study.query.filter(Study.is_published==False) if sp_user in study.users]
        except AttributeError as e:
            user_unpublished_studies = []
        return render_template('index.html', published_studies=published_studies, user_unpublished_studies=user_unpublished_studies)
    
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
        study_to_load = Study.query.filter(Study.name==request.form.get('study_to_load')).first()
        # The other studies should be those that are:
        # a - published
        # b - have dataexplorer data
        # c - are unpublished but have the current user in their users_with_access list
        # We also want to exclude the study_to_load study.
        if current_user.is_anonymous:
            published_and_authorised_studies = Study.query\
                .filter(Study.data_explorer==True, Study.is_published==True).all()
        elif current_user.is_admin:
            # If user is admin then we just want to display all of the studies that have dataexplorer available
            # regardless of whether the user is in the users_with_access list
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True).all()
        else:
            # If not admin but signed in, then we want to return the published articles
            # and those that the user is authorised to have.
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True)\
                .filter(or_(Study.is_published==True, Study.users.contains(current_user)))\
                .filter(Study.name != study_to_load.name).all()
        return render_template('data_explorer.html', study_to_load=study_to_load,
                               published_and_authorised_studies=published_and_authorised_studies ,map_key=map_key)
    

@app.route('/submit_data_learn_more')
def submit_data_learn_more():
    return render_template('submit_data_learn_more.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter(User.username==form.username.data).first()
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

# TODO still need to work out what to do with the timestamp as an upload time stamp will be overwritten everytime
# The database is synced.
@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if request.method == 'GET':
        if current_user.is_anonymous:
            return redirect(url_for('index'))
        # We will populate a table that shows the studies that the user is authorised for
        sp_user = SPUser.query.filter(SPUser.app_db_key_id==current_user.id).one()
        user_authorised_studies = list(Study.query.filter(Study.users.contains(sp_user)).all())
        print(f'The user auth studies are {user_authorised_studies}')
        # We will also populate a table that will only be visible is the user is an admin
        # This table will be populated with all unpublished studies that the user is not authorised on (these will be shown above)
        if current_user.is_admin:
            admin_authorised_studies = list(Study.query.filter(~Study.is_published).filter(~Study.users.contains(sp_user)).all())
        else:
            admin_authorised_studies= list()
        return render_template('profile.html', user_authorised_studies=user_authorised_studies, admin_authorised_studies=admin_authorised_studies)
    if request.method == 'POST':
        # Then someone has clicked on one of the study titles
        # and we should send them to the DataExplorer view of respective study
        # get the google maps api key to be used
        map_key_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'static', 'utils', 'google_maps_api_key.txt')
        with open(map_key_path) as f:
            map_key = f.read().rstrip()
        # Here we are going to load the data_explorer page
        # We will need to provide the database object that represents the study_to_load string
        # provided by the request.
        # We will also need to provide a list of studies to load in the dataexplorer drop
        # down that allows users to switch between the DataSet that they are viewing
        study_to_load = Study.query.filter(Study.name==request.form.get('study_to_load')).first()
        print(f'This is the data_set_to_load we end up with {study_to_load}')
        # The other studies should be those that are:
        # a - published
        # b - have dataexplorer data
        # c - are unpublished but have the current user in their users_with_access list
        # We also want to exclude the study_to_load study.
        if current_user.is_anonymous:
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True, Study.is_published==True).all()
        elif current_user.is_admin:
            # If user is admin then we just want to display all of the studies that have dataexplorer available
            # regardless of whether the user is in the users_with_access list
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True).all()
        else:
            sp_user = SPUser.query.filter(SPUser.app_db_key_id==current_user.id).one()
            # If not admin but signed in, then we want to return the published articles
            # and those that the user is authorised to have.
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True)\
                .filter(or_(Study.is_published==True, Study.users.contains(sp_user)))\
                .filter(Study.name != study_to_load.name).all()
        return render_template('data_explorer.html', study_to_load=study_to_load,
                               published_and_authorised_studies=published_and_authorised_studies ,map_key=map_key)