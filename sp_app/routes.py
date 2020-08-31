from flask import render_template, request, redirect, flash, url_for, jsonify
from sp_app import app, db
import os
from sp_app.forms import LoginForm, ChangePassword
from flask_login import current_user, login_user, logout_user, login_required
from sp_app.models import User, ReferenceSequence, SPDataSet, DataSetSample, DataAnalysis, CladeCollection, AnalysisType, Study, SPUser
from werkzeug.urls import url_parse
from werkzeug.utils import secure_filename
from sqlalchemy import or_
from sqlalchemy.orm.exc import NoResultFound
import json
from sp_app.datasheet_check import DatasheetChecker, DatasheetFormattingError

#TODO remove "Title" and make this a hyper link to the paper
#TODO hide 'Your unpublished analyses if this is empty
#TODO add the table of citations.

@app.route('/', methods=['GET','POST'])
@app.route('/index', methods=['GET','POST'])
def index():
    if request.method == 'GET':
        # get the studies that will be loaded into the published data set table
        published_studies = Study.query.filter(Study.is_published==True, Study.display_online==True).all()
        
        # get the studies that belong to the user that are not yet published
        try:
            sp_user = SPUser.query.filter(SPUser.name==current_user.username).one()
            user_unpublished_studies = [study for study in Study.query.filter(Study.is_published==False, Study.display_online==True) if sp_user in study.users]
        except AttributeError as e:
            user_unpublished_studies = []
        except NoResultFound:
            # We should never get here as we have checked for this at the login route.
            logout_user()
            return redirect(url_for('index'))


        # Finally get the resource_info_dict that is jsoned out and pass this in
        json_resource_info_dict_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'static', 'resources', 'resource_info.json')
        with open(json_resource_info_dict_path, 'r') as f:
            resource_info_dict = dict(json.load(f))
        return render_template('index.html', published_studies=published_studies, user_unpublished_studies=user_unpublished_studies, resource_info_dict=resource_info_dict)
    
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
                .filter(Study.data_explorer==True, Study.is_published==True, Study.display_online==True).all()
        elif current_user.is_admin:
            # If user is admin then we just want to display all of the studies that have dataexplorer available
            # regardless of whether the user is in the users_with_access list
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True, Study.display_online==True).all()
        else:
            # If not admin but signed in, then we want to return the published articles
            # and those that the user is authorised to have.
            sp_user = SPUser.query.filter(SPUser.name==current_user.username).one()
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True, Study.display_online==True)\
                .filter(or_(Study.is_published==True, Study.users.contains(sp_user)))\
                .filter(Study.name != study_to_load.name).all()
        return render_template('data_explorer.html', study_to_load=study_to_load,
                               published_and_authorised_studies=published_and_authorised_studies, map_key=map_key)
    

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
        try:
            # We do this as the user may be logged in the local sqlite db but the corresponding object
            # may not have been created in the symportal_database. If this is the case, the
            # administrator will need to fix this and the user will need to be told to get in contact
            # with the administrator.
            sp_user = SPUser.query.filter(SPUser.name==user.username).one()
        except NoResultFound:
            flash("User has not been synced to the symportal_database.\nPlease contact the administrator to fix this.")
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
        sp_user = SPUser.query.filter(SPUser.name==current_user.username).one()
        user_authorised_studies = list(Study.query.filter(Study.users.contains(sp_user), Study.display_online==True).all())
        # We will also populate a table that will only be visible is the user is an admin
        # This table will be populated with all unpublished studies that the user is not authorised on (these will be shown above)
        if current_user.is_admin:
            admin_authorised_studies = list(Study.query.filter(~Study.is_published).filter(~Study.users.contains(sp_user)).filter(Study.display_online==True).all())
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
        # The other studies should be those that are:
        # a - published
        # b - have dataexplorer data
        # c - are unpublished but have the current user in their users_with_access list
        # We also want to exclude the study_to_load study.
        if current_user.is_anonymous:
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True, Study.is_published==True, Study.display_online==True).all()
        elif current_user.is_admin:
            # If user is admin then we just want to display all of the studies that have dataexplorer available
            # regardless of whether the user is in the users_with_access list
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True, Study.display_online==True).all()
        else:
            sp_user = SPUser.query.filter(SPUser.name==current_user.username).one()
            # If not admin but signed in, then we want to return the published articles
            # and those that the user is authorised to have.
            published_and_authorised_studies = Study.query.filter(Study.data_explorer==True, Study.display_online==True)\
                .filter(or_(Study.is_published==True, Study.users.contains(sp_user)))\
                .filter(Study.name != study_to_load.name).all()
        return render_template('data_explorer.html', study_to_load=study_to_load,
                               published_and_authorised_studies=published_and_authorised_studies ,map_key=map_key)

# Max upload size
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 * 1024

# file Upload
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'uploads')
# Make directory if "uploads" folder not exists
if not os.path.isdir(UPLOAD_FOLDER):
    os.mkdir(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/submission', methods=['GET', 'POST'])
@login_required
def upload_file():
    if request.method == 'GET':
        return render_template('submission.html')
    elif request.method == 'POST':
        username = current_user.username
        user_upload_directory = os.path.join(app.config['UPLOAD_FOLDER'], username)
        # The datasheet name that we should be working with is passed in using the form parameter
        # of the request.
        files = request.files
        datasheet_filename = request.form["datasheet_filename"]
        if datasheet_filename == "":
            dc = DatasheetChecker(request=request, user_upload_directory=user_upload_directory)

            try:
                dc.do_qc()
            # Handle general error non-unique
            except DatasheetFormattingError as e:
                column, values = e.data.items()[0]
                response = {
                    'error': True, 'message': f"{column} contained non_unique values",
                    "data" : values, "error_type": "non_unique"
                }
                return jsonify(response)


        else:
            dc = DatasheetChecker(
                request=request,
                user_upload_directory=user_upload_directory,
                datasheet_path=os.path.join(user_upload_directory, datasheet_filename))
        #TODO deal with the rest of the files.
        # for f in files:
        #     file = request.files.get(f)
        #     filename = secure_filename(file.filename)
        #     file.save(user_upload_directory)
        # TODO we will also populate the preview etc.
        # but for the time being lets just give some feed back in green
        response = {'message': f"{len(files)} file(s) loaded successfully", 'message_class': "text-success", 'container_class':"border-success"}
        return jsonify(response)