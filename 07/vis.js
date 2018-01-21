const width = 960;
const height = 900;

const projection = d3
  .geoConicEqualArea()
  .parallels([29.5, 45.5])
  .scale(6800)
  .translate([-7530, -3150])
  .rotate([88, 0])
  // .center([-0.6, 38.7]);
  .center([-82.46, 28.681389]); // geographic center of Florida
// .scale()
// .translate([0.28*width, 0.1*height]);

const path = d3.geoPath().projection(projection);

const svg = d3
  .select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

// add an rect with a border
// to help with debugging
svg
  .on('click', showBorder)
  .append('rect')
  .attr('x', 0)
  .attr('y', 0)
  .attr('width', width)
  .attr('height', height)
  .attr('class', 'background')
  .style('fill', 'none');

let borderVisible = false;
function showBorder() {
  // console.log('borderVisible', borderVisible);
  if (borderVisible) {
    d3.select('.background').style('stroke', 'none');
    borderVisible = false;
  } else {
    d3.select('.background').style('stroke', 'black');
    borderVisible = true;
  }
}

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
let population = [];
let remaining = 3;

d3.json('fl-counties.json', (err, data) => {
  counties = data;
  if (!--remaining) draw();
});

d3.json('state-fips.json', (err, data) => {
  stateFIPS = data;
  if (!--remaining) draw();
});

// d3.csv('fl-lyme-disease-9211-county.csv', (err, data) => {
//   lyme = data;
//   if (!--remaining) draw();
// });

d3.csv('fl-counties-population-est-20170401.csv', (err, data) => {
  population = data;
  if (!--remaining) draw();
});

function draw() {
  population = population.map(d => ({
    county: d.county,
    population: Number(d.population)
  }));

  const populationHash = {};
  population.forEach(d => {
    populationHash[d.county] = d.population;
  });
  console.log('populationHash', populationHash);

  console.log('population', population);

  console.log(
    'd3.extent(population.map(d => d.population))',
    d3.extent(population.map(d => d.population))
  );

  //
  // set up color scale
  //

  const colorScale = d3
    .scaleQuantile()
    .range([
      '#f7fcf5',
      '#e5f5e0',
      '#c7e9c0',
      '#a1d99b',
      '#74c476',
      '#41ab5d',
      '#238b45',
      '#006d2c',
      '#00441b'
    ]);

  // calculate ckmeans clusters
  // then use the max value of each cluster
  // as a break
  const colorVariable = 'population';
  const numberOfClasses = colorScale.range().length - 1;
  const ckmeansClusters = ss.ckmeans(
    population.map(d => d[colorVariable]),
    numberOfClasses
  );
  const ckmeansBreaks = ckmeansClusters.map(d => d3.min(d));
  console.log('numberOfClasses', numberOfClasses);
  console.log('ckmeansClusters', ckmeansClusters);
  console.log('ckmeansBreaks', ckmeansBreaks);

  colorScale.domain(ckmeansBreaks);

  console.log('colorScale.domain()', colorScale.domain());
  console.log('colorScale(143801)', colorScale(143801));

  //
  //
  //

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

  // lyme = d3
  //   .nest()
  //   .key(d => (d.StateCode.length == 1 ? `0${d.StateCode}` : d.StateCode))
  //   .entries(lyme);

  // lyme = lyme
  //   .map(d => ({
  //     state: d.key,

  //     counties: d.values.reduce((prev, next) => {
  //       let cc = '';
  //       if (next.CountyCode.length == 1) {
  //         cc = `00${next.CountyCode}`;
  //       } else if (next.CountyCode.length == 2) {
  //         cc = `0${next.CountyCode}`;
  //       } else {
  //         cc = next.CountyCode;
  //       }

  //       prev[cc] = next;
  //       return prev;
  //     }, {})
  //   }))
  //   .reduce((prev, next) => {
  //     prev[next.state] = next.counties;
  //     return prev;
  //   }, {});

  console.log('countyFIPS', countyFIPS);
  // console.log('lyme', lyme);

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
    // .style('fill', d => {
    //   const p = d.properties;
    //   return lyme[p.STATEFP] &&
    //   lyme[p.STATEFP][p.COUNTYFP] &&
    //   lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`] != ''
    //     ? color(+lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`])
    //     : '#e0e0e0';
    // })
    .style('fill', d => {
      const countyName = d.properties.NAME;
      const countyPopulation = populationHash[countyName];
      const currentColor = colorScale(countyPopulation);

      // console.log('d from style', d);
      // console.log('countyName', countyName);
      // console.log('countyPopulation', countyPopulation);
      // console.log('currentColor', currentColor);
      return currentColor;
    })
    .style('stroke', '#969696')
    .style('stroke-width', '2px')
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
          `${countyFIPS[p.STATEFP][p.COUNTYFP]} County, ${stateFIPS[p.STATEFP]
            .name}\n${lymeVal}`
        );

      return tooltip.style('visibility', 'visible');
    })
    .on('mousemove', () =>
      tooltip
        .style('top', `${d3.event.pageY - 20}px`)
        .style('left', `${d3.event.pageX + 10}px`)
    )
    .on('mouseout', () => tooltip.style('visibility', 'hidden'));
}

function colorIn(e) {
  const yearRange = e.value;
  const counties = svg.selectAll('.county');

  // counties.style('fill', d => {
  //   const p = d.properties;
  //   return lyme[p.STATEFP] &&
  //   lyme[p.STATEFP][p.COUNTYFP] &&
  //   lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`] != ''
  //     ? color(+lyme[p.STATEFP][p.COUNTYFP][`ConfirmedCount_${yearRange}`])
  //     : '#e0e0e0';
  counties.style('fill', d => {
    if (typeof d === 'undefined') {
      return '#e0e0e0';
    }
    return colorScale(d.population);
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
          `${countyFIPS[p.STATEFP][p.COUNTYFP]} County, ${stateFIPS[p.STATEFP]
            .name}\n${lymeVal}`
        );

      return tooltip.style('visibility', 'visible');
    })
    .on('mousemove', () =>
      tooltip
        .style('top', `${d3.event.pageY - 20}px`)
        .style('left', `${d3.event.pageX + 10}px`)
    )
    .on('mouseout', () => tooltip.style('visibility', 'hidden'));
}
