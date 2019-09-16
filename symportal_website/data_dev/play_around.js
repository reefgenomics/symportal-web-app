// d3.json("data/seqs.absolute.json").then(d => chart(d))
//TODO list includes:
// Have a toggle for absolute/relative
// Have a toggle for pre-MED/post-MED

var data_post_med  = getRectDataPostMED();
// if plotting absolute values we can get the highest y from the 'post_med_aboslute' property
var max_y_val_post_med = getRectDataPostMEDMaxSeq();

var data_pre_med  = getRectDataPreMED();

// if plotting absolute values we can get the highest y from the 'post_taxa_... ' for the pre-med
var max_y_val_pre_med = getRectDataPreMEDMaxSeq();

var sample_list = getRectDataPreMEDSampleList();

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

    // Set the x range that will be used for the x val of the bars
	var x_post_med = d3.scaleBand()
		.range([margin.left, width - margin.right])
		.padding(0.1)

	// Set the x range that will be used for the x val of the bars
	var x_pre_med = d3.scaleBand()
		.range([margin.left, width - margin.right])
		.padding(0.1)

    // Set the y range
	var y_post_med = d3.scaleLinear()
        .rangeRound([height - margin.bottom, margin.top])

    // Set the y range
    var y_pre_med = d3.scaleLinear()
        .rangeRound([height - margin.bottom, margin.top])

    // Set the colour scale
    // We can set both the range and domain of this as these are invariable between absolute and relative
    // data types
    //TODO synchronise the colour scales between the pre- and post-med seqs.
    // The fill colours of the rect objects are now already in the array of objects

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

    //Add a g to the svgs that we will use for the bars
    svg_post_med.append("g").attr("class", "bars")

    if (d3.select("#data_type_selector").property("value") == 'absolute'){
        update('absolute', 0);
    } else if (d3.select("#data_type_selector").property("value") == 'relative'){
        update('relative', 0);
    }


    function update(data_type, speed){


        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        if (data_type == "absolute"){
            y_post_med.domain([0, max_y_val_post_med]).nice();
            y_pre_med.domain([0, max_y_val_pre_med]).nice();
        }else{
            y_post_med.domain([0, 1]).nice();
            y_pre_med.domain([0, 1]).nice();
        }


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
        x_post_med.domain(sample_list);
        x_pre_med.domain(sample_list);

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

        //TODO this is where we switch from the stacked bar chart black magic to simple rectanges



//        var bars_post_med = svg_post_med.selectAll("bar").data(data_post_med).attr("x", d => x_post_med(d.sample) ).attr("y", d => d.y).attr("width", x_post_med.bandwidth()).attr("height", d => d.height).attr("fill", d => d.fill);
////        var bars_pre_med = svg_pre_med.selectAll("g.layer").selectAll("rect")
////        .data(d => d, e => e.data.sample_name);
//
//        bars_post_med.exit().remove();
////        bars_pre_med.exit().remove();

        var bars_post_med = svg_post_med.select("g.bars").selectAll("rect").data(data_post_med, function(d){
            return d.seq_name + d.sample;
        });

        bars_post_med.exit().remove()

        if (data_type == 'absolute'){

            bars_post_med.transition().duration(1000).attr("x", function(d){
                console.log("x set to " + x_post_med(d.sample))
                return x_post_med(d.sample);
            }).attr("y", function(d){
                console.log("y set to " + y_post_med(d.y_abs))
                return y_post_med(d.y_abs);
            }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
                console.log("height set to " + (y_post_med(0) - y_post_med(d.height_abs)));
                return y_post_med(0) - y_post_med(d.height_abs);}
            ).attr("fill", function(d){
                console.log("fill set to " + d.fill)
                return d.fill;
            });


            bars_post_med.enter().append("rect")
            .attr("x", function(d){
                console.log("x set to " + x_post_med(d.sample))
                return x_post_med(d.sample);
            }).attr("y", y_post_med(0)).transition().duration(1000).attr("y", function(d){
                console.log("y set to " + y_post_med(d.y_abs))
                return y_post_med(d.y_abs);
            }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
                console.log("height set to " + (y_post_med(0) - y_post_med(d.height_abs)));
                return y_post_med(0) - y_post_med(d.height_abs);}
            ).attr("fill", function(d){
                console.log("fill set to " + d.fill)
                return d.fill;
            });
        }else if(data_type == 'relative'){
            bars_post_med.transition().duration(1000).attr("x", function(d){
                console.log("x set to " + x_post_med(d.sample))
                return x_post_med(d.sample);
            }).attr("y", function(d){
                console.log("y set to " + y_post_med(d.y_rel))
                return y_post_med(d.y_rel);
            }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
                console.log("height set to " + (y_post_med(0) - y_post_med(d.height_rel)));
                return y_post_med(0) - y_post_med(d.height_rel);}
            ).attr("fill", function(d){
                console.log("fill set to " + d.fill)
                return d.fill;
            });


            bars_post_med.enter().append("rect")
            .attr("x", function(d){
                console.log("x set to " + x_post_med(d.sample))
                return x_post_med(d.sample);
            }).attr("y", y_post_med(0)).transition().duration(1000).attr("y", function(d){
                console.log("y set to " + y_post_med(d.y_rel))
                return y_post_med(d.y_rel);
            }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
                console.log("height set to " + (y_post_med(0) - y_post_med(d.height_rel)));
                return y_post_med(0) - y_post_med(d.height_rel);}
            ).attr("fill", function(d){
                console.log("fill set to " + d.fill)
                return d.fill;
            });
        }


        var foo = "bar"

//        bars_pre_med.enter().append("rect").attr("width", x_pre_med.bandwidth()).merge(bars_pre_med).transition().duration(speed)
//        .attr("x", function(d){
//            var foo = d;
//            return x_pre_med(d.data.sample_name);
//        }).attr("y", function(d)  {
//            return y_pre_med(d[1]);
//        }).attr("height", function(d) {
//            return y_pre_med(d[0]) - y_pre_med(d[1]);
//        }).delay(function(d, i){return(i*500)});
    }


	var data_type_selector = d3.select("#data_type_selector").on("change", function(){

	    if (this.value == 'absolute'){
            setTimeout(update, 0, 'absolute', 1000);
        } else if (this.value == 'relative'){
            setTimeout(update, 0, 'relative', 1000);
        }
	});


}

