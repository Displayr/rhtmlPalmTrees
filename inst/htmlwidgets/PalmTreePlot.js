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
            rindices,
            colSort = "0",
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
        rindices = d3.range(rowNames.length);

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
                leafData.push( [{x:0, y:0, name:rowNames[i], value:sums[i]},
                                {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.07},
                                {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.13},
                                {x:radialScale(normData[i][j]), y:0},
                                {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.13},
                                {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.07}]);
            }
            leavesData.push(leafData);
        }

        var barData = [];
        var textData = [];
        for (i = 0; i < rowNames.length; i++) {
            barData.push({name: rowNames[i], value: sums[i]});
            textData.push({name: rowNames[i], value: sums[i]});
        }

        var bars = plotArea.selectAll(".g")
                    .data(barData);

        var barsEnter = bars.enter();

        barsEnter.append("rect")
                .attr("class", "bar")
                .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                .attr("width", 1)
                .attr("y", function(d) { return plotHeight; })
                .attr("height", function(d) { return viewerHeight*0.1; });

        var palms = plotArea.selectAll(".g")
                    .data(leavesData);

        var palmEnter = palms.enter();

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
            .attr("transform", function(d) {
                return "translate(" + (xscale(d[0][0].name) + xscale.rangeBand()/2) + "," + plotHeight + ")";
            });

        leaves.attr("transform", function(d,i) {
            return "rotate(" + (i*360/ncol) + ")";
        });

        leaves.style("fill", function(d,i) { return colors[i];});


        function sortWithIndices(toSort) {
            for (var i = 0; i < toSort.length; i++) {
                toSort[i] = [toSort[i], i];
            }
            toSort.sort(function(left, right) {
                return left[0] < right[0] ? -1 : 1;
            });
            toSort.sortIndices = [];
            for (var j = 0; j < toSort.length; j++) {
                toSort.sortIndices.push(toSort[j][1]);
                toSort[j] = toSort[j][0];
            }
            return toSort.sortIndices;
        }

        function sortFromIndices(toSort, indices) {
            var output = [];

            for (var i = 0; i < toSort.length; i++) {
                output.push(toSort[indices[i]]);
            }
            return output;
        }


        function sortBars() {

            var rowNamesTemp = [];
            if (colSort == "0") {
                for (i = 0; i < rowNames.length; i++) {
                    rowNamesTemp.push(rowNames[i]);
                }
                rindices = sortWithIndices(rowNamesTemp);
                xscale.domain(rowNames1);

                plotArea.selectAll(".bar")
                    .sort(function(a,b) { return xscale(a.name) - xscale(b.name);})
                    .transition()
                    .duration(duration)
                    .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                    .attr("y", function(d) { return yscale(d.value); })
                    .attr("height", function(d) { return plotHeight - yscale(d.value) + viewerHeight*0.1; });

                plotArea.selectAll(".plotAreaText")
                    .sort(function(a,b) { return xscale(a.name) - xscale(b.name);})
                    .transition()
                    .duration(duration)
                    .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                    .attr("y", function(d) { return yscale(d.value); });

                plotArea.selectAll(".leaf")
                    .sort(function(a,b) { return xscale(a[0][0].name) - xscale(b[0][0].name);})
                    .transition()
                    .duration(duration)
                    .attr("transform", function(d,i) {
                        return "translate(" + (xscale(d[0][0].name) + xscale.rangeBand()/2) + "," + yscale(d[0][0].value) + ")";
                    });


            } else if (colSort == "1") {

                var sumsTemp = [];
                for (i = 0; i < rowNames.length; i++) {
                    sumsTemp.push(sums[i]);
                }
                rindices = sortWithIndices(sumsTemp);
                rowNames2 = sortFromIndices(rowNames, rindices);
                xscale.domain(rowNames2);

                plotArea.selectAll(".bar")
                    .sort(function(a,b) { return a.value - b.value;})
                    .transition()
                    .duration(duration)
                    .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                    .attr("y", function(d) { return yscale(d.value); })
                    .attr("height", function(d) { return plotHeight - yscale(d.value) + viewerHeight*0.1; });

                plotArea.selectAll(".plotAreaText")
                    .sort(function(a,b) { return a.value - b.value;})
                    .transition()
                    .duration(duration)
                    .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                    .attr("y", function(d) { return yscale(d.value); });

                plotArea.selectAll(".leaf")
                    .sort(function(a,b) { return a[0][0].value - b[0][0].value;})
                    .transition()
                    .duration(duration)
                    .attr("transform", function(d,i) {
                        return "translate(" + (xscale(d[0][0].name) + xscale.rangeBand()/2) + "," + yscale(d[0][0].value) + ")";
                    });
            }


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

            barData = [];
            textData = [];
            for (i = 0; i < rowNames.length; i++) {
                barData.push({name: rowNames[i], value: sums[i]});
                textData.push({name: rowNames[i], value: sums[i]});
            }

            for (i = 0; i < rowNames.length; i++) {
                for (j = 0; j < colNames.length; j++) {
                    if (selectedCol[j] < 0.5) {
                        leavesData[i][j] =  [{x:0, y:0, name:rowNames[i], value:sums[i]},
                                            {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.04},
                                            {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.05},
                                            {x:radialScale(normData[i][j]), y:0},
                                            {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.05},
                                            {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.03}];
                    } else {
                        leavesData[i][j] =  [{x:0, y:0, name:rowNames[i], value:sums[i]},
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

            bars.data(barData);
            texts.data(textData);
            palms.data(leavesData);
            leaves.data(function(d) { return d;});

            plotArea.selectAll(".leaf")
                    .transition()
                    .duration(duration)
                    .attr("transform", function(d) {
                        return "translate(" + (xscale(d[0][0].name) + xscale.rangeBand()/2) + "," + yscale(d[0][0].value) + ")";
                    });

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

            sortBars();

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

        if (sdBarHdH + sdBarElemH*(colNames.length+5) > sdBarHeight - sdBarHdH - sdBarElemH) {
            sdBarHdH = (sdBarHeight - 2*sdBarElemMargin)/(colNames.length + 6)*1.1;
            sdBarHdFontSize = sdBarHdH/2;
            sdBarElemH = (sdBarHeight - 2*sdBarElemMargin)/(colNames.length + 5);
            sdBarFontSize = sdBarElemH/2;
        }
        var sdBarHdY = sdBarY + sdBarElemMargin + sdBarHdH/2;

        sideBar.append("text")
                .attr("class","sdBarHeading")
                .attr("x", sdBarX + sdBarElemMargin + sdBarTextPadding)
                .attr("y", sdBarHdY)
                .attr("dy", "0.35em")
                .attr("fill", "white")
                .text(settings.colHeading)
                .style("font-size", sdBarHdFontSize);

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

        function clickReset() {
            if (d3.event.defaultPrevented) return; // click suppressed
            d3.selectAll(".sideBarSwitchOff").style("display", "none");
            d3.selectAll(".sideBarSwitchOn").style("display", "inline");
            selectedCol.forEach(function(d,i) {
                selectedCol[i] = 1;
            });
            updatePlot(duration);
        }

        function clickSort() {
            if (d3.event.defaultPrevented) return; // click suppressed
            var thisid = this.id.substring(1);

            if (thisid != colSort) {
                colSort = thisid;
                sdBarSort.selectAll(".sdBarSortBox").style("fill", "#fff").style("stroke","#ccc");
                sdBarSort.selectAll(".sdBarSortText").style("fill", "#ccc");

                sdBarSort.select("#sortC" + thisid).style("fill", "steelblue").style("stroke","steelblue");
                sdBarSort.select("#sortT" + thisid).style("fill", "#000");

                sortBars();
            }
        }

        var sdBarSwitchOn = sdBarElemEnter.append("text")
                            .attr("id", function(d,i) { return "t" + i;})
                            .attr("x", sdBarX + sdBarWidth - sdBarElemMargin - sdBarTextPadding)
                            .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + sdBarHdH + i*sdBarElemH + sdBarElemH/2})
                            .attr("dy", "0.35em")
                            .attr("text-anchor", "end")
                            .text("ON")
                            .classed("sideBarSwitchOn",true)
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
                            .classed("sideBarSwitchOff",true)
                            .style("font-size", sdBarFontSize)
                            .style("display", "none")
                            .style("cursor", "pointer")
                            .on("click", clickHiddenText);

        var sdBarReset = sideBar.append("g");

        var sdBarResetText = sdBarReset.append("text")
                                .attr("class", "sdBarResetButton")
                                .attr("x", sdBarX + sdBarWidth - sdBarElemMargin - sdBarTextPadding)
                                .attr("y", sdBarY + sdBarElemMargin + sdBarHdH + ncol*sdBarElemH + sdBarElemH/2)
                                .attr("dy", "0.35em")
                                .attr("text-anchor", "end")
                                .text("Reset")
                                .style("font-size", sdBarFontSize)
                                .on("click", clickReset);

        // Sort control
        var sortText = ["Alphabetically", "By rank"];
        var sdBarSort = sideBar.append("g");

        sdBarSort.append("text")
                    .attr("class", "sdBarSortHeading")
                    .attr("x", sdBarX + sdBarElemMargin + sdBarTextPadding)
                    .attr("y", sdBarY + sdBarElemMargin + sdBarHdH + (ncol+1)*sdBarElemH + sdBarElemH/2)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "start")
                    .text("Sort")
                    .style("font-size", sdBarHdFontSize);

        var sdBarSortEnter = sdBarSort.selectAll("g.span")
                        .data(sortText)
                        .enter()
                        .append("g")
                        .attr("id", function(d,i) { return "s" + i;});

        sdBarSortEnter.append("rect")
                        .classed("sideBarElemRect",true)
                        .attr("x", sdBarX + sdBarElemMargin)
                        .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + sdBarHdH + (ncol+2)*sdBarElemH + i*sdBarElemH})
                        .attr("width", sdBarElemW)
                        .attr("height", sdBarElemH);

        sdBarSortEnter.append("circle")
                        .attr("class","sdBarSortBox")
                        .attr("id", function(d,i) { return "sortC" + i;})
                        .attr("cx", sdBarX + sdBarElemMargin + sdBarTextPadding + sdBarColorBarsW*0.5)
                        .attr("cy", function(d,i) { return sdBarY + sdBarElemMargin + sdBarHdH + (ncol+2)*sdBarElemH + sdBarElemH*i + sdBarElemH/2})
                        .attr("r", sdBarColorBarsW*0.35)
                        .style("fill", "#fff");

        sdBarSortEnter.append("text")
                    .attr("class", "sdBarSortText")
                    .attr("id", function(d,i) { return "sortT" + i;})
                    .attr("x", sdBarX + sdBarElemMargin*2 + sdBarTextPadding + sdBarColorBarsW)
                    .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + sdBarHdH + (ncol+2)*sdBarElemH + sdBarElemH*i + sdBarElemH/2})
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "start")
                    .text(function(d) {return d;})
                    .style("font-size", sdBarFontSize);

        sdBarSort.select("#sortC0").style("fill", "steelblue").style("stroke","steelblue");
        sdBarSort.select("#sortT0").style("fill", "#000");
        sdBarSort.selectAll("g").on("click", clickSort);

        var rowNames1 = [];
        var rowNames2 = [];
        for (i = 0; i < rowNames.length; i++) {
            rowNames1.push(rowNames[i]);
        }
        rowNames1.sort();

        var texts = plotArea.selectAll(".gt")
                    .data(textData);

        var textsEnter = texts.enter();
        textsEnter.append("text")
                .attr("class", "plotAreaText")
                .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                .attr("y", function(d) { return plotHeight; })
                .text(function(d) { return d.name;})
                .style("font-size", sdBarFontSize);

        updatePlot(duration);


  },

  resize: function(el, width, height, instance) {

  }
});
