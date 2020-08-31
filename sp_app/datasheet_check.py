""" Module for checking file and datasheet upload"""
from werkzeug.utils import secure_filename
import os
import pandas as pd
from collections import Counter

# Most modern way of defining advanced exceptions here:
# https://stackoverflow.com/a/53469898/5516420
class DatasheetFormattingError(Exception):
    """Exception raised when a general formatting error has happened with the datasheet.
    These types of errors prevent us from continuing the QC."""
    def __init__(self, message, data=None):
        self.message = message
        self.data = data

    def __str__(self):
        return str(self.message)

class DatasheetChecker:
    """
    This class is responsible for checking the format of the datasheet and also for checking the contents
    Out of this class we want to out put:
    good rows - These will a row per sample that has the fwd and rev seq files present
        It will include having colour codes for missing files or meta information
    extra objects - These are seq files that have been uploaded but are not included in the datasheet
    missing objects - These are the seq files that are missing.
    general errors - and warnings. Errors will be in red, warnings will be in yellow.
        These will include things like duplication errors
    This should be output as a json.
    """

    def __init__(self, request, user_upload_directory, datasheet_path=None):
        self.request = request
        self.datasheet_path = datasheet_path
        self.user_upload_directory = user_upload_directory
        self.datasheet_path = datasheet_path
        self.duplication_dict = {}
        if not self.datasheet_path:
            # Then we need to get the datasheet from the uploaded files
            # and save it to disk
            self._get_and_save_datasheet()

        self.sample_meta_info_df = self._make_sample_meta_info_df()
        # The list of the files that are in the datasheet but not found in the local dir
        # Key will be sample name value will be list of the files that are missing
        self.missing = {}
        # The list of the files that have been uploaded but that have not been
        self.extra = []

    def do_qc(self):
        # drop any cells in which the sample name is null
        self.sample_meta_info_df = self.sample_meta_info_df[~pd.isnull(self.sample_meta_info_df['sample_name'])]

        # This will raise a DatasheetFormattingError
        # It will be handled in routes.py
        self._check_datasheet_df_vals_unique()

        # Convert sample names to strings and remove white space and greek characters




    def _check_datasheet_df_vals_unique(self):
        # check sample names
        self._check_vals_of_col_unique(column_name='sample_name')
        # check fastq_fwd_file_name
        self._check_vals_of_col_unique(column_name='fastq_fwd_file_name')
        # check fastq_rev_file_name
        self._check_vals_of_col_unique(column_name='fastq_rev_file_name')

    def _check_vals_of_col_unique(self, column_name):
        # check to see that the values held in a column are unique
        sample_name_counter = Counter(self.sample_meta_info_df[column_name].values.tolist())
        non_unique_name_list = []
        for col_val, count in sample_name_counter.items():
            if count != 1:
                non_unique_name_list.append(col_val)
        if non_unique_name_list:
            self.duplication_dict[column_name] = non_unique_name_list
            raise DatasheetFormattingError(message=f"Non-unique values of {column_name}", data=self.duplication_dict)

    def _make_sample_meta_info_df(self):
        if self.datasheet_path.endswith('.xlsx'):
            return pd.read_excel(
                io=self.datasheet_path, header=0, usecols='A:N', skiprows=[0])
        elif self.datasheet_path.endswith('.csv'):
            with open(self.datasheet_path, 'r') as f:
                data_sheet_as_file = [line.rstrip() for line in f]
            if data_sheet_as_file[0].split(',')[0] == 'sample_name':
                return pd.read_csv(
                    filepath_or_buffer=self.datasheet_path)
            else:
                return pd.read_csv(
                    filepath_or_buffer=self.datasheet_path, skiprows=[0])
        else:
            raise RuntimeError(f'Data sheet: {self.datasheet_path} is in an unrecognised format. '
                               f'Please ensure that it is either in .xlsx or .csv format.')

    def _get_and_save_datasheet(self):
        # Then we need to get the datasheet from the uploaded files
        dsheet_files = [k for k in self.request.files if
                        self.request.files[k].filename.endswith('.xlsx') or
                        self.request.files[k].filename.endswith('.csv')]
        assert (len(dsheet_files) == 1)
        data_sheet_key = dsheet_files[0]
        # Save the datasheet to the temp directory
        # And then read in as a dataframe to work with using the current SymPortal code
        file = self.request.files.get(data_sheet_key)
        filename = secure_filename(file.filename)
        file.save(self.user_upload_directory)
        self.datasheet_path = os.path.join(self.user_upload_directory, filename)
