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
            colors = settings.colors,
            tempNorm = [],
            normData = [],
            selectedCol = [],
            sums = [],
            sumIdx = [],
            leafData = [],
            leavesData = [],
            ncol = settings.colNames.length,
            sdBarMaxTxtL = 0,
            viewerWidth = el.getBoundingClientRect().width,
            viewerHeight = el.getBoundingClientRect().height,
            i,
            j,
            tempSum,
            maxVal,
            minVal,
            duration = 800,
            maxSum = 0,
            nticks = 10;

        for (i = 0; i < colNames.length; i++) {
            selectedCol.push(1);
            sdBarMaxTxtL = Math.max(sdBarMaxTxtL, colNames[i].length);
        }

        for (i = 0; i < rowNames.length; i++) {
            tempSum = 0;
            for (j = 0; j < colNames.length; j++) {
                data[i][j] = weights[j]*data[i][j];
                tempSum += selectedCol[j]*data[i][j];
            }
            sums.push(tempSum);
            sumIdx.push(i);
        }
        maxSum = d3.max(sums);

        // normalize data
        maxVal = 0;
        minVal = 1;
        for (i = 0; i < rowNames.length; i++) {
            sums[i] = sums[i]/maxSum;
            tempNorm = [];
            for (j = 0; j < colNames.length; j++) {
                tempNorm.push(data[i][j]/maxSum);
            }
            normData.push(tempNorm);
            maxVal = Math.max(d3.max(normData[i]), maxVal);
            minVal = Math.min(d3.min(normData[i]), minVal);
        }

        var ymax = d3.max(sums);
        var ymin = d3.min(sums) > 1/nticks*2 ? d3.min(sums)-1/nticks*2 : 0;

        var baseSvg = d3.select(el)
                        .append("svg")
                        .classed("svgContent", true)
                        .attr("width", "100%")
                        .attr("height", "100%");

        // create the bars
        var plotMargin = {top: viewerHeight*0.1, right: 20, bottom: viewerHeight*0.2, left: 35},
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
                    .ticks(nticks);

        var plotArea = baseSvg.append("g")
                        .attr("transform", "translate(" + plotMargin.left + "," + plotMargin.top + ")");

        plotArea.append("g")
                .attr("class", "yaxis")
                .call(yAxis);

        var maxLeafWidth = Math.floor((xscale(rowNames[1]) - xscale(rowNames[0]))/1.4);
        var radialScale = d3.scale.linear()
                            .domain([minVal, maxVal])
                            .range([Math.floor(maxLeafWidth/3), maxLeafWidth]);

        for (i = 0; i < rowNames.length; i++) {
            leafData = [];
            for (j = 0; j < colNames.length; j++) {
                leafData.push( [{x:0,y:0},
                                {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.07},
                                {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.13},
                                {x:radialScale(normData[i][j]), y:0},
                                {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.13},
                                {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.07}]);
            }
            leavesData.push(leafData);
        }

        var palms = plotArea.selectAll(".g")
                    .data(leavesData);

        var palmEnter = palms.enter().append("g").attr("class", "tree");

        palmEnter.append("rect")
                .attr("class", "bar")
                .attr("x", function(d,i) { return xscale(rowNames[i]) + xscale.rangeBand()/2; })
                .attr("width", 1)
                .attr("y", function(d,i) { return plotHeight; })
                .attr("height", function(d,i) { return viewerHeight*0.1; });

        var line = d3.svg.line()
            .interpolate("cardinal-closed")
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; });

        var leaves = palmEnter.append("g")
                    .attr("class", "leaf")
                    .selectAll("path")
                    .data(function(d) { return d;});

        leavesEnter = leaves.enter().append("path");

        leavesEnter.attr("d", line);

        d3.selectAll(".leaf")
            .attr("transform", function(d,i) {
                return "translate(" + (xscale(rowNames[i]) + xscale.rangeBand()/2) + "," + plotHeight + ")";
            });

        leaves.attr("transform", function(d,i) {
            return "rotate(" + (i*360/ncol) + ")";
        });

        leaves.style("fill", function(d,i) { return colors[i];});

        function reorderBars() {

        }

        function updatePlot(duration) {

            if (d3.sum(selectedCol) === 0) {

                // clear plot

            } else {
                for (i = 0; i < rowNames.length; i++) {
                    sums[i] = 0;
                    for (j = 0; j < colNames.length; j++) {
                        sums[i] += selectedCol[j]*data[i][j];
                    }
                }
            }

            maxSum = d3.max(sums);

            for (i = 0; i < rowNames.length; i++) {
                sums[i] = sums[i]/maxSum;
            }

            for (i = 0; i < rowNames.length; i++) {
                for (j = 0; j < colNames.length; j++) {
                    if (selectedCol[j] < 0.5) {
                        leavesData[i][j] =  [{x:0,y:0},
                                            {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.04},
                                            {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.05},
                                            {x:radialScale(normData[i][j]), y:0},
                                            {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.05},
                                            {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.03}];
                    } else {
                        leavesData[i][j] =  [{x:0,y:0},
                                            {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.07},
                                            {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.13},
                                            {x:radialScale(normData[i][j]), y:0},
                                            {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.13},
                                            {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.07}];
                    }
                }
            }

            ymax = d3.max(sums);
            ymin = d3.min(sums) > 1/nticks*2 ? d3.min(sums) - 1/nticks*2 : 0;

            yscale = d3.scale.linear()
                    .domain([ymin, ymax])
                    .range([plotHeight, 0]);

            yAxis = d3.svg.axis()
                    .scale(yscale)
                    .orient("left")
                    .ticks(nticks);

            plotArea.select(".yaxis")
                    .transition()
                    .duration(duration)
                    .call(yAxis);

            plotArea.selectAll("rect")
                    .transition()
                    .duration(duration)
                    .attr("y", function(d,i) { return yscale(sums[i]); })
                    .attr("height", function(d,i) { return plotHeight - yscale(sums[i]) + viewerHeight*0.1; });

            d3.selectAll(".leaf")
            .transition()
            .duration(duration)
            .attr("transform", function(d,i) {
                return "translate(" + (xscale(rowNames[i]) + xscale.rangeBand()/2) + "," + yscale(sums[i]) + ")";
            });

            palms = plotArea.selectAll(".tree")
                    .data(leavesData);

            leaves = palmEnter.selectAll("path")
                            .data(function(d) { return d;});

            leaves.transition()
                .duration(duration)
                .attr("d", line)
                .style("fill", function(d,i) {
                    return selectedCol[i] === 0 ? "#ccc" : colors[i];
                });

            sdBarColorBars.transition()
                .duration(duration)
                .style("fill", function(d,i) {
                    return selectedCol[i] === 0 ? "#ccc" : colors[i];
                });

            sdBarText.transition()
                .duration(duration)
                .style("fill", function(d,i) {
                    return selectedCol[i] === 0 ? "#ccc" : "#000";
                });
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

        var sdBarColorBarsW = sdBarElemH - 2*sdBarElemMargin;
        var sdBarColorBars = sdBarElemEnter.append("rect")
                            .attr("x", sdBarX + sdBarElemMargin + sdBarTextPadding)
                            .attr("y", function(d,i) { return sdBarY + sdBarElemMargin*2 + sdBarHdH + i*sdBarElemH})
                            .attr("width", sdBarColorBarsW)
                            .attr("height", sdBarColorBarsW)
                            .style("fill", function(d,i) { return colors[i];});

        var sdBarText = sdBarElemEnter.append("text")
                        .classed("sideBarText",true)
                        .attr("x", sdBarX + sdBarElemMargin*2 + sdBarTextPadding + sdBarColorBarsW)
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
            updatePlot(duration);
        }

        function clickHiddenText() {
            if (d3.event.defaultPrevented) return; // click suppressed
            d3.select(this).style("display", "none");
            var selector = "#t" + this.id.substring(1);
            sideBar.select(selector).style("display", "inline");
            selectedCol[Number(this.id.substring(1))] = 1;
            updatePlot(duration);
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

        updatePlot(duration);

  },

  resize: function(el, width, height, instance) {

  }
});
