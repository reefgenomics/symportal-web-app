
$(document).ready(function() {
    var previewNode = document.querySelector("#template");
    previewNode.id = "";

    var previewTemplate = previewNode.parentNode.innerHTML;
    previewNode.parentNode.removeChild(previewNode);

    // Dropzone class:
    let csv_xlsx_count = 0;
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
            document.querySelector("#feedback-message").setAttribute("class", response.message_class);
            document.querySelector("#feedback-message").textContent = response.message;
        },
        addedfiles: function(files){
            // addedfiles will be called any time a new file or set of files is added to the staging area
            // when this happens and when the delete button is clicked, then we should re-count the number of
            // .xlsx or .csv files there are
            // The <P></P> tags that hold the file names in the staging area have the class staged-file-name
            // The <P></P> tags that hold the file names in the staging area have the class uploaded-file-name
            
            function enable_start_upload_button(){
                document.querySelector("#start_upload_btn").removeAttribute("disabled");
            }

            function disable_start_upload_button(){
                document.querySelector("#start_upload_btn").addAttribute("disabled");
            }

            function remove_warning_message(){
                let feedback_container = document.querySelector("#feedback-container");
                feedback_container.classList.remove("visible");
                feedback_container.classList.add("invisible");
                let feedback_message = document.querySelector("#feedback-message");
                feedback_message.innerText = "";
            }
            
            function display_upload_datasheet_feedback_message(){
                // Ensure that the message container is visible
                let feedback_container = document.querySelector("#feedback-container");
                feedback_container.classList.remove("invisible");
                feedback_container.classList.add("visible");
                let feedback_message = document.querySelector("#feedback-message");
                feedback_message.innerText = "Please upload a datasheet (.xlsx or .csv)"
            }

            function report_datasheet_already_loaded(){
                let feedback_container = document.querySelector("#feedback-container");
                feedback_container.classList.remove("invisible");
                feedback_container.classList.add("visible");
                let feedback_message = document.querySelector("#feedback-message");
                feedback_message.innerText = "A datasheet is already uploaded. Please remove this before attempting to upload another datasheet.";
            }
            
            let staged_csv_xlsx_count = 0;
            // Count the xlsx and csv files that are in the staging area
            let staged_files = Array.from(document.getElementsByClassName("staged-file-name"));
                staged_files.forEach(element => {
                    if (element.innerText.endsWith(".xlsx") || element.innerText.endsWith(".csv")){
                        staged_csv_xlsx_count +=1;
                    }
            });

            // Count the xlsx and csv files that have already been uploaded
            let uploaded_csv_xlsx_count = 0;
            let uploaded_files = document.getElementsByClassName("uploaded-file-name");
            uploaded_files.forEach(element => {
                if (element.innerText.endsWith(".xlsx") || element.innerText.endsWith(".csv")){
                    uploaded_csv_xlsx_count +=1;
                }
            });

            if ((uploaded_csv_xlsx_count === 0) && (staged_csv_xlsx_count === 1)){
                // If upload=0 and staging == 1, then enable start upload.
                // and remove any error message
                enable_start_upload_button();
                remove_warning_message();
            } else if ((uploaded_csv_xlsx_count === 0) && (staged_csv_xlsx_count === 0)){
                // if upload=0 and staging ==0 then diable start upload.
                // and report that user must upload datasheet
                disable_start_upload_button();
                display_upload_datasheet_feedback_message();
            } else if ((uploaded_csv_xlsx_count === 1) && (staged_csv_xlsx_count > 0)){
                // If uploaded == 1 and staging > 0 then diable start upload and report that a datasheet is already uploaded
                // and that the user needs to remove the currently uploaded dataahseet before proceeding with
                // the upload of a new datasheet.
                disable_start_upload_button();
                report_datasheet_already_loaded();
            } else if ((uploaded_csv_xlsx_count === 0) && (staged_csv_xlsx_count === 0)){
                // If uploaded == 1 and staging ==0 then enable the upload button
                // and remove any warning.
                remove_warning_message();
                enable_start_upload_button();
            }else{
                throw `Unexpected counts reported for staged ${staged_csv_xlsx_count} and uploaded ${uploaded_csv_xlsx_count} csv xlsx counts.\n`
            }
            
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
    };


});