//Class for abstracting the distance plots
//We will aim to abstract both the between sample and between profile
//plots using this class
class DistancePlot{
    constructor({name_of_html_svg_object, coord_data_method, pc_variance_method, available_pcs_method, plot_type}){
        this.plot_type = plot_type;
        this.svg = d3.select(name_of_html_svg_object);
        
        this.sorted_uid_arrays = getSampleSortedArrays();
        this.sorting_keys = Object.keys(this.sorted_uid_arrays);
        this.data = coord_data_method();
        this.pc_variances = pc_variance_method();
        this.available_pcs = available_pcs_method();
        this.genera_array = Object.keys(this.data);
        this.genera_to_sample_array_dict = _init_genera_to_sample_array_dict();
        this.margins = {top: 35, left: 35, bottom: 20, right: 0};
        this.width = +this.svg.attr("width") - this.margin.left - this.margin.right;
        this.height = +this.svg.attr("height") - this.margin.top - this.margin.bottom;
        [this.x_scale, this.y_scale] = this._init_axis_scales();
        [this.x_axis, this.y_axis] = this._init_axes();
        // Add a clip
        this.svg.append("defs").append("clipPath")
            .attr("id", "sample_clip")
            .append("rect")
            .attr("width", this.width - this.margins.right - this.margins.left)
            .attr("height", this.height - this.margins.bottom - this.margins.top)
            .attr("x", this.margins.left)
            .attr("y", this.margins.top);
        // This is the group where we will do the drawing and that has the above
        // clipping mask applied to it
        this.scatter_group = this.svg.append('g').attr("clip-path", "url(#sample_clip)");
        // Set up the zoom object (one for all dist plots)
        this.zoom = d3.zoom().scaleExtent([.5, 20]).extent([[0, 0],[dist_width, dist_height]])
            .on("zoom", update_dist_plot_zoom);
        this.svg.call(zoom);
        this.tip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("visibility", "hidden");
        // The object that holds the meta info for the samples
        this.sample_meta_info = getSampleMetaInfo();
        // Create a name to uid dictionary for the samples
        this.sample_name_to_uid_dict = this._make_name_to_uid_dict(this.sample_meta_info);
        this.profile_meta_info = getProfileMetaInfo();
        this.profile_name_to_uid_dict = this._make_name_to_uid_dict(this.profile_meta_info);

        // We gave the user-visible color categories different names to those
        // that act as keys for the data. The below color_category_to_color_key
        // is a dict that maps between the two.
        [this.color_by_categories, this.color_category_to_color_key] = _init_color_by_categories()
        // Populate the color dropdown selector
        this._populate_color_dropdown_selector();
        // The sample and profile dist plots have different sets of color scales
        if (this.plot_type == 'sample'){
            [
                this.host_color_scale, 
                this.location_color_scale, 
                this.post_med_absolute_color_scale, 
                this.post_med_unique_color_scale
            ] = this._init_sample_color_scales();
        }else if (this.plot_type == 'profile'){
            [
                this.profile_local_abundance_color_scale, 
                this.profile_db_abundance_color_scale, 
                this.profile_identity_color_scale 
            ] = this._init_profile_color_scales();
        }
        // init both the genus and pc available drop downs
        this._init_dropdowns();
    }
    _init_axes(){
        let x_axis = this.svg.append("g").attr("class", "grey_axis")
            .attr("transform", `translate(0,${this.height - this.margins.bottom})`)
            .attr("id", "x_axis_btwn_sample");
        let y_axis = this.svg.append("g").attr("class", "grey_axis")
            .attr("transform", `translate(${this.margins.left},0)`)
            .attr("id", "y_axis_btwn_sample");
        return [x_axis, y_axis];
    }
    _init_axis_scales(){
        x_axis_scale = d3.scaleLinear()
            .range([dist_margin.left, dist_width - dist_margin.right]);
        y_axis_scale = d3.scaleLinear()
            .rangeRound([dist_height - dist_margin.bottom, dist_margin.top]);
        return [x_axis_scale, y_axis_scale];
    }
    _init_genera_to_sample_array_dict(){
        let temp_dict = {};
        for (let i = 0; i < this.genera_array.length; i++) {
            let genera = this.genera_array[i];
            temp_dict[genera] = Object.keys(this.data[genera]);
        }
        return temp_dict;
    }
    _make_name_to_uid_dict(meta_info_obj){
        let temp_dict = {};
        Object.keys(meta_info_obj).forEach(function (uid) {
            temp_dict[meta_info_obj[uid]["name"]] = +uid;
        })
        return temp_dict;
    }
    _init_dropdowns(){
        let genera_array = ['Symbiodinium', 'Breviolum', 'Cladocopium', 'Durusdinium'];
        let card_element;
        if (plot_type == 'sample'){
            card_element = $("#between_sample_distances");
        }else if (plot_type == 'profile'){
            card_element = $("#between_profile_distances");
        }
        let first_genera_present;
        for (let j = 0; j < genera_array.length; j++) {
            // init the genera_indentifier with the first of the genera in the genera_array that we have data for
            // We only want to do this for the first genera that we find so we check whether the data-genera attribute
            // already has been set or not.
            if (this.genera_array.includes(genera_array[j])) {
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
        let pcs_available_genera = this.available_pcs[first_genera_present];
        // Skip the first PC as we don't want PC1 in the options
        for (let j = 1; j < pcs_available_genera.length; j++) {
            card_element.find(".pc_select").append(`<a class="dropdown-item" data-pc="${pcs_available_genera[j]}">${pcs_available_genera[j]}</a>`)
        }
    }
    _init_color_by_categories(){
        if (this.plot_type == 'sample'){
            color_cats = ["host", "location", "post_med_seqs_absolute", "post_med_seqs_unique", "no_color"];
            if (!(this.sorting_keys.includes("taxa_string"))) {
                color_cats.splice(color_cats.indexOf("host"), 1);
            }
            if (!(this.sorting_keys.includes("lat_lon"))) {
                color_cats.splice(color_cats.indexOf("location"), 1);
            }
            col_cat_to_col_key = {
                "host": "taxa_string",
                "location": "lat_lon",
                "post_med_seqs_absolute": "post_med_absolute",
                "post_med_seqs_unique": "post_med_unique"
            };
            return [color_cats, col_cat_to_col_key];
        }else if (this.plot_type == 'profile'){
            color_cats = ["profile_identity", "local_abundance", "db_abundance"];
        }

    }
    _populate_color_dropdown_selector(){
        let color_dropdown_to_populate;
        if (this.plot_type == 'sample'){
            color_dropdown_to_populate = $("#between_sample_distances").find(".color_select");
        }else if (this.plot_type == 'profile'){
            color_dropdown_to_populate = $("#between_profile_distances").find(".color_select");
        }
        for (let i = 0; i < this.color_categories.length; i++) {
            color_dropdown_to_populate.append(`<a class="dropdown-item" data-color=${this.color_categories[i]}>${this.color_categories[i]}</a>`);
        }
    }
    _init_sample_color_scales(){
        let host_c_scale;
        let location_c_scale;
        let post_med_absolute_c_scale;
        let post_med_unique_c_scale;
        if (this.color_by_categories.includes("host")) {
            host_c_scale = this._make_categorical_color_scale_btwn_sample("host");
        }
        if (this.color_by_categories.includes("location")) {
            location_c_scale = this._make_categorical_color_scale_btwn_sample("location");
        }
        post_med_absolute_c_scale = this._make_quantitative_color_scale_btwn_sample("post_med_seqs_absolute");
        post_med_unique_c_scale = this._make_quantitative_color_scale_btwn_sample("post_med_seqs_unique");
        return [host_c_scale, location_c_scale, post_med_absolute_c_scale, post_med_unique_c_scale];
    }
    _make_sample_categorical_color_scale(category_name){
        let key_name = this.color_category_to_color_key[category_name];
        //need to get the list of taxa string
        let cats_array = [];
        let sample_meta_info = this.sample_meta_info;
        Object.keys(this.sample_meta_info).forEach(function (k) {
            let cat;
            if (category_name == "location") {
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
    _make_sample_quantitative_color_scale(category_name){
        let key_name = this.color_category_to_color_key[category_name];
        //need to get the list of taxa string
        let values = [];
        let sample_meta_info = this.sample_meta_info;
        Object.keys(this.sample_meta_info).forEach(function (k) {
            values.push(sample_meta_info[k][key_name]);
        });
        let max_val = Math.max(...values);
        let min_val = Math.min(...values);
        // here we have a unique list of the 'host' values
        // now create the colour scale for it
        return d3.scaleLinear().domain([min_val, max_val]).range(["blue", "red"]);
    }
    _init_profile_color_scales(){
        let profile_local_abund_c_scale;
        let profile_db_abund_c_scale;
        let profile_idenity_c_scale;
        let profile_meta_info = this.profile_meta_info;
        profile_local_abund_c_scale = this._make_profile_quantitative_color_scale("local_abundance");
        profile_db_abund_c_scale = this._make_profile_quantitative_color_scale("db_abundance");
        profile_idenity_c_scale = d3.scaleOrdinal().domain(
            Object.keys(profile_meta_info)).range(
                Object.keys(profile_meta_info).map(
                    k => profile_meta_info[k]["color"]));
        return [profile_local_abund_c_scale, profile_db_abund_c_scale, profile_idenity_c_scale];
    }
    _make_profile_quantitative_color_scale(category_name){
        let key_name = this.color_category_to_color_key[category_name];
        //need to get the list of taxa string
        let values = [];
        let profile_meta_info = this.profile_meta_info;
        Object.keys(this.profile_meta_info).forEach(function (k) {
            values.push(profile_meta_info[k][key_name]);
        });
        let max_val = Math.max(...values);
        let min_val = Math.min(...values);
        // here we have a unique list of the 'host' values
        // now create the colour scale for it
        return d3.scaleLinear().domain([min_val, max_val]).range(["blue", "red"]);
    }

    
}