$(document).ready(function () {

    
    /* Populate the tabs that display the information on the DataSet, the DataAnalysis
    and the resources that can be downloaded */
    populate_dataset_dataanalysis_resource_download_cards()
    function populate_dataset_dataanalysis_resource_download_cards(){
        function populate_the_associated_data_set_meta_information() {
            //populate the associated data set meta information
            let data_set_meta_info = getDataSetMetaData();
            let data_set_meta_info_properties_array = [
                "num_datasets", "names(s)", "UID(s)", "num_samples", "time_stamp(s)", "average_sequencing_depth",
                "average_Sym_sequences_absolute", "average_Sym_sequences_unique"
            ];
            let data_set_meta_info_prop_to_key_dict = {
                "num_datasets": "num_associated_data_sets",
                "names(s)": "ds_names",
                "UID(s)": "ds_uids",
                "num_samples": "num_samples",
                "time_stamp(s)": "ds_time_stamps",
                "average_sequencing_depth": "seq_depth_av",
                "average_Sym_sequences_absolute": "sym_seqs_absolute_av",
                "average_Sym_sequences_unique": "sym_seqs_unique_av"
            };
    
            let data_set_meta_info_holder = $("#dataset_info_collapse");
            for (let i = 0; i < data_set_meta_info_properties_array.length; i++) {
                data_set_meta_info_holder.find(".row").append(`<div class="col-sm-6 data_property">${data_set_meta_info_properties_array[i] + ':'}</div>`);
                data_set_meta_info_holder.find(".row").append(`<div class="col-sm-6 data_value">${data_set_meta_info[data_set_meta_info_prop_to_key_dict[data_set_meta_info_properties_array[i]]]}</div>`);
            }
        }
        populate_the_associated_data_set_meta_information();
    
        //populate the data analysis meta information
        function populate_the_data_analysis_meta_information() {
            
            let data_analysis_meta_info = getDataAnalysisMetaInfo();
            let data_analysis_meta_info_properties_array = [
                "name", "UID", "time_stamp", "samples_in_output", "sample_in_analysis",
                "unique_profiles_local", "profile_instances_local", "unique_profiles_analysis", "profile_instances_analysis"
            ];
            let data_analysis_meta_info_prop_to_key_dict = {
                "name": "name",
                "UID": "uid",
                "time_stamp": "time_stamp",
                "samples_in_output": "samples_in_output",
                "sample_in_analysis": "samples_in_analysis",
                "unique_profiles_local": "unique_profile_local",
                "profile_instances_local": "instance_profile_local",
                "unique_profiles_analysis": "unique_profile_analysis",
                "profile_instances_analysis": "instances_profile_analysis"
            };
            let data_analysis_meta_info_holder = $("#analysis_info_collapse");
            for (let i = 0; i < data_analysis_meta_info_properties_array.length; i++) {
                data_analysis_meta_info_holder.find(".row").append(`<div class="col-sm-6 data_property">${data_analysis_meta_info_properties_array[i] + ':'}</div>`);
                data_analysis_meta_info_holder.find(".row").append(`<div class="col-sm-6 data_value">${data_analysis_meta_info[data_analysis_meta_info_prop_to_key_dict[data_analysis_meta_info_properties_array[i]]]}</div>`);
            }
        }
    
        // remove the data analysis meta information card if analysis was not conducted
        function populate_the_data_analysis_meta_infomation_empty(){
            $("#analysis_meta_info_card").remove();
        }
    
        // In some cases we will not have run an analysis and will only have conducted a loading the data.
        // As such we will not have information to populate in the data_analysis_meta_information section
        if (analysis){ 
            populate_the_data_analysis_meta_information();
        }else{
            populate_the_data_analysis_meta_infomation_empty();
        }
        
        function populate_the_downloads_section() {
            // The uncompressed files were far to big to work with
            // The Restrepo analysis for example ended up being round 1Gb
            // Compressed it was closer to 50M.
            // As such we will individually compress all files and provide a download all zip
            // The hrefs given here for the files to be downloaded should therefore
            // all have the .zip extension added to them
            let data_file_paths = getDataFilePaths();
            let data_file_paths_keys = Object.keys(data_file_paths);
            let clade_array = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
            let dist_type_array = ['unifrac', 'braycurtis'];
            let sample_profile_array = ['sample', 'profile'];
            let file_type_array = [
                "post_med_absolute_abund_meta_count", "post_med_absolute_abund_only_count",
                "post_med_absolute_meta_only_count", "post_med_relative_abund_meta_count",
                "post_med_relative_abund_only_count", "post_med_relative_meta_only_count",
                "post_med_fasta", "post_med_additional_info", "pre_med_absolute_count",
                "pre_med_relative_count", "pre_med_fasta", "profile_absolute_abund_meta_count",
                "profile_absolute_abund_only_count", "profile_absolute_meta_only_count",
                "profile_relative_abund_meta_count", "profile_relative_abund_only_count",
                "profile_relative_meta_only_count", "profile_additional_info_file"
            ];
    
            // First populate the files that are in the above file type array
            for (let i = 0; i < file_type_array.length; i++) {
                // Go in order of the file_type_array being sure to check if the file in question
                // is found in the output of this study
                if (data_file_paths_keys.includes(file_type_array[i])) {
                    $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_property">${file_type_array[i] + ':'}</div>`);
                    $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_value"><a href="${study_to_load_path + data_file_paths[file_type_array[i]]}.zip" download>${data_file_paths[file_type_array[i]]}</a></div>`);
                }
            };
    
            // Then we will iterate through the possible distance files that may exist and populate those
            // First go by clade, then sample/profile, then dist type
            for (let i = 0; i < clade_array.length; i++) {
                for (let j = 0; j < sample_profile_array.length; j++) {
                    for (let k = 0; k < dist_type_array.length; k++) {
                        let f_name_dist = "btwn_" + sample_profile_array[j] + "_" + dist_type_array[k] + "_" + clade_array[i] + "_dist";
                        if (data_file_paths_keys.includes(f_name_dist)) {
                            $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_property">${f_name_dist + ':'}</div>`);
                            $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_value"><a href="${study_to_load_path + data_file_paths[f_name_dist]}.zip" download>${data_file_paths[f_name_dist]}</a></div>`);
                        }
                        let f_name_pcoa = "btwn_" + sample_profile_array[j] + "_" + dist_type_array[k] + "_" + clade_array[i] + "_pcoa";
                        if (data_file_paths_keys.includes(f_name_pcoa)) {
                            $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_property">${f_name_pcoa + ':'}</div>`);
                            $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_value"><a href="${study_to_load_path + data_file_paths[f_name_pcoa]}.zip" download>${data_file_paths[f_name_pcoa]}</a></div>`);
                        }
                    }
                }
            }
        }
        populate_the_downloads_section();
    }
    
    // The post-MED meta info populator
    const sample_meta_info_populator = new PopulatePlotMetaInfo({meta_info_method: getSampleMetaInfo, plot_type:'post_med'});
    sample_meta_info_populator.populateMetaInfo()

    // The profile meta info populator
    let profile_meta_info_populator;
    if (analysis){
        profile_meta_info_populator = new PopulatePlotMetaInfo({meta_info_method: getProfileMetaInfo, plot_type: 'profile'});
        profile_meta_info_populator.populateMetaInfo()
    }
    
    // The post_med_stacked_bar_plot, profile_stacked_bar_plot and  and profile 
    /* Create the plot objects via class abstraction
    The post-MED and profile plots share a lot in common and can easily be represented
    as a single classs. However, the  modal stacked bar plot is much more complicated.
    It has basically double of everything that the simple stacked bar plots have.
    I don't think its a good idea to work with a base class is extended. It will be to 
    complicated and the abstraction will not be clear. Instead I think it will be
    easiest and clearest to have a seperate class. We can call the classes
    SimpleStackedBarPlot and ModalStackedBarPlot.*/
    const post_med_stacked_bar_plot = new SimpleStackedBarPlot(
        {name_of_html_svg_object: "#chart_post_med", get_data_method: getRectDataPostMEDBySample, 
        get_max_y_val_method: getRectDataPostMEDBySampleMaxSeq, sample_meta_info_method: getSampleMetaInfo, 
        profile_meta_info_method: getProfileMetaInfo, plot_type: 'post_med'}
    );
    
    if (analysis){
        const profile_stacked_bar_plot = new SimpleStackedBarPlot(
            {name_of_html_svg_object: "#chart_profile", get_data_method: getRectDataProfileBySample,
            get_max_y_val_method: getRectDataProfileBySampleMaxSeq, sample_meta_info_method: getSampleMetaInfo, 
            profile_meta_info_method: getProfileMetaInfo,plot_type: 'profile'}
        );
        const modal_stacked_bar_plot = new ModalStackedBarPlot();
    } else {
        // Hide the card if the data to populate it doesn't exist
        $("#profile_card").css("display", "none");
        // if the profile data doesn't exist then we don't have need for the modal so we should hide
        // the modal buttons.
        $(".viewer_link_seq_prof").remove();
    }
    // The modal plot will init itself once the lister for the modal opening is fired.
    
    // Init the two distance plots
    // First need to check to see if we are working with the bray curtis
    // or the unifrac distance
    // TODO this will need updating to incorporate all distance types
    // For the time being we will leave the code as it is
    // TODO we are here. Time for debugging.
    if (typeof getBtwnSampleDistCoordsBC === "function") {
        // use the braycurtis objects
        const btwn_sample_plot = new DistancePlot({
            name_of_html_svg_object: "#chart_btwn_sample", 
            coord_data_method: getBtwnSampleDistCoordsBC, 
            pc_variance_method: getBtwnSampleDistPCVariancesBC, 
            available_pcs_method: getBtwnSampleDistPCAvailableBC, 
            plot_type: 'sample'});
    } else if (typeof getBtwnSampleDistCoordsUF === "function") {
        // use the unifrac objects
        const btwn_sample_plot = new DistancePlot({
            name_of_html_svg_object: "#chart_btwn_sample", 
            coord_data_method: getBtwnSampleDistCoordsUF, 
            pc_variance_method: getBtwnSampleDistPCVariancesUF, 
            available_pcs_method: getBtwnSampleDistPCAvailableUF, 
            plot_type: 'sample'});
    }
    
    // Distance colors
    // Process between samples first and then profiles because profiles may not exist and so may not need processing

    // INIT the color by drop down for the btwn sample and the btwn profile dist plots
    let btwn_sample_color_categories = ["host", "location", "post_med_seqs_absolute", "post_med_seqs_unique", "no_color"];
    // We don't want to allow sorting by host or location if we don't have data for these. We can check to see if
    // there is data for these by looking to see if there are sorting arrays for them.
    if (!(sorting_keys.includes("taxa_string"))) {
        btwn_sample_color_categories.splice(btwn_sample_color_categories.indexOf("host"), 1);
    }
    if (!(sorting_keys.includes("lat_lon"))) {
        btwn_sample_color_categories.splice(btwn_sample_color_categories.indexOf("location"), 1);
    }
    let btwn_sample_c_cat_key = {
        "host": "taxa_string",
        "location": "lat_lon",
        "post_med_seqs_absolute": "post_med_absolute",
        "post_med_seqs_unique": "post_med_unique"
    };
    
    let color_dropdown_to_populate = $("#between_sample_distances").find(".color_select");
    for (let i = 0; i < btwn_sample_color_categories.length; i++) {
        color_dropdown_to_populate.append(`<a class="dropdown-item" data-color=${btwn_sample_color_categories[i]}>${btwn_sample_color_categories[i]}</a>`);
    }

    // // Create the color scales for the above parameters
    // // We will need quantitative scales for the post_med_seqs_absolute, post_med_seqs_unique
    // // This will be the same sort of scale as we use for the axes of the dist and the y of the bar
    // // For the host and location we will need to use something different.
    // // For each we will need to have either the list of categorical variables (i.e. the taxa strings or lat long)
    // // Or we will need the max and min of the quantitative values
    // // go cat by cat
    // let host_c_scale;
    // let location_c_scale;
    // let post_med_absolute_c_scale;
    // let post_med_unique_c_scale;

    // function make_categorical_color_scale_btwn_sample(cat_name) {
    //     let key_name = btwn_sample_c_cat_key[cat_name];
    //     //need to get the list of taxa string
    //     let cats_array = [];
    //     Object.keys(sample_meta_info_populator.meta_info).forEach(function (k) {
    //         let cat;
    //         if (cat_name == "location") {
    //             cat = sample_meta_info_populator.meta_info[k]["lat"] + ';' + sample_meta_info_populator.meta_info[k]["lat"];
    //         } else {
    //             cat = sample_meta_info_populator.meta_info[k][key_name];
    //         }

    //         if (!(cats_array.includes(cat))) {
    //             cats_array.push(cat);
    //         }
    //     });
    //     // here we have a unique list of the 'host' values
    //     // now create the colour scale for it
    //     return c_var = d3.scaleOrdinal().domain(cats_array).range(d3.schemeSet3);
    // }

    // function make_quantitative_color_scale_btwn_sample(cat_name) {
    //     let key_name = btwn_sample_c_cat_key[cat_name];
    //     //need to get the list of taxa string
    //     let values = [];
    //     Object.keys(sample_meta_info_populator.meta_info).forEach(function (k) {
    //         values.push(sample_meta_info_populator.meta_info[k][key_name]);
    //     });
    //     let max_val = Math.max(...values);
    //     let min_val = Math.min(...values);
    //     // here we have a unique list of the 'host' values
    //     // now create the colour scale for it
    //     return d3.scaleLinear().domain([min_val, max_val]).range(["blue", "red"]);
    // }

    // if (btwn_sample_color_categories.includes("host")) {
    //     host_c_scale = make_categorical_color_scale_btwn_sample("host");
    // }
    // if (btwn_sample_color_categories.includes("location")) {
    //     location_c_scale = make_categorical_color_scale_btwn_sample("location");
    // }
    // post_med_absolute_c_scale = make_quantitative_color_scale_btwn_sample("post_med_seqs_absolute");
    // post_med_unique_c_scale = make_quantitative_color_scale_btwn_sample("post_med_seqs_unique");

    // // Now profiles
    // let btwn_profile_c_cat_key;
    // let profile_local_abund_c_scale;
    // let profile_db_abund_c_scale;
    // let profile_idenity_c_scale;
    // if (analysis){
        
    //     let btwn_profile_color_categories = ["profile_identity", "local_abundance", "db_abundance"]
        
    //     btwn_profile_c_cat_key = {
    //         "local_abundance": "local_abund",
    //         "db_abundance": "db_abund"
    //     };

    //     color_dropdown_to_populate = $("#between_profile_distances").find(".color_select");
    //     for (let i = 0; i < btwn_profile_color_categories.length; i++) {
    //         color_dropdown_to_populate.append(`<a class="dropdown-item" data-color=${btwn_profile_color_categories[i]}>${btwn_profile_color_categories[i]}</a>`);
    //     }

    //     function make_quantitative_color_scale_btwn_profile(cat_name) {
    //         let key_name = btwn_profile_c_cat_key[cat_name];
    //         //need to get the list of taxa string
    //         let values = [];
    //         Object.keys(profile_meta_info_populator.meta_info).forEach(function (k) {
    //             values.push(profile_meta_info_populator.meta_info[k][key_name]);
    //         });
    //         let max_val = Math.max(...values);
    //         let min_val = Math.min(...values);
    //         // here we have a unique list of the 'host' values
    //         // now create the colour scale for it
    //         return d3.scaleLinear().domain([min_val, max_val]).range(["blue", "red"]);
    //     }

    //     profile_local_abund_c_scale = make_quantitative_color_scale_btwn_profile("local_abundance");
    //     profile_db_abund_c_scale = make_quantitative_color_scale_btwn_profile("db_abundance");
    //     profile_idenity_c_scale = d3.scaleOrdinal().domain(Object.keys(profile_meta_info_populator.meta_info)).range(Object.keys(profile_meta_info_populator.meta_info).map(k => profile_meta_info_populator.meta_info[k]["color"]));
    // }

    //DATA for btwn sample
    let svg_btwn_sample_dist = d3.select("#chart_btwn_sample");
    let btwn_sample_data_available = false;
    let btwn_sample_genera_coords_data;
    let btwn_sample_genera_pc_variances;
    let available_pcs_btwn_samples;
    let btwn_sample_genera_array;
    let x_btwn_sample;
    let y_btwn_sample;
    let xAxis_btwn_sample;
    let yAxis_btwn_sample;
    // Distance plots heights and widths
    let dist_width = +svg_btwn_sample_dist.attr("width") - dist_margin.left - dist_margin.right;
    let dist_height = +svg_btwn_sample_dist.attr("height") - dist_margin.top - dist_margin.bottom;
    // Set up the zoom object (one for all dist plots)
    let zoom = d3.zoom()
        .scaleExtent([.5, 20]) // This control how much you can unzoom (x0.5) and zoom (x20)
        .extent([
            [0, 0],
            [dist_width, dist_height]
        ])
        .on("zoom", update_dist_plot_zoom);
    // Setup the tool tip
    //Dist plot tool tip
    let dist_tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("visibility", "hidden");
    let sample_list_btwn_sample_dist = {};
    let scatter_btwn_sample;
    if (typeof getBtwnSampleDistCoordsBC === "function") {
        // use the braycurtis objects
        btwn_sample_genera_coords_data = getBtwnSampleDistCoordsBC();
        btwn_sample_genera_pc_variances = getBtwnSampleDistPCVariancesBC();
        available_pcs_btwn_samples = getBtwnSampleDistPCAvailableBC();
        btwn_sample_genera_array = Object.keys(btwn_sample_genera_coords_data);
        btwn_sample_data_available = true;
    } else if (typeof getBtwnSampleDistCoordsUF === "function") {
        // use the unifrac objects
        btwn_sample_genera_coords_data = getBtwnSampleDistCoordsUF();
        btwn_sample_genera_pc_variances = getBtwnSampleDistPCVariancesUF();
        available_pcs_btwn_samples = getBtwnSampleDistPCAvailableUF();
        btwn_sample_genera_array = Object.keys(btwn_sample_genera_coords_data);
        btwn_sample_data_available = true;
    } else {
        // btwn_sample data not available
        // make display none for the btwn sample card
        $("#between_sample_distances").css("display", "none");
    }
    if (btwn_sample_data_available) {
        x_btwn_sample = d3.scaleLinear()
            .range([dist_margin.left, dist_width - dist_margin.right]);
        y_btwn_sample = d3.scaleLinear()
            .rangeRound([dist_height - dist_margin.bottom, dist_margin.top]);
        init_genera_pc_dropdown_dist_plots("#between_sample_distances", btwn_sample_genera_array, available_pcs_btwn_samples);
        // setup the group for holding the axes
        xAxis_btwn_sample = svg_btwn_sample_dist.append("g").attr("class", "grey_axis")
            .attr("transform", `translate(0,${dist_height - dist_margin.bottom})`)
            .attr("id", "x_axis_btwn_sample");
        yAxis_btwn_sample = svg_btwn_sample_dist.append("g").attr("class", "grey_axis")
            .attr("transform", `translate(${dist_margin.left},0)`)
            .attr("id", "y_axis_btwn_sample");
        // Init btwn sample sample list
        for (let i = 0; i < btwn_sample_genera_array.length; i++) {
            let genera = btwn_sample_genera_array[i];
            sample_list_btwn_sample_dist[genera] = Object.keys(btwn_sample_genera_coords_data[genera]);
        }
        // Add a clip
        svg_btwn_sample_dist.append("defs").append("clipPath")
            .attr("id", "sample_clip")
            .append("rect")
            .attr("width", dist_width - dist_margin.right - dist_margin.left)
            .attr("height", dist_height - dist_margin.bottom - dist_margin.top)
            .attr("x", dist_margin.left)
            .attr("y", dist_margin.top);
        // This is the group where we will do the drawing and that has the above
        // clipping mask applied to it
        scatter_btwn_sample = svg_btwn_sample_dist.append('g')
            .attr("clip-path", "url(#sample_clip)")

        // Call zoom
        svg_btwn_sample_dist.call(zoom);
    }
    //DATA for btwn profiles
    let svg_btwn_profile_dist = d3.select("#chart_btwn_profile");
    let btwn_profile_data_available = false;
    let btwn_profile_genera_coords_data;
    let btwn_profile_genera_pc_variances;
    let available_pcs_btwn_profiles;
    let btwn_profile_genera_array;
    let x_btwn_profile;
    let y_btwn_profile;
    let sample_list_btwn_profile_dist = {};
    let xAxis_btwn_profile;
    let yAxis_btwn_profile;
    let scatter_btwn_profile;
    if (typeof getBtwnProfileDistCoordsBC === "function") {
        // use the braycurtis objects
        btwn_profile_genera_coords_data = getBtwnProfileDistCoordsBC();
        btwn_profile_genera_pc_variances = getBtwnProfileDistPCVariancesBC();
        available_pcs_btwn_profiles = getBtwnProfileDistPCAvailableBC();
        btwn_profile_genera_array = Object.keys(btwn_profile_genera_coords_data);
        btwn_profile_data_available = true;
    } else if (typeof getBtwnProfileDistCoordsUF === "function") {
        // use the unifrac objects
        btwn_profile_genera_coords_data = getBtwnProfileDistCoordsUF();
        btwn_profile_genera_pc_variances = getBtwnProfileDistPCVariancesUF();
        available_pcs_btwn_profiles = getBtwnProfileDistPCAvailableUF();
        btwn_profile_genera_array = Object.keys(btwn_profile_genera_coords_data);
        btwn_profile_data_available = true;
    } else {
        // btwn_sample data not available
        // make display none for the btwn sample card
        $("#between_profile_distances").css("display", "none");
    }
    if (btwn_profile_data_available) {
        x_btwn_profile = d3.scaleLinear()
            .range([dist_margin.left, dist_width - dist_margin.right]);
        y_btwn_profile = d3.scaleLinear()
            .rangeRound([dist_height - dist_margin.bottom, dist_margin.top]);
        init_genera_pc_dropdown_dist_plots("#between_profile_distances", btwn_profile_genera_array, available_pcs_btwn_profiles);
        // The group for holding the axes
        xAxis_btwn_profile = svg_btwn_profile_dist.append("g").attr("class", "grey_axis")
            .attr("transform", `translate(0,${dist_height - dist_margin.bottom})`)
            .attr("id", "x_axis_btwn_profile");
        yAxis_btwn_profile = svg_btwn_profile_dist.append("g").attr("class", "grey_axis")
            .attr("transform", `translate(${dist_margin.left},0)`)
            .attr("id", "y_axis_btwn_profile");
        // Init the btwn_sample profile list
        for (let i = 0; i < btwn_profile_genera_array.length; i++) {
            let genera = btwn_profile_genera_array[i];
            sample_list_btwn_profile_dist[genera] = Object.keys(btwn_profile_genera_coords_data[genera]);
        }
        // Add a clip
        svg_btwn_profile_dist.append("defs").append("clipPath")
            .attr("id", "profile_clip")
            .append("rect")
            .attr("width", dist_width - dist_margin.right - dist_margin.left)
            .attr("height", dist_height - dist_margin.bottom - dist_margin.top)
            .attr("x", dist_margin.left)
            .attr("y", dist_margin.top);

        // This is the group where we will do the drawing and that has the above
        // clipping mask applied to it
        scatter_btwn_profile = svg_btwn_profile_dist.append('g')
            .attr("clip-path", "url(#profile_clip)")

        svg_btwn_profile_dist.call(zoom);
    }


    // Init the text value of the genera_identifier in each of the distance plots
    // INIT the genera drop down
    // INIT the PC drop down
    function init_genera_pc_dropdown_dist_plots(card_id, genera_present, pcs_available) {
        let genera_array = ['Symbiodinium', 'Breviolum', 'Cladocopium', 'Durusdinium'];
        let card_element = $(card_id);
        let first_genera_present;
        for (let j = 0; j < genera_array.length; j++) {
            // init the genera_indentifier with the first of the genera in the genera_array that we have data for
            // We only want to do this for the first genera that we find so we check whether the data-genera attribute
            // already has been set or not.
            if (genera_present.includes(genera_array[j])) {
                let attr = card_element.find(".genera_identifier").attr("data-genera");
                if (typeof attr !== typeof undefined && attr !== false) {
                    // then already set. just add genera link
                    card_element.find('.genera_select').append(`<a class="dropdown-item" style="font-style:italic;" data-genera="${genera_array[j]}">${genera_array[j]}</a>`);
                } else {
                    // then genera_identifier not set
                    card_element.find(".genera_identifier").text(genera_array[j]);
                    card_element.find(".genera_identifier").attr("data-genera", genera_array[j]);
                    card_element.find(".genera_select_button").text(genera_array[j]);
                    card_element.find(".genera_select_button").attr("data-genera", genera_array[j]);
                    card_element.find('.genera_select').append(`<a class="dropdown-item" style="font-style:italic;" data-genera="${genera_array[j]}">${genera_array[j]}</a>`);
                    first_genera_present = genera_array[j];
                }
            }
        }
        let pcs_available_genera = pcs_available[first_genera_present];
        // Skip the first PC as we don't want PC1 in the options
        for (let j = 1; j < pcs_available_genera.length; j++) {
            card_element.find(".pc_select").append(`<a class="dropdown-item" data-pc="${pcs_available_genera[j]}">${pcs_available_genera[j]}</a>`)
        }
    }


    // Functions for doing the init and updating of the d3 dist plots
    function update_dist_plot(dist_plot_id) {
        let svg;
        let scatter;
        let coords;
        let pc_variances;
        let first_pc_variance;
        let second_pc_variance;
        let pcs_available;
        let sample_array;
        let second_pc;
        let genera;
        let x_scale;
        let y_scale;
        let data = [];
        let x_axis_id;
        let y_axis_id;
        let meta_look_up_dict;
        let uid_to_name_dict;
        let meta_item_type; // ".sample_meta_item" or ".profile_meta_item"
        let c_scale = false;
        let c_property; // the property that we need to look up in the meta info
        let col_key; //The property that will be used to define the colour scale

        //TODO this will need updating to include the profile distances and the modals
        // but to save dev time we will try to get the scatter working with just this one first
        switch (dist_plot_id) {
            // I think we should simplify the data here according to the various selections that have been made
            // The first will be to look at genera, then PC. The colour will be done using the colour scale eventually
            // but first I will just do this as black and we can dev this later.
            // We want to end up with two arrays, one for the x and one for the y
            case "#chart_btwn_sample":
                svg = svg_btwn_sample_dist;
                scatter = scatter_btwn_sample;
                pc_variances = btwn_sample_genera_pc_variances;

                x_axis_id = "#x_axis_btwn_sample";
                y_axis_id = "#y_axis_btwn_sample";
                // get the genera
                // NB the genera identifier is updated from the click of the genera drop down or
                // as part of the init.
                genera = $(dist_plot_id).closest(".card").find(".genera_identifier").attr("data-genera");
                pcs_available = available_pcs_btwn_samples[genera];
                sample_array = sample_list_btwn_sample_dist[genera];
                coords = btwn_sample_genera_coords_data[genera];
                x_scale = x_btwn_sample;
                y_scale = y_btwn_sample;
                meta_look_up_dict = sample_meta_info_populator.meta_info;
                uid_to_name_dict = sample_meta_info_populator.name_to_uid_dict;
                meta_item_type = ".sample_meta_item"
                // Get the correct btwn sample c_scale to be used. We get this from the
                col_key = $(dist_plot_id).closest(".plot_item").find(".color_select_button").attr("data-color");
                switch (col_key) {
                    case "host":
                        c_scale = host_c_scale;
                        c_property = btwn_sample_c_cat_key["host"];
                        break;
                    case "location":
                        c_scale = location_c_scale;
                        c_property = btwn_sample_c_cat_key["location"];
                        break;
                    case "post_med_seqs_absolute":
                        c_scale = post_med_absolute_c_scale;
                        c_property = btwn_sample_c_cat_key["post_med_seqs_absolute"];
                        break;
                    case "post_med_seqs_unique":
                        c_scale = post_med_unique_c_scale;
                        c_property = btwn_sample_c_cat_key["post_med_seqs_unique"];
                        break;
                }
                break;
            case "#chart_btwn_profile":
                svg = svg_btwn_profile_dist;
                scatter = scatter_btwn_profile;
                pc_variances = btwn_profile_genera_pc_variances;
                x_axis_id = "#x_axis_btwn_profile";
                y_axis_id = "#y_axis_btwn_profile";
                // get the genera
                // NB the genera identifier is updated from the click of the genera drop down or
                // as part of the init.
                genera = $(dist_plot_id).closest(".card").find(".genera_identifier").attr("data-genera");
                pcs_available = available_pcs_btwn_profiles[genera];
                sample_array = sample_list_btwn_profile_dist[genera];
                coords = btwn_profile_genera_coords_data[genera];
                x_scale = x_btwn_profile;
                y_scale = y_btwn_profile;
                meta_look_up_dict = profile_meta_info_populator.meta_info;
                uid_to_name_dict = profile_meta_info_populator.name_to_uid_dict;
                meta_item_type = ".profile_meta_item"
                // Get the correct btwn profile c_scale to be used. We get this from the
                col_key = $(dist_plot_id).closest(".plot_item").find(".color_select_button").attr("data-color");
                switch (col_key) {
                    case "local_abundance":
                        c_scale = profile_local_abund_c_scale;
                        c_property = btwn_profile_c_cat_key["local_abundance"];
                        break;
                    case "db_abundance":
                        c_scale = profile_db_abund_c_scale;
                        c_property = btwn_profile_c_cat_key["db_abundance"];
                        break;
                    case "profile_identity":
                        c_scale = profile_idenity_c_scale;
                        c_property = "profile_identity";
                        break;
                }
                break;
        }


        // get the second PC from the PC selector
        let pc_selector_text = $(dist_plot_id).closest(".card-body").find(".pc_selector").attr("data-pc");
        if (pc_selector_text == "PC:") {
            second_pc = "PC2";
        } else {
            second_pc = pc_selector_text;
        }

        first_pc_variance = pc_variances[genera][pcs_available.indexOf("PC1")];
        second_pc_variance = pc_variances[genera][pcs_available.indexOf(second_pc)];

        // Populate the data array that will be used for plotting
        for (let i = 0; i < sample_array.length; i++) {
            let sample = sample_array[i]
            data.push({
                sample: sample,
                x: +coords[sample]["PC1"],
                y: +coords[sample][second_pc]
            })
        }

        let min_x = d3.min(data, d => +d.x);
        let max_x = d3.max(data, d => +d.x);
        let min_y = d3.min(data, d => +d.y);
        let max_y = d3.max(data, d => +d.y);

        // A buffer so that the points don't fall exactly on the axis lines
        let x_buffer = (max_x - min_x) * 0.05;
        let y_buffer = (max_y - min_y) * 0.05;

        x_scale.domain([min_x - x_buffer, max_x + x_buffer]);
        y_scale.domain([min_y - y_buffer, max_y + y_buffer]);

        d3.select(x_axis_id)
            .transition()
            .duration(1000)
            .call(d3.axisBottom(x_scale).ticks(0));

        d3.select(y_axis_id)
            .transition()
            .duration(1000)
            .call(d3.axisLeft(y_scale).ticks(0));


        // We need to process the profile and sample dist plots diffently because they should have different
        // Here do the plotting of the scatter
        let dots = scatter.selectAll("circle").data(data, function (d) {
            return d.sample;
        });

        // Place any new scatter points
        //TODO we can add more info to the tool tip like absolute and relative abundances of the samples or profiles
        dots.enter().append("circle").attr("class", "dot").attr("r", 3.5).attr("cx", function (d) {
                return x_scale(d.x);
            }).attr("cy", d => y_scale(d.y))
            .style("fill", function (d) {
                if (c_scale) {
                    if (c_property == "lat_lon") {
                        let lat_lon_str = meta_look_up_dict[d.sample]["lat"] + ';' + meta_look_up_dict[d.sample]["lon"];
                        return c_scale(lat_lon_str);
                    } else if (c_property == "profile_identity") {
                        return c_scale(d.sample);
                    } else {
                        return c_scale(meta_look_up_dict[d.sample][c_property]);
                    }
                } else {
                    return "rgba(0,0,0,0.5)";
                }
            })
            .on("mouseover", function (d) {
                // Display the tool tip on the dist plot point
                dist_tooltip.transition().duration(200).style("visibility", "visible");
                // First we need to look at what the drop down currently says.
                let data_series = meta_look_up_dict[d.sample.toString()];
                let current_color = $(this).closest(".plot_item").find('.color_select_button').attr("data-color");
                let content_key;
                let additional_content;
                let content;
                let $plot_item = $(this).closest(".plot_item");
                let c_cat_key_obj;
                let default_val;
                if ($plot_item.attr("id") == "between_sample_distances") {
                    // Then we're working with the between sample dist
                    c_cat_key_obj = btwn_sample_c_cat_key;
                    default_val = 'no_color';
                } else {
                    // Then we're working with the between profile dist
                    c_cat_key_obj = btwn_profile_c_cat_key;
                    default_val = 'profile_identity';
                }

                if (current_color != default_val) {
                    // Then we can display additional info in the div
                    content_key = c_cat_key_obj[current_color];
                    additional_content = data_series[content_key];
                    content = `<div>${data_series["name"]}</div><div style="font-size:0.5rem;"><span style="font-weight:bold;">${current_color}: </span><span>${additional_content}</span></div>`
                } else {
                    //Then we just display the sample/profile name
                    content = `${data_series["name"]}`
                }

                dist_tooltip.html(content).style("left", (d3.event.pageX + 5) + "px").style("top", (d3.event.pageY - 28) + "px");

                // Apply the information in the sample/profile meta info area
                // First we need to get the genera/clade
                $(this).closest(".plot_item").find(meta_item_type).each(function () {
                    $(this).text(data_series[$(this).attr("data-key")]);
                });
            })
            .on("mouseout", function (d) {
                dist_tooltip.transition().duration(500).style("visibility", "hidden");
            });

        // Update any changes to points that already exist
        dots.transition().duration(1000).attr("cx", d => x_scale(d.x)).attr("cy", d => y_scale(d.y))
            .style("fill", function (d) {
                if (c_scale) {
                    if (c_property == "lat_lon") {
                        let lat_lon_str = meta_look_up_dict[d.sample]["lat"] + ';' + meta_look_up_dict[d.sample]["lon"];
                        return c_scale(lat_lon_str);
                    } else if (c_property == "profile_identity") {
                        return c_scale(d.sample);
                    } else {
                        return c_scale(meta_look_up_dict[d.sample][c_property]);
                    }
                } else {
                    return "rgba(0,0,0,0.5)";
                }
            });

        // Remove points
        dots.exit().remove()

        // X axis should be PC1
        // Y axis will be the other PC
        // Y axis title
        //we need to be able to change the axis titles so we will give them ids and then
        // check to see if they exist. if they do, simply change text otherwise make from scratch
        let text_x = 15;
        let text_y = dist_height / 2;
        let y_axis_selection = $(dist_plot_id).find(".y_axis_title")
        if (y_axis_selection.length) {
            // Then the y axis title exists. Change the text of this axis
            y_axis_selection.text(`${second_pc} - ${Number.parseFloat(second_pc_variance*100).toPrecision(2)}%`)
        } else {
            // yaxis doesn't exist. make from scratch
            svg.append("text").attr("class", "y_axis_title")
                .attr("y", text_y)
                .attr("x", text_x)
                .attr("dy", "1em").attr("font-size", "0.8rem")
                .style("text-anchor", "middle")
                .text(`${second_pc} - ${Number.parseFloat(second_pc_variance*100).toPrecision(2)}%`)
                .attr("transform", `rotate(-90, ${text_x}, ${text_y})`);
        }

        // X axis title
        text_x = dist_width / 2;
        text_y = dist_height - 15;
        let x_axis_selection = $(dist_plot_id).find(".x_axis_title")
        if (x_axis_selection.length) {
            // Then the y axis title exists. Change the text of this axis
            x_axis_selection.text(`PC1 - ${Number.parseFloat(first_pc_variance*100).toPrecision(2)}%`)
        } else {
            // yaxis doesn't exist. make from scratch
            svg.append("text").attr("class", "x_axis_title")
                .attr("y", text_y)
                .attr("x", text_x)
                .attr("dy", "1em").attr("font-size", "0.8rem")
                .style("text-anchor", "middle")
                .text(`PC1 - ${Number.parseFloat(first_pc_variance*100).toPrecision(2)}%`);
        }

    }

    function update_dist_plot_zoom() {
        let newX;
        let newY;
        let scatter;
        let x_axis_id;
        let y_axis_id;
        if (this.id.includes("sample")) {
            // recover the new scale
            newX = d3.event.transform.rescaleX(x_btwn_sample);
            newY = d3.event.transform.rescaleY(y_btwn_sample);
            x_axis_id = "#x_axis_btwn_sample";
            y_axis_id = "#y_axis_btwn_sample";
            scatter = scatter_btwn_sample;
        } else {
            // recover the new scale
            newX = d3.event.transform.rescaleX(x_btwn_profile);
            newY = d3.event.transform.rescaleY(y_btwn_profile);
            x_axis_id = "#x_axis_btwn_profile";
            y_axis_id = "#y_axis_btwn_profile";
            scatter = scatter_btwn_profile;
        }
        // update axes with these new boundaries
        d3.select(x_axis_id).call(d3.axisBottom(newX).ticks(0));
        d3.select(y_axis_id).call(d3.axisLeft(newY).ticks(0));

        // update circle position
        scatter.selectAll("circle").attr('cx', function (d) {
            return newX(d.x)
        }).attr('cy', function (d) {
            return newY(d.y)
        });
    }

    // Listening for the bar chart sorting button clicks
    $(".svg_sort_by a").click(function () {
        let current_text = $(this).closest(".btn-group").find(".btn").text();
        let selected_text = $(this).text()
        // Only proceed if the button text has changed
        if (current_text !== selected_text) {
            $(this).closest(".btn-group").find(".btn").text(selected_text);

            let data_type;
            let pre_post_profile;
            let sample_list;
            let init_speed;
            $(this).closest(".btn-group-sm").find(".dtype-btn").each(function () {
                // We need to infer the rel_abs from the primary coloured button
                if ($(this).hasClass("btn-primary")) {
                    pre_post_profile = $(this).attr("data-data-type");
                    data_type = $(this).text();
                }
            });

            //TODO perform sorting here.
            // In place of getting a new sample order for real we will simply
            // reverse the current one
            if (pre_post_profile == "post-profile") {
                // Then this is the modal being re-sorted
                sample_list_modal = sorted_sample_uid_arrays[selected_text];
                // Update post modal
                update_bar_plot_by_sample(data_type, "post-modal",
                    sample_list_modal, post_med_init_by_sample_interval);
                // Update profile modal
                update_bar_plot_by_sample(data_type, "profile-modal",
                    sample_list_modal, profile_init_by_sample_interval);
            } else {
                // Then this is not the modal being re-sorted
                switch (pre_post_profile) {
                    case "post":
                        sample_list_post = sorted_sample_uid_arrays[selected_text];
                        sample_list = sample_list_post;
                        init_speed = post_med_init_by_sample_interval;
                        break;
                    case "pre":
                        sample_list_pre = sorted_sample_uid_arrays[selected_text];
                        sample_list = sample_list_pre;
                        init_speed = pre_med_init_by_sample_interval;
                        break;
                    case "profile":
                        sample_list_profile = sorted_sample_uid_arrays[selected_text];
                        sample_list = sample_list_profile;
                        init_speed = profile_init_by_sample_interval;
                        break;
                }
                update_bar_plot_by_sample(data_type, pre_post_profile, sample_list, pre_med_init_by_sample_interval)

            }
        }

    });

    function init_pc_change_listener(){
        //When the genra drop down is created we delete and repopulate the PC drop down menu
        // Upon doing so, we need to reinit the listener for the PC drop down click.
        // Hence we have this method rather than just creating the listener once
        // Listenting for the PC change on the distance plots
        $(".pc_select a").click(function () {
        let pc_button = $(this).closest(".btn-group").find(".btn")
        let current_pc = pc_button.attr("data-pc");
        let selected_pc = $(this).attr("data-pc")

        if (current_pc !== selected_pc) {
            pc_button.text(selected_pc);
            pc_button.attr("data-pc", selected_pc);

            // We need to get the chart is
            // TODO eventually we will want to link this into the modal as well so that it mirrors the non-modal
            chart_id = '#' + pc_button.closest('.card').find('.chart').attr("id");

            update_dist_plot(chart_id);
        }
    });
    }
    init_pc_change_listener();
    
    

    // Listening for the Genera dropdown button change
    $(".genera_select a").click(function () {
        let genera_button = $(this).closest(".btn-group").find(".btn")
        let current_genera = genera_button.attr("data-genera");
        let selected_genera = $(this).attr("data-genera")

        function update_pc_dropd_on_genera_change(card_id) {
            //We need to change the PCs that are available accordingly. This cannot be done in the update_dist_plot
            //If we were to do it there the PC options would be reset everytime the chart got updated, inluding
            // when a new PC was selected. So instead, we will do it here.
            // We should be able to do this from just knowing the chart id
            let pcs_available;
            if (card_id == "#between_sample_distances") {
                pcs_available = available_pcs_btwn_samples[selected_genera];
            } else {
                // between profile distances
                pcs_available = available_pcs_btwn_profiles[selected_genera];
            }
            let $pc_select = $(card_id).find(".pc_select");
            

            $pc_select.empty()
            // Skip PC1 in the for loop
            for (let j = 1; j < pcs_available.length; j++) {
                $pc_select.append(`<a class="dropdown-item" data-pc="${pcs_available[j]}">${pcs_available[j]}</a>`);
            }
            // Then reset the button so that PC1 and PC2 will be used for the distance plot update
            $(card_id).find(".pc_selector").attr("data-pc", "PC2").html("PC2");
        }

        if (current_genera !== selected_genera) {
            genera_button.text(selected_genera);
            genera_button.attr("data-genera", selected_genera);

            // We need to get the chart is
            let chart_id = '#' + genera_button.closest('.card').find('.chart').attr("id");
            let card_id = '#' + genera_button.closest('.card').attr("id");

            genera_button.closest('.plot_item').find(".genera_identifier").text(selected_genera);
            genera_button.closest('.plot_item').find(".genera_identifier").attr("data-genera", selected_genera);

            update_pc_dropd_on_genera_change(card_id)
            update_dist_plot(chart_id);
            init_pc_change_listener();
        }
        
    });

    //Listening for the color dropdown button change
    $(".color_select a").click(function () {
        let color_button = $(this).closest(".btn-group").find(".btn")
        let current_color = color_button.attr("data-color");
        let selected_color = $(this).attr("data-color")

        if (current_color !== selected_color) {
            color_button.text(selected_color);
            color_button.attr("data-color", selected_color);

            // We need to get the chart is
            // TODO eventually we will want to link this into the modal as well so that it mirrors the non-modal
            chart_id = '#' + color_button.closest('.card').find('.chart').attr("id");

            update_dist_plot(chart_id);
        }
    });

    // Listening for the click of a more v button to show secondary sample meta info
    $(".secondary_meta_info_collapser").click(function () {
        // Change the text of the button div
        if ($(this).attr("data-status") == "more") {
            $(this).text('less ^');
            $(this).attr("data-status", "less");
        } else if ($(this).attr("data-status") == "less") {
            $(this).text('more v');
            $(this).attr("data-status", "more");
        }
    })

    //INIT MAP if lat_lon data available
    // TODO we will want a list of the unique sites
    // We will also want a dict of site to samples uid array
    if (sorting_keys.includes('lat_lon')) {
        // If there is data to do a map then set the helper text
        $("#map_helper_text").text("Click markers for site details")
        
        let unique_site_set = new Set();
        let sample_meta_info_keys = Object.keys(sample_meta_info_populator.meta_info);
        // Create and init the site to sample uid dict. we will use this similar to a python defualtdict(list)
        let site_to_sample_uid_dict = {};
        // Keep track of the largest and smallest lat and long so that we can work out an average to center the map on
        let max_lat = -90;
        let min_lat = +90;
        let max_lon = -180;
        let min_lon = +180;

        // Need to take into account that samples with bad or no lat lon details will have been set to the 
        // default value of 999
        for (let i = 0; i < sample_meta_info_keys.length; i++) {
            let sample_obj = sample_meta_info_populator.meta_info[sample_meta_info_keys[i]];
            let numeric_lat = +sample_obj['lat'];
            let numeric_lon = +sample_obj['lon'];
            if (numeric_lat == 999 || numeric_lon == 999) {
                continue;
            }
            if (numeric_lat > max_lat) {
                max_lat = numeric_lat;
            }
            if (numeric_lat < min_lat) {
                min_lat = numeric_lat;
            }
            if (numeric_lon > max_lon) {
                max_lon = numeric_lon;
            }
            if (numeric_lon < min_lon) {
                min_lon = numeric_lon;
            }
            let lat_lon_str = sample_obj['lat'].toString() + ';' + sample_obj['lon'].toString();
            unique_site_set.add(lat_lon_str);
            // if lat_lon already in the dict then simply add the sample uid to the list
            // else create a new list and add the sample uid to this list
            if (Object.keys(site_to_sample_uid_dict).includes(lat_lon_str)) {
                site_to_sample_uid_dict[lat_lon_str].push(sample_meta_info_keys[i]);
            } else {
                site_to_sample_uid_dict[lat_lon_str] = [sample_meta_info_keys[i]];
            }
        }
        // Here we have the unique site set and site to sample uid dict populated and we can now move on to populating the map

        function initMap() {


            // Calculate the position for the center of the map
            let center_location;
            if (unique_site_set.size < 2) {
                center_location = new google.maps.LatLng(max_lat, max_lon);
            } else {
                let center_lat = max_lat - ((max_lat - min_lat) / 2);
                let center_lon = max_lon - ((max_lon - min_lon) / 2);
                center_location = new google.maps.LatLng(center_lat, center_lon);
            }

            // Init the map
            let mapCanvas = document.getElementById('map');
            let mapOptions = {
                center: center_location,
                // We will need to work out how to set this zoom initially
                zoom: 5,
                panControl: false,
                mapTypeId: google.maps.MapTypeId.SATELLITE
            }
            let map = new google.maps.Map(mapCanvas, mapOptions);

            // Here we need to cyle through the unique lat long positions.
            // Create a marker
            // And then create an info window for each of the markers with dynamic content
            unique_site_set.forEach(function (site_loc_str) {
                let lat_numeric = +site_loc_str.split(';')[0];
                let lon_numeric = +site_loc_str.split(';')[1];
                let marker = new google.maps.Marker({
                    position: {
                        lat: lat_numeric,
                        lng: lon_numeric
                    },
                    map: map
                });

                marker.addListener('click', function () {
                    //TODO create the content that will be displayed here
                    let $content_object = $("<div></div>", {
                        "class": "map_info_window"
                    });
                    //Add the spans that will hold the meta info
                    let $meta_div = $('<div></div>');
                    $meta_div.appendTo($content_object);
                    $meta_div.append(`<span class="iwindowprop">lat: </span><span class="iwindowval">${lat_numeric}</span>`) // lat
                    $meta_div.append(`<span class="iwindowprop">lon: </span><span class="iwindowval">${lon_numeric}</span>`) // lat
                    $meta_div.append(`<span class="iwindowprop">site_name: </span><span class="iwindowval">--</span>`) // site_name TODO
                    $meta_div.append(`<span class="iwindowprop">num_samples: </span><span class="iwindowval">${site_to_sample_uid_dict[site_loc_str].length}</span>`) // num_samples
                    // Then the table that will hold data for each sample
                    let $table_div = $('<div></div>');
                    $table_div.appendTo($content_object);

                    let $table = $('<table></table>', {
                        "class": "table table-hover table-sm",
                        "style": "font-size:0.5rem;"
                    });
                    $table.appendTo($table_div);

                    let $thead = $('<thead></thead>');
                    $thead.appendTo($table);
                    let $tr = $('<tr></tr>');
                    $tr.appendTo($thead);
                    $tr.append('<th>sample_name</th>');
                    $tr.append('<th>host_taxa</th>');
                    $tr.append('<th>depth</th>');
                    let $tbody = $('<tbody></tbody>');
                    $tbody.appendTo($table);

                    // Add a tr and cells for every sample of at the location
                    for (let j = 0; j < site_to_sample_uid_dict[site_loc_str].length; j++) {
                        let sample_uid = site_to_sample_uid_dict[site_loc_str][j];
                        $tr = $('<tr></tr>');
                        $tr.appendTo($tbody);
                        $tr.append(`<td>${sample_meta_info_populator.meta_info[sample_uid]["name"]}</td>`);
                        // The full taxa string is really too long here so get the last element that isn't NoData
                        let tax_str = sample_meta_info_populator.meta_info[sample_uid]["taxa_string"];
                        let short_tax = getShortTaxStr(tax_str);
                        $tr.append(`<td>${short_tax}</td>`);
                        $tr.append(`<td>${sample_meta_info_populator.meta_info[sample_uid]["collection_depth"]}</td>`);
                    }
                    // Here we should have the info window content built and stored in the variable $content_object
                    // Now put the info window together
                    let infowindow = new google.maps.InfoWindow();
                    infowindow.setContent($content_object[0]);
                    infowindow.open(map, this);
                });
            });
        }
        // google.maps.event.addDomListener(window, 'load', initMap);
        initMap();
    }else{
        // If there is no map then set the helper text to say this
        $("#map_helper_text").text("No lat lon data for samples. No map available.")
        // Then hide the map object.
        $("#map").css("display", "none");
    }

    function getShortTaxStr(fullTaxStr) {
        let tax_elements = fullTaxStr.split(';');
        tax_elements.reverse();
        let shortTax = "NoData";
        for (let i = 0; i < tax_elements.length; i++) {
            if (tax_elements[i] != "NoData") {
                // If we have a species name then report the first letter of the genera too
                if (i == 0) {
                    if (tax_elements[1] != "NoData") {
                        shortTax = tax_elements[1][0] + '. ' + tax_elements[0];
                        break;
                    } else { // If we don't have the genera then just report the species name
                        shortTax = tax_elements[0];
                        break;
                    }
                } else {
                    shortTax = tax_elements[i];
                    break;
                }
            }
        }
        return shortTax;
    }

    

});