// d3.json("data/seqs.absolute.json").then(d => chart(d))
//TODO list includes:
// Have a toggle for absolute/relative
// Have a toggle for pre-MED/post-MED



chart();

function chart() {
    //This initial chart function will take care of all of the svg elements that are not going to change during
    // an update. i.e. when we are changing from relative to absolute data

    // Here we set the margins of the svg chart


	var svg_pre_med = d3.select("#chart_pre_med"),
		margin = {top: 35, left: 35, bottom: 20, right: 0},
		width = +svg_pre_med.attr("width") - margin.left - margin.right,
		height = +svg_pre_med.attr("height") - margin.top - margin.bottom;

    // Set the x scale that will be used for the x val of the bars


	// Set the x scale that will be used for the x val of the bars
	var x_pre_med = d3.scaleBand()
		.range([margin.left, width - margin.right])
		.padding(0.1)

    // Set the y scale
    var y_pre_med = d3.scaleLinear()
        .rangeRound([height - margin.bottom, margin.top])

    // Set the colour scale
    // We can set both the range and domain of this as these are invariable between absolute and relative
    // data types
    //TODO synchronise the colour scales between the pre- and post-med seqs.
    // This will need to be done within the python SymPortal code.
    var c_dict_pre_med = getColDictObjArrPreMED()
    var c_dict_pre_med_colors = c_dict_pre_med.map(d => d.d_value)
    var c_dict_pre_med_seq_names = c_dict_pre_med.map(d => d.d_key)
    var col_scale_pre_med = d3.scaleOrdinal()
    .range(c_dict_pre_med_colors)
    .domain(c_dict_pre_med_seq_names);

    //Set up the svg element in which we will call the axis objects
    var xAxis_pre_med = svg_pre_med.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("id", "x_axis_pre_med")

	var yAxis_pre_med = svg_pre_med.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("id", "y_axis_pre_med")
    
    update(d3.select("#data_type_selector").property("value"), 0);
//TODO try to just render the fist set of bars of a sinlge column depending on how this is laid out
    function update(data_type, speed){
        if (data_type == 'absolute'){
            var data_pre_med  = getSeqDataAbsolutePreMED();
            var data_post_med  = getSeqDataAbsolutePostMED();
            // if plotting absolute values we can get the highest y from the 'post_taxa_... ' for the pre-med
            var max_y_val_pre_med = d3.max(data_post_med, d => d.post_taxa_id_absolute_symbiodinium_seqs);
        } else if (data_type == 'relative')
        {
            var data_pre_med = getSeqDataRelativePreMED();
            var max_y_val_pre_med = 1;
        }

        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        y_pre_med.domain([0, max_y_val_pre_med]).nice();

        // Now update the y axis
        svg_pre_med.selectAll("#y_axis_pre_med")
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y_pre_med).ticks(null, "s"));

        // Set the domain of the x. This should be the sample names
        x_pre_med.domain(data_pre_med.map(d => d.sample_name));

        // Complete the x axis
        // This should be fairly invariable for the time being as we aren't playing with the order of the x axis yet
        svg_pre_med.selectAll("#x_axis_pre_med").transition().duration(speed)
                .call(d3.axisBottom(x_pre_med).tickSizeOuter(0)).selectAll("text")
                .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                .style("text-anchor", "start").style("text-anchor", "start");


        // TODO can we chunk the data from here?
        // Some magic with stacking
        // by having the keys provided here, a key property is associated to each of the g.layers created
        // this is then used when doing the colour lookup for example.
        var group_pre_med = svg_pre_med.selectAll("g.layer")
        .data(d3.stack().keys(c_dict_pre_med_seq_names)(data_pre_med), d => d.key)


        // This is still a bit black magic, but esentially the above .data should automatically enter into the
        // 'update' state. This should modify the elements that already exist and map them to their new data
        // values if they exist.
        // Then we should enter the exit state to get rid of old stuff
        // Then finally we should work with enter() to enter in any new svg elements and attach them to data

        group_pre_med.exit().remove();
        group_pre_med.enter().append("g").classed("layer", true).attr("fill", d => col_scale_pre_med(d.key));

        var bars_pre_med = svg_pre_med.selectAll("g.layer").selectAll("rect")
        .data(d => d, e => e.data.sample_name);

        var updateSelection = d3.selectAll(bars_pre_med._groups.slice(0, 1));
        var enterSelection = d3.selectAll(bars_pre_med._enter.slice(0, 1));
        var exitSelection = d3.selectAll(bars_pre_med._exit.slice(0, 1));

        exitSelection.remove();

        enterSelection._groups[0][0].forEach(function(d, i){
        	var newElement = svg_pre_med.append('rect')._groups[0];
			newElement.__data__ = d.__data__;
			newElement.setAttribute("width", x_pre_med.bandwidth())
			enterSelection._groups[0][0][i] = newElement;
			updateSelection._groups[0][0][i] = newElement;
        })

        enterSelection.attr("width", x_pre_med.bandwidth())

        enterSelection.merge(bars_pre_med).transition().duration(speed)
        .attr("x", function(d){
            var foo = d;
            return x_pre_med(d.data.sample_name);
        }).attr("y", function(d)  {
            return y_pre_med(d[1]);
        }).attr("height", function(d) {
            return y_pre_med(d[0]) - y_pre_med(d[1]);
        });


    }
			
			
	var data_type_selector = d3.select("#data_type_selector").on("change", function(){
	    setTimeout(update, 0, this.value, 750);
//	    update(this.value, 750);
	});
			
    
}

