HTMLWidgets.widget({

  name: "PalmTreePlot",

  type: "output",

  initialize: function(el, width, height) {

  },

  renderValue: function(el, x, instance) {

        var data = x.data,
            settings = x.settings,
            colNames = settings.colNames,
            rowNames = settings.rowNames,
            weights = settings.weights,
            selectedCol = [],
            sums = [],
            sumIdx = [],
            sdBarMaxTxtL = 0,
            viewerWidth = el.getBoundingClientRect().width,
            viewerHeight = el.getBoundingClientRect().height,
            i,
            j,
            duration = 300;

        for (i = 0; i < colNames.length; i++) {
            selectedCol.push(1);
            sdBarMaxTxtL = Math.max(sdBarMaxTxtL, colNames[i].length);
        }

        for (i = 0; i < rowNames.length; i++) {
            var tempSum = 0;
            for (j = 0; j < colNames.length; j++) {
                tempSum += selectedCol[j]*weights[j]*data[i][j];
            }
            sums.push(tempSum);
            sumIdx.push(i);
        }

        var ymax = d3.max(sums)*1.2;
        var ymin = 0;

        var baseSvg = d3.select(el)
                        .append("svg")
                        .classed("svgContent", true)
                        .attr("width", "100%")
                        .attr("height", "100%");

        // create the plot
        var plotMargin = {top: 20, right: 20, bottom: 20, left: 35},
            plotWidth = viewerWidth * 0.8 - plotMargin.left - plotMargin.right,
            plotHeight = viewerHeight - plotMargin.top - plotMargin.bottom;

        var xscale = d3.scale.ordinal()
                    .domain(rowNames)
                    .rangeRoundBands([0, plotWidth], 0.1, 0.3);

        var yscale = d3.scale.linear()
                    .domain([ymin, ymax])
                    .range([plotHeight, 0]);

        var xAxis = d3.svg.axis()
                    .scale(xscale)
                    .orient("bottom");

        var yAxis = d3.svg.axis()
                    .scale(yscale)
                    .orient("left")
                    .ticks(10);

        var plotArea = baseSvg.append("g")
                        .attr("transform", "translate(" + plotMargin.left + "," + plotMargin.top + ")");

        plotArea.append("g")
                .attr("class", "yaxis")
                .call(yAxis);

        plotArea.selectAll(".bar")
                .data(sumIdx)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", function(d) { return xscale(rowNames[d]) + xscale.rangeBand()/2; })
                .attr("width", 1)
                .attr("y", function(d) { return yscale(sums[d]); })
                .attr("height", function(d) { return plotHeight - yscale(sums[d]); });

        function reorderBars() {

        }

        function updatePlot() {

            for (i = 0; i < rowNames.length; i++) {
                sums[i] = 0;
                for (j = 0; j < colNames.length; j++) {
                    sums[i] += selectedCol[j]*weights[j]*data[i][j];
                }
            }

            ymax = d3.max(sums)*1.2;
            ymin = 0;

            yscale = d3.scale.linear()
                    .domain([ymin, ymax])
                    .range([plotHeight, 0]);

            yAxis = d3.svg.axis()
                    .scale(yscale)
                    .orient("left")
                    .ticks(10);

            plotArea.select(".yaxis")
                    .transition()
                    .duration(duration)
                    .call(yAxis);

            plotArea.selectAll("rect")
                    .transition()
                    .duration(duration)
                    .attr("y", function(d) { return yscale(sums[d]); })
                    .attr("height", function(d) { return plotHeight - yscale(sums[d]); });

        }


        // create the side bar

        var sideBar = baseSvg.append("g");
        var sdBarWidth = viewerWidth*0.2,
            sdBarHeight = viewerHeight,
            sdBarX = viewerWidth - sdBarWidth,
            sdBarY = 0;

        sideBar.append("rect")
                .attr("x", sdBarX)
                .attr("y", sdBarY)
                .attr("rx", 7)
                .attr("ry", 7)
                .attr("width",sdBarWidth)
                .attr("height",sdBarHeight)
                .classed("sideBar", true);

        var sdBarElem = sideBar.selectAll("sdBar.g")
                        .data(colNames);

        var sdBarElemEnter = sdBarElem.enter()
                            .append("g");

        var sdBarElemMargin = 3,
            sdBarTextPadding = 3,
            sdBarElemW = sdBarWidth - 2*sdBarElemMargin;

        var sdBarFontSize = sdBarElemW/sdBarMaxTxtL,
            sdBarElemH = sdBarFontSize * 2;

        // heading
        var sdBarHdFontSize = sdBarFontSize + 2,
            sdBarHdH = sdBarHdFontSize * 2;

        if (sdBarHdH + sdBarElemH*colNames.length > sdBarHeight - sdBarHdH - sdBarElemH) {
            sdBarHdH = (sdBarHeight - 2*sdBarElemMargin)/(colNames.length + 3)*1.1;
            sdBarHdFontSize = sdBarHdH/2;
            sdBarElemH = (sdBarHeight - 2*sdBarElemMargin)/(colNames.length + 2);
            sdBarFontSize = sdBarElemH/2;
        }
        var sdBarHdY = sdBarY + sdBarElemMargin + sdBarHdH/2;

        sideBar.append("text")
                .attr("x", sdBarX + sdBarElemMargin + sdBarTextPadding)
                .attr("y", sdBarHdY)
                .attr("dy", "0.35em")
                .attr("fill", "white")
                .text(settings.colHeading)
                .style("font-family", "sans-serif")
                .style("font-size", sdBarHdFontSize)
                .style("font-weight", "bold");

        sdBarElemEnter.append("rect")
                        .classed("sideBarElemRect",true)
                        .attr("x", sdBarX + sdBarElemMargin)
                        .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + sdBarHdH + i*sdBarElemH})
                        .attr("width", sdBarElemW)
                        .attr("height", sdBarElemH);

        var sdBarText = sdBarElemEnter.append("text")
                        .classed("sideBarText",true)
                        .attr("x", sdBarX + sdBarElemMargin + sdBarTextPadding)
                        .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + sdBarHdH + i*sdBarElemH + sdBarElemH/2})
                        .attr("dy", "0.35em")
                        .text(function(d) { return d;})
                        .style("font-size", sdBarFontSize)
                        .style("cursor", "default");

        function clickText() {
            if (d3.event.defaultPrevented) return; // click suppressed
            d3.select(this).style("display", "none");
            var selector = "#c" + this.id.substring(1);
            sideBar.select(selector).style("display", "inline");
            selectedCol[Number(this.id.substring(1))] = 0;
            updatePlot();
        }

        function clickHiddenText() {
            if (d3.event.defaultPrevented) return; // click suppressed
            d3.select(this).style("display", "none");
            var selector = "#t" + this.id.substring(1);
            sideBar.select(selector).style("display", "inline");
            selectedCol[Number(this.id.substring(1))] = 1;
            updatePlot();
        }

        var sdBarSwitchOn = sdBarElemEnter.append("text")
                            .attr("id", function(d,i) { return "t" + i;})
                            .attr("x", sdBarX + sdBarWidth - sdBarElemMargin - sdBarTextPadding)
                            .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + sdBarHdH + i*sdBarElemH + sdBarElemH/2})
                            .attr("dy", "0.35em")
                            .attr("text-anchor", "end")
                            .text("ON")
                            .classed("sideBarText",true)
                            .style("font-size", sdBarFontSize)
                            .style("cursor", "pointer")
                            .on("click", clickText);

        var sdBarSwitchOff = sdBarElemEnter.append("text")
                            .attr("id", function(d,i) { return "c" + i;})
                            .attr("x", sdBarX + sdBarWidth - sdBarElemMargin - sdBarTextPadding)
                            .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + sdBarHdH + i*sdBarElemH + sdBarElemH/2})
                            .attr("dy", "0.35em")
                            .attr("text-anchor", "end")
                            .text("OFF")
                            .classed("sideBarText",true)
                            .style("font-size", sdBarFontSize)
                            .style("display", "none")
                            .style("cursor", "pointer")
                            .on("click", clickHiddenText);



  },

  resize: function(el, width, height, instance) {

  }
});
