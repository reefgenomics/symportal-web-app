// d3.json("data/seqs.absolute.json").then(d => chart(d))
var json_data = getSeqData()

chart(json_data);

function chart(data) {
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
    var col_scale = d3.scaleOrdinal()
    .range(["steelblue", "darkorange", "lightblue"])
    .domain([0, 1, 2]);
        
    var xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "x-axis")

	var yAxis = svg.append("g")
		.attr("transform", `translate(${margin.left},0)`)
        .attr("class", "y-axis")
    
    // A regex that will allow us to extract the names of the sequences
    var regex = new RegExp('(^[ABCDEFGHI]|_[ABCDEFGHI]$)', 'g');
    // Get an array that is all of the names of the sequence
    var seq_names = Object.keys(data[0]).filter(property => property.match(regex));

    // we can get the total from the property 'post_med_absolute'

    // Find the largest value and use this to set the domain for the y scale
    // This can be moved up to be chined onto the y scale where it is created
    max_y_val = d3.max(data, d => d.post_med_absolute)
    y.domain([0, max_y_val]).nice();

    // Complete the y axis
    svg.selectAll(".y-axis")
    .transition()
    .duration(0)
    .call(d3.axisLeft(y)
    .ticks(null, "s"));
    
    // Set the domain of the x. This should be the sample names
    // We should be able to move this up similar to the y domain def
    x.domain(data.map(d => d.sample_name));

    // Complete the x axis
    svg.selectAll(".x-axis").transition().duration(0)
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
    .data(d3.stack().keys(seq_names)(data), d => d.key)

    // Get an int value that can be used for modulus the colour
    data.forEach(function(d, i) {
        d.col_int = i % 3;
        return d
    })

    var group = group.enter().append("g")
    var group = group.classed("layer", true)
    var group = group.attr("fill", function(d){
        // d.key gives us the user 
        // col_scale(d.key);
        return col_scale(d.index % 3);
    } );
    
    var bars = svg.selectAll("g.layer").selectAll("rect")
    .data(d => d, e => e.data.sample_name);

    var bars = bars.enter().append("rect");
    var bars = bars.attr("width", x.bandwidth());
    var bars = bars.merge(bars).transition().duration(0);
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
    } );
			
			
			
			
    
}

