
$(document).ready(function() {
    var previewNode = document.querySelector("#template");
    previewNode.id = "";

    var previewTemplate = previewNode.parentNode.innerHTML;
    previewNode.parentNode.removeChild(previewNode);

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
            // Upon addition of new files to the staged area, we will perform a check to see whether the
            // Start upload button should be enabled. We want to disable this button if there is already
            // a datasheet file uploaded, or if more than one .xlsx or .csv files have been staged.
            // This way we will ensure that we are always working with only a single .csv or .xlsx file (datasheet)
            datasheet_counter.update_DOM();
        },
        removedfile: function(file){
            // By listening for this event we are overwriting the automatic removal of the file by dropzone.
            // This is fine, we can manually remove the file from the DOM table. However we must check that
            // the file is not sent to the backend upon submission.
            file.previewElement.remove();
            datasheet_counter.update_DOM();
        },
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