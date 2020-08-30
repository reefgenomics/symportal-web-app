
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
            document.querySelector("#feedback-container").classList.remove("invisible");
            document.querySelector("#feedback-container").classList.remove("visible");
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