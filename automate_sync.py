#!/usr/bin/env python3
"""
We want to automate the process of getting an SP output up and displayed on the symportal.org website

We will coordinate this from our local machine as this doesn't have a fixed IP whilst the servers do.
Let's have a flag that we have to implement when doing a --print_output_types that will automatically ask for
the input of the the information we need including username and studyname. a .bak will be output as well as
an accompanying json file that will include username and study name (this should be the same as dataset name) 
info as well as the path to the .bak It should also contain the uid of the dataset. This can be output to the output dir.

From Local: Provide the host and directory where the output data is.
Provide the directory where this should be going on the remote linode server.
Pull down the data to local and process in a new empty direcotry that matches the name
(check that this is empty first)
After successful processing, check that the linode directory doesn't already exist
If not, then send over the processed data directory.
Modify the json sp .json
Also send over the .bak to a postgres database directory.
Also send over the json sp.json
Fire the script to create a new user in the sqlite db.
Then Fire the script to dropdb, createdb and loaddb.
Then fire script to sync the .bak to the sqlite.
# At this point the symportal.org should be ready to go.
Now pull back down to local.
pull down the app.db
pg_dump out to a .bak, drop, create, restore on local.
# Now local should be good to go.

# we can in theory test this all using th AWS instance
# For the time being we can also manually put the .bak and the json file
# in the output directory of the bongaerts study.


On Zygote:
This will be fired either from within SymPortal itself or manually.
Arguments will be the id of the dataset, the id of the data analysis, the username to be created
the Study name to be populated.
Out put a .bak to to the dbBackup directory with todays date, and the time appened.
Produce a read me that informs that this was create progromatically and detail the
output that it was produced for, i.e. the data analysis and the data set sample output.
Then try to fire the script on local.

20200526 it would be good to be able to do an update to. I.e. where the study already exists
Maybe we can build this in as the default. If the user exsits then we check for the study
If the study exists then we should check to see what the current dataset id matches the new

We can pass in an update key word that will mean that if the directory already exists
We can rename it as *_archive_date and then continue with the pull down. We could do the same
for the put to the remote server. It is probably easiest if we work with comma delimited, paths to outputs folders
and then we can get lists of users and datasets to add etc. But this will be quite a bit of work.
"""
import sys
import argparse
from getpass import getpass
import paramiko
import os
import json
import ntpath
import subprocess
import shutil
from zipfile import ZipFile
from colorama import Fore, Style
import datetime

