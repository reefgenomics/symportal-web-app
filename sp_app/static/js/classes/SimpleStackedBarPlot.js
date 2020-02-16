console.log("this happened")
/* Create the plot objects via class abstraction
The post-MED and profile plots share a lot in common and can easily be represented
as a single classs. However, the  modal stacked bar plot is much more complicated.
It has basically double of everything that the simple stacked bar plots have.
I don't think its a good idea to work with a base class is extended. It will be to 
complicated and the abstraction will not be clear. Instead I think it will be
easiest and clearest to have a seperate class. We can call the classes
SimpleStackedBarPlot and ModalStackedBarPlot.*/
class SimpleStackedBarPlot{
    // This base class will hold most of the setup for the stacked bar
    // plots
    // We will use an extension of this for each of the post_med and 
    // profile plots that will contain the methods for doing the plotting
    constructor({name_of_html_svg_object, get_data_method, get_max_y_val_method, sample_meta_info_method, profile_meta_info_method, plot_type}){
        // Get the object that has the sorting parameter as key
        // and a sorted list of the uids (either samples or profiles) as value
        this.plot_type = plot_type;
        this.sorted_uid_arrays = getSampleSortedArrays();
        this.sorting_keys = Object.keys(this.sorted_uid_arrays);
        this.svg = d3.select(name_of_html_svg_object);
        // The object containing the rectangle data to be plotted
        this.data = get_data_method();
        // The maximum absolute count for a given sample
        // This is used to scale the y axis
        this.max_y = get_max_y_val_method();
        // The object that holds the meta info for the samples
        this.sample_meta_info = sample_meta_info_method();
        // Create a name to uid dictionary for the samples
        this.sample_name_to_uid_dict = this._make_name_to_uid_dict(this.sample_meta_info);
        if (this.plot_type == 'profile'){
            // If we are working with the profile plot instance
            // We will need a profile meta info dictionary as well and the corresponding
            // profile name to uid dictt
            this.profile_meta_info = profile_meta_info_method();
            this.profile_name_to_uid_dict = this._make_name_to_uid_dict(this.profile_meta_info);
        }
        
        // The array that contains the current order of the samples
        // This will changed based on the parameter that is sorting the plot
        // If profile_based is available (i.e. if there was an analysis) start
        // with this. Else start with similarity.
        this.current_sample_order_array = this._init_current_sample_order_array();
        this.margin = this._init_margin();
        this.plot_speed = this._init_plot_speed();
        [this.width, this.height] = this._init_width_and_height();
        [this.x_scale, this.y_scale] = this._init_scales();
        // Init the axis group
        //NB the axis no need translating down or left in the direction they orientate.
        // I.e. x axis doesn't need to be translated right (only down)
        // and yaxis doesn't need translating down (only right).
        // This is because they apparently use their ranges to set their positions
        [this.x_axis_id_string, this.y_axis_id_string] = this._init_axes_ids();
        [this.x_axis, this.y_axis] = this._init_axes();
        
        // INIT the drop down with the sample sorting categories we have available
        this._init_sorting_drop_down_menus();
    
        // Add a g to the bar plot svgs that we will use for the bars on a sample by sample basis
        // We will have a seperate g for each of the samples so that we can plot column by column
        // The pre-med plot will not get init until later.
        this._add_sample_groups_to_bar_svgs();
        
        // Create and call the tool tip
        this.tips = this._init_tips();
        this.svg.call(this.tips);
        
        this.color_scale = this._init_color_scale();

        // Whether the plot is currently displaying absolute or relative abundances
        this.absolute_relative = this._init_absolute_realtive();

        // Listeners
        // Relative to Absolute data distplay toggle
        let self = this;
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
                //Second update the plot to represent the newly selected datatype
                // If one of the modal buttons then need to update both plots
                // else just the one plot.
                self._update_absolute_realtive
                self.update_bar_plot_by_sample();
            }
        });

        // Finally, init the plot for the very first time
        this.update_plot();
    }

    // Base level plotting functions
    // Plotting methods
    update_plot(){
        //First update the x_scale and y_scale domains
        this._update_axes_domains();
        
        // Code that does the majoirty of the replotting
        let cumulative_time = 0;
        for (let i = 0; i < this.current_sample_order_array.length; i++) {
            setTimeout(
                //https://stackoverflow.com/questions/5911211/settimeout-inside-javascript-class-using-this
                this._replot_data.bind(this), 
                i * this.plot_speed, 
                this.current_sample_order_array[i],
            );
            cumulative_time += this.plot_speed;
        }
        
        // Now draw the axis last so that they are on top of the bars
        // we can then use a transition .on event to call the centering of the labels
        setTimeout(this._update_axes.bind(this), cumulative_time);
    }
    _update_axes_domains(){
        if (this.absolute_relative == 'absolute'){
            this.y_scale.domain([0, this.max_y]).nice();
        }else if (this.aboslute_relative == 'relative'){
            this.y_scale([0,1]).nice();
        }
        this.x_scale.domain(this.current_sample_order_array);
    }
    _replot_data(sample_uid){
        
        // Bars is the join that we will call exit
        let bars = this.svg.select("g.s" + sample_uid).selectAll("rect").data(this.data[sample_uid], function (d) {
            if (this.plot_type == 'post_med'){
                return d.seq_name;
            }else if (this.plot_type == 'profile'){
                return d.profile_name;
            }
        });

        // Remove any data points from the plot that don't exist
        bars.exit().remove()
        
        // Transitions
        let abs_rel;
        if (this.absolute_relative == 'absolute'){
            abs_rel = 'abs';
        }else if (this.absolute_relative == 'relative'){
            abs_rel = 'rel';
        }
        let color_scale = this.color_scale;
        let x_scale = this.x_scale;
        let y_scale = this.y_scale;
        let plot_type = this.plot_type;
        bars.transition().duration(this.plot_speed).attr("x", function (d) {
            return x_scale(sample_uid);
        }).attr("y", function (d) {
            return y_scale(+d["y_" + abs_rel]);
        }).attr("width", x_scale.bandwidth()).attr("height", function (d) {
            return Math.max(y_scale(0) - y_scale(+d["height_" + abs_rel]), 1);
        }).attr("fill", function (d) {
            if (plot_type == 'post_med'){
                return color_scale(d.seq_name);
            }else if (plot_type == 'profile'){
                return color_scale(this.profile_name_to_uid_dict[d.profile_name])
            }
        }).delay(function (d, i) {
            return (i * 0.1)
        });

        // New objects to be created (enter phase)
        let tips = this.tips;
        let profile_name_to_uid_dict = this.profile_name_to_uid_dict;
        let profile_meta_info = this.profile_meta_info;
        bars.enter().append("rect")
            .attr("x", function (d) {
                return x_scale(sample_uid);
            }).attr("y", y_scale(0)).on('mouseover', function (d) {
                tips.show(d);
                d3.select(this).attr("style", "stroke-width:1;stroke:rgb(0,0,0);");
                if (plot_type == 'profile'){
                    let profile_uid = profile_name_to_uid_dict[d["profile_name"]];
                    let profile_data_series = profile_meta_info[profile_uid.toString()];
                    $(this).closest(".plot_item").find(".profile_meta_item").each(function () {
                        $(this).text(profile_data_series[$(this).attr("data-key")]);
                    });
                    $(this).closest(".plot_item").find(".meta_profile_name").text(d["profile_name"]);
                }
            })
            .on('mouseout', function (d) {
                tips.hide(d);
                d3.select(this).attr("style", null);
            }).transition().duration(1000).attr("y", function (d) {
                return y_scale(+d["y_" + abs_rel]);
            }).attr("width", x_scale.bandwidth()).attr("height", function (d) {
                return Math.max(y_scale(0) - y_scale(+d["height_" + abs_rel]), 1);
            }).attr("fill", function (d) {
                if (plot_type == 'post_med'){
                    return color_scale(d.seq_name);
                }else if (plot_type == 'profile'){
                    return color_scale(profile_name_to_uid_dict[d.profile_name]);
                }
            });
    }
    _update_axes(){
        // y axis
        d3.select("#" + this.y_axis_id_string)
        .transition()
        .duration(1000)
        .call(
            d3.axisLeft(this.y_scale).ticks(null, "s")
        );

        // x axis
        let self = this;
        let sample_meta_info = this.sample_meta_info;
        d3.selectAll("#" + this.x_axis_id_string).transition().duration(1000)
        .call(d3.axisBottom(this.x_scale).tickFormat(d => sample_meta_info[d]["name"]).tickSizeOuter(0)).selectAll("text")
        .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
        .style("text-anchor", "start").on(
            "end", function(){
                // This is a little tricky. The .on method is being called
                // on th text object and therefore in this scope here
                // the 'this' object is the text object.
                // So, to call the ellipse method of this class we have set
                // self to equal the class instance and becuase the class
                // instance is calling the _ellipse method, the 'this' object
                // will be callable from within the _ellipse method. However,
                // we still need access to the text object in this method so 
                // we will pass it in.
                self._ellipse_axis_labels(this);
            });

        // Listener to highlight sample names on mouse over.
        d3.select("#" + this.x_axis_id_string).selectAll(".tick")._groups[0].forEach(function (d1) {
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
    _ellipse_axis_labels(text_obj){
        var self = d3.select(text_obj),
        textLength = self.node().getComputedTextLength(),
        text = self.text(),
        current_x = self.attr("x");
        while (textLength > (this.margin.bottom - current_x) && text.length > 0) {
            text = text.slice(0, -1);
            self.text(text + '...');
            textLength = self.node().getComputedTextLength();
        }
    }

    // Private init methods
    _make_name_to_uid_dict(meta_info_obj){
        let temp_dict = {};
        Object.keys(meta_info_obj).forEach(function (uid) {
            temp_dict[meta_info_obj[uid]["name"]] = +uid;
        })
        return temp_dict;
    }
    _init_current_sample_order_array(){
        if (this.sorting_keys.includes('profile_based')) {
            return this.sorted_uid_arrays['profile_based'];
        } else {
            return this.sorted_uid_arrays['similarity'];
        }
    }
    _init_margin(){return {top: 30, left: 35, bottom: 60, right: 0};}  
    _init_plot_speed(){
        // Set the speed at which transitions will happen
        if (this.plot_type == 'post_med'){
            return 1;
        }else if (this.plot_type == 'profile'){
            return 10;
        }
    }
    _init_width_and_height(){
        this.svg.attr("width", ((this.current_sample_order_array.length * 13) + 70).toString());
        let width = +this.svg.attr("width") - this.margin.left - this.margin.right;
        let height = +this.svg.attr("height") - this.margin.top - this.margin.bottom;
        return [width, height];
    }
    _init_scales(){
        let x_scale = d3.scaleBand()
            .range([this.margin.left, this.width + this.margin.left])
            .padding(0.1);
        let y_scale = d3.scaleLinear()
            .rangeRound([this.height + this.margin.top, this.margin.top]);
        return [x_scale, y_scale];
    }
    _init_axes_ids(){
        if (this.plot_type == 'post_med'){
            return ["x_axis_post_med", "y_axis_post_med"];
        }else if (this.plot_type == 'profile'){
            return ["x_axis_profile", "y_axis_profile"];
        }
    }
    _init_axes(){
        let x_axis = this.svg.append("g")
            .attr("transform", `translate(0,${this.height + this.margin.top})`)
            .attr("id", this.x_axis_id_string);
        let y_axis = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},0)`)
            .attr("id", this.y_axis_id_string);
        return [x_axis, y_axis];
    }
    _init_sorting_drop_down_menus(){
        let sort_dropdown_to_populate = $("#post_med_card").find(".svg_sort_by");
        for (let i = 0; i < this.sorting_keys.length; i++) {
            sort_dropdown_to_populate.append(`<a class="dropdown-item" >${this.sorting_keys[i]}</a>`);
        }
    }
    _add_sample_groups_to_bar_svgs() {
        let svg = this.svg;
        this.current_sample_order_array.forEach(function (sample) {
            svg.append("g").attr("class", "s" + sample);
        })
    }
    _init_tips(){
        let tips;
        if (this.plot_type == 'post_med'){
            tips = d3.tip().attr('class', 'd3-tip').direction('e').offset([0, 5])
                .html(function (d) {
                    let content = '<div style="background-color:rgba(255,255,255,0.9);">' +
                        '<span style="margin-left: 2.5px;"><b>' + d.seq_name + '</b></span><br>' +
                        '</div>';
                    return content;
                });
        }else if (this.plot_type == 'profile'){
            tips = d3.tip().attr('class', 'd3-tip').direction('e').offset([0, 5])
                .html(function (d) {
                    let content = '<div style="background-color:rgba(255,255,255,0.9);">' +
                        '<span style="margin-left: 2.5px;"><b>' + d.profile_name + '</b></span><br>' +
                        '</div>';
                    return content;
                });
        }
        return tips
    }
    _init_color_scale(){
        if (this.plot_type == 'post_med'){
            // We can set both the range and domain of this as these are invariable between absolute and relative
            // data types
            // If we ran the data loading or analysis using the --no_pre_med_seqs flag
            // then the getSeqColor method will not have been output.
            // However the getSeqColorPostMED function should have been output and we will
            // use this instead
            let seq_color;
            try{
                seq_color = getSeqColor();
            }
            catch(err){
                seq_color = getSeqColorPostMED();
            }
            let seq_names = Object.keys(seq_color);
            let seq_colors = seq_names.map(function (seq_name) {
                return seq_color[seq_name]
            });
            return d3.scaleOrdinal().domain(seq_names).range(seq_colors);
        }else if (this.plot_type == 'profile'){
            let prof_color = getProfColor();
            let prof_names = Object.keys(prof_color);
            let prof_colors = prof_names.map(function (prof_name) {
                return prof_color[prof_name]
            });
            return d3.scaleOrdinal().domain(prof_names).range(prof_colors);
        }
        
    }
    _init_absolute_realtive(){
        if (this.plot_type == 'post_med'){
            if ($("#PostMEDAbsDType").hasClass("btn-primary")) {
                return 'absolute';
            } else if ($("#PostMEDRelDType").hasClass("btn-primary")) {
                return 'relative';
            }
        }else if (this.plot_type == 'profile'){
            if ($("#ProfileMEDAbsDType").hasClass("btn-primary")) {
                return 'absolute';
            } else if ($("#ProfileMEDRelDType").hasClass("btn-primary")) {
                return 'relative';
            }
        }
    }
    _update_absolute_realtive(){
        if (this.plot_type == 'post_med'){
            if ($("#PostMEDAbsDType").hasClass("btn-primary")) {
                this.abs_rel = 'absolute';
            } else if ($("#PostMEDRelDType").hasClass("btn-primary")) {
                this.abs_rel = 'relative';
            }
        }else if (this.plot_type == 'profile'){
            if ($("#ProfileMEDAbsDType").hasClass("btn-primary")) {
                this.abs_rel = 'absolute';
            } else if ($("#ProfileMEDRelDType").hasClass("btn-primary")) {
                this.abs_rel = 'relative';
            }
        }
    }
};