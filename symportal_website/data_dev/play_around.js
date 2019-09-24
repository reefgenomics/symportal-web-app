// d3.json("data/seqs.absolute.json").then(d => chart(d))
//TODO list includes:
// Have a toggle for absolute/relative
// Have a toggle for pre-MED/post-MED



$(document).ready(function () {


    //INIT sliders
    $("#sample_mask_slider").slider({});
    $("#profile_mask_slider").slider({});

    //Get data and set parameters for charting
    // DATA FOR PRE, POST MED and PROFILE
    let data_post_med_by_sample = getRectDataPostMEDBySample();
    let data_pre_med_by_sample = getRectDataPreMEDBySample();
    let data_profile_by_sample = getRectDataProfileBySample();

    // DATA for profile inverted
    // Because this dataset is going to be used in the inverted modal plot we need to
    // remove the cummulative y values that have been added to the above
    let data_profile_inv_by_sample = getRectDataProfileBySample();
    function processProfileInvData(data){
        // For each sample in the data
        Object.keys(data).forEach(function (dkey){
            // First check to see if there are any rectangles for this sample
            if (data[dkey].length == 0){
                return;
            }
            // First sort the list so that we are working in order
            // of either y_rel or y_abs in ascending order
            data[dkey].sort((a, b) => (a["y_rel"] < b["y_rel"]) ? 1 : -1);

            // Now that the data is sorted, go through each element removing the cummulative y
            // we can do this by setting the y to 0 for the first element and then
            // for each next element we can set it to the y of the element that is n-1
            new_y_rel = 0;
            new_y_abs = 0;
            for (j = 0; j < data[dkey].length; j++){
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

    //DATA for btwn sample
    // Eventually this will look at the contents of the directory to
    // see which genera or clades there are data for and put these into an
    // array or object. For the time being I will just hard code it in.
    let btwn_sample_genera_coords_data = {'breviolum': GetBtwnSmplPCCoordsBreviolum()};
    let btwn_sample_genera_pc_variances = {'breviolum': GetBtwnSmplPCVarBreviolum()};

    let btwn_sample_genera_array = Object.keys(btwn_sample_genera_coords_data);

    let max_y_val_post_med = getRectDataPostMEDBySampleMaxSeq();
    let max_y_val_pre_med = getRectDataPreMEDBySampleMaxSeq();
    let max_y_val_profile = getRectDataProfileBySampleMaxSeq();


    let sample_list_post = getRectDataPostMEDBySampleSampleList();
    let sample_list_pre = getRectDataPreMEDBySampleSampleList();
    let sample_list_profile = getRectDataProfileBySampleSampleList();
    let sample_list_modal = getRectDataProfileBySampleSampleList();

    // We will do this dynamically for real but for the time being I will hard code
    let sample_list_btwn_smp_dist = {};
    for (let i = 0; i < btwn_sample_genera_array.length; i++){
        let genera = btwn_sample_genera_array[i];
        sample_list_btwn_smp_dist[genera] = Object.keys(btwn_sample_genera_coords_data[genera]);
    }

    // Init the text value of the genera_identifier in each of the distance plots
    // TODO do for the profile dist plot
    let genera_array = ['Symbiodinium', 'Breviolum', 'Cladocopium', 'Durusdinium'];

    for (let i = 0; i < genera_array.length; i++) {
        // init the genera_indentifier with the first of the genera in the genera_array that we have data for
        if (btwn_sample_genera_array.includes(genera_array[i].toLowerCase())){
            $(".genera_identifier_sample").text(genera_array[i].toLowerCase());
            $(".genera_identifier_sample").attr("data-genera", genera_array[i].toLowerCase());
            break;
        }
    }

    // Set the width of the svg html charts according to number of samples
    // we will work with 13 px per sample + 70 for the margins
    $(".seq_prof_chart").attr("width", ((sample_list_post.length * 13) + 70).toString())

    // Speed at which the sample by sample plotting will be done initially
    let post_med_init_by_sample_interval = 10
    let pre_med_init_by_sample_interval = 50
    let profile_init_by_sample_interval = 10

    //This initial chart function will take care of all of the svg elements that are not going to change during
    // an update. i.e. when we are changing from relative to absolute data
    // We init the profile, post-MED, dist and modal plots in full but hold off on the pre-MED
    // The pre-MED takes a lot of time and will only be loaded if its collapsed DIV is opened
    // We will however init the lets that will be used later on for the pre-MED plot so that
    // They are available within the initiating functions.

    // Here we set the margin letibles and init letiables to represent the svg chars
    let svg_post_med = d3.select("#chart_post_med");
	let svg_post_med_modal = d3.select("#chart_post_med_modal");
    let svg_profile = d3.select("#chart_profile");
    let svg_profile_modal = d3.select("#chart_profile_modal");
    let svg_pre_med;
    let svg_btwn_sample_dist = d3.select("#chart_btwn_sample");
    let svg_btwn_profile_dist = d3.select("#chart_btwn_profile");


    let margin = {top: 35, left: 35, bottom: 20, right: 0},
    seq_prof_width = +svg_post_med.attr("width") - margin.left - margin.right,
    seq_prof_height = +svg_post_med.attr("height") - margin.top - margin.bottom;
    // Alt margin used for the inverted profile_modal plot
    let inv_prof_margin = {top: 5, left: 35, bottom: 20, right: 0};
    // Distance plots heights and widths
    let dist_width = +svg_btwn_sample_dist.attr("width") - margin.left - margin.right,
    dist_height = +svg_btwn_sample_dist.attr("height") - margin.top - margin.bottom;


    // Set the x range that will be used for the x val of the bars
	let x_post_med = d3.scaleBand()
		.range([margin.left, seq_prof_width - margin.right])
		.padding(0.1);
    let x_profile = d3.scaleBand()
		.range([margin.left, seq_prof_width - margin.right])
		.padding(0.1);
    let x_pre_med;
    // x ranges for distance plots
    let x_btwn_sample = d3.scaleLinear()
		.range([margin.left, dist_width - margin.right]);
    let x_btwn_profile = d3.scaleLinear()
		.range([margin.left, dist_width - margin.right]);


    // Set the y range
	let y_post_med = d3.scaleLinear()
        .rangeRound([seq_prof_height - margin.bottom, margin.top])
    // Y is inverted for the inverted profile plot
    let y_profile_modal = d3.scaleLinear()
        .rangeRound([inv_prof_margin.top, seq_prof_height - inv_prof_margin.bottom])
    let y_profile = d3.scaleLinear()
        .rangeRound([seq_prof_height - margin.bottom, margin.top])
    let y_pre_med;
    // y range for dist plots
    let y_btwn_sample = d3.scaleLinear()
        .rangeRound([dist_height - margin.bottom, margin.top])
    let y_btwn_profile = d3.scaleLinear()
        .rangeRound([dist_height - margin.bottom, margin.top])


    // Set the colour scale
    // We can set both the range and domain of this as these are inletiable between absolute and relative
    // data types
    //TODO synchronise the colour scales between the pre- and post-med seqs.
    // The fill colours of the rect objects are now already in the array of objects
    //TODO we will need to have color scales for the distance plots as these will vary depending on
    // the property that we are colouring by.


    //TODO for the time being we may not need axis objects for the distance plots
    //Set up the svg element in which we will call the axis objects
    let xAxis_post_med = svg_post_med.append("g")
    .attr("transform", `translate(0,${seq_prof_height - margin.bottom})`)
    .attr("id", "x_axis_post_med")
    let xAxis_post_med_modal = svg_post_med_modal.append("g")
    .attr("transform", `translate(0,${seq_prof_height - margin.bottom})`)
    .attr("id", "x_axis_post_med_modal")
    let xAxis_profile = svg_profile.append("g")
    .attr("transform", `translate(0,${seq_prof_height - margin.bottom})`)
    .attr("id", "x_axis_profile")
    // inverted profile modal plot is axis is only moved down by top margin
    let xAxis_profile_modal = svg_profile_modal.append("g")
    .attr("transform", `translate(0,${inv_prof_margin.top})`)
    .attr("id", "x_axis_profile_modal")
    let xAxis_pre_med;
    

	let yAxis_post_med = svg_post_med.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("id", "y_axis_post_med");
    let yAxis_post_med_modal = svg_post_med_modal.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("id", "y_axis_post_med_modal");
    let yAxis_profile_modal = svg_profile_modal.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("id", "y_axis_profile_modal");
    let yAxis_profile = svg_profile.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("id", "y_axis_profile");
    let yAxis_pre_med;
//

    // Add a g to the bar plot svgs that we will use for the bars on a sample by sample basis
    // We will have a seperate g for each of the samples so that we can plot column by column
    // The pre-med plot will not get init until later.
    sample_list_post.forEach(function(sample){
    // Selectors cannot start with a number so we will add an s
        svg_post_med.append("g").attr("class", "s" + sample.replace(/\./g, "_"));
        svg_post_med_modal.append("g").attr("class", "s" + sample.replace(/\./g, "_"));
        svg_profile.append("g").attr("class", "s" + sample.replace(/\./g, "_"));
        svg_profile_modal.append("g").attr("class", "s" + sample.replace(/\./g, "_"));
    })

    // TODO create the tool tip for the distance plots
    // Create Tooltips
    let tip_seqs = d3.tip().attr('class', 'd3-tip').direction('e').offset([0,5])
        .html(function(d) {
            let content = '<div style="background-color:rgba(255,255,255,0.9);">' +
            '<span style="margin-left: 2.5px;"><b>' + d.seq_name + '</b></span><br>' +
            '</div>';
            return content;
        });
    let tip_profiles = d3.tip().attr('class', 'd3-tip').direction('e').offset([0,5])
        .html(function(d) {
            let content = '<div style="background-color:rgba(255,255,255,0.9);">' +
            '<span style="margin-left: 2.5px;"><b>' + d.prof_name + '</b></span><br>' +
            '</div>';
            return content;
        });

    svg_post_med.call(tip_seqs);
    svg_post_med_modal.call(tip_seqs);
    svg_profile.call(tip_profiles);
    svg_profile_modal.call(tip_profiles);


    // INIT the post-MED and profile plots modal and normal.
    let data_type;
    if ($("#PostMEDAbsDType").hasClass("btn-primary")){
            data_type = 'absolute';
        } else if ($("#PostMEDRelDType").hasClass("btn-primary")){
            data_type = 'relative';
        }

    // POST-MED INIT
    update_bar_plot_by_sample(data_type, "post", sample_list_post, post_med_init_by_sample_interval);

    // POST-MED-MODAL INIT
    update_bar_plot_by_sample(data_type, "post-modal", sample_list_modal, post_med_init_by_sample_interval);

    // PROFILES INIT
    update_bar_plot_by_sample(data_type, "profile", sample_list_profile, profile_init_by_sample_interval);

    // PROFILES-MODAL INIT
    update_bar_plot_by_sample(data_type, "profile-modal", sample_list_modal, profile_init_by_sample_interval);

    // BTWN SAMPLE INIT
    update_dist_plot("#chart_btwn_sample");

    // Functions for doing the init and updating of the d3 bar plots
    function update_bar_plot_by_sample(data_type, pre_post_profile, sample_list, init_sample_interval){
        // Update the domains first
        update_axis_domains_by_sample(data_type, pre_post_profile)
        // then plot the bars sample by sample
        cum_time = 0
        for(let i = 0; i < sample_list_post.length; i++){
             setTimeout(update_by_sample, i * init_sample_interval, sample_list[i],
             data_type, init_sample_interval, pre_post_profile);
             cum_time += init_sample_interval;
        }
        // Now draw the axis last so that they are on top of the bars
        // we can then use a transition .on event to call the centering of the labels
        setTimeout(call_axes, cum_time, 1000, pre_post_profile)

        // Finally if this is the inv profile modal plot we need to draw on the path manually
        // as the bars are obscuring it for some reason
        if (pre_post_profile == "profile-modal"){
            let d_str = "M" + (inv_prof_margin.left + 0.5).toString() +
            "," + (inv_prof_margin.top + 0.5).toString() + "H" +
            (+svg_post_med.attr("width") - inv_prof_margin.left - inv_prof_margin.right + 0.5).toString();

            svg_profile_modal.append("path").attr("stroke", "black").attr("d", d_str);
        }
    }

    function update_axis_domains_by_sample(data_type, pre_post_profile){
        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        let y;
        let x;
        let max_y;
        let sample_list;
        if (pre_post_profile == "post"){
            y = y_post_med;
            x = x_post_med;
            max_y = max_y_val_post_med;
            sample_list = sample_list_post;
        }else if (pre_post_profile == "post-modal"){
            y = y_post_med;
            x = x_post_med;
            max_y = max_y_val_post_med;
            sample_list = sample_list_modal;
        }else if (pre_post_profile == "pre"){
            y = y_pre_med;
            x = x_pre_med;
            max_y = max_y_val_pre_med;
            sample_list = sample_list_pre;
        }else if (pre_post_profile == "profile"){
            y = y_profile;
            x = x_profile;
            max_y = max_y_val_profile;
            sample_list = sample_list_profile;
        }else if (pre_post_profile == "profile-modal"){
            y = y_profile_modal;
            x = x_profile;
            max_y = max_y_val_profile;
            sample_list = sample_list_modal;
        }

        if (data_type == "absolute"){
            y.domain([0, max_y]).nice();
        }else{
            y.domain([0, 1]).nice();
        }

        // Set the domain of the x. This should be the sample names
        x.domain(sample_list);

    }

    function update_by_sample(col_sample, data_type, speed, pre_post_profile){

        let svg;
        let data_by_sample;
        let delay = 0.1;
        let sample_list;
        if (pre_post_profile.includes("post")){
            data_by_sample = data_post_med_by_sample;
            x = x_post_med;
            y = y_post_med;
            if (pre_post_profile == "post-modal"){
                svg = svg_post_med_modal;
                sample_list = sample_list_modal;
            }else{
                svg = svg_post_med;
                sample_list = sample_list_post;
            }
        }else if (pre_post_profile == "pre"){
            svg = svg_pre_med;
            data_by_sample = data_pre_med_by_sample;
            x = x_pre_med;
            y = y_pre_med;
            sample_list = sample_list_pre;
        }else if (pre_post_profile == "profile"){
            svg = svg_profile;
            data_by_sample = data_profile_by_sample;
            x = x_profile;
            y = y_profile;
            sample_list = sample_list_profile;
        }else if (pre_post_profile == "profile-modal"){
            svg = svg_profile_modal;
            data_by_sample = data_profile_inv_by_sample;
            x = x_profile;
            y = y_profile_modal;
            sample_list = sample_list_modal;
        }

        let bars = svg.select("g.s" + col_sample.replace(/\./g, "_")).selectAll("rect").data(data_by_sample[col_sample], function(d){
            // In theory because we're working on a sample by sample basis now we should be able to work with just the
            // the seq name as key. But for the time being we'll keep the key as it is.
            if (pre_post_profile == "profile" || pre_post_profile == "profile-modal"){
                return d.prof_name + d.sample;
            }else{
                return d.seq_name + d.sample;
            }

        });

        bars.exit().remove()

        let abbr;
        if (data_type == 'absolute'){
            //if 'absolute' then use the abbreviation 'abs' for getting the attributes
            abbr = 'abs'
        }else if (data_type == 'relative'){
            // if 'relative' then use the abbreviation 'rel' for getting the attributes
            abbr = 'rel'
        }

        if (pre_post_profile == "profile-modal"){
            bars.transition().duration(speed).attr("x", function(d){
                return x(d.sample);
            }).attr("y", function(d){
                return y(d["y_" + abbr]);
            }).attr("width", x.bandwidth()).attr("height", function(d){
                return Math.max(y(d["height_" + abbr]), 1);
            }).attr("fill", function(d){
                return d.fill;
            }).delay(function(d,i){return(i*delay)});
        }else{
            bars.transition().duration(speed).attr("x", function(d){
                return x(d.sample);
            }).attr("y", function(d){
                return y(d["y_" + abbr]);
            }).attr("width", x.bandwidth()).attr("height", function(d){
                return Math.max(y(0) - y(d["height_" + abbr]), 1);
            }).attr("fill", function(d){
                return d.fill;
            }).delay(function(d,i){return(i*delay)});
        }


        // Interesting article on the positioning of the .on method
        // https://stackoverflow.com/questions/44495524/d3-transition-not-working-with-events?rq=1
        // We need to have separate updates for each of the profile, profile-modal and all others,
        // ys that we will be using and the tips that we will be showing.
        if (pre_post_profile == "profile"){
            bars.enter().append("rect")
            .attr("x", function(d){
                return x(d.sample);
            }).attr("y", y(0)).on('mouseover', function(d){
                tip_profiles.show(d);
                d3.select(this).attr("style", "stroke-width:1;stroke:rgb(0,0,0);");
                $(this).closest(".card").find(".meta_profile_name").text(d["prof_name"]);
            })
            .on('mouseout', function(d){
                tip_profiles.hide(d);
                d3.select(this).attr("style", null);
            }).transition().duration(1000).attr("y", function(d){
                return y(d["y_" + abbr]);
            }).attr("width", x.bandwidth()).attr("height", function(d){
                return Math.max(y(0) - y(d["height_" + abbr]), 1);}
            ).attr("fill", function(d){
                return d.fill;
            });
        }else if(pre_post_profile == "profile-modal"){
            bars.enter().append("rect")
            .attr("x", function(d){
                return x(d.sample);
            }).attr("y", y(0)).on('mouseover', function(d){
                tip_profiles.show(d);
                d3.select(this).attr("style", "stroke-width:1;stroke:rgb(0,0,0);");
                $(this).closest(".card").find(".meta_profile_name").text(d["prof_name"]);
            })
            .on('mouseout', function(d){
                tip_profiles.hide(d);
                d3.select(this).attr("style", null);
            }).transition().duration(1000).attr("y", function(d){
                return y(d["y_" + abbr]);
            }).attr("width", x.bandwidth()).attr("height", function(d){
                return Math.max(y(d["height_" + abbr]), 1);
            }).attr("fill", function(d){
                return d.fill;
            });
        }else{
            bars.enter().append("rect")
            .attr("x", function(d){
                return x(d.sample);
            }).attr("y", y(0)).on('mouseover', function(d){
                tip_seqs.show(d);
                d3.select(this).attr("style", "stroke-width:1;stroke:rgb(0,0,0);");
            })
            .on('mouseout', function(d){
                tip_seqs.hide(d);
                d3.select(this).attr("style", null);
            }).transition().duration(1000).attr("y", function(d){
                return y(d["y_" + abbr]);
            }).attr("width", x.bandwidth()).attr("height", function(d){
                return Math.max(y(0) - y(d["height_" + abbr]), 1);}
            ).attr("fill", function(d){
                return d.fill;
            });
        }
    }

    function call_axes(speed, pre_post_profile){
        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        if (pre_post_profile == "post"){
            y = y_post_med;
            x = x_post_med;
            y_axis_id = "#y_axis_post_med";
            x_axis_id = "#x_axis_post_med";
        }else if (pre_post_profile == "post-modal"){
            y = y_post_med;
            x = x_post_med;
            y_axis_id = "#y_axis_post_med_modal";
            x_axis_id = "#x_axis_post_med_modal";
        }else if (pre_post_profile == "pre"){
            y = y_pre_med;
            x = x_pre_med;
            y_axis_id = "#y_axis_pre_med";
            x_axis_id = "#x_axis_pre_med";
        }else if (pre_post_profile == "profile"){
            y = y_profile;
            x = x_profile;
            y_axis_id = "#y_axis_profile";
            x_axis_id = "#x_axis_profile";
        }else if (pre_post_profile == "profile-modal"){
            y = y_profile_modal;
            x = x_profile;
            y_axis_id = "#y_axis_profile_modal";
            x_axis_id = "#x_axis_profile_modal";
        }

        // Call the y axis
        d3.select(y_axis_id)
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y).ticks(null, "s"));

        // Call the x axis
        if (pre_post_profile == "profile-modal"){
            // Axis with ticks above and no text
            d3.select(x_axis_id).transition().duration(speed)
                    .call(d3.axisTop(x).tickSizeOuter(0));

        }else if (pre_post_profile == "post-modal") {
            // Axis with the centered labels
            // Has callback to center the labels
            d3.selectAll(x_axis_id).transition().duration(speed)
                    .call(d3.axisBottom(x).tickSizeOuter(0)).selectAll("text")
                    .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                    .style("text-anchor", "start").style("text-anchor", "start")
                    .on("end", centerAlignXLabels);
        }else{
            // The regular axis with ticks and text below
            // no call back to center the labels
            d3.selectAll(x_axis_id).transition().duration(speed)
                    .call(d3.axisBottom(x).tickSizeOuter(0)).selectAll("text")
                    .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                    .style("text-anchor", "start").style("text-anchor", "start");
        }

        // Listener to highlight sample names on mouse over.
        // Not needed for the post-2
        if (pre_post_profile !== "profile-modal"){
            let ticks = d3.select(x_axis_id).selectAll(".tick")._groups[0].forEach(function(d1){
                d3.select(d1).on("mouseover", function(){
                    d3.select(this).select("text").attr("fill", "blue").attr("style", "cursor:pointer;text-anchor: start;");
                    let sample_name = this.__data__;
                    $(this).closest(".card").find(".meta_sample_name").text(sample_name);
                }).on("mouseout", function(){
                    d3.select(this).select("text").attr("fill", "black").attr("style", "cursor:auto;text-anchor: start;");
                })
            })
        }
    }

    // Functions for doing the init and updating of the d3 dist plots
    function update_dist_plot(dist_plot_id){
        let svg;
        let coords;
        let first_pc_variance;
        let second_pc_variance;
        let sample_array;
        let second_pc;
        let genera;
        let x_scale;
        let y_scale;
        let data = [];

        //TODO this will need updating to include the profile distances and the modals
        // but to save dev time we will try to get the scatter working with just this one first
        switch(dist_plot_id){
            // I think we should simplify the data here according to the various selections that have been made
            // The first will be to look at genera, then PC. The colour will be done using the colour scale eventually
            // but first I will just do this as black and we can dev this later.
            // We want to end up with two arrays, one for the x and one for the y
            case "#chart_btwn_sample":
                svg = svg_btwn_sample_dist;
                coords = btwn_sample_genera_coords_data;
                pc_variances = btwn_sample_genera_pc_variances;


                // get the genera
                // NB the genera identifier is updated from the click of the genera drop down or
                // as part of the init.
                genera = $(dist_plot_id).closest(".card").find(".genera_identifier_sample").attr("data-genera");
                sample_array = sample_list_btwn_smp_dist[genera];

                // get the PC from the PC selector

                let pc_selector_text = $(dist_plot_id).closest(".card-body").find(".pc_selector").attr("data-pc");
                if ( pc_selector_text == "PC:"){second_pc="PC2";}else{second_pc=pc_selector_text;}

                coords = btwn_sample_genera_coords_data[genera];
                first_pc_variance = btwn_sample_genera_pc_variances[genera]["PC1"];
                second_pc_variance = btwn_sample_genera_pc_variances[genera][second_pc];

                x_scale = x_btwn_sample;
                y_scale = y_btwn_sample;

                for (let i = 0; i < sample_array.length; i++){
                    let sample = sample_array[i]
                    data.push({
                        sample_name:sample,
                        x : coords[sample]["PC1"],
                        y : coords[sample][second_pc]
                    })

                }

                let min_sanity = d3.min(data, d => d.x);

                x_scale.domain([d3.min(data, d => d.x), d3.max(data, d => d.x)]);
                y_scale.domain([d3.min(data, d => d.y), d3.max(data, d => d.y)]);
        }

        // Here do the plotting of the scatter
        let dots = svg.selectAll(".dot").data(data, d => d.sample);

        // Place any new scatter points
        dots.enter().append("circle").attr("class", "dot").attr("r", 3.5).attr("cx", function(d){
            return x_scale(d.x);
        }).attr("cy", d => y_scale(d.y))
        .style("fill", "rgba(0,0,0,0.5)");

        // Update any changes to points that already exist
        dots.transition().duration(20).attr("cx", d => x_scale(d.x)).attr("cy", d => y_scale(d.y))
        .style("fill", "rgba(0,0,0,0.5)");

        // Remove points
        dots.exit().remove()

    }


	// LISTENERS RELATED TO CHARTING
	// RELATIVE to ABSOLUTE switch
	// When we change the modal or regular version we want these changes relected in the other.
    $(".dtype-btn").click(function(){
        console.log($(this).text());
        //If the button is of class btn light then it is not selected and this click should fire
        // the change in datatype event for the relevant svg
        if($(this).hasClass("btn-light")){
            //First change the button attributes so that it looks like we've registered the clicks
            $(this).parents(".btn-group").find('.dtype-btn').each(function(){
                if ($(this).hasClass("btn-light")){
                    //Switch around the btn styles so that light becomes primary and viceversa
                    $(this).addClass("btn-primary").removeClass("btn-light")
                }else if($(this).hasClass("btn-primary")){
                    $(this).addClass("btn-light").removeClass("btn-primary")
                }
            });

            //Second change update the plot to represent the newly selected datatype
            // If one of the modal buttons then need to update both plots
            // else just the one plot.
            let pre_post_profile = $(this).attr("data-data-type")
            let sample_list;
            let init_speed;
            if (pre_post_profile == "post-profile"){
                // Update post modal
                update_bar_plot_by_sample($(this).text(), "post-modal",
                sample_list_modal, post_med_init_by_sample_interval);
                // Update profile modal
                update_bar_plot_by_sample($(this).text(), "profile-modal",
                sample_list_modal, profile_init_by_sample_interval);
            }else{
                switch(pre_post_profile){
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
    $('#pre_med_svg_collapse').on('show.bs.collapse', function(){
        // First check to see if the pre-MED svg has already been initiated. If so then there is nothing
        // to do here.
        //TODO implement the spinner and get rid of the text when open
        if (!$("#chart_pre_med").hasClass("init")){
            $("#chart_pre_med").attr("class", "init");
            //Plot as relative or absolute abundances according to which button is currently primary
            if($("#PreMEDRelDType").hasClass("btn-primary")){
                let data_type = "relative";
            }else{
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
             sample_list_pre.forEach(function(sample){
                svg_pre_med.append("g").attr("class", "s" + sample.replace(/\./g, "_"))
             });

            update_bar_plot_by_sample(data_type, "pre", sample_list_pre, pre_med_init_by_sample_interval)


        }

    });

    // Listening for the sorting button clicks
    // TODO we need to have a separate samplelist that is shared by the modals.
    $(".svg_sort_by a").click(function(){
        let current_text = $(this).closest(".btn-group").find(".btn").text();

        if (current_text !== $(this).text()){
            $(this).closest(".btn-group").find(".btn").text($(this).text());

            let data_type;
            let pre_post_profile;
            let sample_list;
            let init_speed;
            $(this).closest(".btn-group-sm").find(".dtype-btn").each(function(){
                // We need to infer the rel_abs from the primary coloured button
                if ($(this).hasClass("btn-primary")){
                    pre_post_profile = $(this).attr("data-data-type");
                    data_type = $(this).text();
                }

            });

            //TODO perform sorting here.
            // In place of getting a new sample order for real we will simply
            // reverse the current one
            if (pre_post_profile == "post-profile"){
                sample_list_modal = sample_list_modal.reverse();
                // Update post modal
                update_bar_plot_by_sample(data_type, "post-modal",
                sample_list_modal, post_med_init_by_sample_interval);
                // Update profile modal
                update_bar_plot_by_sample(data_type, "profile-modal",
                sample_list_modal, profile_init_by_sample_interval);
            }else{
                switch (pre_post_profile){
                    case "post":
                        sample_list_post = sample_list_post.reverse();
                        sample_list = sample_list_post;
                        init_speed = post_med_init_by_sample_interval;
                        break;
                    case "pre":
                        sample_list_pre = sample_list_pre.reverse();
                        sample_list = sample_list_pre;
                        init_speed = pre_med_init_by_sample_interval;
                        break;
                    case "profile":
                        sample_list_profile = sample_list_profile.reverse();
                        sample_list = sample_list_profile;
                        init_speed = profile_init_by_sample_interval;
                        break;
                }
                update_bar_plot_by_sample(data_type, pre_post_profile, sample_list_pre, pre_med_init_by_sample_interval)

            }
        }

    });

    //INIT MAP
    function initMap() {

        let location = new google.maps.LatLng(22.193730, 38.957069);

        let mapCanvas = document.getElementById('map');
        let mapOptions = {
            center: location,
            zoom: 10,
            panControl: false,
            mapTypeId: google.maps.MapTypeId.SATELLITE
        }
        let map = new google.maps.Map(mapCanvas, mapOptions);


        let contentString = '<div >' +
            '<span style="font-weight:bold;">lat:</span> 32.18876, <span style="font-weight:bold;">lon:</span> 98.7985, <span style="font-weight:bold;">site_name:</span> --, <span style="font-weight:bold;">num_samples:</span> 42'+
        '</div>'+
        '<table class="table table-hover table-sm" style="font-size:0.5rem;">'+
            '<thead>'+
                '<tr>'+
                    '<th>sample_name</th>'+
                    '<th>host_taxa</th>'+
                    '<th>depth</th>'+
                '</tr>'+
            '</thead>'+
            '<tbody>'+
            '<tr>'+
                '<td>Xj.wer.28392</td>'+
                '<td>P. lobata</td>'+
                '<td>2-8m</td>'+
            '</tr>'+
            '<tr>'+
                '<td>Xj.wer.28392</td>'+
                '<td>P. lobata</td>'+
                '<td>2-8m</td>'+
            '</tr>'+
            '<tr>'+
                '<td>Xj.wer.28392</td>'+
                '<td>P. lobata</td>'+
                '<td>2-8m</td>'+
            '</tr>'+
            '<tr>'+
                '<td>Xj.wer.28392</td>'+
                '<td>P. lobata</td>'+
                '<td>2-8m</td>'+
            '</tr>'+
            '<tr>'+
                '<td>Xj.wer.28392</td>'+
                '<td>P. lobata</td>'+
                '<td>2-8m</td>'+
            '</tr>'+
            '<tr>'+
                '<td>Xj.wer.28392</td>'+
                '<td>P. lobata</td>'+
                '<td>2-8m</td>'+
            '</tr>'+
            '</tbody>'+
        '</table>';

        let marker_data = [{'lat': 22.235196, 'lng': 39.006563, 'label': "reef_1"}, {'lat': 22.190266, 'lng': 38.978879, 'label': "reef_2"}]

        let infowindow = new google.maps.InfoWindow({
          content: contentString
        });

        marker_data.forEach(function(data){
            let marker =  new google.maps.Marker({
            position: {lat: data['lat'], lng: data['lng']},
            map:map
            });

            marker.addListener('click', function() {
                infowindow.open(map, marker);
            });
        });
//        let first_marker = new google.maps.Marker({position: {lat: 22.235196, lng: 39.006563}, map:map, label:"reef_two"})
//        let second_marker = new google.maps.Marker({position: {lat: 22.190266, lng: 38.978879}, map:map, label:"Thuwal"})

//        let markerCluster = new MarkerClusterer(map, map_markers,
//            {imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'});

    }

    google.maps.event.addDomListener(window, 'load', initMap);


    function centerAlignXLabels(){
        // This function aims to move the text labels down slightly
        // to align them vertically centrally.
        // Only those labels shorter than others need moving
        // We use the bottom of the bounding box of the axis (svg g element)
        // We calculate the distance between the bottom of the text element
        // and this g box and then move it down by half of this.
        // UPDATE: because the modal hasn't appeared yet we the method below
        // doesn't work because there are no bounding boxes yet.
        //TODO fix this.
        $('#x_axis_post_med_modal').find('text').each(function(){
            let text_current_x = +$(this).attr("x");
            let g_bbox_height = $("#x_axis_post_med_modal")[0].getBoundingClientRect().height;
            let text_bbox_height_inc_tick = this.getBBox().width + text_current_x;
            let distance_btwn_g_and_text = g_bbox_height - text_bbox_height_inc_tick;
            // I have no idea why I have to divide by four here, but dividing by two
            // and adding this to the attributes was moving it all the way to the bottom.
            let dist_to_move = distance_btwn_g_and_text/4;
            if (dist_to_move > 1){
                let new_x = (text_current_x + dist_to_move).toString();
                $(this).attr("x", new_x);
            }

        });
    }

});







