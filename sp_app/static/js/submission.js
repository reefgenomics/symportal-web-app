
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

    // Dropzone class:
    // We can create a class of DatasheetCounter here and then access it within the addedfiles event.
    // This class can already have all of the relevant objects selected
    const datasheet_counter = new DatasheetCounter();
    var myDropzone = new Dropzone("div#dropZone", {
        url: "/submission",
        parallelUploads: 20,
        previewTemplate: previewTemplate,
        autoQueue: false, // Make sure the files aren't queued until manually added
        previewsContainer: "#previews", // Define the container to display the previews
        clickable: ".fileinput-button",
        uploadMultiple: true,
        acceptedFiles: ".csv,.xlsx,.fastq.gz",
        error: function (file, response) {
            console.log("Error");
            console.log(response);
        },
        successmultiple: function (files, response) {
            console.log("Success");
            console.log(response);
            let feedback_container = document.querySelector("#feedback-container");
            feedback_container.classList.remove("invisible");
            feedback_container.classList.remove("visible");
            feedback_container.classList.remove("border-danger");
            feedback_container.classList.remove("border-success");
            feedback_container.classList.add(response.container_class);
            document.querySelector("#feedback-message").setAttribute("class", response.message_class);
            document.querySelector("#feedback-message").textContent = response.message;
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

                            // Enable the upload datasheet button
                            document.querySelector("#start_upload_btn").removeAttribute("disabled");
                            // Ensure the innber text is upload datasheet. With a space before.
                            document.querySelector("#start_upload_btn").innerHTML = '<i class="fa fa-upload"></i> Upload datasheet';
                            // Display the message
                            display_feedback(response["message"], response["border_class"], response["message_class"]);
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
            // When we upload the files we will send up a string value of the
            // current datasheet value that will be stored in an element associated with
            // the Uploaded files table. This way we know which datasheet we should be working with.
            let current_datasheet_filename = document.querySelector("#datasheet_filename").getAttribute("data-datasheet-filename");
            formData.append("datasheet_filename", current_datasheet_filename);
        }
        });

    
    
    // Setup the buttons for all transfers
    // The "add files" button doesn't need to be setup because the config
    // `clickable` has already been specified.
    document.querySelector("#actions .start").onclick = function() {
      myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
    };
    document.querySelector("#actions .cancel").onclick = function() {
      myDropzone.removeAllFiles(true);
      // Assess activation/deactivation of Start Upload button
      datasheet_counter.update_DOM();
    };


});