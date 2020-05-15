"""
We want to automate the process of getting an SP output up and displayed on the symportal.org website
This is not so simply done.
We will likely need to have this process broken up into three scripts that will need to be executed from a single
server. We may have some problems with this as the KAUST server is not easily accessed.
Let's try to split this up into the scripts that need to be produced and what they will do.

We will have to coordinate this from our local machine as this doesn't have a fixed IP whilst the servers do.
Let's have a flag that we have to implement when doing a --print_output_types that will automatically ask for
the input of the the information we need including username and studyname. a .bak will be output as well as
an accompanying json file that will include username and study name (this should be the same as dataset name) 
info as well as the path to the .bak It should also contain the uid of the dataset. This can be output to the output dir.

From Local: Provide the host and directory where the output data is.
Provide the directory where this should be going on the remote linode server.
Pull down the data to local and process in a new empty direcotry that matches the name
(check that this is empty first)
After successful processing, check that the linode directory doesn't already exist
If not, then send over the processed datadirectory.
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
        self.remote_sp_output_path = self.args.remote_sp_output_path
        self.remote_sp_json_info_path = os.path.join(self.remote_sp_output_path, 'example_automate_sp_output.json')
        self.remote_sp_host_pass = getpass('Password for remote SymPortal server: ')


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
            self.web_pass = getpass('Password for remote web server: ')
        else:
            self.pem_file_path = self.args.pem_file_path
        
        # Initial SSH and sftp clients
        self.ssh_client = paramiko.SSHClient()
        self.ssh_client.load_system_host_keys()
        self.ssh_client.connect(hostname=self.remote_sp_host_id, username=self.remote_sp_host_user, password=self.remote_sp_host_pass)
        # Open sftp client
        self.sftp_client = self.ssh_client.open_sftp()
    
    def start_sync(self):
        self._read_json_info_from_sp_server()
        
        self._download_and_prep_data_if_necessary()
        
        self._create_or_update_pub_articles_json_if_necessary()

        self._upload_to_web_server()

        # Finally we we need to run a script on the remote web that does the syncing etc.
        stdin, stdout, stderr = self.ssh_client.exec_command(f'python3 {self.sync_script_path} --path_to_new_sp_json {os.path.join(self.remote_web_json_dir, self.new_pub_art_file_name)} --path_to_new_bak {os.path.join(self.remote_web_database_dir, ntpath.basename(self.json_info["bak_path"]))}')

        foo = 'bar'

    def _ask_continue_sync(self):
        while True:
            continue_text = input('Continue with synchronisation? [y/n]: ')
            if continue_text == 'y':
                return True
            elif continue_text == 'n':
                return False
            else:
                print('Unrecognised response. Please answer y or n.')

    def _user_and_study_populated(self):
        """
        Check to see that the user is already present
        in the published_articles_sp.json and that the study
        is already related
        """
        with open(os.path.join(self.local_json_dir, self.new_pub_art_file_name), 'r') as f:
            self.j_obj = json.load(f)
        # first check to see whether the user already exists
        for i in range(len(self.j_obj["users"])):
            if self.j_obj["users"][i]["name"] == self.json_info["user"]:
                if self.json_info["study"] in self.j_obj["users"][i]["studies"]:
                    for i in range(len(self.j_obj["studies"])):
                        if self.j_obj["studies"][i]["name"] == self.json_info["study"]:
                            return True
        return False

    def _read_json_info_from_sp_server(self):
        # first open up the info json file
        print('Reading the ouput json info file:')
        with self.sftp_client.open(self.remote_sp_json_info_path, 'r') as f:
            self.json_info = json.load(f)
        print('JSON info file successfully read:')
        for k, v in self.json_info.items():
            print(f'{k}: {v}')

    def _download_and_prep_data_if_necessary(self):
        # check to see if a directory already exists for the study in question
        self.local_data_dir = os.path.join(self.local_symportal_data_directory, self.json_info["study"])
        if os.path.exists(self.local_data_dir):
            print(f"{Fore.RED}WARNING: Local directory {self.local_data_dir} already exists.{Style.RESET_ALL}")
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
            os.makedirs(self.local_data_dir)
            print(f'Pulling down data from {self.remote_sp_output_path}')
            self._pull_down_data()
            self._process_sp_output_data()

    def _create_or_update_pub_articles_json_if_necessary(self):
        # Check to see if the new published_articles_sp.json has been created and populated
        self.new_pub_art_file_name_prefix = f'published_articles_sp_{self.json_info["time_stamp_str"]}.json'
        
        largest_version_num = 0
        found = False
        for article in os.listdir(self.local_json_dir):
            if self.new_pub_art_file_name_prefix in article:
                self.new_pub_art_file_name = article
                found = True
                # TODO skip the update of the json
                if self._user_and_study_populated():
                    print(f"{Fore.RED}WARNING: {self.new_pub_art_file_name} already exists and includes the study and user in question.{Style.RESET_ALL}")
                    print('This file will be used for the remainder of the synchronisation.')
                    if self._ask_continue_sync():
                        # Then we can skip update of the json
                        pass
                    else:
                        sys.exit(1)
                else:
                    print(f'{self.new_pub_art_file_name} exists but does not contain the study and user in question')
                    print(f'It will now be populated.')
                    self._update_sp_json_file()
                break
            else:
                # Update the version number
                if int(article.split('_')[0]) > largest_version_num:
                    largest_version_num = int(article.split('_')[0])
        
        if not found:
            self.new_pub_art_file_name = f'{largest_version_num + 1}_{self.new_pub_art_file_name_prefix}'
            print(f'{self.new_pub_art_file_name} does not exist.')
            print('Creating and populating.')
            self._update_sp_json_file()

    def _upload_to_web_server(self):
        # Send the data directory up to the remote web server
        # send the sp_json up to the server as well
        # For this we will need connections to the web server.
        # At this point we are finished with the connection to the sp remote server
        self.ssh_client.close()
        self.ssh_client = paramiko.SSHClient()
        self.ssh_client.load_system_host_keys()
        if self.remote_web_connection_type == 'IP':
            raise NotImplementedError
        else:
            # Working with the amazon aws ec2 instance
            self.ssh_client.connect(hostname=self.remote_web_host, username=self.remote_web_user, key_filename=self.pem_file_path)
        
            # Open sftp client
            self.sftp_client = self.ssh_client.open_sftp()
            
            # Transfer the data directory up
            # Check to see if the data directory exists
            if self.json_info["study"] in self.sftp_client.listdir(self.remote_web_symportal_data_directory):
                print(f'{Fore.RED}WARNING: Directory {self.json_info["study"]} already exists in the remote web server data directory.{Style.RESET_ALL}')
                print('We will not upload anything additional to this directory.')
                if self._ask_continue_sync():
                    # Then we can skip the data upload
                    pass
                else:
                    sys.exit(1)
            else:
                self.remote_web_data_dir = os.path.join(self.remote_web_symportal_data_directory, self.json_info["study"])
                self.sftp_client.mkdir(self.remote_web_data_dir)
                self._put_all(remote=self.remote_web_data_dir, local=self.local_data_dir)
            
            # Transfer the sp_json up
            self.sftp_client.put(os.path.join(self.local_json_dir, self.new_pub_art_file_name), os.path.join(self.remote_web_json_dir, '_'.join(self.new_pub_art_file_name.split('_')[1:])))
            # Transfer up the .bak
            self.sftp_client.put(os.path.join(self.local_bak_dir, ntpath.basename(self.json_info["bak_path"])), os.path.join(self.remote_web_bak_dir, ntpath.basename(self.json_info["bak_path"])))

    def _update_sp_json_file(self):
        # Data processing is complete at this point.
        # Now add the Study, and User as required to the published articles json
        # We will want to use the oldest published articles json as the template to
        # update. To get this we will match the version int. This will be one
        # less than the int of the current name:
        last_version_int = int(self.new_pub_art_file_name.split('_')[0]) - 1
        for article in os.listdir(self.local_json_dir):
            if int(article.split('_')[0]) == last_version_int:
                # Then this is the file to use as a template
                self.template_json_file_name = article
        
        with open(os.path.join(self.local_json_dir, self.template_json_file_name), 'r') as f:
            self.j_obj = json.load(f)
        
        # first check to see whether the user already exists
        user_to_look_for = self.json_info["user"]
        u_exists = False
        for i in range(len(self.j_obj["users"])):
            if self.j_obj["users"][i]["name"] == user_to_look_for:
                u_exists = True
                # If the user exists, add the study to the list
                # if it doesn't already exist
                if self.json_info["study"] not in self.j_obj["users"][i]["studies"]:
                    self.j_obj["users"][i]["studies"].append(self.json_info["study"])
                else:
                    # User already has the study there so no need to add
                    pass
        
        if not u_exists:
            # Create a new user dict and add it
            temp_dict = {
            "name":self.json_info["user"],
            "is_admin":False,
            "studies":[self.json_info["study"]]
            }
            self.j_obj["users"].append(temp_dict)
        
        # In theory the study should not already exist
        study_to_look_for = self.json_info["study"]
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
                "data_sets":[self.json_info["data_set_id"]],
                "data_set_samples":[]
            }
            self.j_obj["studies"].append(temp_dict)
        
        # Now we can write out the json
        with open(os.path.join(self.local_json_dir, self.new_pub_art_file_name), 'w') as f:
            json.dump(self.j_obj, f)
    
    def _process_sp_output_data(self):
        """
        Get the data in the format required for the symportal.org server
        """
        # At this point we have the datafiles pulled down.
        # Now its time to process them
        # 1 - mv the html/study.js file out from in the html directory.
        shutil.move(os.path.join(self.local_data_dir, 'html', 'study_data.js'), os.path.join(self.local_data_dir, 'study_data.js'))
        # 2 - zip into one file that we will temporarily hold in the base data directory
        # 3 - at the same time create an idividual zip of the file
        # https://thispointer.com/python-how-to-create-a-zip-archive-from-multiple-files-or-directory/
        master_zip_path = os.path.join(self.local_data_dir, f'{self.json_info["study"]}.zip')
        with ZipFile(master_zip_path, 'w') as zipObj:
            # Iterate over all the files in directory
            for folderName, subfolders, filenames in os.walk(self.local_data_dir):
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

    def _pull_down_data(self):
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
        self._get_all(self.remote_sp_output_path, self.local_data_dir)
        #Finally get pull down the .bak
        self.sftp_client.get(remotepath=self.json_info["bak_path"], localpath=os.path.join(self.local_database_dir, ntpath.basename(self.json_info["bak_path"])))
    
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
            
            # path_to_dir = os.path.join(self.remote_sp_output_path, get_file)
            # subprocess.run(['scp', '-r', f'{self.remote_sp_host_user}@{self.remote_sp_host_ip}:{path_to_dir}', self.local_data_dir])
    
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
            '--remote_sp_output_path', 
            type=str, 
            help='The path to the base output directory of the SymPortal output on the remote SymPortal server', 
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

        # Symportal.org webpage server
        self.parser.add_argument('--remote_web_json_dir', help='The full path to the json file that contains the information for the symportal_database User and Study objects on the remote web server', default='/home/humebc/symportal.org/published_articles_archive')
        self.parser.add_argument('--remote_web_connection_type', help='Either IP or PEM.', default='IP', required=True),
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