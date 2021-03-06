const width = 960;
const height = 500;

const projection = d3.geoAlbersUsa().translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);

const color = d3.scaleQuantile()
  .domain([0, 10, 100, 1000, 10000])
  .range(['#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b']);

const svg = d3
  .select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

const tooltip = d3
  .select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('position', 'absolute')
  .style('z-index', '10')
  .style('visibility', 'hidden');

let counties = {};
let lyme = {};
let stateFIPS = {};
let countyFIPS = {};
let remaining = 3;

d3.json('us-counties.json', (err, data) => {
  counties = data;
  if (!--remaining) draw();
});

d3.json('state-fips.json', (err, data) => {
  stateFIPS = data;
  if (!--remaining) draw();
});

d3.csv('lyme-disease-9211-county.csv', (err, data) => {
  lyme = data;
  if (!--remaining) draw();
});

function draw() {
  countyFIPS = d3
    .nest()
    .key(d => d.properties.STATEFP) // nest by state
    .entries(counties.features);

  countyFIPS = countyFIPS
    .map(d => ({
    state: d.key,

    counties: d.values.reduce((prev, next) => {
      prev[next.properties.COUNTYFP] = next.properties.NAME;
      return prev;
    }, {})
  }))
    .reduce((prev, next) => {
      prev[next.state] = next.counties;
      return prev;
    }, {});

  lyme = d3
    .nest()
    .key(d => d.StateCode.length == 1 ? `0${d.StateCode}` : d.StateCode)
    .entries(lyme);

  lyme = lyme
    .map(d => ({
    state: d.key,

    counties: d.values.reduce((prev, next) => {
      let cc = '';
      if (next.CountyCode.length == 1) {
        cc = `00${next.CountyCode}`;
      } else if (next.CountyCode.length == 2) {
        cc = `0${next.CountyCode}`;
      } else {
        cc = next.CountyCode;
      }

      prev[cc] = next;
      return prev;
    }, {})
  }))
    .reduce((prev, next) => {
      prev[next.state] = next.counties;
      return prev;
    }, {});

  const yearRange = '2007_2011';
  // for (var i = 0; i < document.selector.length; i++) { // first year range for page load
  //   if (document.selector[i].checked) {
  //     yearRange = document.selector[i].value;
  //   }
  // }

  svg
    .selectAll('.county')
    .data(counties.features)
    .enter()
    .append('path')
    .attr('class', d => 'county')
    .attr('d', path)
    .style('fill', d => {
      const p = d.properties;
      return lyme[p.STATEFP] &&
      lyme[p.STATEFP][p.COUNTYFP] &&
      lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`] != ''
        ? color(+lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`])
        : '#e0e0e0';
    })
    .on('mouseover', d => {
      tooltip.html('');
      tooltip.append('pre');

      const p = d.properties;
      let lymeVal = '';

      if (
        lyme[p.STATEFP] &&
        lyme[p.STATEFP][p.COUNTYFP] &&
        lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`] != ''
      ) {
        const l = lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`];
        lymeVal = l + (l == '1' ? ' confirmed case' : ' confirmed cases');
      } else {
        lymeVal = 'No Data';
      }

      tooltip
        .select('pre')
        .text(
          `${countyFIPS[p.STATEFP][p.COUNTYFP]} County, ${stateFIPS[p.STATEFP].name}\n${lymeVal}`
        );

      return tooltip.style('visibility', 'visible');
    })
    .on('mousemove', () => tooltip
    .style('top', `${d3.event.pageY - 20}px`)
    .style('left', `${d3.event.pageX + 10}px`))
    .on('mouseout', () => tooltip.style('visibility', 'hidden'));
}

function colorIn(e) {
  const yearRange = e.value;
  const counties = svg.selectAll('.county');

  counties.style('fill', d => {
    const p = d.properties;
    return lyme[p.STATEFP] &&
    lyme[p.STATEFP][p.COUNTYFP] &&
    lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`] != ''
      ? color(+lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`])
      : '#e0e0e0';
  });

  counties
    .on('mouseover', d => {
      tooltip.html('');
      tooltip.append('pre');

      const p = d.properties;
      let lymeVal = '';

      if (
        lyme[p.STATEFP] &&
        lyme[p.STATEFP][p.COUNTYFP] &&
        lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`] != ''
      ) {
        const l = lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`];
        lymeVal = l + (l == '1' ? ' confirmed case' : ' confirmed cases');
      } else {
        lymeVal = 'No Data';
      }

      tooltip
        .select('pre')
        .text(
          `${countyFIPS[p.STATEFP][p.COUNTYFP]} County, ${stateFIPS[p.STATEFP].name}\n${lymeVal}`
        );

      return tooltip.style('visibility', 'visible');
    })
    .on('mousemove', () => tooltip
    .style('top', `${d3.event.pageY - 20}px`)
    .style('left', `${d3.event.pageX + 10}px`))
    .on('mouseout', () => tooltip.style('visibility', 'hidden'));
}
