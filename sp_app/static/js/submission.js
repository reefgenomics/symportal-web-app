
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
            feedback_message.textContent = message;
    }

    function hide_feedback(){
        let feedback_container = document.querySelector("#feedback-container");
        feedback_container.classList.remove("visible");
        feedback_container.classList.add("invisible");
        let feedback_message = document.querySelector("#feedback-message");
        feedback_message.textContent = "";
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
        acceptedFiles: ".csv,.xlsx,.fastq.gz",
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
                    document.querySelector("#datasheet_filename").setAttribute("data-datasheet-filename") = `${response.datasheet_filename}`;
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
            // When a datasheet is added, or when seq files are added, we will need to send the added files
            // up to the routes.py to check the adding.
            // It is important that we get the files with status "added" directly from the dropzone element
            // rather than from the automatic "files" parameter that get given to this event, as for some reason
            // this fileList only contains the lastest "batch" of files that were added rather than all files
            // in the dropzone with the status "added".
            let files_to_send = []
            this.files.forEach(element => {
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
                            let message = "To fix the below problems, either \n1)hit the 'Reset' button and upload a modified datasheet or \n2) add/remove problematic files as needed"
                            display_feedback(message, response["border_class"], response["message_class"]);
                            // We will need to revert to the datasheet upload stage
                            // Rename and enable the datasheet selection button
                            // Rename and disable the datasheet upload button
                            // Change the text of the datasheet indicator label to ''

                        }
                    }
                    console.log(response);
                    }
               });

        },
//        removedfile: function(file){
//            // By listening for this event we are overwriting the automatic removal of the file by dropzone.
//            // This is fine, we can manually remove the file from the DOM table. However we must check that
//            // the file is not sent to the backend upon submission.
//            file.previewElement.remove();
//            datasheet_counter.update_DOM();
//        },
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