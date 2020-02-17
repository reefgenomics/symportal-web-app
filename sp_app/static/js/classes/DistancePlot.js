//Class for abstracting the distance plots
//We will aim to abstract both the between sample and between profile
//plots using this class
class DistancePlot{
    constructor({name_of_html_svg_object, coord_data_method, pc_variance_method, available_pcs_method, plot_type}){
        this.plot_type = plot_type;
        this.svg_id = name_of_html_svg_object;
        this.svg = d3.select(this.svg_id);
        this.sorted_uid_arrays = getSampleSortedArrays();
        this.sorting_keys = Object.keys(this.sorted_uid_arrays);
        this.data = coord_data_method();
        this.pc_variances = pc_variance_method();
        this.available_pcs = available_pcs_method();
        // For the between sample this will be a list of the samples
        // for between profiles it will be a lit of the profiles
        this.genera_array = Object.keys(this.data);
        this.genera_to_obj_array_dict = this._init_genera_to_obj_array_dict();
        this.margin = {top: 35, left: 35, bottom: 20, right: 0};
        this.width = +this.svg.attr("width") - this.margin.left - this.margin.right;
        this.height = +this.svg.attr("height") - this.margin.top - this.margin.bottom;
        [this.x_axis_id, this.y_axis_id] = this._init_axis_ids();
        [this.x_scale, this.y_scale] = this._init_axis_scales();
        [this.x_axis, this.y_axis] = this._init_axes();
        // The string used to select the meta items info objects below the plot
        this.meta_item_type = this._init_meta_item_type();
        // Add a clip
        this.svg.append("defs").append("clipPath")
            .attr("id", "sample_clip")
            .append("rect")
            .attr("width", this.width - this.margin.right - this.margin.left)
            .attr("height", this.height - this.margin.bottom - this.margin.top)
            .attr("x", this.margin.left)
            .attr("y", this.margin.top);
        // This is the group where we will do the drawing and that has the above
        // clipping mask applied to it
        this.scatter_group = this.svg.append('g').attr("clip-path", "url(#sample_clip)");
        // Set up the zoom object (one for all dist plots)
        this.zoom = d3.zoom().scaleExtent([.5, 20]).extent([[0, 0],[this.width, this.height]])
            .on("zoom", this._update_dist_plot_zoom.bind(this));
        this.svg.call(this.zoom);
        this.tip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("visibility", "hidden");
        // Unlike the barplot classes, each of the distance plot objects will only
        // need access to one of either the profile meta info or the sample meta info
        // depending on which distance plot we are working with.
        if (this.plot_type == 'sample'){
            this.object_meta_info = getSampleMetaInfo();
        }else if (this.plot_type == 'profile'){
            this.object_meta_info = getProfileMetaInfo();
        }
        this.object_name_to_uid_dict = this._make_name_to_uid_dict(this.object_meta_info);

        // We gave the user-visible color categories different names to those
        // that act as keys for the data. The below color_category_to_color_key
        // is a dict that maps between the two.
        [this.color_by_categories, this.color_category_to_color_key] = this._init_color_by_categories()
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
        // Get the current state of the objects. I.e. genus, color and second pc
        this.current_genus = $(this.svg_id).closest(".card").find(".genera_identifier").attr("data-genera");
        // Get the currently selected color category i.e. no_color or host
        // get the color scale to use
        // get the key used to access the data
        // Finally, log whether we are using the default value or not (i.e. )
        // TODO change the default value of the between profiles to no_color.
        [this.selected_color_category, this.current_color_scale, this.current_color_key, this.selected_color_category_is_default] = this._get_current_color_settings();
        this.current_second_pc = this._get_second_pc();

        // Finally, plot init the distance plot
        this._update_plot();
    }

