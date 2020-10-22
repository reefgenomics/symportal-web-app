#!/usr/bin/env python3
"""
This script will be managed by chron jobs and will be run once every hour
It will be responsible for transfering the output results from datasets/studies that have been
output on the SymPortal framework over to the web server so that they can be displayed to the user.
It will do much of the work that was previously done by the combination of the automate_sync.py
and sync_db.py scripts. However, now that we are working with a single instance of the database via remote connection
to the framework server, everything can be done in a a single script.

This script will search for submission objects that have had results outputted for them. This will happen at two
different points. For those Submission objects where for_analysis is False, they will have status
framework_loading_complete. For those Submissions where for_analysis is True,
they will have status framework_analysis_complete. In both cases, any Submission object will have the
path of the output directory stored in framework_local_dir_path and the progress_status will be set to framework_output_complete.
This script will be responsible for pulling over this data to the web server, and processing it in preparation of
use for the DataExplorer. Users should already have been created.

Once the data has been pulled over we will set the Study object display_online and DataExplorer attributes to True.
This will be the signal for the symportal.org code to display these new Study objects.
"""

import sys
import os
import subprocess
import platform
from sp_app import app, db
from sp_app.models import Submission
import paramiko
from . import chron_config
import shutil
from zipfile import ZipFile
from datetime import datetime

class TransferFrameworkToWeb:
    def __init__(self):
        """
        Get the list of submissions that need to be transfered over to the web server.
        Setup the sftp connection for doing the transfers
        """
        self._check_no_other_instance_running()
        self.submissions_to_transfer = Submission.query.filter(
            Submission.progress_status=="framework_output_complete"
        ).filter(
            Submission.error_has_occured==False
        ).all()
        # The directory to which the Study output directory should be pulled to and processed
        self.explorer_data_dir = chron_config.explorer_data_dir

        # Use paramiko to set up an sftp that we can use to transfer
        self.ssh_client = paramiko.SSHClient()
        self.ssh_client.load_system_host_keys()
        self.ssh_client.connect(hostname=chron_config.framework_ip, username=chron_config.framework_user,
                                password=chron_config.framework_pass)

        # Open sftp client
        self.sftp_client = self.ssh_client.open_sftp()

        # Number of attempts already undertaken to download the data from the webserver and validate md5sum
        self.attempts = 0

        # Dynamics for convenience that will be updated with each Submission object
        self.submission_to_transfer = None
        self.framework_source_dir = None
        self.web_dest_dir = None

    def _update_submission_objects(self):
        self.submission_to_transfer.associated_study.display_online = True
        self.submission_to_transfer.associated_study.data_explorer = True
        self.submission_to_transfer.progress_status = 'transfer_to_web_server_complete'
        self.submission_to_transfer.transfer_to_web_server_date_time = self._get_date_time()
        self.submission_to_transfer.associated_study.save()
        self.submission_to_transfer.save()

    def transfer_and_prep(self):
        for sub in self.submissions_to_transfer:
            self.submission_to_transfer = sub

            # check to see if a directory already exists for the study in question
            self.web_dest_dir = os.path.join(
                self.explorer_data_dir,
                os.path.basename(self.submission_to_transfer.framework_results_dir_path)
            )

            if os.path.exists(self.web_dest_dir):
                # TODO possibility of checking to see if the directory contents is identical to
                # wheat we are trying to pull down.
                # TODO to do this we would need to produce an md5sum of the output directory and
                # possibly assign this to the Submission object
                # Then we could check here to see if the data that is already present is an exact match
                # In which case no download needed.
                # Else, delte what is currently here and redownload.

                # For the time being, we will simply delete the directory that is currently present
                shutil.rmtree(self.web_dest_dir)
                raise RuntimeError
            else:
                # We need to pull down the data and then process it
                os.makedirs(self.web_dest_dir)
                print(f'Pulling down data from {self.submission_to_transfer.framework_results_dir_path}')
                self._get_all(remote=self.framework_source_dir, local=self.web_dest_dir)
                print('Processing data for upload')
                self._process_sp_output_data()

            self._update_submission_objects()

    def _process_sp_output_data(self):
        """
        Get the data in the format required for the DataExplorer
        """
        # At this point we have the datafiles pulled down.
        # Now its time to process them
        # 1 - mv the html/study.js file out from in the html directory.
        shutil.move(os.path.join(self.web_dest_dir, 'html', 'study_data.js'), os.path.join(self.web_dest_dir, 'study_data.js'))
        # 2 - zip into one file that we will temporarily hold in the base data directory
        # 3 - at the same time create an idividual zip of the file
        # https://thispointer.com/python-how-to-create-a-zip-archive-from-multiple-files-or-directory/
        master_zip_path = os.path.join(self.web_dest_dir, f'{self.submission_to_transfer.name}.zip')
        with ZipFile(master_zip_path, 'w') as zipObj:
            # Iterate over all the files in directory
            for folderName, subfolders, filenames in os.walk(self.web_dest_dir):
                for filename in filenames:
                    #create complete filepath of file in directory
                    filePath = os.path.join(folderName, filename)
                    # check that it is not the .zip itself
                    if filePath == master_zip_path:
                        continue
                    # Add file to zip
                    # https://stackoverflow.com/questions/27991745/zip-file-and-avoid-directory-structure
                    zipObj.write(filePath, arcname=os.path.relpath(filePath, start=self.explorer_data_dir))
                    # Now zip the file individually unless it is the study_data.js file
                    if not 'study_data.js' in filePath:
                        with ZipFile(f'{filePath}.zip', 'w') as sub_zip_obj:
                            # https://stackoverflow.com/questions/27991745/zip-file-and-avoid-directory-structure
                            sub_zip_obj.write(filePath, arcname=os.path.relpath(filePath, start=folderName))
                        # and then remove that file
                        os.remove(filePath)

    def _get_all(self, remote, local):
        """
        Recursively parse through the remote directory pulling down all files
        """
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

    def _check_no_other_instance_running(self):
        try:
            if sys.argv[1] == 'debug':  # For development only
                pass
            else:
                raise RuntimeError('Unknown arg at sys.argv[1]')
        except IndexError:
            captured_output = subprocess.run(['pgrep', '-f', 'chron_transfer_web_to_framework.py'], capture_output=True)
            if captured_output.returncode == 0:  # PIDs were returned
                procs = captured_output.stdout.decode('UTF-8').rstrip().split('\n')
                if platform.system() == 'Linux':
                    # Then we expect there to be one PID for the current process
                    if len(procs) > 1:
                        sys.exit()
                else:
                    # Then we are likely on mac and we expect no PIDs
                    sys.exit()
            else:
                # No PIDs returned
                pass

    @staticmethod
    def _get_date_time():
        return str(
            datetime.utcnow()
        ).split('.')[0].replace('-', '').replace(' ', 'T').replace(':', '')