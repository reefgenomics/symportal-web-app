// d3.json("data/seqs.absolute.json").then(d => chart(d))
//TODO list includes:
// Have a toggle for absolute/relative
// Have a toggle for pre-MED/post-MED



chart();

function chart() {
    //This initial chart function will take care of all of the svg elements that are not going to change during
    // an update. i.e. when we are changing from relative to absolute data

    // Here we set the margins of the svg chart
    var svg_post_med = d3.select("#chart_post_med"),
		margin = {top: 35, left: 35, bottom: 20, right: 0},
		width = +svg_post_med.attr("width") - margin.left - margin.right,
		height = +svg_post_med.attr("height") - margin.top - margin.bottom;

	var svg_pre_med = d3.select("#chart_pre_med"),
		margin = {top: 35, left: 35, bottom: 20, right: 0},
		width = +svg_pre_med.attr("width") - margin.left - margin.right,
		height = +svg_pre_med.attr("height") - margin.top - margin.bottom;

    // Set the x scale that will be used for the x val of the bars
	var x_post_med = d3.scaleBand()
		.range([margin.left, width - margin.right])
		.padding(0.1)

	// Set the x scale that will be used for the x val of the bars
	var x_pre_med = d3.scaleBand()
		.range([margin.left, width - margin.right])
		.padding(0.1)

    // Set the y scale
	var y_post_med = d3.scaleLinear()
        .rangeRound([height - margin.bottom, margin.top])

    var y_pre_med = d3.scaleLinear()
        .rangeRound([height - margin.bottom, margin.top])

    // Set the colour scale
    // We can set both the range and domain of this as these are invariable between absolute and relative
    // data types
    //TODO synchronise the colour scales between the pre- and post-med seqs.
    // This will need to be done within the python SymPortal code.
    var c_dict_post_med = getColDictObjArrPostMED()
    var c_dict_post_med_colors = c_dict_post_med.map(d => d.d_value)
    var c_dict_post_med_seq_names = c_dict_post_med.map(d => d.d_key)
    var col_scale_post_med = d3.scaleOrdinal()
    .range(c_dict_post_med_colors)
    .domain(c_dict_post_med_seq_names);

    var c_dict_pre_med = getColDictObjArrPreMED()
    var c_dict_pre_med_colors = c_dict_pre_med.map(d => d.d_value)
    var c_dict_pre_med_seq_names = c_dict_pre_med.map(d => d.d_key)
    var col_scale_pre_med = d3.scaleOrdinal()
    .range(c_dict_pre_med_colors)
    .domain(c_dict_pre_med_seq_names);
        
    //Set up the svg element in which we will call the axis objects
    var xAxis_post_med = svg_post_med.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("id", "x_axis_post_med")

	var yAxis_post_med = svg_post_med.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("id", "y_axis_post_med")

    //Set up the svg element in which we will call the axis objects
    var xAxis_pre_med = svg_pre_med.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("id", "x_axis_pre_med")

	var yAxis_pre_med = svg_pre_med.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("id", "y_axis_pre_med")
    
    update(d3.select("#data_type_selector").property("value"), 0);

    function update(data_type, speed){
        if (data_type == 'absolute'){
            var data_post_med  = getSeqDataAbsolutePostMED();
            // if plotting absolute values we can get the highest y from the 'post_med_aboslute' property
            var max_y_val_post_med = d3.max(data_post_med, d => d.post_med_absolute);

            var data_pre_med  = getSeqDataAbsolutePreMED();

            // if plotting absolute values we can get the highest y from the 'post_taxa_... ' for the pre-med
            var max_y_val_pre_med = d3.max(data_post_med, d => d.post_taxa_id_absolute_symbiodinium_seqs);
        } else if (data_type == 'relative')
        {
            var data_post_med = getSeqDataRelativePostMED();
            var max_y_val_post_med = 1;
            var data_pre_med = getSeqDataRelativePreMED();
            var max_y_val_pre_med = 1;
        }

        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        y_post_med.domain([0, max_y_val_post_med]).nice();
        y_pre_med.domain([0, max_y_val_pre_med]).nice();

        // Now update the y axis
        svg_post_med.selectAll("#y_axis_post_med")
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y_post_med).ticks(null, "s"));

        svg_pre_med.selectAll("#y_axis_pre_med")
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y_pre_med).ticks(null, "s"));

        // Set the domain of the x. This should be the sample names
        x_post_med.domain(data_post_med.map(d => d.sample_name));
        x_pre_med.domain(data_pre_med.map(d => d.sample_name));

        // Complete the x axis
        // This should be fairly invariable for the time being as we aren't playing with the order of the x axis yet
        svg_post_med.selectAll("#x_axis_post_med").transition().duration(speed)
                .call(d3.axisBottom(x_post_med).tickSizeOuter(0)).selectAll("text")
                .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                .style("text-anchor", "start").style("text-anchor", "start");
        svg_pre_med.selectAll("#x_axis_pre_med").transition().duration(speed)
                .call(d3.axisBottom(x_pre_med).tickSizeOuter(0)).selectAll("text")
                .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                .style("text-anchor", "start").style("text-anchor", "start");

        // Some magic with stacking
        // by having the keys provided here, a key property is associated to each of the g.layers created
        // this is then used when doing the colour lookup for example.
        var group_post_med = svg_post_med.selectAll("g.layer")
        .data(d3.stack().keys(c_dict_post_med_seq_names)(data_post_med), d => d.key)
        var group_pre_med = svg_pre_med.selectAll("g.layer")
        .data(d3.stack().keys(c_dict_pre_med_seq_names)(data_pre_med), d => d.key)

        // This is still a bit black magic, but esentially the above .data should automatically enter into the
        // 'update' state. This should modify the elements that already exist and map them to their new data
        // values if they exist.
        // Then we should enter the exit state to get rid of old stuff
        // Then finally we should work with enter() to enter in any new svg elements and attach them to data
        group_post_med.exit().remove();
        group_pre_med.exit().remove();
        group_post_med.enter().append("g").classed("layer", true).attr("fill", d => col_scale_post_med(d.key));
        group_pre_med.enter().append("g").classed("layer", true).attr("fill", d => col_scale_pre_med(d.key));

        var bars_post_med = svg_post_med.selectAll("g.layer").selectAll("rect")
        .data(d => d, e => e.data.sample_name);
        var bars_pre_med = svg_pre_med.selectAll("g.layer").selectAll("rect")
        .data(d => d, e => e.data.sample_name);

        bars_post_med.exit().remove();
        bars_pre_med.exit().remove();

        //NB this was breaking when we had this broken up and being reassigned to var bar each time
        bars_post_med.enter().append("rect").attr("width", x_post_med.bandwidth()).merge(bars_post_med).transition().duration(speed)
        .attr("x", function(d){
            var foo = d;
            return x_post_med(d.data.sample_name);
        }).attr("y", function(d)  {
            return y_post_med(d[1]);
        }).attr("height", function(d) {
            var height_here = y_post_med(d[0]) - y_post_med(d[1]);
            console.log("Height set to" + height_here);
            return y_post_med(d[0]) - y_post_med(d[1]);
        });

        bars_pre_med.enter().append("rect").attr("width", x_pre_med.bandwidth()).merge(bars_pre_med).transition().duration(speed)
        .attr("x", function(d){
            var foo = d;
            return x_pre_med(d.data.sample_name);
        }).attr("y", function(d)  {
            return y_pre_med(d[1]);
        }).attr("height", function(d) {
            var height_here = y_pre_med(d[0]) - y_pre_med(d[1]);
            console.log("Height set to" + height_here);
            return y_pre_med(d[0]) - y_pre_med(d[1]);
        });
    }
			
			
	var data_type_selector = d3.select("#data_type_selector").on("change", function(){
	    update(this.value, 750);
	});
			
    
}

