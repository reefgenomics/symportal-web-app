// d3.json("data/seqs.absolute.json").then(d => chart(d))
//TODO list includes:
// Have a toggle for absolute/relative
// Have a toggle for pre-MED/post-MED



chart();

function chart() {
    //This initial chart function will take care of all of the svg elements that are not going to change during
    // an update. i.e. when we are changing from relative to absolute data

    // Here we set the margins of the svg chart
    var svg = d3.select("#chart"),
		margin = {top: 35, left: 35, bottom: 20, right: 0},
		width = +svg.attr("width") - margin.left - margin.right,
		height = +svg.attr("height") - margin.top - margin.bottom;

    // Set the x scale that will be used for the x val of the bars
	var x = d3.scaleBand()
		.range([margin.left, width - margin.right])
		.padding(0.1)

    // Set the y scale
	var y = d3.scaleLinear()
        .rangeRound([height - margin.bottom, margin.top])

    // Set the colour scale
    // We can set both the range and domain of this as these are invariable between absolute and relative
    // data types
    var c_dict_post_med = getColDictObjArr()
    var c_dict_post_med_colors = c_dict_post_med.map(d => d.d_value)
    var c_dict_post_med_seq_names = c_dict_post_med.map(d => d.d_key)
    var col_scale = d3.scaleOrdinal()
    .range(c_dict_post_med_colors)
    .domain(c_dict_post_med_seq_names);
        
    //Set up the svg element in which we will call the axis objects
    var xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "x-axis")

	var yAxis = svg.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("class", "y-axis")
    
    update(d3.select("#data_type_selector").property("value"), 0);

    function update(data_type, speed){
        if (data_type == 'absolute'){
            var data  = getSeqDataAbsolutePostMED();
            // if plotting absolute values we can get the highest y from the 'post_med_aboslute' property
            var max_y_val = d3.max(data, d => d.post_med_absolute);
        } else if (data_type == 'relative')
        {
            var data = getSeqDataRelativePostMED();
            var max_y_val = 1;
        }

        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        y.domain([0, max_y_val]).nice();

        // Now update the y axis
        svg.selectAll(".y-axis")
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y)
        .ticks(null, "s"));

        // Set the domain of the x. This should be the sample names

        x.domain(data.map(d => d.sample_name));

        // Complete the x axis
        // This should be fairly invariable for the time being as we aren't playing with the order of the x axis yet
        svg.selectAll(".x-axis").transition().duration(speed)
                .call(d3.axisBottom(x).tickSizeOuter(0)).selectAll("text").attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)").style("text-anchor", "start").style("text-anchor", "start");

        // var x_ax = d3.selectAll(".x-axis");
        // var x_ax = x_ax.selectAll("text");
        // var x_ax = x_ax.attr("y", 0);
        // var x_ax = x_ax.attr("x", 9);
        // var x_ax = x_ax.attr("dy", ".35em");
        // var x_ax = x_ax.attr("transform", "rotate(90)");
        // var x_ax = x_ax.style("text-anchor", "start");

        // Some magic with stacking
        // by having the keys provided here, a key property is associated to each of the g.layers created
        // this is then used when doing the colour lookup for example.
        var group = svg.selectAll("g.layer")
        .data(d3.stack().keys(c_dict_post_med_seq_names)(data), d => d.key)

        // This is still a bit black magic, but esentially the above .data should automatically enter into the
        // 'update' state. This should modify the elements that already exist and map them to their new data
        // values if they exist.
        // Then we should enter the exit state to get rid of old stuff
        // Then finally we should work with enter() to enter in any new svg elements and attach them to data
        group.exit().remove()
        var group = group.enter().append("g")
        var group = group.classed("layer", true)
        var group = group.attr("fill", function(d){
            // here d is a given sequence and the name can be accessed with d.key
            // have a look in the chrome dev tools when debugging for more info on the structure of d
            // d.key gives us the user
            // col_scale(d.key);
            return col_scale(d.key);
        } );

        var bars = svg.selectAll("g.layer").selectAll("rect")
        .data(d => d, e => e.data.sample_name);

        bars.exit().remove()

        var bars = bars.enter().append("rect");
        var bars = bars.attr("width", x.bandwidth());
        var bars = bars.merge(bars).transition().duration(speed);
        var bars = bars.attr("x", function(d){
            var foo = d;
            return x(d.data.sample_name);
        });
        var bars = bars.attr("y", function(d)  {
            return y(d[1]);
        });
        var bars = bars.attr("height", function(d) {
            var height_here = y(d[0]) - y(d[1]);
            console.log("Height set to" + height_here);
            return y(d[0]) - y(d[1]);
        });
    }
			
			
	var data_type_selector = d3.select("#data_type_selector").on("change", function(){
	    update(this.value, 750)
	})
			
    
}