    //Plotting methods
    _update_plot(){
        
        // Populate the data array that we will be using for plotting
        let data_to_plot = this._populate_data_array_to_plot();

        // Get the max and min x and y values
        let min_x = d3.min(data_to_plot, d => +d.x);
        let max_x = d3.max(data_to_plot, d => +d.x);
        let min_y = d3.min(data_to_plot, d => +d.y);
        let max_y = d3.max(data_to_plot, d => +d.y);

        // A buffer so that the points don't fall exactly on the axis lines
        let x_buffer = (max_x - min_x) * 0.05;
        let y_buffer = (max_y - min_y) * 0.05;

        // Set the domains of the x and y scales
        this.x_scale.domain([min_x - x_buffer, max_x + x_buffer]);
        this.y_scale.domain([min_y - y_buffer, max_y + y_buffer]);

        // Call the axes
        this._call_axes();

        // create the data join
        let dots = this.scatter_group.selectAll("circle").data(data_to_plot, function (d) {
            return d.data_object_key;
        });

        // Place any new scatter points
        //TODO we can add more info to the tool tip like absolute and relative abundances of the samples or profiles
        let x_scale = this.x_scale;
        let y_scale = this.y_scale;
        let self = this;
        dots.enter().append("circle").attr("class", "dot").attr("r", 3.5).attr("cx", function (d) {
            return x_scale(d.x);
        }).attr("cy", d => y_scale(d.y))
        .style("fill", function (d) {
            return self._get_fill_color(d);
        })
        .on("mouseover", function (d) {
            self._show_tool_tip(d, this);
        })
        .on("mouseout", function (d) {
            self.tip.transition().duration(500).style("visibility", "hidden");
        });

        // Update any changes to points that already exist
        dots.transition().duration(1000).attr("cx", d => x_scale(d.x)).attr("cy", d => y_scale(d.y))
            .style("fill", function (d) {
                this._get_fill_color(d);
            });

        // Remove points
        dots.exit().remove()

        // Set the axis titles
        this._set_axis_titles();
    }
    _set_axis_titles(){
        // Set titles for the x and y axes
        // X axis should be PC1
        // Y axis will be the other PC
        // Y axis title
        //we need to be able to change the axis titles so we will give them ids and then
        // check to see if they exist. if they do, simply change text otherwise make from scratch
        let text_x = 15;
        let text_y = this.height / 2;
        let y_axis_selection = $(this.svg_id).find(".y_axis_title");
        // Get the variances of the PC1 and current second PC
        let first_pc_variance = this.pc_variances[this.current_genus][this.available_pcs[this.current_genus].indexOf("PC1")];
        let second_pc_variance = this.pc_variances[this.current_genus][this.available_pcs[this.current_genus].indexOf(this.current_second_pc)];
        if (y_axis_selection.length) {
            // Then the y axis title exists. Change the text of this axis
            y_axis_selection.text(`${this.second_pc} - ${Number.parseFloat(second_pc_variance*100).toPrecision(2)}%`)
        } else {
            // yaxis doesn't exist. make from scratch
            this.svg.append("text").attr("class", "y_axis_title")
                .attr("y", text_y)
                .attr("x", text_x)
                .attr("dy", "1em").attr("font-size", "0.8rem")
                .style("text-anchor", "middle")
                .text(`${this.current_second_pc} - ${Number.parseFloat(second_pc_variance*100).toPrecision(2)}%`)
                .attr("transform", `rotate(-90, ${text_x}, ${text_y})`);
        }

        // X axis title
        text_x = this.width / 2;
        text_y = this.height - 15;
        let x_axis_selection = $(this.svg_id).find(".x_axis_title")
        if (x_axis_selection.length) {
            // Then the y axis title exists. Change the text of this axis
            x_axis_selection.text(`PC1 - ${Number.parseFloat(first_pc_variance*100).toPrecision(2)}%`)
        } else {
            // yaxis doesn't exist. make from scratch
            this.svg.append("text").attr("class", "x_axis_title")
                .attr("y", text_y)
                .attr("x", text_x)
                .attr("dy", "1em").attr("font-size", "0.8rem")
                .style("text-anchor", "middle")
                .text(`PC1 - ${Number.parseFloat(first_pc_variance*100).toPrecision(2)}%`);
        }
    }
    _show_tool_tip(d, outer_this){
        // Display the tool tip on the dist plot point
        this.tip.transition().duration(200).style("visibility", "visible");
        // First we need to look at what the drop down currently says.
        let data_series = this.object_meta_info[d.data_object_key.toString()];
        let content;
        if (!this.selected_color_category_is_default) {
            // Then we can display additional info in the div
            content = `<div>${data_series["name"]}</div><div style="font-size:0.5rem;"><span style="font-weight:bold;">${this.current_color_key}: </span><span>${data_series[this.current_color_key]}</span></div>`;
        } else {
            //Then we just display the sample/profile name
            content = `${data_series["name"]}`
        }
        this.tip.html(content).style("left", (d3.event.pageX + 5) + "px").style("top", (d3.event.pageY - 28) + "px");
        // Apply the information in the sample/profile meta info area
        // First we need to get the genera/clade
        $(outer_this).closest(".plot_item").find(this.meta_item_type).each(function () {
            $(this).text(data_series[$(this).attr("data-key")]);
        });
    }
    _get_fill_color(d){
        if (this.current_color_scale) {
            if (this.current_color_key == "lat_lon") {
                let lat_lon_str = this.object_meta_info[d.data_object_key]["lat"] + ';' + this.object_meta_info[d.data_object_key]["lon"];
                return this.current_color_scale(lat_lon_str);
            } else if (this.current_color_key == "profile_identity") {
                return this.current_color_scale(d.data_object_key);
            } else {
                return this.current_color_scale(this.object_meta_info[d.data_object_key][this.current_color_key]);
            }
        } else {
            return "rgba(0,0,0,0.5)";
        }
    }
    _call_axes(){
        // Call the axes
        d3.select('#' + this.x_axis_id)
            .transition()
            .duration(1000)
            .call(d3.axisBottom(this.x_scale).ticks(0));

        d3.select('#' + this.y_axis_id)
            .transition()
            .duration(1000)
            .call(d3.axisLeft(this.y_scale).ticks(0));
    }
    _update_dist_plot_zoom() {
        let new_x_scale = d3.event.transform.rescaleX(this.x_scale);
        let new_y_scale = d3.event.transform.rescaleY(this.y_scale);
        // update axes with these new boundaries
        d3.select(this.x_axis_id).call(d3.axisBottom(new_x_scale).ticks(0));
        d3.select(this.y_axis_id).call(d3.axisLeft(new_y_scale).ticks(0));

        // update circle position
        this.scatter_group.selectAll("circle").attr('cx', function (d) {
            return new_x_scale(d.x)
        }).attr('cy', function (d) {
            return new_y_scale(d.y)
        });
    }
    _populate_data_array_to_plot(){
        let data_to_plot = [];
        let object_array = this.genera_to_obj_array_dict[this.current_genus]
        for (let i = 0; i < object_array.length; i++) {
            let obj_uid = object_array[i]
            data_to_plot.push({
                data_object_key: obj_uid,
                x: +this.data[this.current_genus][obj_uid]["PC1"],
                y: +this.data[this.current_genus][obj_uid][this.current_second_pc]
            })
        }
        return data_to_plot;
    }
    _init_axis_ids(){
        if (this.plot_type == 'sample'){
            let x_axis_id = "x_axis_btwn_sample";
            let y_axis_id = "y_axis_btwn_sample";
            return [x_axis_id, y_axis_id];
        }else if (this.plot_type == 'profile'){
            let x_axis_id = "x_axis_btwn_profile";
            let y_axis_id = "y_axis_btwn_profile";
            return [x_axis_id, y_axis_id];
        }
    }
    // Init methods
    _get_second_pc(){
        let pc_selector_text = $(this.svg_id).closest(".card-body").find(".pc_selector").attr("data-pc");
        if (pc_selector_text == "PC:") {
            return "PC2";
        } else {
            return pc_selector_text;
        }
    }
    _get_current_color_settings(){
        if (this.plot_type == 'sample'){
            let selected_color = $(this.svg_id).closest(".plot_item").find(".color_select_button").attr("data-color");
            switch (selected_color) {
                case "host":
                    return [selected_color, this.host_color_scale, this.color_category_to_color_key["host"], false];
                case "location":
                    return [selected_color, this.location_color_scale, this.color_category_to_color_key["location"], false];
                case "post_med_seqs_absolute":
                    return [selected_color, this.post_med_absolute_color_scale, this.color_category_to_color_key["post_med_seqs_absolute"], false];
                case "post_med_seqs_unique":
                    return [selected_color, this.post_med_unique_color_scale, btwn_sample_c_cat_key["post_med_seqs_unique"], false];
                case "no_color":
                    return [selected_color, false, 'no_color', true];
            }
        }else if (this.plot_type == 'profile'){
            let selected_color = $(this.svg_id).closest(".plot_item").find(".color_select_button").attr("data-color");
            switch (selected_color) {
                case "local_abundance":
                    return [selected_color, this.profile_local_abundance_color_scale, this.color_category_to_color_key["local_abundance"], false];
                case "db_abundance":
                    return [selected_color, this.profile_db_abundance_color_scale, this.color_category_to_color_key["db_abundance"], false];
                case "profile_identity":
                    return [selected_color, this.profile_identity_color_scale, "profile_identity", true];
            }
        }
    }
    _init_axes(){
        let x_axis = this.svg.append("g").attr("class", "grey_axis")
        .attr("transform", `translate(0,${this.height - this.margin.bottom})`)
        .attr("id", this.x_axis_id);
        let y_axis = this.svg.append("g").attr("class", "grey_axis")
        .attr("transform", `translate(${this.margin.left},0)`)
        .attr("id", this.y_axis_id);
        return [x_axis, y_axis];
    }
    _init_axis_scales(){
        let x_axis_scale = d3.scaleLinear()
            .range([this.margin.left, this.width - this.margin.right]);
        let y_axis_scale = d3.scaleLinear()
            .rangeRound([this.height - this.margin.bottom, this.margin.top]);
        return [x_axis_scale, y_axis_scale];
    }
    _init_meta_item_type(){
        if (this.plot_type == 'sample'){
            return ".sample_meta_item";
        }else if (this.plot_type == 'profile'){
            return ".profile_meta_item";
        }
    }
    _init_genera_to_obj_array_dict(){
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
        if (this.plot_type == 'sample'){
            card_element = $("#between_sample_distances");
        }else if (this.plot_type == 'profile'){
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
            let color_by_categories = ["host", "location", "post_med_seqs_absolute", "post_med_seqs_unique", "no_color"];
            if (!(this.sorting_keys.includes("taxa_string"))) {
                color_by_categories.splice(color_by_categories.indexOf("host"), 1);
            }
            if (!(this.sorting_keys.includes("lat_lon"))) {
                color_by_categories.splice(color_by_categories.indexOf("location"), 1);
            }
            let col_cat_to_col_key = {
                "host": "taxa_string",
                "location": "lat_lon",
                "post_med_seqs_absolute": "post_med_absolute",
                "post_med_seqs_unique": "post_med_unique"
            };
            return [color_by_categories, col_cat_to_col_key];
        }else if (this.plot_type == 'profile'){
            let color_by_categories = ["profile_identity", "local_abundance", "db_abundance"];
            let col_cat_to_col_key = {
                "local_abundance": "local_abund",
                "db_abundance": "db_abund"
            };
            return [color_by_categories, col_cat_to_col_key];
        }
    }
    _populate_color_dropdown_selector(){
        let color_dropdown_to_populate;
        if (this.plot_type == 'sample'){
            color_dropdown_to_populate = $("#between_sample_distances").find(".color_select");
        }else if (this.plot_type == 'profile'){
            color_dropdown_to_populate = $("#between_profile_distances").find(".color_select");
        }
        for (let i = 0; i < this.color_by_categories.length; i++) {
            color_dropdown_to_populate.append(`<a class="dropdown-item" data-color=${this.color_by_categories[i]}>${this.color_by_categories[i]}</a>`);
        }
    }
    _init_sample_color_scales(){
        let host_c_scale;
        let location_c_scale;
        let post_med_absolute_c_scale;
        let post_med_unique_c_scale;
        if (this.color_by_categories.includes("host")) {
            host_c_scale = this._make_sample_categorical_color_scale("host");
        }
        if (this.color_by_categories.includes("location")) {
            location_c_scale = this._make_sample_categorical_color_scale("location");
        }
        post_med_absolute_c_scale = this._make_sample_quantitative_color_scale("post_med_seqs_absolute");
        post_med_unique_c_scale = this._make_sample_quantitative_color_scale("post_med_seqs_unique");
        return [host_c_scale, location_c_scale, post_med_absolute_c_scale, post_med_unique_c_scale];
    }
    _make_sample_categorical_color_scale(category_name){
        let key_name = this.color_category_to_color_key[category_name];
        //need to get the list of taxa string
        let cats_array = [];
        let object_meta_info = this.object_meta_info;
        Object.keys(this.object_meta_info).forEach(function (k) {
            let cat;
            if (category_name == "location") {
                cat = object_meta_info[k]["lat"] + ';' + object_meta_info[k]["lat"];
            } else {
                cat = object_meta_info[k][key_name];
            }

            if (!(cats_array.includes(cat))) {
                cats_array.push(cat);
            }
        });
        // here we have a unique list of the 'host' values
        // now create the colour scale for it
        return d3.scaleOrdinal().domain(cats_array).range(d3.schemeSet3);
    }
    _make_sample_quantitative_color_scale(category_name){
        let key_name = this.color_category_to_color_key[category_name];
        //need to get the list of taxa string
        let values = [];
        let object_meta_info = this.object_meta_info;
        Object.keys(this.object_meta_info).forEach(function (k) {
            values.push(object_meta_info[k][key_name]);
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
        let object_meta_info = this.object_meta_info;
        profile_local_abund_c_scale = this._make_profile_quantitative_color_scale("local_abundance");
        profile_db_abund_c_scale = this._make_profile_quantitative_color_scale("db_abundance");
        profile_idenity_c_scale = d3.scaleOrdinal().domain(
            Object.keys(object_meta_info)).range(
                Object.keys(object_meta_info).map(
                    k => object_meta_info[k]["color"]));
        return [profile_local_abund_c_scale, profile_db_abund_c_scale, profile_idenity_c_scale];
    }
    _make_profile_quantitative_color_scale(category_name){
        let key_name = this.color_category_to_color_key[category_name];
        //need to get the list of taxa string
        let values = [];
        let object_meta_info = this.object_meta_info;
        Object.keys(this.object_meta_info).forEach(function (k) {
            values.push(object_meta_info[k][key_name]);
        });
        let max_val = Math.max(...values);
        let min_val = Math.min(...values);
        // here we have a unique list of the 'host' values
        // now create the colour scale for it
        return d3.scaleLinear().domain([min_val, max_val]).range(["blue", "red"]);
    }   
}