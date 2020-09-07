""" Module for checking file and datasheet upload"""
from werkzeug.utils import secure_filename
import os
import pandas as pd
from collections import Counter, defaultdict
import logging
from numpy import NaN
import ntpath
import json

# Most modern way of defining advanced exceptions here:
# https://stackoverflow.com/a/53469898/5516420
class DatasheetGeneralFormattingError(Exception):
    """Exception raised when a general formatting error has occured
        For example, if non-unique sample names are used
    """
    def __init__(self, message, data=None):
        self.message = message
        self.data = data

    def __str__(self):
        return str(self.message)

class AddedFilesError(Exception):
    """
    Raised when there are either files missing,
    there are files that are not in the supplied datasheet
    or if there are files that are too small.
    """
    def __init__(self, message, data):
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
        os.makedirs(self.user_upload_directory, exist_ok=True)
        # self.datasheet_path = datasheet_path
        self.duplication_dict = {}
        if not self.datasheet_path:
            # Then we need to get the datasheet from the uploaded files
            # and save it to disk
            self.datasheet_filename = self._get_and_save_datasheet()

        self.sample_meta_info_df = self._make_sample_meta_info_df()
        # The list of the files that are in the datasheet but not found in the local dir
        # Key will be sample name value will be list of the files that are missing
        self.missing_files = defaultdict(list)
        # The list of the files that have been uploaded but that have not been
        self.extra_files = []

    def do_general_format_check(self):
        # drop any cells in which the sample name is null
        self.sample_meta_info_df = self.sample_meta_info_df[~pd.isnull(self.sample_meta_info_df['sample_name'])]
        if self.sample_meta_info_df.empty:
            raise DatasheetGeneralFormattingError(
                message="The datasheet appears to be empty. Please fix this problem and upload again.",
                data={"error_type": "df_empty"}
            )
        self._format_sample_names()

        # This will raise a DatasheetFormattingError
        # It will be handled in routes.py
        self._check_datasheet_df_vals_unique()

    def _format_sample_names(self):
        # Convert sample names to strings and remove white space and greek characters
        self.sample_meta_info_df['sample_name'] = self.sample_meta_info_df['sample_name'].astype(str)
        self.sample_meta_info_df['sample_name'] = self.sample_meta_info_df['sample_name'].str.rstrip() \
            .str.lstrip().str.replace(' ', '_').str.replace('/', '_').str.replace('α', 'alpha').str.replace('β', 'beta')

    def _check_valid_seq_files_added(self):
        # drop any cells in which the sample name is null
        self.sample_meta_info_df = self.sample_meta_info_df[~pd.isnull(self.sample_meta_info_df['sample_name'])]
        self._format_sample_names()

        self.sample_meta_info_df.set_index('sample_name', inplace=True, drop=True)
        self.sample_meta_info_df.index = self.sample_meta_info_df.index.map(str)
        # TODO move this to the warning section same as for the lat long changes
        self._check_for_binomial()

        self._replace_null_vals_in_meta_info_df()

        self._check_seq_files_exist()

        # TODO continue to check for meta data warnings, i.e. bad lat longs etc.


    def _check_seq_files_exist(self):
        """
        Check that all of the sequencing files provided in the datasheet exist.
        If filenames are given in the datasheet then convert these to full paths
        before checking for their existence. This way, all locations of seq files
        are full paths.
        Ensure that we lstrip and rstrip the entries to remove any spaces.
        Also check for size of file and require a 300B minimum. Remove from the sample from the data sheet if
        smaller than this.
        """

        # Get a list of the files that the user has added
        data_dict = json.loads(list(self.request.form.keys())[0])
        # A dict of filename to size
        self.added_files_dict = {}
        for file_dict in data_dict["files"]:
            for k, v in file_dict.items():
                self.added_files_dict[k] = v

        self._strip_white_space_from_filenames()

        self.file_not_found_list = []
        self.size_violation_samples = []
        checked_files = []
        for df_ind in self.sample_meta_info_df.index.values.tolist():
            fwd_file = self.sample_meta_info_df.at[df_ind, 'fastq_fwd_file_name']
            rev_file = self.sample_meta_info_df.at[df_ind, 'fastq_rev_file_name']

            checked_files.extend([fwd_file, rev_file])

            # Check that full paths have not been provided
            self._check_for_full_path_error(fwd_file)
            self._check_for_full_path_error(rev_file)

            # Check for the fwd read
            # Unlike in the framework, we will not allow .fastq files. Only .fastq.gz
            self._check_file_in_added_list(df_ind, fwd_file)
            self._check_file_in_added_list(df_ind, rev_file)

            # NB if we were unable to find either the fwd or rev read then we will not be able
            # to continue with our checks
            if df_ind in self.missing_files:
                continue

            # Check file size
            if self.added_files_dict[fwd_file] < 300 or self.added_files_dict[rev_file] < 300:
                print(f'WARNING: At least one of the seq files for sample {df_ind} is less than 300 bytes in size')
                print(f'{df_ind} will be removed from your datasheet and analysis')
                self.size_violation_samples.append(df_ind)

        # drop the rows that had size violations
        # Not really necessary in terms of checking whether files exist
        # But good to undertake this action now to ensure that it doesn't create
        # Any issues during the framework's handling of the datasheet and files
        self.sample_meta_info_df.drop(index=self.size_violation_samples, inplace=True)

        # Check for files that have been added but haven't been listed in the df
        self.extra_files = [filename for filename in self.added_files_dict.keys() if filename not in checked_files]

        if self.missing_files or self.size_violation_samples or self.extra_files:
            # Then we either have missing files, size violation files or extra files
            message = []
            if self.missing_files:
                message.append("Some of the files listed in your datasheet cannot be found.")
            if self.size_violation_samples:
                message.append("Some of your files are too small.")
            if self.extra_files:
                message.append("There are files that are not listed in your datasheet.")
            message = '\n'.join(message)
            raise AddedFilesError(
                message=message,
                data={
                    "missing_files":self.missing_files,
                    "size_violation_samples":self.size_violation_samples,
                    "extra_files":self.extra_files
                })
        else:
            # Otherwise there were no errors and we can proceed to check for warnings
            return


    def _check_file_in_added_list(self, df_ind, filename):
        if not filename in self.added_files_dict:
            self.file_not_found_list.append(filename)
            self.missing_files[df_ind].append(filename)

    def _strip_white_space_from_filenames(self):
        self.sample_meta_info_df['fastq_fwd_file_name'] = self.sample_meta_info_df['fastq_fwd_file_name'].astype(
            str)
        self.sample_meta_info_df['fastq_fwd_file_name'] = self.sample_meta_info_df[
            'fastq_fwd_file_name'].str.rstrip() \
            .str.lstrip()
        self.sample_meta_info_df['fastq_rev_file_name'] = self.sample_meta_info_df['fastq_rev_file_name'].astype(
            str)
        self.sample_meta_info_df['fastq_rev_file_name'] = self.sample_meta_info_df[
            'fastq_rev_file_name'].str.rstrip() \
            .str.lstrip()

    def _check_for_full_path_error(self, file):
        if not file == ntpath.basename(file):
            raise DatasheetGeneralFormattingError(
                message=f"It appears that full paths have been provided for the seq files. "
                        f"Please provide only filenames.  Please fix this problem and upload again.",
                data={"error_type": "full_path", "example_filename": file})

    def _replace_null_vals_in_meta_info_df(self):
        self.sample_meta_info_df = self.sample_meta_info_df.replace('N/A', NaN).replace('NA', NaN).replace('na',
                                                                                                           NaN).replace(
            'n/a', NaN)

    def _check_for_binomial(self):
        """People were putting the full binomial in the speices colums. This crops this back to just the
        species component of binomial"""
        for row_name in self.sample_meta_info_df.index.values.tolist():
            current_species_val = self.sample_meta_info_df.at[row_name, 'host_species']
            if not pd.isnull(current_species_val):
                if ' ' in current_species_val:
                    new_species_val = current_species_val.split(' ')[-1]
                    logging.warning(f'changing {current_species_val} to {new_species_val} for {row_name}')
                    self.sample_meta_info_df.at[row_name, 'host_species'] = new_species_val

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
            logging.error(f"The following items for column {column_name} were non unique:")
            for item in non_unique_name_list:
                logging.error(f"\t{item}")
            self.duplication_dict[column_name] = non_unique_name_list
            raise DatasheetGeneralFormattingError(
                message=f"Column {column_name} contains non unique values. Please fix this problem and upload again.",
                data={"error_type": "non_unique", "non_unique_data": self.duplication_dict})

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
        self.datasheet_path = os.path.join(self.user_upload_directory, filename)
        file.save(self.datasheet_path)
        return filename

