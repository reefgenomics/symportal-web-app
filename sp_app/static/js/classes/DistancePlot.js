//Class for abstracting the distance plots
//We will aim to abstract both the between sample and between profile
//plots using this class
class DistancePlot{
    constructor({plot_type}){
        this.plot_type = plot_type;
        this.sorted_uid_arrays = getSampleSortedArrays();
        this.sorting_keys = Object.keys(this.sorted_uid_arrays);
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
    }

    _make_name_to_uid_dict(meta_info_obj){
        let temp_dict = {};
        Object.keys(meta_info_obj).forEach(function (uid) {
            temp_dict[meta_info_obj[uid]["name"]] = +uid;
        })
        return temp_dict;
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