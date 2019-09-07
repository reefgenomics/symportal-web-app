// Media query
var vp_width_match = window.matchMedia("(max-width: 560px)");
var vp_height_match = window.matchMedia("(max-height: 500px)");

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


function populate_article_table(data){

    // Get the table object to which we append rows and cells
    var table = document.getElementById('published_articles_table');

    // For each article create row if published
    data.forEach(function(article, index){
        // If the article is not yet published, then do not add to table
        if (article["published"] == "false"){
            return
        }

        // If published, add row and cells to row.
        var tr = document.createElement('tr');

        // The first row needs to be light, so class .row_off
        // Then alternate to dark and light
        if (index%2 == 0) {//class needs to be off
            tr.setAttribute("class", "article_table_row row_off");
        }else{
            tr.setAttribute("class", "article_table_row row_on");
        }

        // Add a cell for each field
        table_fields = ["article_name", "title", "location", "num_samples",
                        "additional_markers", "run_type", "article_url", "seq_data_url"];

        table_fields.forEach(function(field_key){
            // If url then need to make <a> otherwise plain div
            if (field_key.includes("url")){
                var td = document.createElement('td');
                // set the href to the appropriate value
                if (field_key == "article_url"){
                    td.innerHTML = "Article URL"
//                    td.setAttribute("href", article['article_url']);
//                    var td_div = document.createElement('div')
//                    td_div.setAttribute("style", "height:100%;width:100%")
//                    td_div.innerHTML = "Article URL";
//                    td.appendChild(td_div)

                }else if (field_key == "seq_data_url"){
                    td.innerHTML = "Seq data URL"
//                    td.setAttribute("href", article['seq_data_url']);
//                    var td_div = document.createElement('div')
//                    td_div.setAttribute("style", "height:100%;width:100%")
//                    td_div.innerHTML = "Seq data URL";
//                    td.appendChild(td_div)
                }
            }else{
                // if not a url then we need a normal div
                var td = document.createElement('td');
                td.innerHTML = article[field_key];
            }
            tr.appendChild(td);
        });
        table.appendChild(tr)
    });

//    return tr;


}






// populate the published articles table
published_articles = getPublishedArticlesData()
populate_article_table(published_articles)