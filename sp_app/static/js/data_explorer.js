// d3.json("data/seqs.absolute.json").then(d => chart(d))
//TODO list includes:
// Have a toggle for absolute/relative
// Have a toggle for pre-MED/post-MED




$(document).ready(function () {

    function populate_study_select_dropdown(){
        // Get a list of the studies that have the DataExplorer available
        let pub_articles = getPublishedArticlesData();
        // First add the current study
        $("#study_select").append(`<option value=${study_to_load}>${study_to_load}</option>`)
        pub_articles.forEach(function(article){
            if (article["DataExplorer"]){
                // Then this had DataExplorer data available
                if (article["study_to_load_str"] != study_to_load){
                    $("#study_select").append(`<option value=${article["study_to_load_str"]}>${article["article_name"]}</option>`)
                }
            }
        })
        // Here we have a list of the article names that need to be populated
        
    }
    populate_study_select_dropdown();
    
    // // Now listen for a change
    // $("#study_select").on('change', function () {
    //     $("#study_select_form").submit();
    // });

    function init_publication_details() {
        //INIT title
        $("#study_title").html(getStudyMetaInfo()['title']);
        //INIT authors
        $("#authors").html(getStudyMetaInfo()['author_list']);
    }
    init_publication_details();

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

    function populate_the_data_analysis_meta_information() {
        //populate the data analysis meta information
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
    populate_the_data_analysis_meta_information();

    function populate_the_downloads_section() {
        //TODO populate the downloads section
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
                $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_value"><a href="${study_to_load_path + data_file_paths[file_type_array[i]]}" download>${data_file_paths[file_type_array[i]]}</a></div>`);
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
                        $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_value"><a href="${study_to_load_path + data_file_paths[f_name_dist]}" download>${data_file_paths[f_name_dist]}</a></div>`);
                    }
                    let f_name_pcoa = "btwn_" + sample_profile_array[j] + "_" + dist_type_array[k] + "_" + clade_array[i] + "_pcoa";
                    if (data_file_paths_keys.includes(f_name_pcoa)) {
                        $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_property">${f_name_pcoa + ':'}</div>`);
                        $("#resource_download_info_collapse").find(".row").append(`<div class="col-sm-6 data_value"><a href="${study_to_load_path + data_file_paths[f_name_pcoa]}" download>${data_file_paths[f_name_pcoa]}</a></div>`);
                    }
                }
            }
        }
    }
    populate_the_downloads_section();


    // Create Tooltips
    let tip_seqs = d3.tip().attr('class', 'd3-tip').direction('e').offset([0, 5])
        .html(function (d) {
            let content = '<div style="background-color:rgba(255,255,255,0.9);">' +
                '<span style="margin-left: 2.5px;"><b>' + d.seq_name + '</b></span><br>' +
                '</div>';
            return content;
        });
    let tip_profiles = d3.tip().attr('class', 'd3-tip').direction('e').offset([0, 5])
        .html(function (d) {
            let content = '<div style="background-color:rgba(255,255,255,0.9);">' +
                '<span style="margin-left: 2.5px;"><b>' + d.profile_name + '</b></span><br>' +
                '</div>';
            return content;
        });

    // Get the sample and profile meta info
    let profile_meta_info = getProfileMetaInfo();
    let sample_meta_info = getSampleMetaInfo();

    // Sample name to uid object for doing the sample meta info
    // TODO we will need the same thing for the profiles once we get to doing the profile info
    sample_name_to_uid_dict = (function () {
        let temp_dict = {};
        Object.keys(sample_meta_info).forEach(function (sample_uid) {
            temp_dict[sample_meta_info[sample_uid]["name"]] = +sample_uid;
        })
        return temp_dict;
    })();

    profile_name_to_uid_dict = (function () {
        let temp_dict = {};
        Object.keys(profile_meta_info).forEach(function (profile_uid) {
            temp_dict[profile_meta_info[profile_uid]["name"]] = +profile_uid;
        })
        return temp_dict;
    })();

    // Sequence meta info
    let available_sample_meta_info = Object.keys(sample_meta_info[Object.keys(sample_meta_info)[0]]);
    let sample_meta_annotation_to_key = {
        "sample": "name",
        "UID": "uid",
        "taxa": "taxa_string",
        "lat": "lat",
        "lon": "lon",
        "collection_date": "collection_date",
        "depth": "collection_depth",
        "clade_relative_abund": "clade_prop_string",
        "clade_absolute_abund": "clade_abs_abund_string",
        "raw_contigs": "raw_contigs",
        "post_qc_absolute": "post_taxa_id_absolute_symbiodinium_seqs",
        "post_qc_unique": "post_taxa_id_unique_symbiodinium_seqs",
        "post_med_absolute": "post_med_absolute",
        "post_med_unique": "post_med_unique",
        "non_Symbiodiniaceae_absolute": "post_taxa_id_absolute_non_symbiodinium_seqs",
        "non_Symbiodiniaceae_unique": "post_taxa_id_unique_non_symbiodinium_seqs"
    };
    let sample_meta_info_annotation_order_array_primary = ["sample", "UID", "taxa", "lat", "lon"];
    let sample_meta_info_annotation_order_array_secondary = ["collection_date", "depth",
        "clade_relative_abund", "clade_absolute_abund", "raw_contigs", "post_qc_absolute", "post_qc_unique",
        "post_med_absolute", "post_med_unique", "non_Symbiodiniaceae_absolute", "non_Symbiodiniaceae_unique"
    ];

    // Profile meta info
    let available_profile_meta_info = Object.keys(profile_meta_info);
    let profile_meta_annotation_to_key = {
        "profile": "name",
        "UID": "uid",
        "genera": "genera",
        "maj_seq": "maj_its2_seq",
        "associated species": "assoc_species",
        "local_abund": "local_abund",
        "db_abund": "db_abund",
        "seq_uids": "seq_uids",
        "seq_abund_string": "seq_abund_string"
    };
    let profile_meta_info_annotation_order_array_primary = ["profile", "UID", "genera"];
    let profile_meta_info_annotation_order_array_secondary = ["maj_seq", "species", "local_abund", "db_abund",
        "seq_uids", "seq_abund_string"
    ];

    //populate the sample_meta_info_holders
    (function populateSampleMetaInfoHolders() {
        for (let i = 0; i < sample_meta_info_annotation_order_array_primary.length; i++) {
            let annotation = sample_meta_info_annotation_order_array_primary[i];
            if (available_sample_meta_info.includes(sample_meta_annotation_to_key[annotation])) {
                // We want to put taxa on its own line because it is so big and the other two paris on the same line
                if (annotation == "taxa") {
                    $(".primary_sample_meta").append(`<div style="width:100%;"><span style="font-weight:bold;">${annotation}: </span><span class="sample_meta_item mr-1" data-key=${sample_meta_annotation_to_key[annotation]}>--</span></div>`);
                } else {
                    $(".primary_sample_meta").append(`<div><span style="font-weight:bold;">${annotation}: </span><span class="sample_meta_item mr-1" data-key=${sample_meta_annotation_to_key[annotation]}>--</span></div>`);
                }
            }
        }
        for (let i = 0; i < sample_meta_info_annotation_order_array_secondary.length; i++) {
            let annotation = sample_meta_info_annotation_order_array_secondary[i];
            if (available_sample_meta_info.includes(sample_meta_annotation_to_key[annotation])) {
                $(".secondary_sample_meta").append(`<div><span style="font-weight:bold;">${annotation}: </span><span class="sample_meta_item mr-1" data-key=${sample_meta_annotation_to_key[annotation]}>--</span></div>`);
            }
        }
    })();

    //populate the profile_meta_info_holders
    (function populateProfileMetaInfoHolders() {
        for (let i = 0; i < profile_meta_info_annotation_order_array_primary.length; i++) {
            let annotation = profile_meta_info_annotation_order_array_primary[i];
            $(".primary_profile_meta").append(`<div><span style="font-weight:bold;">${annotation}: </span><span class="profile_meta_item mr-1" data-key=${profile_meta_annotation_to_key[annotation]}>--</span></div>`);
        }
        for (let i = 0; i < profile_meta_info_annotation_order_array_secondary.length; i++) {
            let annotation = profile_meta_info_annotation_order_array_secondary[i];
            $(".secondary_profile_meta").append(`<div><span style="font-weight:bold;">${annotation}: </span><span class="profile_meta_item mr-1" data-key=${profile_meta_annotation_to_key[annotation]}>--</span></div>`);
        }
    })();



    // Add a g to the bar plot svgs that we will use for the bars on a sample by sample basis
    // We will have a seperate g for each of the samples so that we can plot column by column
    // The pre-med plot will not get init until later.
    function add_sample_groups_to_bar_svgs(svg_element, sample_list) {
        sample_list.forEach(function (sample) {
            svg_element.append("g").attr("class", "s" + sample);
        })
    }

    // DATA FOR PRE, POST MED and PROFILE
    // POST MED BARS
    let sorting_keys = Object.keys(getSampleSortedArrays());
    let sorted_sample_uid_arrays = getSampleSortedArrays();

    let svg_post_med = d3.select("#chart_post_med");
    let data_post_med_by_sample;
    let max_y_val_post_med;
    let sample_list_post;
    let post_med_bars_exists = false;
    let post_med_init_by_sample_interval = 10;
    //INIT margins, widths and heights for the bar plots
    let margin = {
        top: 30,
        left: 35,
        bottom: 60,
        right: 0
    };
    let seq_prof_width;
    let seq_prof_height;
    
    // margin used for the inverted profile_modal plot
    let inv_prof_margin = {
        top: 5,
        left: 35,
        bottom: 5,
        right: 0
    };

    let dist_margin = {top: 35, left: 35, bottom: 20, right: 0};
    let x_post_med;
    let y_post_med;
    let xAxis_post_med;
    let yAxis_post_med;
    if (typeof getRectDataPostMEDBySample === "function") {
        data_post_med_by_sample = getRectDataPostMEDBySample();
        post_med_bars_exists = true;
        max_y_val_post_med = getRectDataPostMEDBySampleMaxSeq();
        if (sorting_keys.includes('profile_based')) {
            sample_list_post = sorted_sample_uid_arrays['profile_based'];
        } else {
            sample_list_post = sorted_sample_uid_arrays['similarity'];
        }
        // INIT the width and height of the chart
        $("#post_med_card").find(".seq_prof_chart").attr("width", ((sample_list_post.length * 13) + 70).toString());
        seq_prof_width = +svg_post_med.attr("width") - margin.left - margin.right;
        seq_prof_height = +svg_post_med.attr("height") - margin.top - margin.bottom;
        // Init x and y scales
        x_post_med = d3.scaleBand()
            .range([margin.left, seq_prof_width + margin.left])
            .padding(0.1);
        y_post_med = d3.scaleLinear()
            .rangeRound([seq_prof_height + margin.top, margin.top]);
        // Init the axis group
        //NB the axis no need translating down or left in the direction they orientate.
        // I.e. x axis doesn't need to be translated right (only down)
        // and yaxis doesn't need translating down (only right).
        // This is because they apparently use their ranges to set their positions
        xAxis_post_med = svg_post_med.append("g")
            .attr("transform", `translate(0,${seq_prof_height + margin.top})`)
            .attr("id", "x_axis_post_med");
        yAxis_post_med = svg_post_med.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .attr("id", "y_axis_post_med");
        // INIT the drop down with the sample sorting categories we have available
        let sort_dropdown_to_populate = $("#post_med_card").find(".svg_sort_by");
        for (let i = 0; i < sorting_keys.length; i++) {
            sort_dropdown_to_populate.append(`<a class="dropdown-item" >${sorting_keys[i]}</a>`);
        }
        // Add the groups per sample for plotting in
        add_sample_groups_to_bar_svgs(svg_post_med, sample_list_post);
        // Call the tool tip
        svg_post_med.call(tip_seqs);
    } else {
        // Hide the card if the data to populate it doesn't exist
        $("#post_med_card").attr("display", "none");
    }




    //PROFILE BARS
    let svg_profile = d3.select("#chart_profile");
    let svg_post_med_modal = d3.select("#chart_post_med_modal");
    let svg_profile_modal = d3.select("#chart_profile_modal");
    let data_profile_by_sample;
    let sample_list_modal;
    let max_y_val_profile;
    let sample_list_profile;
    let profile_bars_exists = false;
    let profile_init_by_sample_interval = 10;
    let x_profile;
    let y_profile;
    let y_profile_modal;
    let xAxis_profile;
    let xAxis_post_med_modal;
    let xAxis_profile_modal;
    let seq_height_modal;
    let prof_height_modal;
    if (typeof getRectDataProfileBySample === "function") {
        data_profile_by_sample = getRectDataProfileBySample();
        profile_bars_exists = true;
        max_y_val_profile = getRectDataProfileBySampleMaxSeq();
        if (sorting_keys.includes('profile_based')) {
            sample_list_profile = sorted_sample_uid_arrays['profile_based'];
            sample_list_modal = sorted_sample_uid_arrays['profile_based'];
        } else {
            sample_list_profile = sorted_sample_uid_arrays['similarity'];
            sample_list_modal = sorted_sample_uid_arrays['similarity'];
        }
        $("#profile_card").find(".seq_prof_chart").attr("width", ((sample_list_profile.length * 13) + 70).toString());
        // Init the width of the modal chart too if we have profile data
        $("#seq-prof-modal").find(".seq_prof_chart").attr("width", ((sample_list_modal.length * 13) + 70).toString());
        // Need to manually calculate the pixels for height as we rely on returning these pixels for the scales
        // Viewport height
        let vp_height = window.innerHeight;
        // 30% of this
        let height_for_seq_modal_svg = 0.30 * vp_height;
        let height_for_profile_modal_svg = height_for_seq_modal_svg - margin.bottom;
        $("#chart_post_med_modal").attr("height", height_for_seq_modal_svg);
        $("#chart_profile_modal").attr("height", height_for_profile_modal_svg);
        seq_height_modal = +svg_post_med_modal.attr("height") - margin.top - margin.bottom;
        prof_height_modal = +svg_profile_modal.attr("height") - inv_prof_margin.top - inv_prof_margin.bottom;
        // We want to make tha actual plot areas the same height for the seq modal and the profile modal.
        // Because the seq modal has to incorporate the labels in its height as well we will reduce the 
        // profile modal by this height (i.e. bottom margin)

        // Init x and y scales
        x_profile = d3.scaleBand()
            .range([margin.left, seq_prof_width + margin.left])
            .padding(0.1);
        x_modal = d3.scaleBand()
            .range([margin.left, seq_prof_width + margin.left])
            .padding(0.1);
        y_profile = d3.scaleLinear()
            .rangeRound([seq_prof_height + margin.top, margin.top]);
        // Y is inverted for the inverted profile plot
        y_post_modal = d3.scaleLinear()
            .rangeRound([seq_height_modal + margin.top, margin.top]);
        y_profile_modal = d3.scaleLinear()
            .rangeRound([inv_prof_margin.top, prof_height_modal + inv_prof_margin.top]);
        // Set up the axes groups
        // Profile
        xAxis_profile = svg_profile.append("g")
            .attr("transform", `translate(0,${seq_prof_height + margin.top})`)
            .attr("id", "x_axis_profile");
        yAxis_profile = svg_profile.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .attr("id", "y_axis_profile");
        // Post-MED modal
        xAxis_post_med_modal = svg_post_med_modal.append("g")
            .attr("transform", `translate(0,${seq_height_modal + margin.top})`)
            .attr("id", "x_axis_post_med_modal");
        yAxis_post_med_modal = svg_post_med_modal.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .attr("id", "y_axis_post_med_modal");
        // Profile modal
        // inverted profile modal plot is axis is only moved down by top margin
        xAxis_profile_modal = svg_profile_modal.append("g")
            .attr("transform", `translate(0,${inv_prof_margin.top})`)
            .attr("id", "x_axis_profile_modal");
        // This should also be moved down by the top axis
        yAxis_profile_modal = svg_profile_modal.append("g")
            .attr("transform", `translate(${margin.left}, 0)`)
            .attr("id", "y_axis_profile_modal");

        // INIT the drop down with the sample sorting categories we have available
        let sort_dropdown_to_populate_profile = $("#profile_card").find(".svg_sort_by");
        let sort_dropdown_to_populate_modal = $("#seq-prof-modal").find(".svg_sort_by");
        for (let i = 0; i < sorting_keys.length; i++) {
            sort_dropdown_to_populate_profile.append(`<a class="dropdown-item" >${sorting_keys[i]}</a>`);
            sort_dropdown_to_populate_modal.append(`<a class="dropdown-item" >${sorting_keys[i]}</a>`);
        }
        // Add the groups per sample for plotting in
        add_sample_groups_to_bar_svgs(svg_profile, sample_list_profile);
        add_sample_groups_to_bar_svgs(svg_profile_modal, sample_list_modal);
        add_sample_groups_to_bar_svgs(svg_post_med_modal, sample_list_modal);
        // Call tool tips
        svg_post_med_modal.call(tip_seqs);
        svg_profile.call(tip_profiles);
        svg_profile_modal.call(tip_profiles);
    } else {
        // Hide the card if the data to populate it doesn't exist
        $("#profile_card").attr("display", "none");
        // if the profile data doesn't exist then we don't have need for the modal so we should hide
        // the modal buttons.
        $(".viewer_link_seq_prof").attr("display", "none");
    }



    //PRE-MED BARS
    let data_pre_med_by_sample;
    let max_y_val_pre_med;
    let sample_list_pre;
    let pre_med_bars_exists = false;
    let pre_med_init_by_sample_interval = 50;
    let svg_pre_med;
    let x_pre_med;
    let y_pre_med;
    let xAxis_pre_med;
    let yAxis_pre_med;
    if (typeof getRectDataPreMEDBySample === "function") {
        data_pre_med_by_sample = getRectDataPreMEDBySample();
        pre_med_bars_exists = true;
        max_y_val_pre_med = getRectDataPreMEDBySampleMaxSeq();
        if (sorting_keys.includes('profile_based')) {
            sample_list_pre = sorted_sample_uid_arrays['profile_based'];
        } else {
            sample_list_pre = sorted_sample_uid_arrays['similarity'];
        }
        if (sorting_keys.includes('profile_based')) {
            sample_list_pre = sorted_sample_uid_arrays['profile_based'];
        } else {
            sample_list_pre = sorted_sample_uid_arrays['similarity'];
        }
        $("#pre_med_card").find(".seq_prof_chart").attr("width", ((sample_list_pre.length * 13) + 70).toString());
        // INIT the drop down with the sample sorting categories we have available
        let sort_dropdown_to_populate = $("#pre_med_card").find(".svg_sort_by");
        for (let i = 0; i < sorting_keys.length; i++) {
            sort_dropdown_to_populate.append(`<a class="dropdown-item" >${sorting_keys[i]}</a>`);
        }
    } else {
        // Hide the card if the data to populate it doesn't exist
        $("#pre_med_card").attr("display", "none");
    }


    //INIT inv profile data for the modal
    //TODO we can work with this for the time being and see how long it takes to process on the
    // large test dataset. If it takes to long then we can switch to the already having the inv values
    // calculated. If it is fast then we no longer need to output the inv values and can save some space
    // DATA for profile inverted
    // Because this dataset is going to be used in the inverted modal plot we need to
    // remove the cummulative y values that have been added to the above
    let data_profile_inv_by_sample = getRectDataProfileBySample();

    function processProfileInvData(data) {
        // For each sample in the data
        Object.keys(data).forEach(function (dkey) {
            // First check to see if there are any rectangles for this sample
            if (data[dkey].length == 0) {
                return;
            }

            // Go through each element removing the cummulative y
            // we can do this by setting the y to 0 for the first element and then
            // for each next element we can set it to the y of the element that is n-1
            new_y_rel = 0;
            new_y_abs = 0;
            for (j = 0; j < data[dkey].length; j++) {
                old_y_rel = data[dkey][j]["y_rel"];
                old_y_abs = data[dkey][j]["y_abs"];
                data[dkey][j]["y_rel"] = new_y_rel;
                data[dkey][j]["y_abs"] = new_y_abs;
                new_y_rel = old_y_rel;
                new_y_abs = old_y_abs;
            }

        })
    }
    processProfileInvData(data_profile_inv_by_sample);










    // Distance colors
    // INIT the color by drop down for the btwn sample and the btwn profile dist plots
    let btwn_sample_color_categories = ["host", "location", "post_med_seqs_absolute", "post_med_seqs_unique", "no_color"];
    let btwn_profile_color_categories = ["profile_identity", "local_abundance", "db_abundance"]
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
    let btwn_profile_c_cat_key = {
        "local_abundance": "local_abund",
        "db_abundance": "db_abund"
    };

    let color_dropdown_to_populate = $("#between_sample_distances").find(".color_select");
    for (let i = 0; i < btwn_sample_color_categories.length; i++) {
        color_dropdown_to_populate.append(`<a class="dropdown-item" data-color=${btwn_sample_color_categories[i]}>${btwn_sample_color_categories[i]}</a>`);
    }

    color_dropdown_to_populate = $("#between_profile_distances").find(".color_select");
    for (let i = 0; i < btwn_profile_color_categories.length; i++) {
        color_dropdown_to_populate.append(`<a class="dropdown-item" data-color=${btwn_profile_color_categories[i]}>${btwn_profile_color_categories[i]}</a>`);
    }

    // Create the color scales for the above parameters
    // We will need quantitative scales for the post_med_seqs_absolute, post_med_seqs_unique
    // This will be the same sort of scale as we use for the axes of the dist and the y of the bar
    // For the host and location we will need to use something different.
    // For each we will need to have either the list of categorical variables (i.e. the taxa strings or lat long)
    // Or we will need the max and min of the quantitative values
    // go cat by cat
    let host_c_scale;
    let location_c_scale;
    let post_med_absolute_c_scale;
    let post_med_unique_c_scale;
    let profile_local_abund_c_scale;
    let profile_db_abund_c_scale;
    let profile_idenity_c_scale;

    function make_categorical_color_scale_btwn_sample(cat_name) {
        let key_name = btwn_sample_c_cat_key[cat_name];
        //need to get the list of taxa string
        let cats_array = [];
        Object.keys(sample_meta_info).forEach(function (k) {
            let cat;
            if (cat_name == "location") {
                cat = sample_meta_info[k]["lat"] + ';' + sample_meta_info[k]["lat"];
            } else {
                cat = sample_meta_info[k][key_name];
            }

            if (!(cats_array.includes(cat))) {
                cats_array.push(cat);
            }
        });
        // here we have a unique list of the 'host' values
        // now create the colour scale for it
        return c_var = d3.scaleOrdinal().domain(cats_array).range(d3.schemeSet3);
    }

    function make_quantitative_color_scale_btwn_sample(cat_name) {
        let key_name = btwn_sample_c_cat_key[cat_name];
        //need to get the list of taxa string
        let values = [];
        Object.keys(sample_meta_info).forEach(function (k) {
            values.push(sample_meta_info[k][key_name]);
        });
        let max_val = Math.max(...values);
        let min_val = Math.min(...values);
        // here we have a unique list of the 'host' values
        // now create the colour scale for it
        return d3.scaleLinear().domain([min_val, max_val]).range(["blue", "red"]);
    }

    function make_quantitative_color_scale_btwn_profile(cat_name) {
        let key_name = btwn_profile_c_cat_key[cat_name];
        //need to get the list of taxa string
        let values = [];
        Object.keys(profile_meta_info).forEach(function (k) {
            values.push(profile_meta_info[k][key_name]);
        });
        let max_val = Math.max(...values);
        let min_val = Math.min(...values);
        // here we have a unique list of the 'host' values
        // now create the colour scale for it
        return d3.scaleLinear().domain([min_val, max_val]).range(["blue", "red"]);
    }

    if (btwn_sample_color_categories.includes("host")) {
        host_c_scale = make_categorical_color_scale_btwn_sample("host");
    }
    if (btwn_sample_color_categories.includes("location")) {
        location_c_scale = make_categorical_color_scale_btwn_sample("location");
    }
    post_med_absolute_c_scale = make_quantitative_color_scale_btwn_sample("post_med_seqs_absolute");
    post_med_unique_c_scale = make_quantitative_color_scale_btwn_sample("post_med_seqs_unique");
    profile_local_abund_c_scale = make_quantitative_color_scale_btwn_profile("local_abundance");
    profile_db_abund_c_scale = make_quantitative_color_scale_btwn_profile("db_abundance");
    profile_idenity_c_scale = d3.scaleOrdinal().domain(Object.keys(profile_meta_info)).range(Object.keys(profile_meta_info).map(k => profile_meta_info[k]["color"]));

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
    } else if (typeof getBtwnProfileDistCoordsUF === "function") {
        // use the unifrac objects
        btwn_sample_genera_coords_data = getBtwnSampleDistCoordsUF();
        btwn_sample_genera_pc_variances = getBtwnSampleDistPCVariancesUF();
        available_pcs_btwn_samples = getBtwnSampleDistPCAvailableUF();
        btwn_sample_genera_array = Object.keys(btwn_sample_genera_coords_data);
        btwn_sample_data_available = true;
    } else {
        // btwn_sample data not available
        // make display none for the btwn sample card
        $("#between_sample_distances").attr("display", "none");
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
        $("#between_sample_distances").attr("display", "none");
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


    // Set the colour scale
    // We can set both the range and domain of this as these are invariable between absolute and relative
    // data types
    //TODO synchronise the colour scales between the pre- and post-med seqs.
    // The fill colours of the rect objects are now already in the array of objects
    //TODO we will need to have color scales for the distance plots as these will vary depending on
    // the property that we are colouring by.
    let seq_color = getSeqColor();
    let seq_names = Object.keys(seq_color);
    let seq_colors = seq_names.map(function (seq_name) {
        return seq_color[seq_name]
    });
    let sequence_color_scale = d3.scaleOrdinal().domain(seq_names).range(seq_colors);

    let prof_color = getProfColor();
    let prof_names = Object.keys(prof_color);
    let prof_colors = seq_names.map(function (seq_name) {
        return seq_color[seq_name]
    });
    let profile_color_scale = d3.scaleOrdinal().domain(prof_names).range(prof_colors);


    // INIT the post-MED and profile plots modal and normal.
    let data_type;
    if ($("#PostMEDAbsDType").hasClass("btn-primary")) {
        data_type = 'absolute';
    } else if ($("#PostMEDRelDType").hasClass("btn-primary")) {
        data_type = 'relative';
    }

    // We have to init the modal plots once the modal has been opened (see listener below)
    // So that we can get the size of the label text and adjust the text accordingly.
    // POST-MED INIT
    update_bar_plot_by_sample(data_type, "post", sample_list_post, post_med_init_by_sample_interval);

    // PROFILES INIT
    update_bar_plot_by_sample(data_type, "profile", sample_list_profile, profile_init_by_sample_interval);

    // BTWN SAMPLE INIT
    update_dist_plot("#chart_btwn_sample");

    // BTWN SAMPLE INIT
    update_dist_plot("#chart_btwn_profile");

    // Functions for doing the init and updating of the d3 bar plots
    function update_bar_plot_by_sample(data_type, pre_post_profile, sample_list, init_sample_interval) {
        // Update the domains first
        update_axis_domains_by_sample(data_type, pre_post_profile)
        // then plot the bars sample by sample
        cum_time = 0
        for (let i = 0; i < sample_list.length; i++) {
            setTimeout(update_by_sample, i * init_sample_interval, sample_list[i],
                data_type, init_sample_interval, pre_post_profile);
            cum_time += init_sample_interval;
        }
        // Now draw the axis last so that they are on top of the bars
        // we can then use a transition .on event to call the centering of the labels
        setTimeout(call_axes, cum_time, 1000, pre_post_profile)

        // Finally if this is the inv profile modal plot we need to draw on the path manually
        // as the bars are obscuring it for some reason
        if (pre_post_profile == "profile-modal") {
            let d_str = "M" + (inv_prof_margin.left + 0.5).toString() +
                "," + (inv_prof_margin.top + 0.5).toString() + "H" +
                (+svg_post_med.attr("width") - inv_prof_margin.left - inv_prof_margin.right + 0.5).toString();

            svg_profile_modal.append("path").attr("stroke", "black").attr("d", d_str);
        }
    }

    function update_axis_domains_by_sample(data_type, pre_post_profile) {
        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        let y;
        let x;
        let max_y;
        let sample_list;
        if (pre_post_profile == "post") {
            y = y_post_med;
            x = x_post_med;
            max_y = max_y_val_post_med;
            sample_list = sample_list_post;
        } else if (pre_post_profile == "post-modal") {
            y = y_post_modal;
            x = x_modal;
            max_y = max_y_val_post_med;
            sample_list = sample_list_modal;
        } else if (pre_post_profile == "pre") {
            y = y_pre_med;
            x = x_pre_med;
            max_y = max_y_val_pre_med;
            sample_list = sample_list_pre;
        } else if (pre_post_profile == "profile") {
            y = y_profile;
            x = x_profile;
            max_y = max_y_val_profile;
            sample_list = sample_list_profile;
        } else if (pre_post_profile == "profile-modal") {
            y = y_profile_modal;
            x = x_modal;
            max_y = max_y_val_profile;
            sample_list = sample_list_modal;
        }

        if (data_type == "absolute") {
            y.domain([0, max_y]).nice();
        } else {
            y.domain([0, 1]).nice();
        }

        // Set the domain of the x. This should be the sample names
        x.domain(sample_list);

    }

    function update_by_sample(col_sample, data_type, speed, pre_post_profile) {

        let svg;
        let data_by_sample;
        let delay = 0.1;
        let col_scale;
        let x_key = sample_meta_info[col_sample]["name"];
        if (pre_post_profile == "post-modal") {
            data_by_sample = data_post_med_by_sample;
            svg = svg_post_med_modal;
            x = x_modal;
            y = y_post_modal;
            col_scale = sequence_color_scale;
        } else if (pre_post_profile == "post") {
            data_by_sample = data_post_med_by_sample;
            svg = svg_post_med;
            x = x_post_med;
            y = y_post_med;
            col_scale = sequence_color_scale;
        } else if (pre_post_profile == "pre") {
            svg = svg_pre_med;
            data_by_sample = data_pre_med_by_sample;
            x = x_pre_med;
            y = y_pre_med;
        } else if (pre_post_profile == "profile") {
            svg = svg_profile;
            data_by_sample = data_profile_by_sample;
            x = x_profile;
            y = y_profile;
            col_scale = profile_color_scale;
        } else if (pre_post_profile == "profile-modal") {
            svg = svg_profile_modal;
            data_by_sample = data_profile_inv_by_sample;
            x = x_modal;
            y = y_profile_modal;
            col_scale = profile_color_scale;
        }

        let bars = svg.select("g.s" + col_sample).selectAll("rect").data(data_by_sample[col_sample], function (d) {
            // In theory because we're working on a sample by sample basis now we should be able to work with just the
            // the seq name as key. But for the time being we'll keep the key as it is.
            if (pre_post_profile == "profile" || pre_post_profile == "profile-modal") {
                return d.profile_name;
            } else {
                return d.seq_name;
            }

        });

        bars.exit().remove()

        let abbr;
        if (data_type == 'absolute') {
            //if 'absolute' then use the abbreviation 'abs' for getting the attributes
            abbr = 'abs'
        } else if (data_type == 'relative') {
            // if 'relative' then use the abbreviation 'rel' for getting the attributes
            abbr = 'rel'
        }

        if (pre_post_profile == "profile-modal") {
            bars.transition().duration(speed).attr("x", function (d) {
                return x(col_sample);
            }).attr("y", function (d) {
                return y(+d["y_" + abbr]);
            }).attr("width", x.bandwidth()).attr("height", function (d) {
                return Math.max(y(+d["height_" + abbr]), 1);
            }).attr("fill", function (d) {
                return col_scale(d.profile_name);
            }).delay(function (d, i) {
                return (i * delay)
            });
        } else if (pre_post_profile == "profile") {
            bars.transition().duration(speed).attr("x", function (d) {
                return x(col_sample);
            }).attr("y", function (d) {
                return y(+d["y_" + abbr]);
            }).attr("width", x.bandwidth()).attr("height", function (d) {
                return Math.max(y(0) - y(+d["height_" + abbr]), 1);
            }).attr("fill", function (d) {
                return col_scale(d.profile_name);
            }).delay(function (d, i) {
                return (i * delay)
            });
        } else {
            bars.transition().duration(speed).attr("x", function (d) {
                return x(col_sample);
            }).attr("y", function (d) {
                return y(+d["y_" + abbr]);
            }).attr("width", x.bandwidth()).attr("height", function (d) {
                return Math.max(y(0) - y(+d["height_" + abbr]), 1);
            }).attr("fill", function (d) {
                return col_scale(d.seq_name);
            }).delay(function (d, i) {
                return (i * delay)
            });
        }


        // Interesting article on the positioning of the .on method
        // https://stackoverflow.com/questions/44495524/d3-transition-not-working-with-events?rq=1
        // We need to have separate updates for each of the profile, profile-modal and all others,
        // ys that we will be using and the tips that we will be showing.
        if (pre_post_profile == "profile") {
            bars.enter().append("rect")
                .attr("x", function (d) {
                    return x(col_sample);
                }).attr("y", y(0)).on('mouseover', function (d) {
                    tip_profiles.show(d);
                    d3.select(this).attr("style", "stroke-width:1;stroke:rgb(0,0,0);");
                    let profile_uid = profile_name_to_uid_dict[d["profile_name"]];
                    let profile_data_series = profile_meta_info[profile_uid.toString()];
                    $(this).closest(".plot_item").find(".profile_meta_item").each(function () {
                        $(this).text(profile_data_series[$(this).attr("data-key")]);
                    });
                    $(this).closest(".plot_item").find(".meta_profile_name").text(d["profile_name"]);
                })
                .on('mouseout', function (d) {
                    tip_profiles.hide(d);
                    d3.select(this).attr("style", null);
                }).transition().duration(1000).attr("y", function (d) {
                    return y(+d["y_" + abbr]);
                }).attr("width", x.bandwidth()).attr("height", function (d) {
                    return Math.max(y(0) - y(+d["height_" + abbr]), 1);
                }).attr("fill", function (d) {
                    return col_scale(d.profile_name);
                });
        } else if (pre_post_profile == "profile-modal") {
            bars.enter().append("rect")
                .attr("x", function (d) {
                    return x(col_sample);
                }).attr("y", y(0)).on('mouseover', function (d) {
                    tip_profiles.show(d);
                    d3.select(this).attr("style", "stroke-width:1;stroke:rgb(0,0,0);");
                    let profile_uid = profile_name_to_uid_dict[d["profile_name"]];
                    let profile_data_series = profile_meta_info[profile_uid.toString()];
                    $(this).closest(".plot_item").find(".profile_meta_item").each(function () {
                        $(this).text(profile_data_series[$(this).attr("data-key")]);
                    });
                    $(this).closest(".plot_item").find(".meta_profile_name").text(d["profile_name"]);
                })
                .on('mouseout', function (d) {
                    tip_profiles.hide(d);
                    d3.select(this).attr("style", null);
                }).transition().duration(1000).attr("y", function (d) {
                    return y(+d["y_" + abbr]);
                }).attr("width", x.bandwidth()).attr("height", function (d) {
                    return Math.max(y(+d["height_" + abbr]), 1);
                }).attr("fill", function (d) {
                    return col_scale(d.profile_name);
                });
        } else {
            bars.enter().append("rect")
                .attr("x", function (d) {
                    return x(col_sample);
                }).attr("y", y(0)).on('mouseover', function (d) {
                    tip_seqs.show(d);
                    d3.select(this).attr("style", "stroke-width:1;stroke:rgb(0,0,0);");
                })
                .on('mouseout', function (d) {
                    tip_seqs.hide(d);
                    d3.select(this).attr("style", null);
                }).transition().duration(1000).attr("y", function (d) {
                    return y(+d["y_" + abbr]);
                }).attr("width", x.bandwidth()).attr("height", function (d) {
                    return Math.max(y(0) - y(+d["height_" + abbr]), 1);
                }).attr("fill", function (d) {
                    return col_scale(d.seq_name);
                });
        }
    }

    let ellipse_axis_labels = function () {
        var self = d3.select(this),
            textLength = self.node().getComputedTextLength(),
            text = self.text(),
            current_x = self.attr("x");
        while (textLength > (margin.bottom - current_x) && text.length > 0) {
            text = text.slice(0, -1);
            self.text(text + '...');
            textLength = self.node().getComputedTextLength();
        }
    };

    function call_axes(speed, pre_post_profile) {
        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        let sample_name_width_obj = {};
        if (pre_post_profile == "post") {
            y = y_post_med;
            x = x_post_med;
            y_axis_id = "#y_axis_post_med";
            x_axis_id = "#x_axis_post_med";
        } else if (pre_post_profile == "post-modal") {
            y = y_post_modal;
            x = x_modal;
            y_axis_id = "#y_axis_post_med_modal";
            x_axis_id = "#x_axis_post_med_modal";
            // TODO run code to get the length of the labels
            // create an inner html to translate x value.
            // if tanslate value, then do translate to center.
            // else, do ellipse logic.
            // We also have to do the ellipse shortening here
            let sample_names = sample_list_modal.map(sample_uid => sample_meta_info[sample_uid]["name"]);  // your text here
            svg_post_med_modal.append('g').attr("class", '.dummyTextG')
                .selectAll('.dummyText')
                .data(sample_names)
                .enter()
                .append("text")
                .attr("style", "font-size:10px;")
                
                //.attr("opacity", 0.0)      // not really necessary
                .text(function(d) { return d})
                .attr("x", "10")
                .attr("y", "10")
                .each(function(d,i) {
                    let length_of_text = this.getComputedTextLength();
                    let self = d3.select(this),
                        text = self.text(),
                        current_x = self.attr("x");
                    let available_space = margin.bottom - current_x - 2;
                    if (length_of_text > available_space){
                        // Perform the ellipse shortening here
                        while (length_of_text > (margin.bottom - current_x) && text.length > 0) {
                            text = text.slice(0, -1);
                            self.text(text + '...');
                            length_of_text = self.node().getComputedTextLength();
                        }
                        sample_name_width_obj[d] = {"ellipse":true, "ellipse_text":self.text()};
                    }else{
                        sample_name_width_obj[d] = {"width":length_of_text, "ellipse":false};
                    }
                    this.remove();
                    
                })
            $("#chart_post_med_modal").find(".dummyTextG").remove();
            
            
        } else if (pre_post_profile == "pre") {
            y = y_pre_med;
            x = x_pre_med;
            y_axis_id = "#y_axis_pre_med";
            x_axis_id = "#x_axis_pre_med";
        } else if (pre_post_profile == "profile") {
            y = y_profile;
            x = x_profile;
            y_axis_id = "#y_axis_profile";
            x_axis_id = "#x_axis_profile";
        } else if (pre_post_profile == "profile-modal") {
            y = y_profile_modal;
            x = x_modal;
            y_axis_id = "#y_axis_profile_modal";
            x_axis_id = "#x_axis_profile_modal";
        }

        let center_or_ellipse_axis_labels = function(){
            // text has already been ellipsed. So we just need to do centering here.
            d3.select(this).attr("y", 0).attr("x", 9).attr("dy", "-0.35em").attr("style", "font-size:10px;").attr("transform", "rotate(90)")
            .style("text-anchor", "start");
            // Set the values we need to here dynamically according to the dict that we worked out above. but still need to find some way of linking.
            //This has a data node.
            let sample_name = sample_meta_info[this.__data__]["name"];
            // Available width is the margin - 9 for the displacement of the sequence tick and -2 for displacement of the profile tick
            // So figure out if our text is larger than the available space. If it is larger, then ellipse until smaller
            // If its smaller, center
            if (sample_name_width_obj[sample_name]["ellipse"]){
                return;
            }else{
                // Then this needs centering
                // Have to take into account the fact that the labels are already displaced by an amount x
                // Also have to take into account that the ticks from the inv profile axis are protruding
                // Into the space of the seq modal margin. To account for this we will adjust by 2 px
                let current_x = +$(this).attr("x");
                let length_of_text = sample_name_width_obj[sample_name]["width"]
                let translate_by = ((margin.bottom - (length_of_text+current_x))/2)-2;
                $(this).attr("x", `${current_x + translate_by}`);
            }
        }

        // Call the y axis
        d3.select(y_axis_id)
            .transition()
            .duration(speed)
            .call(d3.axisLeft(y).ticks(null, "s"));

        // Call the x axis
        if (pre_post_profile == "profile-modal") {
            // Axis with ticks above and no text
            d3.select(x_axis_id)
                .call(d3.axisTop(x).tickSizeOuter(0));

        } else if (pre_post_profile == "post-modal") {
            // Axis with the centered labels
            // Has callback to center the labels
            d3.selectAll(x_axis_id).transition().duration(speed)
                .call(d3.axisBottom(x).tickFormat(function(d) {
                    let sample_name = sample_meta_info[d]["name"];
                    if (sample_name_width_obj[sample_name]["ellipse"]){
                        return sample_name_width_obj[sample_name]["ellipse_text"];
                    }else{return sample_name;}
                }).tickSizeOuter(0)).selectAll("text").each(center_or_ellipse_axis_labels);
        } else {
            // The regular axis with ticks and text below
            // no call back to center the labels
            d3.selectAll(x_axis_id).transition().duration(speed)
                .call(d3.axisBottom(x).tickFormat(d => sample_meta_info[d]["name"]).tickSizeOuter(0)).selectAll("text")
                .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                .style("text-anchor", "start").on("end", ellipse_axis_labels);
        }

        // Listener to highlight sample names on mouse over.
        // Not needed for the post-2
        if (pre_post_profile !== "profile-modal") {
            let ticks = d3.select(x_axis_id).selectAll(".tick")._groups[0].forEach(function (d1) {
                d3.select(d1).on("mouseover", function () {
                    d3.select(this).select("text").attr("fill", "blue").attr("style", "cursor:pointer;text-anchor: start;");
                    let sample_uid = this.__data__;
                    let sample_data_series = sample_meta_info[sample_uid];
                    $(this).closest(".plot_item").find(".sample_meta_item").each(function () {
                        $(this).text(sample_data_series[$(this).attr("data-key")]);
                    })
                }).on("mouseout", function () {
                    d3.select(this).select("text").attr("fill", "black").attr("style", "cursor:auto;text-anchor: start;");
                })
            })
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
                meta_look_up_dict = sample_meta_info;
                uid_to_name_dict = sample_name_to_uid_dict;
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
                meta_look_up_dict = profile_meta_info;
                uid_to_name_dict = profile_name_to_uid_dict;
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
            }).attr("cy", d => y_scale(d.y)) //"rgba(0,0,0,0.5)"
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

        // Y axis title
        //we need to be able to change the axis titles so we will give them ids and then
        // check to see if they exist. if they do, simply change text otherwise make from scratch
        let text_x = 15;
        let text_y = dist_height / 2;
        let y_axis_selection = $(dist_plot_id).find(".y_axis_title")
        if (y_axis_selection.length) {
            // Then the y axis title exists. Change the text of this axis
            y_axis_selection.text(`PC1 - ${Number.parseFloat(first_pc_variance*100).toPrecision(2)}%`)
        } else {
            // yaxis doesn't exist. make from scratch
            svg.append("text").attr("class", "x_axis_title")
                .attr("y", text_y)
                .attr("x", text_x)
                .attr("dy", "1em").attr("font-size", "0.8rem")
                .style("text-anchor", "middle")
                .text(`PC1 - ${Number.parseFloat(first_pc_variance*100).toPrecision(2)}%`)
                .attr("transform", `rotate(-90, ${text_x}, ${text_y})`);
        }

        // X axis title
        text_x = dist_width / 2;
        text_y = dist_height - 15;
        let x_axis_selection = $(dist_plot_id).find(".y_axis_title")
        if (x_axis_selection.length) {
            // Then the y axis title exists. Change the text of this axis
            x_axis_selection.text(`${second_pc} - ${Number.parseFloat(second_pc_variance*100).toPrecision(2)}%`)
        } else {
            // yaxis doesn't exist. make from scratch
            svg.append("text").attr("class", "y_axis_title")
                .attr("y", text_y)
                .attr("x", text_x)
                .attr("dy", "1em").attr("font-size", "0.8rem")
                .style("text-anchor", "middle")
                .text(`${second_pc} - ${Number.parseFloat(second_pc_variance*100).toPrecision(2)}%`);
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


    //Listening for opening of seq-profile modal
    $("#seq-prof-modal").on("shown.bs.modal", function (e) {
        // POST-MED-MODAL INIT
        update_bar_plot_by_sample(data_type, "post-modal", sample_list_modal, post_med_init_by_sample_interval);
        // PROFILES-MODAL INIT
        update_bar_plot_by_sample(data_type, "profile-modal", sample_list_modal, profile_init_by_sample_interval);
    })

    // LISTENERS RELATED TO CHARTING
    // RELATIVE to ABSOLUTE switch
    // When we change the modal or regular version we want these changes relected in the other.
    $(".dtype-btn").click(function () {
        //If the button is of class btn light then it is not selected and this click should fire
        // the change in datatype event for the relevant svg
        if ($(this).hasClass("btn-light")) {
            //First change the button attributes so that it looks like we've registered the clicks
            $(this).parents(".btn-group").find('.dtype-btn').each(function () {
                if ($(this).hasClass("btn-light")) {
                    //Switch around the btn styles so that light becomes primary and viceversa
                    $(this).addClass("btn-primary").removeClass("btn-light")
                } else if ($(this).hasClass("btn-primary")) {
                    $(this).addClass("btn-light").removeClass("btn-primary")
                }
            });

            //Second change update the plot to represent the newly selected datatype
            // If one of the modal buttons then need to update both plots
            // else just the one plot.
            let pre_post_profile = $(this).attr("data-data-type")
            let sample_list;
            let init_speed;
            if (pre_post_profile == "post-profile") {
                // Update post modal
                update_bar_plot_by_sample($(this).text(), "post-modal",
                    sample_list_modal, post_med_init_by_sample_interval);
                // Update profile modal
                update_bar_plot_by_sample($(this).text(), "profile-modal",
                    sample_list_modal, profile_init_by_sample_interval);
            } else {
                switch (pre_post_profile) {
                    case "post":
                        sample_list = sample_list_post;
                        init_speed = post_med_init_by_sample_interval;
                        break;
                    case "pre":
                        sample_list = sample_list_pre;
                        init_speed = pre_med_init_by_sample_interval;
                        break;
                    case "profile":
                        sample_list = sample_list_profile;
                        init_speed = profile_init_by_sample_interval;
                        break;
                }
                update_bar_plot_by_sample($(this).text(), pre_post_profile, sample_list, init_speed);
            }


        }
    });

    // Listening for INIT of pre-MED seqs plot
    // We want to have a listener for the Pre-MED header opening up. When this happens, we will want to plot the
    // pre-med plot, we will also want to remove the rendering the pre-MED seqs text. Also a good idea will be to have
    // a spinner set off in the top right corner.
    $('#pre_med_svg_collapse').on('show.bs.collapse', function () {
        // First check to see if the pre-MED svg has already been initiated. If so then there is nothing
        // to do here.
        //TODO implement the spinner and get rid of the text when open
        if (!$("#chart_pre_med").hasClass("init")) {
            $("#chart_pre_med").attr("class", "init");
            //Plot as relative or absolute abundances according to which button is currently primary
            if ($("#PreMEDRelDType").hasClass("btn-primary")) {
                let data_type = "relative";
            } else {
                let data_type = "absolute";
            }

            //Now do the init of the pre-MED svg
            svg_pre_med = d3.select("#chart_pre_med");

            // Set the x range that will be used for the x val of the bars
            x_pre_med = d3.scaleBand()
                .range([margin.left, seq_prof_width - margin.right])
                .padding(0.1)

            // Set the y range
            y_pre_med = d3.scaleLinear()
                .rangeRound([seq_prof_height - margin.bottom, margin.top])

            //Set up the svg element in which we will call the axis objects
            xAxis_pre_med = svg_pre_med.append("g")
                .attr("transform", `translate(0,${seq_prof_height - margin.bottom})`)
                .attr("id", "x_axis_pre_med")

            yAxis_pre_med = svg_pre_med.append("g")
                .attr("transform", `translate(${margin.left},0)`)
                .attr("id", "y_axis_pre_med")

            //Add a g to the svgs that we will use for the bars
            //We will have a seperate g for each of the samples so that we can hopefully plot column by column
            sample_list_pre.forEach(function (sample) {
                svg_pre_med.append("g").attr("class", "s" + sample)
            });

            update_bar_plot_by_sample(data_type, "pre", sample_list_pre, pre_med_init_by_sample_interval)


        }

    });

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
        let unique_site_set = new Set();
        let sample_meta_info_keys = Object.keys(sample_meta_info);
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
            let sample_obj = sample_meta_info[sample_meta_info_keys[i]];
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
                        $tr.append(`<td>${sample_meta_info[sample_uid]["name"]}</td>`);
                        // The full taxa string is really too long here so get the last element that isn't NoData
                        let tax_str = sample_meta_info[sample_uid]["taxa_string"];
                        let short_tax = getShortTaxStr(tax_str);
                        $tr.append(`<td>${short_tax}</td>`);
                        $tr.append(`<td>${sample_meta_info[sample_uid]["collection_depth"]}</td>`);
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