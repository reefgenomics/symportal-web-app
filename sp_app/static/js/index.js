// Media query
let vp_width_match = window.matchMedia("(max-width: 560px)");
let vp_height_match = window.matchMedia("(max-height: 500px)");

// Even listeners for the mouse enter and leave
let showcase_content_enter_listener = document.getElementById("showcase_content").addEventListener("mouseenter", blur_nav_bar);
let showcase_content_leave_listener = document.getElementById("showcase_content").addEventListener("mouseleave", unblur_nav_bar);



// blur the nav bar when the mouse enters the showcase content only if media match
function blur_nav_bar(){
    if (!vp_width_match.matches && !vp_height_match.matches) { // If media query matches then enable the blurring of the nav bar
        document.getElementById("nav_cont").setAttribute("class", "nav_content blur");
    }
}

// unblur the nav bar when the mouse leaves the showcase content
function unblur_nav_bar(){
    if (!vp_width_match.matches && !vp_height_match.matches) {
        document.getElementById("nav_cont").setAttribute("class", "nav_content no_blur");
    }
}



// Populate the published articles tables
function populate_article_table(data){

    // Get the table object to which we append rows and cells
    let table = document.getElementById('published_articles_table');
    let tbody = table.querySelector("tbody")
    // For each article create row if published
    data.forEach(function(article, index){
        // If the article is not yet published, then do not add to table
        if (article["published"] == false){
            return
        }

        // If published, add row and cells to row.
        let tr = document.createElement('tr');
        let td;
        // The first row needs to be light, so class .row_off
        // Then alternate to dark and light
        if (index%2 == 0) {//class needs to be off
            tr.setAttribute("class", "hover_row row_off");
        }else{
            tr.setAttribute("class", "hover_row row_on");
        }

        // Add a cell for each field
        table_fields = ["article_name", "title", "location", "num_samples",
                        "additional_markers", "run_type", "article_url", "seq_data_url"];
        // The labels that we will asign as attribute label and that will be used when doing the mobile
        // version of the table
        labels = ["Article", "Title", "Location", "#Samples", "Additional markers", "Run type", "Article URL", "Seq data URL"]

        
        table_fields.forEach(function(field_key, index){
            // If url then need to make <a> otherwise plain div
            if (field_key.includes("url")){
                td = document.createElement('td');
                td.setAttribute("label", labels[index]);
                // set the href to the appropriate value
                if (field_key == "article_url"){
                    // Check to see if there is a URL
                    if (article['article_url'].includes('.')){
                        let td_a = document.createElement('a')
                        td_a.setAttribute("href", article['article_url']);
                        let td_a_div = document.createElement('div')
                        td_a_div.setAttribute("style", "height:100%;width:100%")
                        td_a_div.innerHTML = "Article";
                        td_a.appendChild(td_a_div)
                        td.appendChild(td_a)
                    }else{
                        // if not a valid URL
                        td.innerHTML = "--"
                    }


                }else if (field_key == "seq_data_url"){
                    if (article['seq_data_url'].includes('.')){
                        let td_a = document.createElement('a')
                        td_a.setAttribute("href", article['seq_data_url']);
                        let td_a_div = document.createElement('div')
                        td_a_div.setAttribute("style", "height:100%;width:100%")
                        td_a_div.innerHTML = "Data";
                        td_a.appendChild(td_a_div)
                        td.appendChild(td_a)
                    }else{
                        td.innerHTML = "--"
                    }
                }
            }else{
                // if not a url then we need a normal div
                td = document.createElement('td');
                td.setAttribute("label", labels[index]);
                td.innerHTML = article[field_key];
            }
            tr.appendChild(td);
        });
        // Put in the data explorer icon in green if the data explorer is available
        // else we should just put the image in black
        if (article['DataExplorer']){
            let $td = $("<td></td>", {"align":"center"});
            let $form = $("<form></form>", {"action":"", "method":"post"}); $form.appendTo($td);
            let $btn = $("<button></button>", {"class":"DEbtn", "name":"study_to_load", "value":`${article['study_to_load_str']}`}).append('<img src="/static/images/sp_logo_green.svg" style="height:20px;"></img>'); $btn.appendTo($form);
            $td.appendTo(tr);
            tbody.appendChild(tr);
        }else{
            let $td = $("<td></td>", {"align":"center"});
            let $img = $('<img src="/static/images/sp_logo.svg" style="height:20px;"></img>'); $img.appendTo($td);
            $td.appendTo(tr);
            tbody.appendChild(tr);
        }
    });


}






// // populate the published articles table
// published_articles = getPublishedArticlesData()
// populate_article_table(published_articles)