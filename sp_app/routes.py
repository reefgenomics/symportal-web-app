from flask import render_template, request, redirect, flash, url_for, jsonify, send_from_directory
from sp_app import app, db
import os
from sp_app.forms import LoginForm, ChangePassword
from flask_login import current_user, login_user, logout_user, login_required
from sp_app.models import User, ReferenceSequence, SPDataSet, DataSetSample, DataAnalysis, CladeCollection, AnalysisType, Study, SPUser
from werkzeug.urls import url_parse
from sqlalchemy import or_
from sqlalchemy.orm.exc import NoResultFound
import json
from sp_app.datasheet_check import DatasheetChecker, DatasheetGeneralFormattingError, AddedFilesError
import shutil
import traceback
import ntpath


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

@app.route('/data_explorer/', methods=['POST'])
def data_explorer():
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

EXPLORER_DATA_DIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'explorer_data')
@app.route('/get_study_data/<string:study_name>/<path:file_path>/')
def get_study_data(study_name, file_path):
    # This route will be picked up whenever we want to load the data explorer page
    # If the study is published or belongs to the currently logged in user, it will
    # return the study_data.js file of the corresponding study
    # Else it will return to index

    # If the study requested is published, send the study_data.js
    file_dir = os.path.join(EXPLORER_DATA_DIR, study_name, os.path.dirname(file_path))
    filename = ntpath.basename(file_path)
    study_obj = Study.query.filter(Study.name == study_name).one()

    # NB if the current user is anonymous and we try to call .is_admin, we get an attribute error
    if not study_obj.is_published:
        if current_user.is_anonymous:
            # Then divert to index
            # This code shouldn't be reachable as study links won't be displayed to a non-logged in user
            # unless they are public
            return redirect(url_for('index'))
        else:
            sp_user = SPUser.query.filter(SPUser.name == current_user.username).one()
            if (sp_user in study_obj.users) or current_user.is_admin:
                # Then this study belongs to the logged in user and we should release the data
                # Or the user is an admin and we should release the data
                if filename == 'study_data.js':
                    print(f'returning {os.path.join(file_dir, filename)}')
                    return send_from_directory(directory=file_dir, filename=filename)
                else:
                    print(f'returning {os.path.join(file_dir, filename)}')
                    return send_from_directory(directory=file_dir, filename=filename, as_attachment=True)
            else:
                return redirect(url_for('index'))
    else:
        # Study is published
        if filename == 'study_data.js':
            print(f'returning {os.path.join(file_dir, filename)}')
            return send_from_directory(directory=file_dir, filename=filename)
        else:
            print(f'returning {os.path.join(file_dir, filename)}')
            return send_from_directory(directory=file_dir, filename=filename, as_attachment=True)

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

