/* * * * * * * * * * * * * *
*          MapVis          *
* * * * * * * * * * * * * */


class MapVis {

    // constructor method to initialize Timeline object
    constructor(parentElement, covidData, usaData, geoData) {
        this.parentElement = parentElement;
        this.covidData = covidData;
        this.usaData = usaData;
        this.geoData = geoData;
        this.displayData = [];

        // parse date method
        this.parseDate = d3.timeParse("%m/%d/%Y");

        this.initTable()
    }

    initTable(){
        let vis = this

        vis.margin = {top: 20, right: 20, bottom: 20, left: 20};
        vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
        vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

        // add title
        vis.svg.append('g')
            .attr('class', 'title map-title')
            .append('text')
            .text('HeatMap')
            .attr('transform', `translate(${vis.width / 2}, 20)`)
            .attr('text-anchor', 'middle');


        vis.viewpoint = {'width': 975, 'height': 610};
        vis.zoom = vis.width / vis.viewpoint.width;

        // adjust map position
        vis.map = vis.svg.append("g") // group will contain all state paths
            .attr("class", "states")
            .attr('transform', `scale(${vis.zoom} ${vis.zoom})`);

        vis.path = d3.geoPath()

        vis.country = topojson.feature(vis.geoData, vis.geoData.objects.states).features
        console.log(vis.geoData);
        vis.states = vis.map.selectAll(".states")
            .data(vis.country)
            .enter().append("path")
            .attr('class', 'states')
            .attr("d", vis.path)

        // wrangleData
        vis.wrangleData()
    }

    wrangleData(){
        let vis = this

        // check out the data
        // console.log(vis.covidData)
        // console.log(vis.usaData)

        // first, filter according to selectedTimeRange, init empty array
        let filteredData = [];



        // if there is a region selected
        if (selectedTimeRange.length !== 0){
            //console.log('region selected', vis.selectedTimeRange, vis.selectedTimeRange[0].getTime() )

            // iterate over all rows the csv (dataFill)
            vis.covidData.forEach( row => {
                // and push rows with proper dates into filteredData
                if (selectedTimeRange[0].getTime() <= vis.parseDate(row.submission_date).getTime() && vis.parseDate(row.submission_date).getTime() <= selectedTimeRange[1].getTime() ){
                    filteredData.push(row);
                }
            });
        } else {
            filteredData = vis.covidData;
        }

        // prepare covid data by grouping all rows by state
        let covidDataByState = Array.from(d3.group(filteredData, d =>d.state), ([key, value]) => ({key, value}))

        // have a look
        // console.log(covidDataByState)

        // init final data structure in which both data sets will be merged into
        vis.stateInfo = []

        // merge
        covidDataByState.forEach( state => {

            // get full state name
            let stateName = nameConverter.getFullName(state.key)

            // init counters
            let newCasesSum = 0;
            let newDeathsSum = 0;
            let population = 0;

            // look up population for the state in the census data set
            vis.usaData.forEach( row => {
                if(row.state === stateName){
                    population += +row["2019"].replaceAll(',', '');
                }
            })

            // calculate new cases by summing up all the entries for each state
            state.value.forEach( entry => {
                newCasesSum += +entry['new_case'];
                newDeathsSum += +entry['new_death'];
            });

            // populate the final data structure
            vis.stateInfo.push(
                {
                    state: stateName,
                    population: population,
                    absCases: newCasesSum,
                    absDeaths: newDeathsSum,
                    relCases: (newCasesSum/population*100),
                    relDeaths: (newDeathsSum/population*100)
                }
            )
        })

        console.log('final data structure for myDataTable', vis.stateInfo);

        vis.updateTable()

    }

    updateTable(){
        let vis = this;



        /**************************/

        let selectedCategoryArray = [];

        vis.stateInfo.map(state => {
            selectedCategoryArray.push(state[selectedCategory])
        })

        vis.country.map(state => {
            console.log(state.properties.name);
            let index = vis.stateInfo.findIndex(x => x.state === state.properties.name);
            console.log(index)
        })

        console.log(vis.country);


        console.log(selectedCategoryArray);

        // console.log(vis.stateInfo.state());

        vis.colorScale = d3.scaleLinear()
            .domain(d3.extent(selectedCategoryArray))
            .range(['white', 'red']);

        console.log(vis.colorScale(73437))



        d3.select("#tooltip").style("opacity", 0);

        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")



        vis.states
            .attr("fill", (d, i) => {
                let index = vis.stateInfo.findIndex(x => x.state === d.properties.name);
                return vis.colorScale(vis.stateInfo[index][selectedCategory]);
            })
            .on("mouseover", function(event, d) {
                let index = vis.stateInfo.findIndex(x => x.state === d.properties.name);

                d3.select(this)
                    .attr('stroke-width', '2px')
                    .attr('stroke', 'black')

                let mouseLeft = event.pageX;
                let mouseTop = event.pageY;

                vis.tooltip
                    .style("opacity", 1)
                    .style("left", mouseLeft + 30 + 'px')
                    .style("top", mouseTop + 'px')
                    .html(`
                <div style="border-radius: 5px;  width: 200px; background-color: white;">
                    <h3>${d.properties.name}<h3>
                    <h6>Population: ${vis.numberWithCommas(vis.stateInfo[index].population)}</h6>
                    <h6>Cases (absolute): ${vis.numberWithCommas(vis.stateInfo[index].absCases)}</h6>
                    <h6>Deaths (absolute): ${vis.numberWithCommas(vis.stateInfo[index].absDeaths)}</h6>
                    <h6>Cases (relative): ${vis.stateInfo[index].relCases.toFixed(1)}%</h6>
                    <h6>Deaths (relative): ${vis.stateInfo[index].relDeaths.toFixed(1)}%</h6>
                </div>`);


            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .attr('stroke-width', '0px')
                    d3.select('.tooltip').style("opacity", 0)
            })

        d3.select("#tooltip").classed("hidden", false);

        // Legend
        // vis.legend = vis.svg.append("g")
        //     .attr('class', 'legend')
        //     .attr('transform', `translate(${vis.width / 10}, ${vis.height - 30})`)
        //
        // vis.legend.selectAll()
        //     .data(vis.stateInfo.sort((a, b) => {
        //         return b[selectedCategory] - a[selectedCategory] ;
        //     }))
        //     .enter().append("rect")
        //     .merge(vis.legend)
        //     .attr('class', 'legend')
        //     .attr("d", vis.rect)
        //     .attr("fill", d => vis.colorScale(d[selectedCategory]))
        //     .attr("width", 8)
        //     .attr("height", 15)
        //     .attr("x", (d, i) => i * 8)
        //     .attr("y", 0);


        vis.x  = d3.scaleLinear()
            .range([0, 200])





        // // reset tbody
        // vis.tbody.html('')
        //
        // // loop over all states
        // vis.stateInfo.forEach(state =>{
        //     let row = vis.tbody.append("tr")
        //     row.html(
        //         `<td>${state.state}</td>
        //         <td>${state.population}</td>
        //         <td>${state.absCases}</td>
        //         <td>${state.absDeaths}</td>
        //         <td>${state.relCases}</td>
        //         <td>${state.relDeaths}</td>`
        //     )
        //     row.on('mouseover', function(){
        //         console.log(' you hovered over a row - the selected state is', state.state)
        //         selectedState = state.state;
        //         myBrushVis.wrangleDataResponsive();
        //     })
        // })
    }

    numberWithCommas = (number) => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}
