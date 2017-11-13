var width = 960,
    height = 500;

var stateFIPS = { "01": { "abbrev": "AL", "name": "Alabama" }, "02": { "abbrev": "AK", "name": "Alaska" }, "05": { "abbrev": "AR", "name": "Arkansas" }, "60": { "abbrev": "AS", "name": "American Samoa" }, "04": { "abbrev": "AZ", "name": "Arizona" }, "06": { "abbrev": "CA", "name": "California" }, "08": { "abbrev": "CO", "name": "Colorado" }, "09": { "abbrev": "CT", "name": "Connecticut" }, "11": { "abbrev": "DC", "name": "District of Columbia" }, "10": { "abbrev": "DE", "name": "Delaware" }, "12": { "abbrev": "FL", "name": "Florida" }, "13": { "abbrev": "GA", "name": "Georgia" }, "66": { "abbrev": "GU", "name": "Guam" }, "15": { "abbrev": "HI", "name": "Hawaii" }, "19": { "abbrev": "IA", "name": "Iowa" }, "16": { "abbrev": "ID", "name": "Idaho" }, "17": { "abbrev": "IL", "name": "Illinois" }, "18": { "abbrev": "IN", "name": "Indiana" }, "20": { "abbrev": "KS", "name": "Kansas" }, "21": { "abbrev": "KY", "name": "Kentucky" }, "22": { "abbrev": "LA", "name": "Louisana" }, "25": { "abbrev": "MA", "name": "Massachusetts" }, "24": { "abbrev": "MD", "name": "Maryland" }, "23": { "abbrev": "ME", "name": "Maine" }, "26": { "abbrev": "MI", "name": "Michigan" }, "27": { "abbrev": "MN", "name": "Minnesota" }, "29": { "abbrev": "MO", "name": "Missouri" }, "28": { "abbrev": "MS", "name": "Mississippi" }, "30": { "abbrev": "MT", "name": "Montana" }, "37": { "abbrev": "NC", "name": "North Carolina" }, "38": { "abbrev": "ND", "name": "North Dakota" }, "31": { "abbrev": "NE", "name": "Nebraska" }, "33": { "abbrev": "NH", "name": "New Hampshire" }, "34": { "abbrev": "NJ", "name": "New Jersey" }, "35": { "abbrev": "NM", "name": "New Mexico" }, "32": { "abbrev": "NV", "name": "Nevada" }, "36": { "abbrev": "NY", "name": "New York" }, "39": { "abbrev": "OH", "name": "Ohio" }, "40": { "abbrev": "OK", "name": "Oklahoma" }, "41": { "abbrev": "OR", "name": "Oregon" }, "42": { "abbrev": "PA", "name": "Pennsylvania" }, "72": { "abbrev": "PR", "name": "Puerto Rico" }, "44": { "abbrev": "RI", "name": "Rhode Island" }, "45": { "abbrev": "SC", "name": "South Carolina" }, "46": { "abbrev": "SD", "name": "South Dakota" }, "47": { "abbrev": "TN", "name": "Tennessee" }, "48": { "abbrev": "TX", "name": "Texas" }, "49": { "abbrev": "UT", "name": "Utah" }, "51": { "abbrev": "VA", "name": "Virginia" }, "78": { "abbrev": "VI", "name": "Virgin Islands" }, "50": { "abbrev": "VT", "name": "Vermont" }, "53": { "abbrev": "WA", "name": "Washington" }, "55": { "abbrev": "WI", "name": "Wisconsin" }, "54": { "abbrev": "WV", "name": "West Virginia" }, "56": { "abbrev": "WY", "name": "Wyoming" } };

var countyFIPS = {}; 

var projection = d3.geo.albersUsa()
  .translate([width/2, height/2]);

var path = d3.geo.path()
  .projection(projection);

var color = d3.scale.quantile()
  .domain([0,10,100,1000,10000])
  .range(["#74c476","#41ab5d","#238b45","#006d2c","#00441b"]);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden");

var counties = {}, lyme = {}, remaining = 2;

d3.json("us_counties.json", function(err, data) {
  counties = data;
  if (!--remaining) draw();
});

d3.csv("LymeDisease_9211_county.csv", function(err, data) {
  lyme = data;
  if (!--remaining) draw();
});