@app.route('/_check_submission', methods=['POST'])
@login_required
def _check_submission():
    """This is where the AJAX requests are sent when a user clicks the
    Add datasheet or Add seq files.
    We have sent up a jsonified object that contains keys of datasheet_data, files or add_or_upload
    We can tell what sort of checks we should be doing based on the value of
    datasheet_data and add_or_upload. If the value is '' and add_or_upload is 'add'
    then we know we should only be looking for the user to have submitted a single *.xlsx or .csv. This is all we will
    be checking at this point."""
    if request.form:
    # Then this is checking files in the staged area
        data_dict = json.loads(list(request.form.keys())[0])
        if data_dict["add_or_upload"] == "add" and data_dict["datasheet_data"] == "":
            if len(data_dict["files"]) != 1:
                response = {
                    "check_type": "datasheet",
                    "add_or_upload": "add",
                    "error":True,
                    "border_class": "border-danger",
                    "message":'<strong class="text-danger">Please select a single datasheet (.xlsx, .csv)</strong>'
                }
                return jsonify(response)
            file_name = [k for k, v in data_dict["files"][0].items()][0]
            if file_name.endswith(".xlsx") or file_name.endswith(".csv"):
                response = {
                    "check_type": "datasheet",
                    "add_or_upload": "add",
                    "error":False,
                    "border_class": "border-success",
                    "message":'<strong class="text-success">Datasheet selected, please upload<strong>'
                }
                return jsonify(response)
            else:
                response = {
                    "check_type": "datasheet",
                    "add_or_upload": "add",
                    "error": True,
                    "border_class": "border-danger",
                    "message": '<strong class="text-danger">Please select a single datasheet (.xlsx, .csv)</strong>'
                }
                return jsonify(response)
        else:
            # Checking sequencing files that are in the staged area
            try:
                datasheet_path = os.path.join(app.config['UPLOAD_FOLDER'], current_user.username, data_dict["datasheet_data"])
                dc = DatasheetChecker(
                    request=request,
                    user_upload_directory=os.path.join(app.config['UPLOAD_FOLDER'], current_user.username),
                    datasheet_path=datasheet_path)
                try:
                    dc.check_valid_seq_files_added()
                    # If we make it to here then an AddedFilesError was not raised
                    # Check to see if any of the warning containers have contents
                    # If so return these
                    if (
                            dc.binomial_dict or dc.lat_long_dict or
                            dc.lat_lon_missing or dc.date_missing_list or
                            dc.depth_missing_list or dc.sample_type_missing_list or
                            dc.taxonomy_missing_set
                    ):
                        response = {
                            "check_type": "seq_files", "add_or_upload": "add",
                            'error': False, 'warning':True,
                            "data": {
                                'binomial_dict': dc.binomial_dict,
                                'lat_long_dict': dc.lat_long_dict,
                                'lat_long_missing': dc.lat_lon_missing,
                                'date_missing':dc.date_missing_list,
                                'depth_missing': dc.depth_missing_list,
                                'sample_type_missing':dc.sample_type_missing_list,
                                'taxonomy_missing': list(dc.taxonomy_missing_set)
                            },
                            "border_class": "border-warning"
                        }
                        return jsonify(response)

                    else:
                        # No warnings
                        response = {
                            "check_type": "seq_files", "add_or_upload": "add",
                            'error': False, 'warning': False,
                            "border_class": "border-success"
                        }
                        return jsonify(response)
                except AddedFilesError as e:
                    # Then files were missing, too small, or extra files were added
                    response = {
                        "check_type": "seq_files", "add_or_upload": "add",
                        'error': True, 'message': str(e),
                        "data": e.data,
                        "border_class": "border-danger"
                    }
                    return jsonify(response)
            except Exception:
                # Catch any unhandled errors and present on to the user with a 'please contact us' message
                tb = traceback.format_exc().replace("\n", "<br>")
                response = {
                    'error': True,
                    'message': '<strong class="text-danger">ERROR: an unexpected error has occured when trying to run QC on your submission.</strong><br>'
                               'Please ensure that you are uploading a properly formatted datasheet.<br>'
                               'If the error persists, please get in contact at:<br>'
                               '&#098;&#101;&#110;&#106;&#097;&#109;&#105;&#110;&#099;&#099;&#104;&#117;&#109;&#101;&#064;&#103;&#109;&#097;&#105;&#108;&#046;&#099;&#111;&#109;<br>'
                               f'The full backend traceback is:<br><br>{tb}',
                    "error_type": "unhandled_error",
                    "response_type": "datasheet",
                    "border_class": "border-danger"
                }
                # Delete the datasheet from the server if it has been saved
                if 'dc' in locals():
                    if dc.datasheet_path:
                        if os.path.exists(dc.datasheet_path):
                            os.remove(dc.datasheet_path)
                return jsonify(response)
    else:
        # Then this is an upload of either a datasheet or sequencing files that have been checked
        # while in the staging area
        if len(request.files) == 1:
            # Then this is an upload of a datasheet
            # We should perform the general formatting tests on it and then send an appropriate response.
            # If the general formatting tests pass, we enable user to proceed to sequence upload
            # If the general checking fails then we will output the errors to show where it failed.
            # TODO display a spinner when we send it up and switch it off once checking is complete
            # can set a delay of 1 sec or something.
            # TODO catch unhandled errors during the init of the DatasheetChecker
            try:
                dc = DatasheetChecker(
                    request=request,
                    user_upload_directory=os.path.join(app.config['UPLOAD_FOLDER'], current_user.username))
                try:
                    # TODO If we have an error here then we should first try to catch it as the
                    # DatasheetGeneralFormattingError that the we have created and then handle
                    # unhandled errors" and pass back this error to the
                    # browser to inform the user.
                    dc.do_general_format_check()
                    response = {
                        'error': False,
                        'message': f'<strong class="text-success">Datasheet {dc.datasheet_filename} '
                                   f'containing {len(dc.sample_meta_info_df.index)} '
                                   f"samples successfully uploaded.</strong><br>Please select your seq files",
                        "num_samples": len(dc.sample_meta_info_df.index),
                        "response_type": "datasheet",
                        "datasheet_filename": dc.datasheet_filename,
                        "border_class": "border-success"
                    }
                    return jsonify(response)
                except DatasheetGeneralFormattingError as e:
                    if e.data["error_type"] == "non_unique":
                        response = {
                            'error': True, 'message': str(e),
                            "data": e.data["non_unique_data"],
                            "error_type": "non_unique",
                            "response_type": "datasheet",
                            "border_class": "border-danger"
                        }
                    elif e.data["error_type"] == "full_path":
                        response = {
                            'error': True, 'message': str(e),
                            "data": e.data["example_filename"],
                            "error_type": "full_path",
                            "response_type": "datasheet",
                            "border_class": "border-danger"
                        }
                    elif e.data["error_type"] == "df_empty":
                        response = {
                            'error': True, 'message': str(e),
                            "error_type": "df_empty",
                            "response_type": "datasheet",
                            "border_class": "border-danger"
                        }
                    elif e.data["error_type"] == "invalid_file_format":
                        response = {
                            'error': True, 'message': str(e),
                            "error_type": "invalid_file_format",
                            "response_type": "datasheet",
                            "border_class": "border-danger"
                        }
                    os.remove(dc.datasheet_path)
                    return jsonify(response)
            except Exception as e:
                # Catch any unhandled errors and present on to the user with a 'please contact us' message
                tb = traceback.format_exc().replace("\n", "<br>")
                response = {
                    'error': True,
                    'message': '<strong class="text-danger">ERROR: an unexpected error has occured when trying to run QC on your submission.</strong><br>'
                               'Please ensure that you are uploading a properly formatted datasheet.<br>'
                               'If the error persists, please get in contact at:<br>'
                               '&#098;&#101;&#110;&#106;&#097;&#109;&#105;&#110;&#099;&#099;&#104;&#117;&#109;&#101;&#064;&#103;&#109;&#097;&#105;&#108;&#046;&#099;&#111;&#109;<br>'
                               f'The full backend traceback is:<br><br>{tb}',
                    "error_type": "unhandled_error",
                    "response_type": "datasheet",
                    "border_class": "border-danger"
                }
                # Delete the datasheet from the server if it has been saved
                if 'dc' in locals():
                    if dc.datasheet_path:
                        if os.path.exists(dc.datasheet_path):
                            os.remove(dc.datasheet_path)
                return jsonify(response)
        else:
            # Then we are handling the upload of sequence data that has already been through the checking.
            # At this point we will be saving files doing final checks and then sending back good news to the user
            raise NotImplementedError

@app.route('/_reset_submission', methods=['POST'])
@login_required
def _reset_submission():
    """
    This will be called when a user hits the reset button.
    Delete user upload dir. Recreate dir.
    """
    user_dir = os.path.join(app.config['UPLOAD_FOLDER'], current_user.username)
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir)
    os.makedirs(user_dir)
    response = "user files deleted"
    return response