// d3.json("data/seqs.absolute.json").then(d => chart(d))
//TODO list includes:
// Have a toggle for absolute/relative
// Have a toggle for pre-MED/post-MED

var data_post_med  = getRectDataPostMED();
var data_post_med_by_sample = getRectDataPostMEDBySample();
// if plotting absolute values we can get the highest y from the 'post_med_aboslute' property
var max_y_val_post_med = getRectDataPostMEDMaxSeq();

var data_pre_med  = getRectDataPreMED();
var data_pre_med_by_sample = getRectDataPreMEDBySample();

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
    //We will have a seperate g for each of the samples so that we can hopefully plot column by column
    sample_list.forEach(function(sample){
        svg_post_med.append("g").attr("class", sample)
        svg_pre_med.append("g").attr("class", sample)
    })

    if (d3.select("#data_type_selector").property("value") == 'absolute'){
        // First do the columns for the post_med
        // Eventually we can make the amount of time this takes dynamic with the number of samples and seqs
        // per sample

        // So that we don't run the same code for the axes etc over and over we will
        // move this code into the general_update_post_med_by_sample
        // and only run the code specific to the given sample column updating in the
        // update_post_med_by_sample function
        general_update_post_med_by_sample('absolute', 1000)
        for(let i = 0; i < sample_list.length; i++){
         setTimeout(update_post_med_by_sample, 1000, sample_list[i], 'absolute', 1000)
        }
        // Then do column by column for the pre_med
        for(let i = 0; i < sample_list.length; i++){
         setTimeout(update_pre_med_by_sample, 1000, sample_list[i], 'absolute', 1000)
        }
//        setTimeout(update_post_med,0,'absolute', 0);
//        setTimeout(update_pre_med,1000,'absolute', 0);
    } else if (d3.select("#data_type_selector").property("value") == 'relative'){
//        setTimeout(update_post_med, 0, 'relative', 0);
//        setTimeout(update_pre_med,1000, 'relative', 0);
        for(let i = 0; i < sample_list.length; i++){
             setTimeout(update_post_med_by_sample, 1000, sample_list[i], 'relative', 1000)
        }
        // Then do column by column for the pre_med
        for(let i = 0; i < sample_list.length; i++){
             setTimeout(update_pre_med_by_sample, 1000, sample_list[i], 'relative', 1000)
        }
    }

    function general_update_post_med_by_sample(data_type, speed){
        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        if (data_type == "absolute"){
            y_post_med.domain([0, max_y_val_post_med]).nice();
        }else{
            y_post_med.domain([0, 1]).nice();
        }

        // Now update the y axis
        svg_post_med.selectAll("#y_axis_post_med")
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y_post_med).ticks(null, "s"));

        // Set the domain of the x. This should be the sample names
        x_post_med.domain(sample_list);

        // Complete the x axis
        // This should be fairly invariable for the time being as we aren't playing with the order of the x axis yet
        svg_post_med.selectAll("#x_axis_post_med").transition().duration(speed)
                .call(d3.axisBottom(x_post_med).tickSizeOuter(0)).selectAll("text")
                .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                .style("text-anchor", "start").style("text-anchor", "start");

    }

    function update_post_med_by_sample(col_sample, data_type, speed){

        // Process the post_MED data first.
        // TODO you got to here EOD. Work in doing the individual Ds.
        var bars_post_med = svg_post_med.select(eval("g." + col_sample)).selectAll("rect").data(data_post_med_by_sample[col_sample], function(d){
            return d.seq_name + d.sample;
        });

        bars_post_med.exit().remove()

        if (data_type == 'absolute'){
            //if 'absolute' then use the abbreviation 'abs' for getting the attributes
            var abbr = 'abs'
        }else if (data_type == 'relative'){
            // if 'relative' then use the abbreviation 'rel' for getting the attributes
            var abbr = 'rel'
        }

        bars_post_med.transition().duration(1000).attr("x", function(d){
            return x_post_med(d.sample);
        }).attr("y", function(d){
            return y_post_med(eval("d.y_" + abbr));
        }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
            return y_post_med(0) - y_post_med(eval("d.height_" + abbr));}
        ).attr("fill", function(d){
            return d.fill;
        }).delay(function(d,i){return(i*5)});


        bars_post_med.enter().append("rect")
        .attr("x", function(d){
            return x_post_med(d.sample);
        }).attr("y", y_post_med(0)).transition().duration(1000).attr("y", function(d){
            return y_post_med(eval("d.y_" + abbr));
        }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
            return y_post_med(0) - y_post_med(eval("d.height_" + abbr));}
        ).attr("fill", function(d){
            return d.fill;
        });

        var foo = "bar"

    }

    function update_pre_med_by_sample(col_sample, data_type, speed){


        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        if (data_type == "absolute"){
            y_pre_med.domain([0, max_y_val_pre_med]).nice();
        }else{
            y_pre_med.domain([0, 1]).nice();
        }

        // Now update the y axis
        svg_pre_med.selectAll("#y_axis_pre_med")
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y_pre_med).ticks(null, "s"));

        // Set the domain of the x. This should be the sample names
        x_pre_med.domain(sample_list);

        // Complete the x axis
        // This should be fairly invariable for the time being as we aren't playing with the order of the x axis yet
        svg_pre_med.selectAll("#x_axis_pre_med").transition().duration(speed)
                .call(d3.axisBottom(x_pre_med).tickSizeOuter(0)).selectAll("text")
                .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                .style("text-anchor", "start").style("text-anchor", "start");

        // Then let's process the pre-MED and see how we're looking
        var bars_pre_med = svg_pre_med.select("g.bars").selectAll("rect").data(data_pre_med, function(d){
            return d.seq_name + d.sample;
        });

        bars_pre_med.exit().remove()

        if (data_type == 'absolute'){

            bars_pre_med.transition().duration(2000).attr("x", function(d){
                return x_pre_med(d.sample);
            }).attr("y", function(d){
                return y_pre_med(d.y_abs);
            }).attr("width", x_pre_med.bandwidth()).attr("height", function(d){
                return Math.max((y_pre_med(0) - y_pre_med(d.height_abs)), 1);}
            ).attr("fill", function(d){
                return d.fill;
            }).delay(function(d,i){return(i*2)});


            bars_pre_med.enter().append("rect")
            .attr("x", function(d){
                return x_pre_med(d.sample);
            }).attr("y", y_pre_med(0)).transition().duration(2000).attr("y", function(d){
                return y_pre_med(d.y_abs);
            }).attr("width", x_pre_med.bandwidth()).attr("height", function(d){
                return Math.max((y_pre_med(0) - y_pre_med(d.height_abs)), 1);}
            ).attr("fill", function(d){
                return d.fill;
            });

        }else if(data_type == 'relative'){

            bars_pre_med.transition().duration(2000).attr("x", function(d){
                return x_pre_med(d.sample);
            }).attr("y", function(d){
                return y_pre_med(d.y_rel);
            }).attr("width", x_pre_med.bandwidth()).attr("height", function(d){
                return Math.max((y_pre_med(0) - y_pre_med(d.height_rel)), 1);
            }).attr("fill", function(d){
                return d.fill;
            }).delay(function(d,i){return(i*2)});


            bars_pre_med.enter().append("rect")
            .attr("x", function(d){
                return x_pre_med(d.sample);
            }).attr("y", y_pre_med(0)).transition().duration(2000).attr("y", function(d){
                return y_pre_med(d.y_rel);
            }).attr("width", x_pre_med.bandwidth()).attr("height", function(d){
                return Math.max((y_pre_med(0) - y_pre_med(d.height_rel)), 1);}
            ).attr("fill", function(d){
                return d.fill;
            });
        }
        var foo = "bar"
    }

    function update_post_med(data_type, speed){


        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        if (data_type == "absolute"){
            y_post_med.domain([0, max_y_val_post_med]).nice();
        }else{
            y_post_med.domain([0, 1]).nice();
        }


        // Now update the y axis
        svg_post_med.selectAll("#y_axis_post_med")
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y_post_med).ticks(null, "s"));


        // Set the domain of the x. This should be the sample names
        x_post_med.domain(sample_list);

        // Complete the x axis
        // This should be fairly invariable for the time being as we aren't playing with the order of the x axis yet
        svg_post_med.selectAll("#x_axis_post_med").transition().duration(speed)
                .call(d3.axisBottom(x_post_med).tickSizeOuter(0)).selectAll("text")
                .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                .style("text-anchor", "start").style("text-anchor", "start");

        // Process the post_MED data first.
        var bars_post_med = svg_post_med.select("g.bars").selectAll("rect").data(data_post_med, function(d){
            return d.seq_name + d.sample;
        });

        bars_post_med.exit().remove()

        if (data_type == 'absolute'){

            bars_post_med.transition().duration(1000).attr("x", function(d){
                return x_post_med(d.sample);
            }).attr("y", function(d){
                return y_post_med(d.y_abs);
            }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
                return y_post_med(0) - y_post_med(d.height_abs);}
            ).attr("fill", function(d){
                return d.fill;
            }).delay(function(d,i){return(i*5)});


            bars_post_med.enter().append("rect")
            .attr("x", function(d){
                return x_post_med(d.sample);
            }).attr("y", y_post_med(0)).transition().duration(1000).attr("y", function(d){
                return y_post_med(d.y_abs);
            }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
                return y_post_med(0) - y_post_med(d.height_abs);}
            ).attr("fill", function(d){
                return d.fill;
            });
        }else if(data_type == 'relative'){
            bars_post_med.transition().duration(1000).attr("x", function(d){
                return x_post_med(d.sample);
            }).attr("y", function(d){
                return y_post_med(d.y_rel);
            }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
                return y_post_med(0) - y_post_med(d.height_rel);}
            ).attr("fill", function(d){
                return d.fill;
            }).delay(function(d,i){return(i*5)});


            bars_post_med.enter().append("rect")
            .attr("x", function(d){
                return x_post_med(d.sample);
            }).attr("y", y_post_med(0)).transition().duration(1000).attr("y", function(d){
                return y_post_med(d.y_rel);
            }).attr("width", x_post_med.bandwidth()).attr("height", function(d){
                return y_post_med(0) - y_post_med(d.height_rel);}
            ).attr("fill", function(d){
                return d.fill;
            });
        }
        var foo = "bar"

    }

    function update_pre_med(data_type, speed){


        // Update the Y scale's domain depending on whether we are doing absolute or relative data_type
        if (data_type == "absolute"){
            y_pre_med.domain([0, max_y_val_pre_med]).nice();
        }else{
            y_pre_med.domain([0, 1]).nice();
        }

        // Now update the y axis
        svg_pre_med.selectAll("#y_axis_pre_med")
        .transition()
        .duration(speed)
        .call(d3.axisLeft(y_pre_med).ticks(null, "s"));

        // Set the domain of the x. This should be the sample names
        x_pre_med.domain(sample_list);

        // Complete the x axis
        // This should be fairly invariable for the time being as we aren't playing with the order of the x axis yet
        svg_pre_med.selectAll("#x_axis_pre_med").transition().duration(speed)
                .call(d3.axisBottom(x_pre_med).tickSizeOuter(0)).selectAll("text")
                .attr("y", 0).attr("x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
                .style("text-anchor", "start").style("text-anchor", "start");

        // Then let's process the pre-MED and see how we're looking
        var bars_pre_med = svg_pre_med.select("g.bars").selectAll("rect").data(data_pre_med, function(d){
            return d.seq_name + d.sample;
        });

        bars_pre_med.exit().remove()

        if (data_type == 'absolute'){

            bars_pre_med.transition().duration(2000).attr("x", function(d){
                return x_pre_med(d.sample);
            }).attr("y", function(d){
                return y_pre_med(d.y_abs);
            }).attr("width", x_pre_med.bandwidth()).attr("height", function(d){
                return Math.max((y_pre_med(0) - y_pre_med(d.height_abs)), 1);}
            ).attr("fill", function(d){
                return d.fill;
            }).delay(function(d,i){return(i*2)});


            bars_pre_med.enter().append("rect")
            .attr("x", function(d){
                return x_pre_med(d.sample);
            }).attr("y", y_pre_med(0)).transition().duration(2000).attr("y", function(d){
                return y_pre_med(d.y_abs);
            }).attr("width", x_pre_med.bandwidth()).attr("height", function(d){
                return Math.max((y_pre_med(0) - y_pre_med(d.height_abs)), 1);}
            ).attr("fill", function(d){
                return d.fill;
            });

        }else if(data_type == 'relative'){

            bars_pre_med.transition().duration(2000).attr("x", function(d){
                return x_pre_med(d.sample);
            }).attr("y", function(d){
                return y_pre_med(d.y_rel);
            }).attr("width", x_pre_med.bandwidth()).attr("height", function(d){
                return Math.max((y_pre_med(0) - y_pre_med(d.height_rel)), 1);
            }).attr("fill", function(d){
                return d.fill;
            }).delay(function(d,i){return(i*2)});


            bars_pre_med.enter().append("rect")
            .attr("x", function(d){
                return x_pre_med(d.sample);
            }).attr("y", y_pre_med(0)).transition().duration(2000).attr("y", function(d){
                return y_pre_med(d.y_rel);
            }).attr("width", x_pre_med.bandwidth()).attr("height", function(d){
                return Math.max((y_pre_med(0) - y_pre_med(d.height_rel)), 1);}
            ).attr("fill", function(d){
                return d.fill;
            });
        }
        var foo = "bar"
    }

	var data_type_selector = d3.select("#data_type_selector").on("change", function(){

	    if (this.value == 'absolute'){
            setTimeout(update_post_med, 0, 'absolute', 1000);
            setTimeout(update_pre_med, 1000, 'absolute', 1000);
        } else if (this.value == 'relative'){
            setTimeout(update_post_med, 0, 'relative', 1000);
            setTimeout(update_pre_med, 1000, 'relative', 1000);
        }
	});


}

