class DatasheetCounter{
    constructor(){
        this.staged_csv_xlsx_count = 0;
        this.uploaded_csv_xlsx_count = 0;
        this.staged_files = Array.from(document.getElementsByClassName("staged-file-name"));
        this.uploaded_files = Array.from(document.getElementsByClassName("uploaded-file-name"));
        this.feedback_container = document.querySelector("#feedback-container");
        this.feedback_message = document.querySelector("#feedback-message");

    }

    _enable_start_upload_button(){
        document.querySelector("#start_upload_btn").removeAttribute("disabled");
    }

    _disable_start_upload_button(){
        document.querySelector("#start_upload_btn").addAttribute("disabled");
    }

    _remove_warning_message(){
        this.feedback_container.classList.remove("visible");
        this.feedback_container.classList.add("invisible");
        this.feedback_message.innerText = "";
    }

    _display_upload_datasheet_feedback_message(){
        // Ensure that the message container is visible
        this.feedback_container.classList.remove("invisible");
        this.feedback_container.classList.add("visible");
        this.feedback_message.innerText = "Please upload a datasheet (.xlsx or .csv)"
    }

    _report_datasheet_already_loaded(){
        this.feedback_container.classList.remove("invisible");
        this.feedback_container.classList.add("visible");
        this.feedback_message.innerText = "A datasheet is already uploaded. Please remove this before attempting to upload another datasheet.";
    }

    _count_staged_and_uploaded_datasheets(){
        
        this.staged_files.forEach(element => {
            if (element.innerText.endsWith(".xlsx") || element.innerText.endsWith(".csv")){
                this.staged_csv_xlsx_count +=1;
            }
        });
        
        this.uploaded_files.forEach(element => {
            if (element.innerText.endsWith(".xlsx") || element.innerText.endsWith(".csv")){
                this.uploaded_csv_xlsx_count +=1;
            }
        });
    }

    _format_DOM_objects(){
        if ((this.uploaded_csv_xlsx_count === 0) && (this.staged_csv_xlsx_count === 1)){
            // If upload=0 and staging == 1, then enable start upload.
            // and remove any error message
            this._enable_start_upload_button();
            this._remove_warning_message();
        } else if ((this.uploaded_csv_xlsx_count === 0) && (this.staged_csv_xlsx_count === 0)){
            // if upload=0 and staging ==0 then diable start upload.
            // and report that user must upload datasheet
            this._disable_start_upload_button();
            this._display_upload_datasheet_feedback_message();
        } else if ((this.uploaded_csv_xlsx_count === 1) && (this.staged_csv_xlsx_count > 0)){
            // If uploaded == 1 and staging > 0 then diable start upload and report that a datasheet is already uploaded
            // and that the user needs to remove the currently uploaded dataahseet before proceeding with
            // the upload of a new datasheet.
            this._disable_start_upload_button();
            this._report_datasheet_already_loaded();
        } else if ((this.uploaded_csv_xlsx_count === 0) && (this.staged_csv_xlsx_count === 0)){
            // If uploaded == 1 and staging ==0 then enable the upload button
            // and remove any warning.
            this._remove_warning_message();
            this._enable_start_upload_button();
        }else{
            throw `Unexpected counts reported for staged ${this.staged_csv_xlsx_count} and uploaded ${this.uploaded_csv_xlsx_count} csv xlsx counts.\n`
        }
    }

    _reset_counts_and_selections(){
        this.staged_csv_xlsx_count = 0;
        this.uploaded_csv_xlsx_count = 0;
        this.staged_files = Array.from(document.getElementsByClassName("staged-file-name"));
        this.uploaded_files = Array.from(document.getElementsByClassName("uploaded-file-name"));
    }

    update_DOM(){
        this._reset_counts_and_selections();
        this._count_staged_and_uploaded_datasheets();
        this._format_DOM_objects();
    }
}