class AutomateSync:
    def __init__(self):
        # General parameters
        self.parser = argparse.ArgumentParser()
        self._define_args()
        self.args = self.parser.parse_args()
        
        # Local machine
        self.local_symportal_data_directory = self.args.local_symportal_data_directory
        self.local_json_dir = self.args.local_json_dir
        self.local_bak_dir = self.args.local_bak_dir
        
        # Parameters for remote symportal framework server
        self.remote_sp_host_id = self.args.remote_sp_host_id
        self.remote_sp_host_user = self.args.remote_sp_host_user
        # TODO this is now a list.
        self.remote_sp_output_paths = self.args.remote_sp_output_paths.split(',')
        # TODO this is now a list
        self.remote_sp_json_info_paths = [os.path.join(_, 'automate_sp_output.json') for _ in self.remote_sp_output_paths]
        # A list of the json info objects
        self.json_info_object_list = []
        # If we are working with multiple datasets worth of syncing here, then we should be working from
        # a single .bak file rather than one .bak file per dataset.
        if len(self.remote_sp_output_paths) > 1:
            if self.args.remote_bak_path is None:
                raise RuntimeError('The --remote_bak_path parameter should be passed as multiple datasets are being synced.')
            self.remote_bak_path = self.args.remote_bak_path
            self.time_stamp_str = str(datetime.datetime.now()).split('.')[0].replace('-','').replace(' ','T').replace(':','')
        # This is a convenience list that is created from joining the local data dir
        # with the study name in question.
        self.local_data_dirs = []
        self.remote_sp_host_pass = getpass('Password for remote SymPortal_framework server: ')


        # Symportal.org web server
        self.remote_web_sync_script_path = self.args.remote_web_sync_script_path
        
        # Parameters for the web server
        self.remote_web_connection_type = self.args.remote_web_connection_type
        self.remote_web_symportal_data_directory = self.args.remote_web_symportal_data_directory
        self.remote_web_host = self.args.remote_web_host
        self.remote_web_user = self.args.remote_web_user
        self.remote_web_json_dir = self.args.remote_web_json_dir
        self.remote_web_bak_dir = self.args.remote_web_bak_dir
        if self.remote_web_connection_type == 'IP':
            self.remote_web_password = getpass('Password for remote web server: ')
        else:
            self.pem_file_path = self.args.pem_file_path
        
        # Initial SSH and sftp clients
        self.ssh_client = paramiko.SSHClient()
        self.ssh_client.load_system_host_keys()
        self.ssh_client.connect(hostname=self.remote_sp_host_id, username=self.remote_sp_host_user, password=self.remote_sp_host_pass)
        # Open sftp client
        self.sftp_client = self.ssh_client.open_sftp()
    
    def _fire_sync_script_on_remote_web_server(self):
        # Finally we we need to run a script on the remote web that does the syncing etc.   
        print(f'Running {self.remote_web_sync_script_path} on remote web server. This may take some time.')
        stdin, stdout, stderr = self.ssh_client.exec_command(f'/home/humebc/miniconda3/envs/symportal_org/bin/python3 {self.remote_web_sync_script_path} -y --path_to_new_sp_json {os.path.join(self.remote_web_json_dir, "_".join(self.new_pub_art_file_name.split("_")[1:]))} --path_to_new_bak {os.path.join(self.remote_web_bak_dir, ntpath.basename(self.remote_bak_path))}')
        print('stdout:')
        while True:
            line = stdout.readline()
            if not line:
                break
            print(line)
        print('sync_db.py complete')

    def start_sync(self):
        self._read_json_info_from_sp_server()
        if len(self.json_info_object_list) == 1:
            # set the self.remote_bak_path
            self.remote_bak_path = self.json_info_object_list[0]["bak_path"]
        
        self._download_and_prep_data_if_necessary()
        
        self._create_or_update_pub_articles_json_if_necessary()

        self._connect_to_remote_web_server()
        
        self._upload_to_web_server()

        self._fire_sync_script_on_remote_web_server()

        # Finally we want to pull down copies of the symportal_org db and the symportal_database db.
        # We can simply copy over the app.db file
        # For the symportal_database database we will need to put down a new .bak, pull down, drop, create and restore
        print('Getting app.db from remote web server')
        self.sftp_client.get("/home/humebc/symportal.org/app.db", "/Users/humebc/Documents/symportal.org/app.db")
        print('Complete')
        # The .bak is saved in the bak archive dir, with the same name as the bak we put up but with *_synced.bak
        print('Getting .bak of synced symportal_database from web server')
        # Check to see if it needs pulling down
        if os.path.isfile(os.path.join(self.local_bak_dir, ntpath.basename(self.remote_bak_path).replace('.bak', '_synced.bak'))):
            print('.bak has already been pulled down and will not be pulled down again.')
        else:
            self.sftp_client.get(os.path.join(self.remote_web_bak_dir, ntpath.basename(self.remote_bak_path).replace('.bak', '_synced.bak')), os.path.join(self.local_bak_dir, ntpath.basename(self.remote_bak_path).replace('.bak', '_synced.bak')))
        print('Complete')
        # At this point we need to restore the .bak.
        
        # Drop the db
        print('Installing synced database')
        print('Dropping db')
        result = subprocess.run(['dropdb', '-U', 'humebc', '-w', 'symportal_database'], check=True)
        # Remake the db
        print('Creating db')
        result = subprocess.run(['createdb', '-U', 'humebc', '-O', 'humebc', '-w', 'symportal_database'], check=True)
        # Restore the db from the .bak
        print('Restoring db. This make take some time...')
        result = subprocess.run(['pg_restore', '-U', 'humebc', '-w', '-d', 'symportal_database', '-Fc', os.path.join(self.local_bak_dir, ntpath.basename(self.remote_bak_path).replace('.bak', '_synced.bak'))])
        print('Db successfuly restored')
        # At this point, both dbs have been  pulled down, and synced, the data is all in place and we should be all setup to
        # test the local server.
        self._clean_up_on_remote_web()
        
    def _clean_up_on_remote_web(self):
        """
        Finally, let's do some cleanup on the remote web server. We want to make sure that the original non-archived bak
        does not exist and that the synced bak has been removed.
        """
        print('Cleaning up on remote server')
        try:
            self.sftp_client.remove(os.path.join(self.remote_web_bak_dir, ntpath.basename(self.remote_bak_path).replace('.bak', '_synced.bak')))
        except FileNotFoundError:
            pass
        try:
            self.sftp_client.remove(os.path.join(self.remote_web_bak_dir, ntpath.basename(self.remote_bak_path)))
        except FileNotFoundError:
            pass
        try:
            self.sftp_client.remove(os.path.join(self.remote_web_json_dir, '_'.join(self.new_pub_art_file_name.split('_')[1:])))
        except FileNotFoundError:
            pass
        print('Done')        

    def _ask_continue_sync(self):
        while True:
            continue_text = input('Continue with synchronisation? [y/n]: ')
            if continue_text == 'y':
                return True
            elif continue_text == 'n':
                return False
            else:
                print('Unrecognised response. Please answer y or n.')

    def _user_and_study_populated(self, latest_json_file, json_info):
        """
        Check to see that the user is already present
        in the published_articles_sp.json and that the study
        is already related
        """
        with open(os.path.join(self.local_json_dir, latest_json_file), 'r') as f:
            self.j_obj = json.load(f)
        # first check to see whether the user already exists
        for i in range(len(self.j_obj["users"])):
            if self.j_obj["users"][i]["name"] == json_info["user"]:
                if json_info["study"] in self.j_obj["users"][i]["studies"]:
                    for i in range(len(self.j_obj["studies"])):
                        if self.j_obj["studies"][i]["name"] == json_info["study"]:
                            return True
        return False

    def _read_json_info_from_sp_server(self):
        # first open up the info json file
        for remote_sp_json_info_path in self.remote_sp_json_info_paths:
            print('Reading the ouput json info file:')
            with self.sftp_client.open(remote_sp_json_info_path, 'r') as f:
                json_info = json.load(f)
            print('JSON info file successfully read:')
            for k, v in json_info.items():
                print(f'{k}: {v}')
            self.json_info_object_list.append(json_info)

    def _download_and_prep_data_if_necessary(self):
        for json_info, remote_sp_output_path in zip(self.json_info_object_list, self.remote_sp_output_paths):
            # check to see if a directory already exists for the study in question
            local_data_dir = os.path.join(self.local_symportal_data_directory, json_info["study"])
            self.local_data_dirs.append(local_data_dir)
            if os.path.exists(local_data_dir):
                print(f"{Fore.RED}WARNING: Local directory {local_data_dir} already exists.{Style.RESET_ALL}")
                print("This directory will not be overwritten.")
                print("If synchronisation continues, this directory will be used as it is.")
                print("No further processing will be conducted on it.")
                if self._ask_continue_sync():
                    # Then we can skip the pull down and processing
                    pass
                else:
                    sys.exit(1)
            else:
                # We need to pull down the data and then process it
                os.makedirs(local_data_dir)
                print(f'Pulling down data from {remote_sp_output_path}')
                self._pull_down_data(remote_sp_output_path=remote_sp_output_path, local_data_dir=local_data_dir)
                print('Processing data for upload')
                self._process_sp_output_data(local_data_dir=local_data_dir, json_info=json_info)
            
            
            if os.path.exists(os.path.join(self.local_bak_dir, ntpath.basename(self.remote_bak_path))):
                print(f'{os.path.join(self.local_bak_dir, ntpath.basename(self.remote_bak_path))} already exists locally and will not be pulled down')
            else:
                print(f'pulling down {self.remote_bak_path}. This may take some time...')
                #Finally pull down the .bak
                self.sftp_client.get(remotepath=self.remote_bak_path, localpath=os.path.join(self.local_bak_dir, ntpath.basename(self.remote_bak_path)))
            

    def _create_or_update_pub_articles_json_if_necessary(self):
        # Find the latest json version file.
        # For each of the sync objects check to see if the user and dataset are found
        # If the are, then we work with this json file
        # else we need to create a new one.
        largest_version_num = 0
        latest_json_file = None
        for article in os.listdir(self.local_json_dir):
            if int(article.split('_')[0]) > largest_version_num:
                    largest_version_num = int(article.split('_')[0])
                    latest_json_file = article
        
        need_new_json = False
        for json_info in self.json_info_object_list:
            if not self._user_and_study_populated(latest_json_file, json_info):
                # If at any point this fails, then that means we need to make a new json
                need_new_json = True
                break
        if need_new_json:
            self.new_pub_art_file_name = f'{largest_version_num + 1}_published_articles_sp_{self.time_stamp_str}.json'
            print('Creating and populating a new published articles json file')
            self._update_sp_json_file(template_json_file_name=latest_json_file)
        else:
            print(f'Current json file {latest_json_file} already contains all users and dataset objects.')
            print('We will work with this file')
            self.new_pub_art_file_name = latest_json_file

    def _connect_to_remote_web_server(self):
        self.ssh_client.close()
        self.ssh_client = paramiko.SSHClient()
        self.ssh_client.load_system_host_keys()
        if self.remote_web_connection_type == 'IP':
            # Working with linode instance
            self.ssh_client.connect(hostname=self.remote_web_host, username=self.remote_web_user, password=self.remote_web_password)
        else:
            # Working with the amazon aws ec2 instance
            self.ssh_client.connect(hostname=self.remote_web_host, username=self.remote_web_user, key_filename=self.pem_file_path)
        
        # Open sftp client
        self.sftp_client = self.ssh_client.open_sftp()
    
    def _upload_to_web_server(self):
        # Send the data directories up to the remote web server
        # send the sp_json up to the server as well
        for json_info, local_data_dir in zip(self.json_info_object_list, self.local_data_dirs):
            # Check to see if the data directory exists
            if json_info["study"] in self.sftp_client.listdir(self.remote_web_symportal_data_directory):
                print(f'{Fore.RED}WARNING: Directory {json_info["study"]} already exists in the remote web server data directory.{Style.RESET_ALL}')
                print('We will not upload anything additional to this directory.')
                if self._ask_continue_sync():
                    # Then we can skip the data upload
                    pass
                else:
                    sys.exit(1)
            else:
                remote_web_data_dir = os.path.join(self.remote_web_symportal_data_directory, json_info["study"])
                self.sftp_client.mkdir(remote_web_data_dir)
                self._put_all(remote=remote_web_data_dir, local=local_data_dir)
            
            # Transfer the sp_json up only once
            if "_".join(self.new_pub_art_file_name.split("_")[1:]) not in self.sftp_client.listdir(self.remote_web_json_dir):
                print(f'Transfering {os.path.join(self.local_json_dir, self.new_pub_art_file_name)} to {os.path.join(self.remote_web_json_dir, "_".join(self.new_pub_art_file_name.split("_")[1:]))}\nThis may take some time...')
                self.sftp_client.put(os.path.join(self.local_json_dir, self.new_pub_art_file_name), os.path.join(self.remote_web_json_dir, '_'.join(self.new_pub_art_file_name.split('_')[1:])))
                print('Transfer complete')
            
            # Transfer up the bak only once.
            if ntpath.basename(self.remote_bak_path) not in self.sftp_client.listdir(self.remote_web_bak_dir):
                print(f'Transfering {os.path.join(self.local_bak_dir, ntpath.basename(self.remote_bak_path))} to {os.path.join(self.remote_web_bak_dir, ntpath.basename(self.remote_bak_path))}\nThis may take some time...')
                # Transfer up the .bak
                self.sftp_client.put(os.path.join(self.local_bak_dir, ntpath.basename(self.remote_bak_path)), os.path.join(self.remote_web_bak_dir, ntpath.basename(self.remote_bak_path)))
                print('Transfer complete')
            
    def _update_sp_json_file(self, template_json_file_name):
        # For each sync object add the Study and User if not already contained to the published
        # articles json.
        # We will work with the latest version of the published articles json as a template.
        with open(os.path.join(self.local_json_dir, template_json_file_name), 'r') as f:
            self.j_obj = json.load(f)
        for json_info in self.json_info_object_list:
            # first check to see whether the user already exists
            user_to_look_for = json_info["user"]
            u_exists = False
            for i in range(len(self.j_obj["users"])):
                if self.j_obj["users"][i]["name"] == user_to_look_for:
                    u_exists = True
                    # If the user exists, add the study to the list
                    # if it doesn't already exist
                    if json_info["study"] not in self.j_obj["users"][i]["studies"]:
                        self.j_obj["users"][i]["studies"].append(json_info["study"])
                    else:
                        # User already has the study there so no need to add
                        pass
            
            if not u_exists:
                # Create a new user dict and add it
                temp_dict = {
                "name":json_info["user"],
                "is_admin":False,
                "studies":[json_info["study"]]
                }
                self.j_obj["users"].append(temp_dict)
            
            # In theory the study should not already exist
            study_to_look_for = json_info["study"]
            study_found = False
            for i in range(len(self.j_obj["studies"])):
                if self.j_obj["studies"][i]["name"] == study_to_look_for:
                    print(f'{Fore.RED}The study {study_to_look_for} is already in the published articles json.{Style.RESET_ALL}')
                    print('It will not be added again.')
                    study_found = True
            
            if not study_found:
                temp_dict = {
                    "name":study_to_look_for,
                    "title":study_to_look_for,
                    "location":"--", "additional_markers":"--",
                    "run_type":"remote",
                    "article_url":"--",
                    "data_url":"--", "is_published":False, "data_explorer":True,
                    "author_list_string": "--",
                    "analysis": True,
                    "data_sets":[json_info["data_set_id"]],
                    "data_set_samples":[]
                }
                self.j_obj["studies"].append(temp_dict)
        
        # Now we can write out the json
        with open(os.path.join(self.local_json_dir, self.new_pub_art_file_name), 'w') as f:
            json.dump(self.j_obj, f)
    
    def _process_sp_output_data(self, local_data_dir, json_info):
        """
        Get the data in the format required for the symportal.org server
        """
        # At this point we have the datafiles pulled down.
        # Now its time to process them
        # 1 - mv the html/study.js file out from in the html directory.
        shutil.move(os.path.join(local_data_dir, 'html', 'study_data.js'), os.path.join(local_data_dir, 'study_data.js'))
        # 2 - zip into one file that we will temporarily hold in the base data directory
        # 3 - at the same time create an idividual zip of the file
        # https://thispointer.com/python-how-to-create-a-zip-archive-from-multiple-files-or-directory/
        master_zip_path = os.path.join(local_data_dir, f'{json_info["study"]}.zip')
        with ZipFile(master_zip_path, 'w') as zipObj:
            # Iterate over all the files in directory
            for folderName, subfolders, filenames in os.walk(local_data_dir):
                for filename in filenames:
                    #create complete filepath of file in directory
                    filePath = os.path.join(folderName, filename)
                    # check that it is not the .zip itself
                    if filePath == master_zip_path:
                        continue
                    # Add file to zip
                    # https://stackoverflow.com/questions/27991745/zip-file-and-avoid-directory-structure
                    zipObj.write(filePath, arcname=os.path.relpath(filePath, start=self.local_symportal_data_directory))
                    # Now zip the file individually unless it is the study_data.js file
                    if not 'study_data.js' in filePath:
                        with ZipFile(f'{filePath}.zip', 'w') as sub_zip_obj:
                            # https://stackoverflow.com/questions/27991745/zip-file-and-avoid-directory-structure
                            sub_zip_obj.write(filePath, arcname=os.path.relpath(filePath, start=folderName))
                        # and then remove that file
                        os.remove(filePath)

    def _pull_down_data(self, remote_sp_output_path, local_data_dir):
        """
        Grab the data from the SymPortal output directory.
        This is much more complicated than it seems, there seems to be no simple way to recursively transfer files.
        I have written the function _get_all, but it is very slow.
        Alternatively we can try scp but we will have to use sshpass to use a password on the commandline
        and so that we don't have this written out on our system we should write the password out to a temp file
        Turns out that this prevents us from getting an stdout output
        The alternative is to set up an ssh/rsa key pair and then use this with scp, but there
        is no way to pass in the passphrase for the key pairs and so the keys would have to be used unencrypted
        I don't want to do that. So we're back to square one, that is the slow get all.
        """
        self._get_all(remote=remote_sp_output_path, local=local_data_dir)
        
    def _put_all(self, remote, local):
        remote_contents = self.sftp_client.listdir(remote)
        for put_file in os.listdir(local):
            if '.' in put_file:
                if 'DS_Store' in put_file:
                    continue
                if put_file in remote_contents:
                    print(f'{os.path.join(local, put_file)} already exists')
                else:
                    print(f'putting: {os.path.join(local, put_file)}')
                    return_obj = self.sftp_client.put(os.path.join(local, put_file), os.path.join(remote, put_file))

            else:
                # Then this is a directory and we need to drop into it after creating it
                if put_file not in remote_contents:
                    self.sftp_client.mkdir(os.path.join(remote, put_file))
                self._put_all(remote=os.path.join(remote, put_file), local=os.path.join(local, put_file))
        return

    def _get_all(self, remote, local):
        for get_file in self.sftp_client.listdir(remote):
            if '.' in get_file:
                if os.path.exists(os.path.join(local, get_file)):
                    print(f'{os.path.join(local, get_file)} already exists')
                else:
                    print(f'getting: {os.path.join(remote, get_file)}')
                    self.sftp_client.get(os.path.join(remote, get_file), os.path.join(local, get_file))
            else:
                # Then this is a directory and we need to drop into it after creating it
                os.makedirs(os.path.join(local, get_file), exist_ok=True)
                self._get_all(remote=os.path.join(remote, get_file), local=os.path.join(local, get_file))
        return
            
    def _define_args(self):
        # Parameter for local machine
        self.parser.add_argument('--local_json_dir', help='The  path to the directory that holds the published_articles_sp.json files that contains the information for the symportal_database User and Study objects on the local machine', default='/Users/humebc/Documents/symportal.org/published_articles_archive')
        self.parser.add_argument(
            '--local_symportal_data_directory', 
            help='The base directory where the individual study directories are held on the local machine', 
            default='/Users/humebc/Documents/symportal.org/sp_app/static/data/data_explorer_data')
        self.parser.add_argument('--pem_file_path', help='Full path to the .pem file to connect to the AWS instance', default=None),
        self.parser.add_argument('--local_bak_dir', help="Path to the directory on the local machine where the .bak file should be deposited", default="/Users/humebc/Documents/symportal.org/symportal_database_versions")
        
        # Parameters for symportal_framework_server
        self.parser.add_argument(
            '--remote_sp_output_paths', 
            type=str, 
            help='The path to the base output directory of the SymPortal output on the remote SymPortal server. For multiple outputs, this can be comma separated.', 
            required=True
            )
        self.parser.add_argument(
            '--remote_sp_host_id', 
            type=str, 
            help='The IP of the server that you want to grab the SymPortal output from [defaut=134.34.126.43;zygote]', 
            default='134.34.126.43'
            )
        self.parser.add_argument(
            '--remote_sp_host_user', 
            type=str, 
            help='The useraccount for ssh to the remote SymPortal server [default=humebc]', 
            default='humebc'
            )
        self.parser.add_argument('--remote_bak_path', type=str, help='When syncing multiple datasets, a single path to a .bak file should be passed using this argument', default=None)

        # Symportal.org webpage server
        self.parser.add_argument('--remote_web_json_dir', help='The full path to the json file that contains the information for the symportal_database User and Study objects on the remote web server', default='/home/humebc/symportal.org/published_articles_archive')
        self.parser.add_argument('--remote_web_connection_type', help='Either IP or PEM.', default='IP'),
        self.parser.add_argument('--remote_web_bak_dir', help="Path to the directory on the web server where the .bak file should be deposited", default="/home/humebc/symportal.org/symportal_database_versions")
        self.parser.add_argument('--remote_web_sync_script_path', help="Full path to the syncronization script to run on the web server", default="/home/humebc/symportal.org/sync_db.py")
        self.parser.add_argument(
            '--remote_web_host', 
            type=str, 
            help='The IP of the server to upload data to [defaut=172.104.241.93;linode]', 
            default='172.104.241.93'
            )
        self.parser.add_argument(
            '--remote_web_user', 
            type=str, 
            help='The useraccount for ssh to the remote symportal.org server [default=humebc]', 
            default='humebc'
            )
        self.parser.add_argument('--pem_path', help='The path to the .pem file if sshing to an AWS server')
        self.parser.add_argument(
            '--remote_web_symportal_data_directory', 
            help='The base directory where the individual study directories are held on the web machine', 
            default='/home/humebc/symportal.org/sp_app/static/data/data_explorer_data')
        
AutomateSync().start_sync()