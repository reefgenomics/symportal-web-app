
$(document).ready(function() {
    var previewNode = document.querySelector("#template");
    previewNode.id = "";

    var previewTemplate = previewNode.parentNode.innerHTML;
    previewNode.parentNode.removeChild(previewNode);

    function display_feedback(message, border_class){
        let feedback_container = document.querySelector("#feedback-container");
            feedback_container.classList.remove("invisible");
            feedback_container.classList.remove("visible");
            feedback_container.classList.remove("border-danger");
            feedback_container.classList.remove("border-success");
            feedback_container.classList.add(border_class);
            let feedback_message = document.querySelector("#feedback-message");
            feedback_message.classList.remove("text-danger");
            feedback_message.classList.remove("text-success");
            feedback_message.innerHTML = message;
    }

    function hide_feedback(){
        let feedback_container = document.querySelector("#feedback-container");
        feedback_container.classList.remove("visible");
        feedback_container.classList.add("invisible");
        let feedback_message = document.querySelector("#feedback-message");
        feedback_message.textContent = "";
    }

    function send_files_for_checking(){

        // Functions for only the send_files_for_checking function
        function get_added_status_files_of_dropzone_object(){
            let files_to_send = []
            myDropzone.files.forEach(element => {
                if (element.status == "added"){
                    var obj = {};
                    obj[element.name] = element.size;
                    files_to_send.push(obj);
                }
            });
            return files_to_send;
        }

        function prepare_DOM_for_datasheet_upload(response){
            // Then the user selected a single .csv or .xlsx. Prepare DOM for upload of the selected datasheet.
            // Disable the Add datasheet button so that no further files can be added before the upload
            document.querySelector("#fileinput-button").setAttribute("disabled", "");
            // Enable the upload datasheet button
            document.querySelector("#start_upload_btn").removeAttribute("disabled");
            // Ensure the inner text is upload datasheet. With a space before.
            document.querySelector("#start_upload_btn").innerHTML = '<i class="fa fa-upload"></i> Upload datasheet';
            // Display the message
            display_feedback(response["message"], response["border_class"]);
            // Enable the reset button
            document.querySelector("#reset").removeAttribute("disabled");
        }

        function process_datasheet_select_ajax_response(response){
            if (response["error"] == true){
                // Then there was some sort of error. Reset submission.
                reset_submission_buttons_and_display_message(response["message"], response["border_class"]);
            }else{
                // Then the user selected a single .csv or .xlsx. Prepare DOM for upload of the selected datasheet.
                prepare_DOM_for_datasheet_upload(response);
            }
        }

        function process_seq_files_select_ajax_response(response){
            if (response.error){
                // If there was an error, report the error in the message box
                // User will have two options to fix the problem
                // Either, modify and reupload the datasheet, or add/remove files
                process_seq_files_select_ajax_response_error(response);
            }else if(response.warning){
                // Then we need to parse through the response.data and construct an appropriate warning message
                // However, warnings should not prevent the upload of seq data
                // Enable the upload button
                construct_and_display_warning_message_seq_file_select(response);
            }else{
                construct_and_display_success_message_seq_file_select(response);
            }
        }

        function process_seq_files_select_ajax_response_error(response){
            if (response.error_type == "unhandled_error"){
                // If we have an unhandled error we will essentially reset back to datasheet selection
                reset_submission_buttons_and_display_message(response["message"], response["border_class"]);
            }else{
                // This is a handled error and we will deliver an informative error message and
                // stay at the stage of files selection
                // The user will have the option of hitting the reset button
                // Or deleting/adding files.
                // Everytime the staged files are changed we will run this same send_files_for_checking
                // function and therefore this is already coded up.
                construct_and_display_error_message_seq_file_select(response);
            }
        }

        function construct_and_display_error_message_seq_file_select(response){
            let message = "";
            message += '<strong class="text-danger">ERROR: missing files, extra files or small files were detected</strong><br><br>'

            // To produce a useful error message we need to go through the data that has
            // been returned by the processing to see which of the data objects were populated
            // Check for missing files
            let missing_files_object = response.data["missing_files"];
            if (Object.keys(missing_files_object).length){
                // Then there are some missing files
                message += "The following files are listed in the datasheet but are missing from your selection: <br>"
                for (let key in missing_files_object) {
                    message += `<pre>   ${key}: ${missing_files_object[key].join(' ')}</pre>`;
                }
                message += "<br>"
            }
            let extra_files_array = response.data["extra_files"];
            if (extra_files_array.length){
                // Then there were extra files selected that were not in the datasheet
                message += "The following files were selected but do not appear in the datasheet: <br>"
                extra_files_array.forEach(function(filename){
                    message += `<pre>   ${filename}</pre>`;
                });
                message += "<br>"
            }
            let small_files = response.data["size_violation_samples"];
            if (small_files.length){
                // Then there were extra files selected that were not in the datasheet
                message += "The following files are too small (please remove from datasheet): <br>"
                small_files.forEach(function(filename){
                    message += `<pre>   ${filename}</pre>`;
                });
                message += "<br>"
            }
            let duplicate_staged_files = response.data["duplicate_staged_files"];
            if (Object.keys(duplicate_staged_files).length){
                // Then there are some missing files
                message += "The following files have been staged more than once: <br>"
                for (let key in duplicate_staged_files) {
                    message += `<pre>   ${key}: ${duplicate_staged_files[key]}</pre>`;
                }
                message += "<br>"
            }
            message += "To fix the above problems, either <br>1) hit the 'Reset' button and upload a modified datasheet or <br>2) add/remove problematic files as needed."
            display_feedback(message, response["border_class"]);

            // Activate the reset button
            document.querySelector("#reset").removeAttribute("disabled");
            // Disable the Upload seq files button
            document.querySelector("#start_upload_btn").setAttribute("disabled", "");
        }

        function construct_and_display_warning_message_seq_file_select(response){
            let taxonomy_missing = response.data.taxonomy_missing;
            let binomial_dict = response.data.binomial_dict;
            let lat_long_missing = response.data.lat_long_missing;
            let lat_long_dict = response.data.lat_long_dict;
            let sample_type_missing = response.data.sample_type_missing;
            let date_missing = response.data.date_missing;
            let depth_missing = response.data.depth_missing;


            let message = "<strong>WARNING: some meta data fields are incomplete or causing format errors</strong><br><br>";
            if (taxonomy_missing.length > 0){
                message += "The following samples are missing taxonomy data: <br>"
                taxonomy_missing.forEach(function(sample_name){
                    message += `<pre class="text-warning">   ${sample_name}</pre>`;
                });
                message += "<br>"
            }
            if (Object.keys(binomial_dict).length > 0){
                // Then we split binomials that were provided in the species field
                message += "A binomial is detected and adjusted in the following samples:<br>"
                for (let key in binomial_dict) {
                    message += `<pre class="text-warning">   ${key}: ${binomial_dict[key][0]} --> ${binomial_dict[key][1]}</pre>`;
                }
                message += "<br>"
            }
            if (lat_long_missing.length > 0){
                message += "The following samples are missing lat/lon data: <br>"
                lat_long_missing.forEach(function(sample_name){
                    message += `<pre class="text-warning">   ${sample_name}</pre>`;
                });
                message += "<br>"
            }
            if (Object.keys(lat_long_dict).length > 0){
                // Then we split binomials that were provided in the species field
                message += "Lat/lon format is bad for the following samples:<br>"
                for (let key in lat_long_dict) {
                    message += `<pre class="text-warning">   ${key}: ${lat_long_dict[key]}</pre>`;
                }
                message += "<br>"
            }
            if (sample_type_missing.length > 0){
                message += "The following samples are missing sample_type data: <br>"
                sample_type_missing.forEach(function(sample_name){
                    message += `<pre class="text-warning">   ${sample_name}</pre>`;
                });
                message += "<br>"
            }
            if (date_missing.length > 0){
                message += "The following samples are missing collection date data: <br>"
                date_missing.forEach(function(sample_name){
                    message += `<pre class="text-warning">   ${sample_name}</pre>`;
                });
                message += "<br>"
            }
            if (depth_missing.length > 0){
                message += "The following samples are missing collection depth data: <br>"
                depth_missing.forEach(function(sample_name){
                    message += `<pre class="text-warning">   ${sample_name}</pre>`;
                });
                message += "<br>"
            }
            message += "Your seq files can be submitted despite the above warnings<br>"
            message += "To begin uploading your seq files, click the 'Upload seq files' button.<br>"
            message += "To act on any of the above warnings, click 'Reset' then upload your modified datasheet"
            display_feedback(message, response["border_class"]);
            // Enable the upload datasheet button
            document.querySelector("#start_upload_btn").removeAttribute("disabled");
            // Ensure the inner text is Upload seq files.
            document.querySelector("#start_upload_btn").innerHTML = '<i class="fa fa-upload"></i> Upload seq files';
            // Enable the reset button
            document.querySelector("#reset").removeAttribute("disabled");
        }

        function construct_and_display_success_message_seq_file_select(response){
            // No warnings or errors.
            let message = '<strong class="text-success">Your datasheet passed QC with no errors or warnings</strong><br>';
            message += "To begin uploading your seq files, click the 'Upload seq files' button.<br>";
            display_feedback(message, response["border_class"]);
            // Enable the upload datasheet button
            document.querySelector("#start_upload_btn").removeAttribute("disabled");
            // Ensure the inner text is Upload seq files.
            document.querySelector("#start_upload_btn").innerHTML = '<i class="fa fa-upload"></i> Upload seq files';
            // Enable the reset button
            document.querySelector("#reset").removeAttribute("disabled");
        }

        // When a datasheet is added, or when seq files are added, we will need to send the added files
        // up to the routes.py to check the adding.

        // This method collects the files that are currently of status added in the dropzone
        // and sends them to /_check_submission in routes.py.

        // It will automatically differentiate between checking a datasheet and checking sequencing files
        // This will be called when files are added using the select file button
        // and also when a file(s) is removed

        // It is important that we get the files with status "added" directly from the dropzone element
        // rather than from the automatic "files" parameter that get given to this event, as for some reason
        // this fileList only contains the lastest "batch" of files that were added rather than all files
        // in the dropzone with the status "added".

        let files_to_send = get_added_status_files_of_dropzone_object();

        // It is possible that there are no files to send
        // This happens if a user trashes a staged datasheet before upload
        // This case will be handled in routes.py

        // We also want to send up the value of the data-datasheet-filename
        // If this is "" then the user should have selected only a single .csv or .xlsx
        // Else, then this is the user selecting sequencing files
        // and we should only be receiving sequencing files and we will run the checks on
        // agreement between the datasheet and the sequencing files submitted.
        // If the user tries really hard they will be able to send up another datasheet when they are
        // selecting their seq files, but this will be recognised and reported in routes.py

        let datasheet = document.querySelector("#datasheet_filename");
        let datasheet_data = datasheet.getAttribute("data-datasheet-filename");

        let ajax_object_to_send = {"datasheet_data": datasheet_data, "files": files_to_send, "add_or_upload":"add"}

        $.ajax({
            type: 'POST',
            url: "/_check_submission",
            data: JSON.stringify(ajax_object_to_send),
            dataType: "json",
            success: function(response){
                if (response["check_type"] == "datasheet" && response["add_or_upload"] == "add"){
                    // Then we checked to see that the user was only selecting a single file
                    // And that that file was a .xlsx or .csv.
                    process_datasheet_select_ajax_response(response);
                }else{
                    // Then this is the response from checking the seq files
                    process_seq_files_select_ajax_response(response);
                }
                console.log(response);
            }
           });
    }

    // Dropzone class:
    var myDropzone = new Dropzone("div#dropZone", {
        url: "/_check_submission",
        parallelUploads: 20,
        previewTemplate: previewTemplate,
        autoQueue: false, // Make sure the files aren't queued until manually added
        previewsContainer: "#previews", // Define the container to display the previews
        clickable: "#fileinput-button",
        uploadMultiple: true,
        acceptedFiles: ".csv,.xlsx,.gz",
        error: function (file, response) {
            console.log("Error");
            console.log(response);
        },
        successmultiple: function (files, response) {
            function progress_user_to_seq_file_select(response){
                // The following actions will progress the user
                // Change the datasheet label to indicate the datasheet we are working with
                document.querySelector("#datasheet_filename").textContent = `Datasheet: ${response.datasheet_filename}`;
                document.querySelector("#datasheet_filename").setAttribute("data-datasheet-filename", `${response.datasheet_filename}`);
                // Change the text of the Select datasheet to select seqfiles
                document.querySelector("#fileinput-button").innerHTML = '<i class="fa fa-plus-circle"></i> Select seq files';
                // Enable this button
                document.querySelector("#fileinput-button").removeAttribute("disabled");
                // Change the Upload datasheet text to Upload seq files
                document.querySelector("#start_upload_btn").innerHTML = '<i class="fa fa-upload"></i> Upload seq files';
                // Disable this button
                document.querySelector("#start_upload_btn").setAttribute("disabled", "");
                // Change the message box to show successful upload
                display_feedback(response.message, response.border_class);
                // Remove the uploaded datasheet. This is already saved on the server
                // and its name will be sent up using the Datasheet label data value when seq files are staged
                // This way the user cannot click the delete button on the uploaded datasheet that will cause a
                // staging check to happen and leaves us in a strange state.
                myDropzone.removeAllFiles(true);
            }

            // We are either handling the upload response for a datasheet being sent up
            // Or we are handling a successful submission.
            if (response.response_type == "datasheet"){
                // Then this is the upload of a datasheet rather than the upload of sequencing files
                if (response.error === true){
                    // We are routing DatasheetGeneralFormattingError and unhandled errors here
                    // We will provide an informative message and reset
                    reset_submission_buttons_and_display_message(response.message, response.border_class);
                }else{
                    // Then the datasheet looks good. Allow user to select seq files
                    // Once they have been selected we will check them against the datasheet that has been uploaded
                    progress_user_to_seq_file_select(response);
                }
            }else{
                // TODO this needs to be implemented. This is after a successful upload of seq files.
            }

        },
        addedfiles: function(files){
            send_files_for_checking();
        },
        removedfile: function(file){
            // By listening for this event we are overwriting the automatic removal of the file by dropzone.
            // This is fine, we can manually remove the file from the DOM table.
            // Once removed from the DOM, the file is also removed from the dropzone object list of files

            // This event is also triggered by an error in the datasheet checking
            // In this case, the event is of type "load". We do not want to do checking in this case
            file.previewElement.remove();
            if (event.type != "load"){
                // Only send files for checking if the delete button was clicked.
                if (event.currentTarget.classList.contains("delete")){
                    send_files_for_checking();
                }
            }

        },
        sendingmultiple: function(files, xhr, formData){
            // This will be fired either when we are uploading a datasheet, or when we are doing the final submission
            // (i.e. after having checked that only a single .csv/.xlsx has been uploaded or after checking that
            // all is in agreement between an uploaded datasheet and a set of sequencing files).
            // If this.files.length > 1 then it is final upload of seq data
            if (this.files.length > 1){
                // Then this is a submission of the sequencing datafiles and we want to send up the datasheetfile name
                // TODO we are here.
                formData.append("datasheet_filename", current_datasheet_filename);
            }else{
                // length is one. we just send it as it is without adding additional data.
            }

        }
        });

    function reset_submission_buttons_and_display_message(message, border_class){
        // There are multiple times when we want to essentially start again with the submission process
        // The only thing that differs between the instances in which we want to do this reset is the
        // feedback message that we want to provide the user with. Some times we want a message and
        // sometimes we don't. As such, we will take the message and border attributes that are
        // passed to the display_feedback message so that these can be used to display the correct
        // message. If these parameters are not provided then we will disable the feedback message

        myDropzone.removeAllFiles(true);

        // This POST to the server will delete all user uploaded files that are currently held on the server
        // When calling this function, there will not always be data saved to the server but there is
        // no harm in completing this ajax request anyway.
        $.ajax({
                type: 'POST',
                url: "/_reset_submission"
                });

        // Rename and enable select datasheet button
        document.querySelector("#fileinput-button").innerHTML = '<i class="fa fa-plus-circle"></i> Select datasheet';
        document.querySelector("#fileinput-button").removeAttribute("disabled");
        // Rename and disable upload datasheet button
        document.querySelector("#start_upload_btn").setAttribute("disabled", "");
        document.querySelector("#start_upload_btn").innerHTML = '<i class="fa fa-upload"></i> Upload datasheet';
        // Change the text and attribute of the Datasheet indicator
        document.querySelector("#datasheet_filename").textContent = "Datasheet: ";
        document.querySelector("#datasheet_filename").setAttribute("data-datasheet-filename", "");
        // Make feedback invisible
        if (message){
            display_feedback(message, border_class);
        }else{
            hide_feedback();
        }

        // Disable the reset button
        document.querySelector("#reset").setAttribute("disabled", "");
    }

    document.querySelector("#actions .start").onclick = function() {
      myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
    };

    // Setup the reset button
    document.querySelector("#reset").onclick = function() {
        reset_submission_buttons_and_display_message();
    };

});