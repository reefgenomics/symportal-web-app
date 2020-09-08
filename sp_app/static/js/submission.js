
$(document).ready(function() {
    var previewNode = document.querySelector("#template");
    previewNode.id = "";

    var previewTemplate = previewNode.parentNode.innerHTML;
    previewNode.parentNode.removeChild(previewNode);

    function display_feedback(message, border_class, message_class){
        let feedback_container = document.querySelector("#feedback-container");
            feedback_container.classList.remove("invisible");
            feedback_container.classList.remove("visible");
            feedback_container.classList.remove("border-danger");
            feedback_container.classList.remove("border-success");
            feedback_container.classList.add(border_class);
            let feedback_message = document.querySelector("#feedback-message");
            feedback_message.classList.remove("text-danger");
            feedback_message.classList.remove("text-success");
            feedback_message.classList.add(message_class);
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
        // Collects the files that are currently of status added in the dropzone
        // and sends them up to the server for checking.
        // It will automatically differentiate between checking a datasheet and checking sequencing files
        // This will be called when files are added using a variation of the select files button
        // and also when a files is removed
        // When a datasheet is added, or when seq files are added, we will need to send the added files
        // up to the routes.py to check the adding.
        // It is important that we get the files with status "added" directly from the dropzone element
        // rather than from the automatic "files" parameter that get given to this event, as for some reason
        // this fileList only contains the lastest "batch" of files that were added rather than all files
        // in the dropzone with the status "added".
        let files_to_send = []
        myDropzone.files.forEach(element => {
            if (element.status == "added"){
                var obj = {};
                obj[element.name] = element.size;
                files_to_send.push(obj);
            }
        });

        // We also want to send up the value of the data-datasheet-filename
        // If this is "" then the user should have selected only a single .csv or .xlsx
        // Else, then we use this to do then this is the user selecting sequencing files
        // and we should only be receiving sequencing files and we will run the checks on
        // agreement between the datasheet and the sequencing files submitted
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
                    // Then we checked to see that the user was only uploading a single file
                    // And that that file was a .xlsx or .csv.
                    if (response["error"] == true){
                        // Then there was some sort of error.
                        // Ensure the Upload datasheet button is disabled
                        document.querySelector("#start_upload_btn").setAttribute("disabled", "");
                        // Display the message in a red box in the error area
                        // message, border_class, message_class
                        display_feedback(response["message"], response["border_class"], response["message_class"]);
                        // Remove the staged object(s)
                        myDropzone.removeAllFiles();
                    }else{
                        // Then the user uploaded a single .csv or .xlsx.
                        // Disable the Add datasheet button so that no further files can be added before the upload
                        document.querySelector("#fileinput-button").setAttribute("disabled", "");
                        // Enable the upload datasheet button
                        document.querySelector("#start_upload_btn").removeAttribute("disabled");
                        // Ensure the inner text is upload datasheet. With a space before.
                        document.querySelector("#start_upload_btn").innerHTML = '<i class="fa fa-upload"></i> Upload datasheet';
                        // Display the message
                        display_feedback(response["message"], response["border_class"], response["message_class"]);
                    }
                }else{
                    // Then this is the response from checking the seq files
                    if (response.error == true){
                        // If there was an error
                        // Report the error in the message box
                        // Then the user will have two options to fix the problem
                        // Either, modify and reupload the datasheet, or add/remove files
                        // If the user wants to modify the datasheet
                        // Then the dataset will need to be reloaded to fix the problem
                        // The easiest way to do this is probably to hit he restart button
                        // In this case we should put this guidance in the feedback message
                        let message = "";
                        message += "<strong>ERROR: missing files, extra files or small files were detected</strong><br><br>"

                        // To produce a useful error message we need to go through the data that has
                        // been returned by the processing to see which of the data objects were populated
                        // Check for missing files
                        let missing_files_object = response.data["missing_files"];
                        if (Object.keys(missing_files_object).length){
                            // Then there are some missing files
                            message += "The following files are listed in the datasheet but missing from your selection: <br>"
                            for (let key in missing_files_object) {
                                message += `\t${key}: ${missing_files_object[key].join(' ')}<br>`;
                            }
                            message += "<br><br>"
                        }
                        let extra_files_array = response.data["extra_files"];
                        if (extra_files_array.length){
                            // Then there were extra files selected that were not in the datasheet
                            message += "The following files were selected but do not appear in the datasheet: <br>"
                            extra_files_array.forEach(function(filename){
                                message += `\t${filename}<br>`;
                            });
                            message += "<br><br>"
                        }
                        let small_files = response.data["size_violation_samples"];
                        if (small_files.length){
                            // Then there were extra files selected that were not in the datasheet
                            message += "The following files are too small (please remove from datasheet): <br>"
                            small_files.forEach(function(filename){
                                message += `\t${filename}<br>`;
                            });
                            message += "<br><br>"
                        }
                        message += "<br>To fix the above problems, either <br>1) hit the 'Reset' button and upload a modified datasheet or <br>2) add/remove problematic files as needed."
                        display_feedback(message, response["border_class"], response["message_class"]);

                        // Activate the reset button
                        document.querySelector("#reset").removeAttribute("disabled");
                        // Alternatively the user may wish to add or remove files
                        // In this case, then the easiest way to implement this is to check the files again for each
                        // addition or removal. If a files are added then we enter this function again
                        // so we don't need to implement anything else
                        // However, we will need to implement a check when the delete button is pressed.

                    }else if(response.warning){
                        // Then we need to parse through the response.data and construct an appropriate warning message
                        // However, warnings should not prevent the upload of seq data
                        // Enable the upload button
                        let taxonomy_missing = response.data.taxonomy_missing;
                        let binomial_dict = response.data.binomial_dict;
                        let lat_long_missing = response.data.lat_long_missing;
                        let lat_long_dict = response.data.lat_long_dict;
                        let sample_type_missing = response.data.sample_type_missing;
                        let date_missing = response.data.date_missing;
                        let depth_missing = response.data.depth_missing;


                        message = "<strong>WARNING: some meta data fields are incomplete or causing format errors</strong><br><br>"
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
                        message += "To begin uploading your seq files click the Upload seq files button.<br>"
                        message += "To act on any of the above warnings, click 'Reset' then upload your modified datasheet"
                        display_feedback(message, response["border_class"], response["message_class"]);
                        // Enable the upload datasheet button
                        document.querySelector("#start_upload_btn").removeAttribute("disabled");
                        // Ensure the inner text is Upload seq files.
                        document.querySelector("#start_upload_btn").innerHTML = '<i class="fa fa-upload"></i> Upload seq files';
                        // Enable the reset button
                        document.querySelector("#reset").removeAttribute("disabled");
                    }else{
                        // No warnings or errors.
                        // Enable the upload button
                    }
                }
                console.log(response);
                }
           });
    }

    // Dropzone class:
    // We can create a class of DatasheetCounter here and then access it within the addedfiles event.
    // This class can already have all of the relevant objects selected
    const datasheet_counter = new DatasheetCounter();
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
            //TODO we are here. Handle the return from upload
            // We are either handling the upload response for a datasheet being sent up
            // Or we are handling a successful submission.
            if (response.response_type == "datasheet"){
                // Then this is the upload of a datasheet rather than the upload of sequencing files
                if (response.error === true){
                    // There was a problem with the datasheet
                    // The following actions will take the user back to the upload datasheet
                    // The file should be removed from the dropzone object
                    myDropzone.removeAllFiles();
                    // Error message should be displayed
                    // It should give an informative error AND instruct user to reupload
                    display_feedback(response.message, response.border_class, response.message_class);
                    // The Select datasheet button should be enabled
                    document.querySelector("#fileinput-button").removeAttribute("disabled");
                    // The upload datasheet button should be disabled
                    document.querySelector("#start_upload_btn").setAttribute("disabled", "");
                }else{
                    // Then the datasheet looks good
                    // Now it is time to allow the user to upload seq files
                    // Once they have been selected we will check them against the datasheet that has
                    // been uploaded
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
                    display_feedback(response.message, response.border_class, response.message_class);
                }
            }

        },
        addedfiles: function(files){
            send_files_for_checking();
        },
        removedfile: function(file){
            // By listening for this event we are overwriting the automatic removal of the file by dropzone.
            // This is fine, we can manually remove the file from the DOM table. However we must check that
            // the file is not sent to the backend upon submission.
            file.previewElement.remove();
            send_files_for_checking();

        },
        sendingmultiple: function(files, xhr, formData){
            // This will be fired either when we are uploading a datasheet, or when we are doing the final submission
            // (i.e. after having checked that only a single .csv/.xlsx has been uploaded or after checking that
            // all is in agreement between an uploaded datasheet and a set of sequencing files).
            // Both cases are easily distinguishable. In the first, files will contain only a sinlge .csv/.xlsx
            // In the other, files will contain at least two sequencing files.
            if (this.files.length > 1){
                // Then this is a submission of the sequencing datafiles and we want to send up the datasheetfile name
                formData.append("datasheet_filename", current_datasheet_filename);
            }
            // length is one. we just send it as it is without adding additional data.
        }
        });

    
    
    // Setup the buttons for all transfers
    // The "add files" button doesn't need to be setup because the config
    // `clickable` has already been specified.
    document.querySelector("#actions .start").onclick = function() {
      myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
    };
    document.querySelector("#reset").onclick = function() {
        myDropzone.removeAllFiles(true);
        // To reset we will send an AJAX request to the server
        // We will delete and remake all files already uploaded
        // Upon success


        // disable the cancel button
        // All files will already have been removed
        // TODO implement spinner
        // This POST to the server will delete all user uploaded files that are currently held on the server
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
        hide_feedback()
        this.setAttribute("disabled", "");
    };


});