function draw() {
  countyFIPS = d3.nest()
    .key(function(d) { return d.properties.STATEFP; }) // nest by state
    .entries(counties.features);

  countyFIPS = countyFIPS.map(function(d) {
    return { "state": d.key, "counties": d.values.reduce(function(prev, next) {
        prev[next.properties.COUNTYFP] = next.properties.NAME;
        return prev;
      }, {})
    };
  }).reduce(function(prev, next) {
    prev[next.state] = next.counties;
    return prev;
  }, {})

  lyme = d3.nest()
    .key(function(d) { return d.StateCode.length == 1 ? "0" + d.StateCode : d.StateCode; })
    .entries(lyme);

  lyme = lyme.map(function(d) {
    return { "state": d.key, "counties": d.values.reduce(function(prev, next) {
        var cc = "";
        if (next.CountyCode.length == 1) { 
          cc = "00" + next.CountyCode; 
        } else if (next.CountyCode.length == 2) {
          cc = "0" + next.CountyCode;
        } else {
          cc = next.CountyCode;
        }

        prev[cc] = next;
        return prev;
      }, {})
    };
  }).reduce(function(prev, next) {
    prev[next.state] = next.counties;
    return prev;
  }, {})

  var yearRange = "2007_2011";
  // for (var i = 0; i < document.selector.length; i++) { // first year range for page load
  //   if (document.selector[i].checked) {
  //     yearRange = document.selector[i].value;
  //   }
  // }
   
  svg.selectAll(".county") 
    .data(counties.features) 
    .enter()
    .append("path")
    .attr("class", function(d) { return "county"; })
    .attr("d", path)
    .style("fill", function(d) { 
      var p = d.properties;
      return ((lyme[p.STATEFP] && lyme[p.STATEFP][p.COUNTYFP] && lyme[p.STATEFP][p.COUNTYFP]["ConfirmedCount_" + yearRange] != "") ? color(+lyme[p.STATEFP][p.COUNTYFP]["ConfirmedCount_" + yearRange]) : "#e0e0e0"); 
    })
    .on("mouseover", function(d) {
       tooltip.html("");
       tooltip.append("pre");

       var p = d.properties;
       var lymeVal = "";
        
       if (lyme[p.STATEFP] && lyme[p.STATEFP][p.COUNTYFP] && lyme[p.STATEFP][p.COUNTYFP]["ConfirmedCount_" + yearRange] != "") {
        var l = lyme[p.STATEFP][p.COUNTYFP]["ConfirmedCount_" + yearRange]; 
        lymeVal = l + (l == "1" ? " confirmed case" : " confirmed cases");
       } else {
        lymeVal = "No Data";
       }

       tooltip.select("pre")
         .text(
            countyFIPS[p.STATEFP][p.COUNTYFP] + " County, " + stateFIPS[p.STATEFP].name + "\n" + lymeVal
          );

       return tooltip.style("visibility", "visible");
     })
     .on("mousemove", function() {
       return tooltip.style("top", (d3.event.pageY-20) + "px").style("left", (d3.event.pageX+10) + "px");
     })
     .on("mouseout", function() {
       return tooltip.style("visibility", "hidden");
     });
}

function colorIn(e) {
  var yearRange = e.value;
  var counties = svg.selectAll(".county");

  counties
    .style("fill", function(d) {
      var p = d.properties;
      return ((lyme[p.STATEFP] && lyme[p.STATEFP][p.COUNTYFP] && lyme[p.STATEFP][p.COUNTYFP]["ConfirmedCount_" + yearRange] != "") ? color(+lyme[p.STATEFP][p.COUNTYFP]["ConfirmedCount_" + yearRange]) : "#e0e0e0"); 
    });

  counties
    .on("mouseover", function(d) {
       tooltip.html("");
       tooltip.append("pre");
        
       var p = d.properties;
       var lymeVal = "";
       
       if (lyme[p.STATEFP] && lyme[p.STATEFP][p.COUNTYFP] && lyme[p.STATEFP][p.COUNTYFP]["ConfirmedCount_" + yearRange] != "") {
        var l = lyme[p.STATEFP][p.COUNTYFP]["ConfirmedCount_" + yearRange]; 
        lymeVal = l + (l == "1" ? " confirmed case" : " confirmed cases");
       } else {
        lymeVal = "No Data";
       }

       tooltip.select("pre")
         .text(
            countyFIPS[p.STATEFP][p.COUNTYFP] + " County, " + stateFIPS[p.STATEFP].name + "\n" + lymeVal
          );

       return tooltip.style("visibility", "visible");
     })
     .on("mousemove", function() {
       return tooltip.style("top", (d3.event.pageY-20) + "px").style("left", (d3.event.pageX+10) + "px");
     })
     .on("mouseout", function() {
       return tooltip.style("visibility", "hidden");
     });
}
