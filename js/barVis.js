/* * * * * * * * * * * * * *
*      class BarVis        *
* * * * * * * * * * * * * */


class BarVis {

// / constructor method to initialize Timeline object
    constructor(parentElement, covidData, usaData, descending, title) {
        this.parentElement = parentElement;
        this.covidData = covidData;
        this.usaData = usaData;
        this.descending = descending;
        this.title = title;

        // parse date method
        this.parseDate = d3.timeParse("%m/%d/%Y");

        this.initVis()
    }

    initVis(){
        let vis = this;

        vis.margin = {top: 20, right: 20, bottom: 50, left: 50};
        vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
        vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append('g')
            .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

        // add title
        vis.svg.append('g')
            .attr('class', 'title bar-title')
            .append('text')
            .text(vis.title)
            .attr('transform', `translate(${vis.width / 2}, 10)`)
            .attr('text-anchor', 'middle');

        /************ CHANGE *************/

        // Scales and axes
        vis.y = d3.scaleLinear()
            .range([vis.height, 0])

        vis.x = d3.scaleBand()
            .range([0, vis.width])
            .padding(0.2);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")")
            .style('font-size', '8px')
            .style("text-anchor", "middle");

        vis.svg.append("g")
            .attr("class", "y-axis axis");


        /*********** CHANGE ***************/

        this.wrangleData();
    }

    wrangleData(){
        let vis = this

        // I think one could use a lot of the dataWrangling from dataTable.js here...
        let filteredData = [];
        vis.displayData = [];

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
            vis.displayData.push(
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


        // // maybe a boolean in the constructor could come in handy ?
        // /*

        if (vis.descending){
            vis.displayData.sort((a,b) => {return b[selectedCategory] - a[selectedCategory]})
        } else {
            vis.displayData.sort((a,b) => {return a[selectedCategory] - b[selectedCategory]})
        }

        console.log('final data structure', vis.displayData);

        vis.topTenData = vis.displayData.slice(0, 10)

        console.log('final data structure', vis.topTenData);
        // */


        vis.updateVis()


    }

    updateVis(){
        // let vis = this;

        // if (vis.descending){
        //     vis.displayData.sort((a,b) => {return b[selectedCategory] - a[selectedCategory]})
        // } else {
        //     vis.displayData.sort((a,b) => {return a[selectedCategory] - b[selectedCategory]})
        // }
        //
        // console.log('final data structure', vis.displayData);
        //
        // vis.topTenData = vis.displayData.slice(0, 10)
        //
        // console.log('final data structure', vis.topTenData);
        // // */
        //
        //
        // vis.updateVis()


        let vis = this;

        let chosenValueArray = [];

        vis.topTenData.forEach(state => {
            chosenValueArray.push(state[selectedCategory])
        })

        let displayDataValueArray = [];

        vis.displayData.forEach(state => {
            displayDataValueArray.push(state[selectedCategory])
        })

        let topTenStateArray = [];

        vis.topTenData.forEach(state => {
            topTenStateArray.push(state['state'])
        })


        vis.x.domain(topTenStateArray)
        vis.y.domain([0, d3.max(chosenValueArray)])


        let bars = vis.svg.selectAll(".bar").data(vis.topTenData)


        vis.colorScale = d3.scaleLinear()
            .domain(d3.extent(displayDataValueArray))
            .range(['white', 'red']);


        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")

        bars.enter().append("rect")
            .attr("class", "bar")
            .merge(bars)
            .on("mouseover", function(event, d) {
                let index = vis.displayData.findIndex(x => x.state === d.state);
                // let index = vis.stateInfo.findIndex(x => x.state === d.properties.name);

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
                    <h3>${d.state}<h3>
                    <h6>Population: ${vis.numberWithCommas(vis.displayData[index].population)}</h6>
                    <h6>Cases (absolute): ${vis.numberWithCommas(vis.displayData[index].absCases)}</h6>
                    <h6>Deaths (absolute): ${vis.numberWithCommas(vis.displayData[index].absDeaths)}</h6>
                    <h6>Cases (relative): ${vis.displayData[index].relCases.toFixed(1)}%</h6>
                    <h6>Deaths (relative): ${vis.displayData[index].relDeaths.toFixed(1)}%</h6>
                </div>`);


            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .attr('stroke-width', '0px')
                vis.tooltip
                    .style("opacity", 0)
            })
            .transition()
            .duration(200)
            .attr("x", d => vis.x(d.state))
            .attr("y", d => vis.y(d[selectedCategory]))
            .attr("height", d => vis.height - vis.y(d[selectedCategory]))
            .attr("width", vis.x.bandwidth())
            .attr("fill", function (d) {

                let index = vis.displayData.findIndex(x => x.state === d.state);
                return vis.colorScale(vis.displayData[index][selectedCategory]);

            })


        bars.exit().remove()

        vis.svg.select(".y-axis").call(vis.yAxis)
        vis.svg.select(".x-axis").call(vis.xAxis)


        console.log('here')

    }

    numberWithCommas = (number) => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }



}