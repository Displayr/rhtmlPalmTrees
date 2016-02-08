function PalmPlot() {
    var viewerWidth = 600, // default width
        viewerHeight = 600, // default height
        plotWidth = 400,
        plotHeight = 400,
        left_margin = 35,
        yaxisFormat = 0,
        data = [],
        settings = {},
        plotMargin = {},
        param = {},
        tempNorm = [],
        normData = [],
        selectedCol = [],
        sums = [],
        sumIdx = [],
        barData = [],
        frondData = [],
        i,
        j,
        tempSum,
        maxVal,
        minVal,
        rindices,
        colSort = "0",
        duration = 600,
        maxSum = 0,
        nticks = 10,
        colNames,
        rowNames,
        weights,
        colors,
        ncol,
        xscale,
        yscale,
        radialScale,
        xaxis,
        yaxis,
        line,
        bars,
        texts,
        palms,
        tips,
        tip,
        minLeafWidth = 10,
        leaves;
    var commasFormatter = d3.format(",.1f");
    var commasFormatterE = d3.format(",.1e");

    function setup_sizes(settings) {

        plotMargin = {top: viewerHeight*0.1, right: 20, bottom: viewerHeight*0.2, left: left_margin};
        plotWidth = viewerWidth * 0.8 - plotMargin.left - plotMargin.right;
        plotHeight = viewerHeight - plotMargin.top - plotMargin.bottom;

        // sidebar parameters
        param.sdBarMaxWidth = viewerWidth*0.2;
        /*param.sdBarWidth = viewerWidth*0.2;
        param.sdBarHeight = viewerHeight-5;
        param.sdBarX = viewerWidth - param.sdBarWidth-5;
        param.sdBarY = 5;

        param.sdBarMargin = 0;
        param.sdBarTextPadding = 3;
        param.sdBarElemW = param.sdBarWidth - 2*param.sdBarMargin;

        // param.sdBarFontSize = param.sdBarElemW/param.sdBarMaxTxtL;
        param.sdBarMaxTextWidth = 0;
        param.sdBarFontSize = 12;
        param.sdBarElemH = param.sdBarFontSize * 2;

        // heading
        param.sdBarHdFontSize = param.sdBarFontSize + 2,
        param.sdBarHdH = param.sdBarHdFontSize * 2;
        param.sdBarElemY = param.sdBarY + param.sdBarMargin + param.sdBarHdH;

        var sortOptions = 4;
        if (param.sdBarElemY + (ncol+2)*param.sdBarElemH + sortOptions*param.sdBarElemH > param.sdBarHeight - param.sdBarMargin) {
            param.sdBarElemH = (param.sdBarHeight - 2*param.sdBarMargin)/(colNames.length + sortOptions + 1 + 1.1*2);
            param.sdBarHdH = param.sdBarElemH*1.1;
            param.sdBarHdFontSize = param.sdBarHdH/2;
            param.sdBarFontSize = param.sdBarElemH/2;
        }
        // heading X,Y offset
        param.sdBarHdX = param.sdBarX + param.sdBarMargin + param.sdBarTextPadding;
        param.sdBarHdY = param.sdBarY + param.sdBarMargin + param.sdBarHdH/2;

        // white container box X,Y offset
        param.sdBarElemX = param.sdBarX + param.sdBarMargin;
        param.sdBarElemY = param.sdBarY + param.sdBarMargin + param.sdBarHdH;

        // color boxes
        param.sdBarColorBarsX = param.sdBarElemX + param.sdBarTextPadding;
        param.sdBarColorBarsY = param.sdBarElemY + param.sdBarTextPadding;
        param.sdBarColorBarsW = param.sdBarElemH - 2*param.sdBarTextPadding;

        // Column name (text) X,Y offset
        param.sdBarTextX = param.sdBarColorBarsX + param.sdBarColorBarsW + param.sdBarTextPadding;
        param.sdBarTextY = param.sdBarElemY + param.sdBarElemH/2;

        param.sdBarSwitchX = param.sdBarElemX + param.sdBarElemW - param.sdBarTextPadding;
        param.sdBarSwitchY = param.sdBarTextY;*/
    }

    function setup_colors() {

    }

    function update_data() {

        for (i = 0; i < rowNames.length; i++) {
             barData[i].value = sums[i];
             frondData[i].value = sums[i];
            for (j = 0; j < colNames.length; j++) {
                if (selectedCol[j] < 0.5) {
                    frondData[i].leaves[j] =  [{x:0, y:0},
                                        {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.03},
                                        {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.05},
                                        {x:radialScale(normData[i][j]), y:0},
                                        {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.05},
                                        {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.03}];
                } else {
                    frondData[i].leaves[j] =  [{x:0, y:0},
                                        {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.07},
                                        {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.13},
                                        {x:radialScale(normData[i][j]), y:0},
                                        {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.13},
                                        {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.07}];
                }
            }
        }
    }

    function mouse_over_frond(d) {

        var this_tip = tip.show(d);

        if (plotMargin.top + yscale(d.value) > viewerHeight * 0.5) {

            this_tip = this_tip.direction("n").offset([-15,0]).show(d);
            d3.select("#littleTriangle")
            .attr("class", "northTip")
            .style("visibility", "visible")
            .style("top", (yscale(d.value) + plotMargin.top - radialScale(d.tipR) - 10) + "px")
            .style("left", (xscale(d.name) + xscale.rangeBand()/2 + plotMargin.left) + "px");
        } else {
            this_tip = this_tip.direction("s").offset([15,0]).show(d);
            d3.select("#littleTriangle")
            .attr("class", "southTip")
            .style("visibility", "visible")
            .style("top", (yscale(d.value) + plotMargin.top + radialScale(d.tipR) + 10) + "px")
            .style("left", (xscale(d.name) + xscale.rangeBand()/2 + plotMargin.left) + "px");
        }

        if (parseFloat(this_tip.style("left")) < 0) {
            this_tip.style("left", "5px");
        } else if (parseFloat(this_tip.style("left")) + parseFloat(this_tip.style("width")) > param.sdBarX) {
            this_tip.style("left", (param.sdBarX - 5 - parseFloat(this_tip.style("width"))) + "px");
        }

        i = d.index;
        var s = 1.1;
        for (j = 0; j < colNames.length; j++) {
            if (selectedCol[j] < 0.5) {
                frondData[i].leaves[j] =  [{x:0, y:0},
                                    {x:radialScale(normData[i][j])*0.25*s, y:-radialScale(normData[i][j])*0.03*s},
                                    {x:radialScale(normData[i][j])*0.75*s, y:-radialScale(normData[i][j])*0.05*s},
                                    {x:radialScale(normData[i][j])*s, y:0},
                                    {x:radialScale(normData[i][j])*0.75*s, y:radialScale(normData[i][j])*0.05*s},
                                    {x:radialScale(normData[i][j])*0.25*s, y:radialScale(normData[i][j])*0.03*s}];
            } else {
                frondData[i].leaves[j] =  [{x:0, y:0},
                                    {x:radialScale(normData[i][j])*0.25*s, y:-radialScale(normData[i][j])*0.07*s},
                                    {x:radialScale(normData[i][j])*0.75*s, y:-radialScale(normData[i][j])*0.13*s},
                                    {x:radialScale(normData[i][j])*s, y:0},
                                    {x:radialScale(normData[i][j])*0.75*s, y:radialScale(normData[i][j])*0.13*s},
                                    {x:radialScale(normData[i][j])*0.25*s, y:radialScale(normData[i][j])*0.07*s}];
            }
        }
        palms.data(frondData);
        leaves.data(function(d) { return d.leaves;});
        d3.select("#frond" + d.index).selectAll("path").transition().duration(300).attr("d", line);
    }

    function mouse_out_frond(d) {
        tip.hide(d);
        d3.select("#littleTriangle").style("visibility", "hidden");
        i = d.index;
        for (j = 0; j < colNames.length; j++) {
            if (selectedCol[j] < 0.5) {
                frondData[i].leaves[j] =  [{x:0, y:0},
                                    {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.04},
                                    {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.05},
                                    {x:radialScale(normData[i][j]), y:0},
                                    {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.05},
                                    {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.03}];
            } else {
                frondData[i].leaves[j] =  [{x:0, y:0},
                                    {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.07},
                                    {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.13},
                                    {x:radialScale(normData[i][j]), y:0},
                                    {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.13},
                                    {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.07}];
            }
        }
        palms.data(frondData);
        leaves.data(function(d) { return d.leaves;});
        d3.select("#frond" + d.index).selectAll("path").transition().duration(300).attr("d", line);
    }

    function update_unit_position() {
        d3.select(".suffixText")
            .attr("x", -plotMargin.left*0.5)
            .attr("y", -plotMargin.top*0.5);
    }

    function resize_chart(el) {
        // recompute sizes
        setup_sizes(settings);
        var baseSvg = d3.select(el).select("svg");
        baseSvg.select("g").attr("transform", "translate(" + plotMargin.left + "," + plotMargin.top + ")");
        // resize scales and axis
        xscale.rangeRoundBands([0, plotWidth], 0.1, 0.3);
        yscale.range([plotHeight, 0]);
        yAxis.scale(yscale);
        xAxis.scale(xscale);
        baseSvg.select(".yaxis").call(yAxis);
        baseSvg.select(".xaxis")
                .attr("transform", "translate(0," + plotHeight + ")")
                .call(xAxis)
                .selectAll(".tick text")
                .call(wrap, xscale.rangeBand());
        // update leaf size
        param.maxLeafWidth = Math.min(plotMargin.top, Math.floor((xscale.range()[1] - xscale.range()[0])/1.4));
        radialScale.range([minLeafWidth, param.maxLeafWidth]);
        update_data();

        palms.data(frondData);
        leaves.data(function(d) { return d.leaves;});

        baseSvg.selectAll(".bar")
                .attr("x", function(d) { return xscale(d.name) + Math.round(xscale.rangeBand()/2); })
                .attr("y", function(d) { return yscale(d.value); })
                .attr("height", function(d) { return plotHeight - yscale(d.value); });
        /*baseSvg.selectAll(".plotAreaText")
                .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                .attr("y", function(d) { return yscale(d.value) + radialScale(d.offset); });*/
        baseSvg.selectAll(".plotAreaHeading")
                .attr("x", plotWidth/2)
                .attr("y", plotHeight + plotMargin.bottom*0.8);

        baseSvg.selectAll(".leaf")
                .attr("transform", function(d) {
                    return "translate(" + (xscale(d.name) + xscale.rangeBand()/2) + "," + yscale(d.value) + ")";
                });
        leaves.attr("d", line);

        if(settings.tooltips){
            tip.destroy();
            tip = d3.tip()
                    .attr('class', 'd3-tip')
                    .html(function(d) { return d.tip; });

            baseSvg.call(tip);
            baseSvg.selectAll(".ghostCircle")
                    .attr("r", function(d) { return radialScale(d.tipR)})
                    .attr("cx", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                    .attr("cy", function(d) { return yscale(d.value); })
                    .on('mouseover', function(d) {
                        mouse_over_frond(d);
                    })
                    .on('mouseout', function(d) {
                        mouse_out_frond(d);
                    });
        }

        if (settings.prefix || settings.suffix) {
            update_unit_position();
        }
        // resize side bar
        /*baseSvg.selectAll(".sideBar")
                .attr("x", param.sdBarX)
                .attr("y", param.sdBarY)
                .attr("width",param.sdBarWidth)
                .attr("height",param.sdBarHeight);
        baseSvg.selectAll(".sdBarHeading")
                .attr("x", param.sdBarHdX)
                .attr("y", param.sdBarHdY)
                .style("font-size", param.sdBarHdFontSize);
        baseSvg.selectAll(".sideBarElemRect")
                .attr("x", param.sdBarElemX)
                .attr("y", function(d,i) { return param.sdBarElemY + i*param.sdBarElemH})
                .attr("width", param.sdBarElemW)
                .attr("height", param.sdBarElemH);
        baseSvg.selectAll(".sideBarColorBox")
                .attr("x", param.sdBarColorBarsX)
                .attr("y", function(d,i) { return param.sdBarColorBarsY + i*param.sdBarElemH})
                .attr("width", param.sdBarColorBarsW)
                .attr("height", param.sdBarColorBarsW);
        baseSvg.selectAll(".sideBarText")
                .attr("x", param.sdBarTextX)
                .attr("y", function(d,i) { return param.sdBarTextY + i*param.sdBarElemH })
                .style("font-size", param.sdBarFontSize);
        baseSvg.selectAll(".sideBarSwitchOn")
                .attr("x", param.sdBarSwitchX)
                .attr("y", function(d,i) { return param.sdBarSwitchY + i*param.sdBarElemH })
                .style("font-size", param.sdBarFontSize);
        baseSvg.selectAll(".sideBarSwitchOff")
                .attr("x", param.sdBarSwitchX)
                .attr("y", function(d,i) { return param.sdBarSwitchY + i*param.sdBarElemH})
                .style("font-size", param.sdBarFontSize);
        baseSvg.selectAll(".sdBarResetButton")
                .attr("x", param.sdBarSwitchX)
                .attr("y", param.sdBarSwitchY + ncol*param.sdBarElemH)
                .style("font-size", param.sdBarFontSize);
        baseSvg.selectAll(".sdBarSortHeading")
                .attr("x", param.sdBarHdX)
                .attr("y", param.sdBarTextY + (ncol+1)*param.sdBarElemH)
                .style("font-size", param.sdBarHdFontSize);
        baseSvg.selectAll(".sideBarElemSortRect")
                .attr("x", param.sdBarElemX)
                .attr("y", function(d,i) { return param.sdBarElemY + (ncol+2)*param.sdBarElemH + i*param.sdBarElemH})
                .attr("width", param.sdBarElemW)
                .attr("height", param.sdBarElemH);
        baseSvg.selectAll(".sdBarSortBox")
                .attr("cx", param.sdBarColorBarsX + param.sdBarColorBarsW*0.5)
                .attr("cy", function(d,i) { return param.sdBarTextY + (ncol+2)*param.sdBarElemH + param.sdBarElemH*i})
                .attr("r", param.sdBarColorBarsW*0.35);
        baseSvg.selectAll(".sdBarSortText")
                .attr("x", param.sdBarTextX)
                .attr("y", function(d,i) { return param.sdBarTextY + (ncol+2)*param.sdBarElemH + param.sdBarElemH*i})
                .style("font-size", param.sdBarFontSize);*/
    }

    function set_left_margin(ymax) {

        if (ymax >= 10000) {
            yaxisFormat = 1;
            left_margin = 55;
        } else {
            yaxisFormat = 0;
            left_margin = (Math.floor(ymax)).toString().length*7 + 30;
        }
    }

    function wrap(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }

    function chart(selection){

        param.ymax = d3.max(sums);
        param.ymin = 0;
        set_left_margin(param.ymax);
        setup_sizes(settings);
        // param.ymin = d3.min(sums) > 1/nticks*2 ? d3.min(sums)-1/nticks*2 : 0;

        xscale = d3.scale.ordinal()
                    .domain(rowNames)
                    .rangeRoundBands([0, plotWidth], 0.1, 0.3);

        yscale = d3.scale.linear()
                    .domain([param.ymin, param.ymax])
                    .nice(nticks)
                    .range([plotHeight, 0]);

        xAxis = d3.svg.axis()
                    .scale(xscale)
                    .orient("bottom");

        yAxis = d3.svg.axis()
                    .scale(yscale)
                    .orient("left")
                    .ticks(nticks)
                    .tickFormat(function(d) {
                        if (yaxisFormat === 0)
                            return settings.prefix + commasFormatter(d);
                        else if (yaxisFormat === 1)
                            return settings.prefix + commasFormatterE(d);
                    });

        // create the bars
        var baseSvg = selection.select("svg");
        var plotArea = baseSvg.append("g")
                        .attr("transform", "translate(" + plotMargin.left + "," + plotMargin.top + ")");

        plotArea.append("g")
                .attr("class", "yaxis")
                .call(yAxis);

        plotArea.append("g")
                .attr("class", "xaxis")
                .attr("transform", "translate(0," + plotHeight + ")")
                .call(xAxis)
                .selectAll(".tick text")
                .call(wrap, xscale.rangeBand());

        param.maxLeafWidth = Math.min(plotMargin.top, Math.floor((xscale.range()[1] - xscale.range()[0])/1.4));
        radialScale = d3.scale.linear()
                        .domain([minVal, maxVal])
                        .range([minLeafWidth, param.maxLeafWidth]);

        for (i = 0; i < rowNames.length; i++) {
            var frondDatum = {};
            var leafData = [];
            for (j = 0; j < colNames.length; j++) {
                leafData.push( [{x:0, y:0},
                                {x:radialScale(normData[i][j])*0.25, y:-radialScale(normData[i][j])*0.07},
                                {x:radialScale(normData[i][j])*0.75, y:-radialScale(normData[i][j])*0.13},
                                {x:radialScale(normData[i][j]), y:0},
                                {x:radialScale(normData[i][j])*0.75, y:radialScale(normData[i][j])*0.13},
                                {x:radialScale(normData[i][j])*0.25, y:radialScale(normData[i][j])*0.07}]);
            }
            frondDatum = {leaves: leafData, name: rowNames[i], value: sums[i], index: i,
                            tip: "s", tipR: d3.mean(normData[i])};
            frondData.push(frondDatum);
        }

        for (i = 0; i < rowNames.length; i++) {
            barData.push({name: rowNames[i], value: sums[i], index: i});
        }

        // vertical bars
        bars = plotArea.selectAll(".g")
                        .data(barData);
        var barsEnter = bars.enter();

        barsEnter.append("rect")
                .attr("class", "bar")
                .attr("x", function(d) { return xscale(d.name) + Math.round(xscale.rangeBand()/2); })
                .attr("width", 1)
                .attr("y", function(d) { return plotHeight; })
                .attr("height", function(d) { return 0; });

        // leaves

        palms = plotArea.selectAll(".g")
                    .data(frondData);

        var palmEnter = palms.enter();
        leaves = palmEnter.append("g")
                    .attr("class", "leaf")
                    .attr("id", function(d) { return "frond" + d.index;})
                    .selectAll("path")
                    .data(function(d) { return d.leaves;});

        leavesEnter = leaves.enter().append("path");

        line = d3.svg.line()
                    .interpolate("cardinal-closed")
                    .x(function(d) { return d.x; })
                    .y(function(d) { return d.y; });
        leavesEnter.attr("d", line);

        plotArea.selectAll(".leaf")
                .attr("transform", function(d) {
                    return "translate(" + (xscale(d.name) + xscale.rangeBand()/2) + "," + plotHeight + ")";
                });

        leaves.attr("transform", function(d,i) {
            return "rotate(" + (i*360/ncol - 90) + ")";
        });

        leaves.style("fill", function(d,i) { return colors[i];});

        //function round(value, decimals) {
        //    return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals);
        //}

        function make_tip_data() {

            var tb_len, k, aligntext, val;
            if (settings.suffix) {tb_len = 4;} else {tb_len = 3;}
            for (i = 0; i < rowNames.length; i++) {
                var atip = "";
                atip = "<table style='margin:0;border-spacing:0px 0;vertical-align:middle;padding:0'>";
                atip = atip + "<th colspan='" + tb_len + "', style='text-align:left'>" + rowNames[i] + "</th>";

                for (j = 0; j < colNames.length; j++) {
                    atip = atip + "<tr>";
                    // val = round(data[i][j],2) >= 0.01? data[i][j].toFixed(2) : 0;
                    val = data[i][j].toFixed(2);
                    if (selectedCol[j] == 1) {
                        atip = atip + "<td style='text-align:center'>";
                        atip = atip + "<div style='width:11px;height:11px;background-color:" + colors[j] + "'></div>" + "</td>";
                        atip = atip + "<td style='text-align:left'>" + colNames[j] + "</td>";

                        atip = atip + "<td style='text-align:right'>" + settings.prefix + val + "</td>";
                        if (settings.suffix) {
                            atip = atip + "<td style='text-align:left'>"+ settings.suffix + "</td>";
                        }
                    } else {
                        atip = atip + "<td style='text-align:center'>";
                        atip = atip + "<div style='width:11px;height:11px;background-color:#ccc'></div>" + "</td>";
                        atip = atip + "<td style='text-align:left'><font color=#ccc>" + colNames[j] + "</font></td>";
                        atip = atip + "<td style='text-align:right'><font color=#ccc>" + settings.prefix + val + "</font></td>";
                        if (settings.suffix) {
                            atip = atip + "<td style='text-align:left'><font color=#ccc>" + settings.suffix + "</font></td>";
                        }
                    }

                    atip = atip + "</tr>";
                }
                atip = atip + "</table>";

                frondData[i].tip = atip;
            }

        }

        // work on tooltip

        if(settings.tooltips){

            make_tip_data();
            tip = d3.tip()
                    .attr('class', 'd3-tip')
                    .html(function(d) { return d.tip; });

            baseSvg.call(tip);

            var tipTriangle = d3.select("body")
                            .append("div")
                            .attr("id", "littleTriangle")
                            .style("visibility", "hidden");

            palmEnter.append("circle")
                    .attr("class", "ghostCircle")
                    .attr("r", function(d) { return radialScale(d.tipR)})
                    .on('mouseover', function(d) {
                        mouse_over_frond(d);
                    })
                    .on('mouseout', function(d) {
                        mouse_out_frond(d);
                    });
        }

        // sort and return sort indices
        function sortWithIndices(toSort, mode) {
            for (var i = 0; i < toSort.length; i++) {
                toSort[i] = [toSort[i], i];
            }
            if (mode === 0) {
                toSort.sort(function(left, right) {
                    return left[0] < right[0] ? -1 : 1;
                });
            } else {
                toSort.sort(function(left, right) {
                    return left[0] < right[0] ? 1 : -1;
                });
            }
            toSort.sortIndices = [];
            for (var j = 0; j < toSort.length; j++) {
                toSort.sortIndices.push(toSort[j][1]);
                toSort[j] = toSort[j][0];
            }
            return toSort.sortIndices;
        }

        // sort using supplied indices
        function sortFromIndices(toSort, indices) {
            var output = [];
            for (var i = 0; i < toSort.length; i++) {
                output.push(toSort[indices[i]]);
            }
            return output;
        }

        // sort bars
        function sortBars() {
            var rowNamesTemp = [];
            var sortfun,sortfun1;
            var sumsTemp = [];
            if (colSort == "0") {
                // as is
                xscale.domain(rowNames);
                sortfun = function(a,b) { return a.index - b.index;};
                sortfun1 = function(a,b) { return a.index - b.index;};

            } else if (colSort == "1") {
                // alphabetical
                for (i = 0; i < rowNames.length; i++) {
                    rowNamesTemp.push(rowNames[i]);
                }
                rindices = sortWithIndices(rowNamesTemp,0);
                xscale.domain(rowNames1);
                sortfun = function(a,b) { return xscale(a.name) - xscale(b.name);};
                sortfun1 = function(a,b) { return xscale(a.name) - xscale(b.name);};


            } else if (colSort == "2") {
                // low to high

                for (i = 0; i < rowNames.length; i++) {
                    sumsTemp.push(sums[i]);
                }
                rindices = sortWithIndices(sumsTemp,0);
                rowNames2 = sortFromIndices(rowNames, rindices);
                xscale.domain(rowNames2);
                sortfun = function(a,b) { return a.value - b.value;};
                sortfun1 = function(a,b) { return a.value - b.value;};

            } else if (colSort == "3") {
                // high to low
                for (i = 0; i < rowNames.length; i++) {
                    sumsTemp.push(sums[i]);
                }
                rindices = sortWithIndices(sumsTemp,1);
                rowNames2 = sortFromIndices(rowNames, rindices);
                xscale.domain(rowNames2);
                sortfun = function(a,b) { return -(a.value - b.value);};
                sortfun1 = function(a,b) { return -(a.value - b.value);};
            }

            plotArea.selectAll(".bar")
                    .sort(sortfun)
                    .transition()
                    .duration(duration)
                    .attr("x", function(d) { return xscale(d.name) + Math.round(xscale.rangeBand()/2); })
                    .attr("y", function(d) { return yscale(d.value); })
                    .attr("height", function(d) { return plotHeight - yscale(d.value); });

            plotArea.select(".xaxis")
                    .transition()
                    .duration(duration)
                    .call(xAxis)
                    .selectAll(".tick text")
                    .call(wrap, xscale.rangeBand());

     /*       plotArea.selectAll(".plotAreaText")
                    .sort(sortfun)
                    .transition()
                    .duration(duration)
                    .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                    .attr("y", function(d) { return yscale(d.value) + radialScale(d.offset); });*/

            plotArea.selectAll(".ghostCircle")
                    .sort(sortfun)
                    .attr("cx", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                    .attr("cy", function(d) { return yscale(d.value); });

            plotArea.selectAll(".leaf")
                    .sort(sortfun1)
                    .transition()
                    .duration(duration)
                    .attr("transform", function(d) {
                        return "translate(" + (xscale(d.name) + xscale.rangeBand()/2) + "," + yscale(d.value) + ")";
                    });
        }

        // update plot when something is clicked
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

            /* for (i = 0; i < rowNames.length; i++) {
                sums[i] = sums[i]/maxSum;
            }*/

            make_tip_data();
            update_data();

            param.ymax = d3.max(sums);
            param.ymin = 0;
            // param.ymin = d3.min(sums) > 1/nticks*2 ? d3.min(sums) - 1/nticks*2 : 0;

            yscale.domain([param.ymin, param.ymax])
                    .nice(nticks)
                    .range([plotHeight, 0]);

            yAxis.scale(yscale);

            plotArea.select(".yaxis")
                    .transition()
                    .duration(duration)
                    .call(yAxis);

            bars.data(barData);
            palms.data(frondData);
            leaves.data(function(d) { return d.leaves;});

            plotArea.select(".plotAreaHeading")
                    .transition()
                    .duration(duration)
                    .attr("y", plotHeight + plotMargin.bottom*0.8);

            /*plotArea.selectAll(".leaf")
                    .transition()
                    .duration(duration)
                    .attr("transform", function(d) {
                        return "translate(" + (xscale(d.name) + xscale.rangeBand()/2) + "," + yscale(d.value) + ")";
                    });*/

            leaves.transition()
                .duration(duration)
                .attr("d", line)
                .style("fill", function(d,i) {
                    return selectedCol[i] === 0 ? "#ccc" : colors[i];
                });

            baseSvg.selectAll(".sideBarColorBox").transition()
                .duration(duration)
                .style("fill", function(d,i) {
                    return selectedCol[i] === 0 ? "#ccc" : colors[i];
                });

            baseSvg.selectAll(".sideBarText").transition()
                .duration(duration)
                .style("fill", function(d,i) {
                    return selectedCol[i] === 0 ? "#ccc" : "#000";
                });

            sortBars();

        }

        // create the side bar
        param.sdBarOuterMargin = 5;
        param.sdBarPadding = 3;
        param.sdBarHdivF = 2;   // ratio of height divided by font size
        param.sdBarMaxTextWidth = 0;
        param.sdBarY = param.sdBarOuterMargin + 0.5;

        param.sdBarMaxWidth = Math.floor(viewerWidth*0.2);
        param.sdBarMaxHeight = Math.floor(viewerHeight - 2*param.sdBarOuterMargin);

        param.sdBarFontSize = 10;
        param.sdBarHdFontSize = param.sdBarFontSize + 2;
        param.sdBarHdH = param.sdBarHdFontSize * param.sdBarHdivF;
        param.sdBarElemH = param.sdBarFontSize * param.sdBarHdivF;
        param.sdBarColorBarsW = param.sdBarElemH - 2*param.sdBarPadding;

        param.sdBarHdY = param.sdBarHdH/2;
        param.sdBarColorBarsY = param.sdBarHdH + param.sdBarPadding;

        var sideBar = baseSvg.append("g");
        // container
        sideBar.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("class", "sideBar");

        var sdBarCtrl = sideBar.append("g")
                                .attr("class", "sdBarControl")
                                .style("display", "none");

        sdBarCtrl.selectAll("option")
                .data([1,2])
                .enter()
                .append("rect")
                .attr("class", "sdBarAllRect")
                .attr("id", function(d,i) { return "sdAC" + i;});

        sdBarCtrl.append("text")
                .attr("class", "sdBarAllOn");
        sdBarCtrl.append("text")
                .attr("class", "sdBarAllOff");

        var sdBarElem = sideBar.selectAll("sdBar.g")
                        .data(colNames);
        var sdBarElemEnter = sdBarElem.enter()
                            .append("g");

        sdBarElemEnter.append("rect")
                    .attr("class","sideBarElemRect")
                    .attr("id", function(d,i) { return "sbRect" + i;});

        sdBarElemEnter.append("rect")
                .attr("class", "sideBarColorBox")
                .attr("id", function(d,i) { return "sbColor" + i;});

        sdBarElemEnter.append("text")
                .attr("class", "sideBarText")
                .attr("id", function(d,i) { return "sbTxt" + i;})
                .attr("dy", "0.35em")
                .text(function(d) { return d;})
                .style("font-size", param.sdBarFontSize + "px")
                //.call(wrap, param.sdBarMaxWidth)
                .each(function(d) {
                    param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), param.sdBarMaxTextWidth);
                });

        sideBar.append("text")
                .attr("class","sdBarHeading");

        param.sdBarWidth = Math.ceil(param.sdBarMaxTextWidth + 3*param.sdBarPadding + param.sdBarColorBarsW);
        param.sdBarHeight = Math.ceil(param.sdBarHdH + colNames.length*param.sdBarElemH);

        // adjusting font size to set width and height
        while (param.sdBarFontSize > 1 &&
            (param.sdBarWidth > param.sdBarMaxWidth || param.sdBarHeight > param.sdBarMaxHeight) ) {

            param.sdBarFontSize = param.sdBarFontSize - 1;
            param.sdBarHdFontSize = param.sdBarFontSize + 2;
            param.sdBarHdH = param.sdBarHdFontSize * param.sdBarHdivF;
            param.sdBarElemH = param.sdBarFontSize * param.sdBarHdivF;
            param.sdBarColorBarsW = param.sdBarElemH - 2*param.sdBarPadding;

            param.sdBarHdY = param.sdBarHdH/2;
            param.sdBarColorBarsY = param.sdBarHdH + param.sdBarPadding;
            param.sdBarMaxTextWidth = 0;

            baseSvg.selectAll(".sideBarText")
                .style("font-size", param.sdBarFontSize + "px")
                .each(function(d) {
                    param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), param.sdBarMaxTextWidth);
                });

            param.sdBarWidth = Math.ceil(param.sdBarMaxTextWidth + 3*param.sdBarPadding + param.sdBarColorBarsW);
            param.sdBarHeight = Math.ceil(param.sdBarHdH + colNames.length*param.sdBarElemH);
        }

        // set X location of legend
        param.sdBarX = viewerWidth - param.sdBarOuterMargin - param.sdBarWidth - 0.5;
        param.sdBarElemW = param.sdBarWidth;

        // set font size on hover
        param.sdBarMenuItems = 4;
        param.sdBarHoverFontSize = param.sdBarFontSize;
        param.sdBarHoverElemH = param.sdBarElemH;
        param.sdBarHoverHeight = param.sdBarHeight;
        while (param.sdBarHoverFontSize > 1 &&
            (param.sdBarHoverHeight + param.sdBarHoverElemH*(param.sdBarMenuItems+2) > viewerHeight - 2*param.sdBarY)) {

            param.sdBarHoverFontSize = param.sdBarHoverFontSize - 1;
            param.sdBarHoverHdFontSize = param.sdBarHoverFontSize + 2;
            param.sdBarHoverElemH = param.sdBarHoverFontSize * param.sdBarHdivF;
            param.sdBarHoverColorBarsW = param.sdBarHoverElemH - 2*param.sdBarPadding;

            param.sdBarHoverColorBarsY = param.sdBarHdH + param.sdBarPadding;
            param.sdBarHoverHeight = Math.ceil(param.sdBarHdH + colNames.length*param.sdBarHoverElemH);
        }

        // transform the object into position
        sideBar.attr("transform", "translate(" + param.sdBarX + "," + param.sdBarY + ")");
        baseSvg.select(".sideBar")
                .attr("width",param.sdBarWidth + "px")
                .attr("height",param.sdBarHeight + "px");

        // column names
        baseSvg.selectAll(".sideBarText")
                .attr("x", 2*param.sdBarPadding + param.sdBarColorBarsW)
                .attr("y", function(d,i) {
                    return param.sdBarHdH + i*param.sdBarElemH + param.sdBarElemH/2;
                });
        // heading
        baseSvg.select(".sdBarHeading")
                .attr("x", param.sdBarPadding)
                .attr("y", param.sdBarHdY)
                .attr("dy", "0.35em")
                .text(settings.colHeading)
                .style("font-size", param.sdBarHdFontSize )
                .style("font-size", function(d) {
                    var L = param.sdBarElemW - 2*param.sdBarPadding;
                    if (this.getComputedTextLength() > L)
                        return (L/settings.colHeading.length*1.4) + "px";
                    else
                        return param.sdBarHdFontSize + "px";
                });

        // column colors
        baseSvg.selectAll(".sideBarColorBox")
                .attr("x", param.sdBarPadding + 0.5)
                .attr("y", function(d,i) { return param.sdBarColorBarsY + i*param.sdBarElemH + 0.5})
                .attr("width", param.sdBarColorBarsW - 1)
                .attr("height", param.sdBarColorBarsW - 1)
                .style("fill", function(d,i) { return colors[i];});

        function toggleColumn() {
            if (d3.event.defaultPrevented) return; // click suppressed

            var index = Number(this.id.substring(6));
            if (selectedCol[index] === 0) {
                selectedCol[index] = 1;
            } else {
                selectedCol[index] = 0;
            }
            updatePlot(duration);
            d3.event.stopPropagation();
        }


        baseSvg.selectAll(".sideBarElemRect")
                .attr("x", 0)
                .attr("y", function(d,i) {
                    return param.sdBarHdH + i*param.sdBarElemH;
                })
                .attr("width", param.sdBarElemW + "px")
                .attr("height", param.sdBarElemH + "px")
                .on("mouseover", function() {
                    d3.select(this).style("fill", "#eee");
                    d3.event.stopPropagation();
                })
                .on("mouseout", function() {
                    d3.select(this).style("fill", "white");
                    d3.event.stopPropagation();
                })
                .on("click", toggleColumn);


        function clickAllToggle() {
            if (d3.event.defaultPrevented) return; // click suppressed
            if (this.id.substring(4) == "0") {
                selectedCol.forEach(function(d,i) {
                    selectedCol[i] = 1;
                });
            } else {
                selectedCol.forEach(function(d,i) {
                    selectedCol[i] = 0;
                });
            }
            updatePlot(duration);
            d3.event.stopPropagation();
        }


        baseSvg.selectAll(".sdBarAllRect")
                .attr("x", function(d,i) { return i === 0 ? 0 : Math.floor(param.sdBarElemW/2)})
                .attr("y", param.sdBarHdH)
                .attr("width", function(d,i) { return i === 0 ? Math.floor(param.sdBarElemW/2) : Math.ceil(param.sdBarElemW/2);})
                .attr("height", param.sdBarHoverElemH)
                .on("mouseover", function() {
                    d3.select(this).style("fill", "#eee");
                    d3.event.stopPropagation();
                })
                .on("mouseout", function() {
                    d3.select(this).style("fill", "white");
                    d3.event.stopPropagation();
                })
                .on("click", clickAllToggle);

        var ctrlText = "All On All Off";
        param.sdBarResetFontSize = param.sdBarHoverFontSize;
        sdBarCtrl.append("text")
                .text(ctrlText)
                .style("font-size", param.sdBarResetFontSize )
                .each(function(d) {
                    var L = param.sdBarElemW - 2*param.sdBarPadding;
                    if (this.getComputedTextLength() > L)
                        param.sdBarResetFontSize = (L/ctrlText.length*1.4);
                    else
                        param.sdBarResetFontSize = param.sdBarHoverFontSize;
                })
                .remove();

        baseSvg.select(".sdBarAllOn")
                .attr("x", param.sdBarElemW/4)
                .attr("y", param.sdBarHdH + param.sdBarHoverElemH/2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .text("All On")
                .style("font-size", param.sdBarResetFontSize + "px");

        baseSvg.select(".sdBarAllOff")
                .attr("x", param.sdBarElemW*3/4)
                .attr("y", param.sdBarHdH + param.sdBarHoverElemH/2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .text("All Off")
                .style("font-size", param.sdBarResetFontSize + "px");

        sideBar.on("mouseenter", function() {
                    if (param.sdBarFontSize > 1 &&
                        (param.sdBarHeight + param.sdBarElemH*(param.sdBarMenuItems+2) > viewerHeight - 2*param.sdBarY)) {

                        baseSvg.selectAll(".sideBarElemRect")
                        .transition()
                        .duration(300)
                        .attr("y", function(d,i) {
                            return param.sdBarHdH + i*param.sdBarHoverElemH;
                        })
                        .attr("height", param.sdBarHoverElemH + "px");

                        baseSvg.selectAll(".sideBarColorBox")
                        .transition()
                        .duration(300)
                        .attr("y", function(d,i) { return param.sdBarHoverColorBarsY + i*param.sdBarHoverElemH + 0.5; })
                        .attr("width", param.sdBarHoverColorBarsW - 1)
                        .attr("height", param.sdBarHoverColorBarsW - 1);

                        baseSvg.selectAll(".sideBarText")
                        .transition()
                        .duration(300)
                        .attr("x", 2*param.sdBarPadding + param.sdBarHoverColorBarsW)
                        .attr("y", function(d,i) {
                            return param.sdBarHdH + i*param.sdBarHoverElemH + param.sdBarHoverElemH/2;
                        })
                        .style("font-size", param.sdBarHoverFontSize + "px");

                        baseSvg.select(".sideBar")
                        .transition()
                        .duration(300)
                        .attr("height", param.sdBarHoverHeight + param.sdBarHoverElemH*6);

                        baseSvg.select(".sdBarControl")
                        .transition()
                        .duration(500)
                        .style("display", "inline")
                        .attr("transform", "translate(" + 0 + "," + ncol*param.sdBarHoverElemH + ")");

                    } else {
                        baseSvg.select(".sideBar")
                        .transition()
                        .duration(300)
                        .attr("height", param.sdBarHeight + param.sdBarHoverElemH*6);

                        baseSvg.select(".sdBarControl")
                        .transition()
                        .duration(500)
                        .attr("transform", "translate(" + 0 + "," + ncol*param.sdBarElemH + ")")
                        .style("display", "inline");
                    }

                })
                .on("mouseleave", function() {
                    if (param.sdBarFontSize > 1 &&
                        (param.sdBarHeight + param.sdBarElemH*(param.sdBarMenuItems+2) > viewerHeight - 2*param.sdBarY)) {

                        baseSvg.selectAll(".sideBarElemRect")
                        .transition()
                        .duration(300)
                        .attr("y", function(d,i) {
                            return param.sdBarHdH + i*param.sdBarElemH;
                        })
                        .attr("height", param.sdBarElemH + "px");

                        baseSvg.selectAll(".sideBarColorBox")
                        .transition()
                        .duration(300)
                        .attr("y", function(d,i) { return param.sdBarColorBarsY + i*param.sdBarElemH + 0.5})
                        .attr("width", param.sdBarColorBarsW - 1)
                        .attr("height", param.sdBarColorBarsW - 1);

                        baseSvg.selectAll(".sideBarText")
                        .transition()
                        .duration(300)
                        .attr("x", 2*param.sdBarPadding + param.sdBarColorBarsW)
                        .attr("y", function(d,i) {
                            return param.sdBarHdH + i*param.sdBarElemH + param.sdBarElemH/2
                        })
                        .style("font-size", param.sdBarFontSize + "px");

                    }

                    baseSvg.select(".sdBarControl")
                    .transition()
                    .duration(500)
                    .style("display", "none")
                    .attr("transform", "translate(" + 0 + "," + 0 + ")");

                    baseSvg.select(".sideBar")
                    .transition()
                    .duration(300)
                    .attr("height", param.sdBarHeight);
                });

        // column names
/*



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

        var sdBarReset = sideBar.append("g");

        var sdBarResetText = sdBarReset.append("text")
                                .attr("class", "sdBarResetButton")
                                .attr("x", param.sdBarSwitchX)
                                .attr("y", param.sdBarSwitchY + ncol*param.sdBarElemH)
                                .attr("dy", "0.35em")
                                .attr("text-anchor", "end")
                                .text("All On")
                                .style("font-size", param.sdBarFontSize)
                                .on("click", clickReset);

        // Sort control
        var sortText = ["Default", "Alphabetical", "Lowest to Highest", "Highest to Lowest"];
        var sdBarSort = sideBar.append("g");

        sdBarSort.append("text")
                    .attr("class", "sdBarSortHeading")
                    .attr("x", param.sdBarHdX)
                    .attr("y", param.sdBarTextY + (ncol+1)*param.sdBarElemH)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "start")
                    .text("Sort")
                    .style("font-size", param.sdBarHdFontSize);

        var sdBarSortEnter = sdBarSort.selectAll("g.span")
                        .data(sortText)
                        .enter()
                        .append("g")
                        .attr("id", function(d,i) { return "s" + i;});

        sdBarSortEnter.append("rect")
                        .classed("sideBarElemSortRect",true)
                        .attr("x", param.sdBarElemX)
                        .attr("y", function(d,i) { return param.sdBarElemY + (ncol+2)*param.sdBarElemH + i*param.sdBarElemH})
                        .attr("width", param.sdBarElemW)
                        .attr("height", param.sdBarElemH);

        sdBarSortEnter.append("circle")
                        .attr("class","sdBarSortBox")
                        .attr("id", function(d,i) { return "sortC" + i;})
                        .attr("cx", param.sdBarColorBarsX + param.sdBarColorBarsW*0.5)
                        .attr("cy", function(d,i) { return param.sdBarTextY + (ncol+2)*param.sdBarElemH + param.sdBarElemH*i})
                        .attr("r", param.sdBarColorBarsW*0.35)
                        .style("fill", "#fff");

        sdBarSortEnter.append("text")
                    .attr("class", "sdBarSortText")
                    .attr("id", function(d,i) { return "sortT" + i;})
                    .attr("x", param.sdBarTextX)
                    .attr("y", function(d,i) { return param.sdBarTextY + (ncol+2)*param.sdBarElemH + param.sdBarElemH*i})
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "start")
                    .text(function(d) {return d;})
                    .style("font-size", param.sdBarFontSize);

        sdBarSort.select("#sortC0").style("fill", "steelblue").style("stroke","steelblue");
        sdBarSort.select("#sortT0").style("fill", "#000");
        sdBarSort.selectAll("g").on("click", clickSort);*/


        // additional stuff
        var rowNames1 = [];
        var rowNames2 = [];
        for (i = 0; i < rowNames.length; i++) {
            rowNames1.push(rowNames[i]);
        }
        rowNames1.sort();

        /*var texts = plotArea.selectAll(".gt")
                    .data(textData);

        var textsEnter = texts.enter();
        textsEnter.append("text")
                .attr("class", "plotAreaText")
                .attr("x", function(d) { return xscale(d.name) + xscale.rangeBand()/2; })
                .attr("y", function(d) { return plotHeight; })
                .text(function(d) { return d.name;});*/

        plotArea.append("text")
                .attr("class", "plotAreaHeading")
                .attr("x", plotWidth/2)
                .attr("y", viewerHeight)
                .text(settings.rowHeading);

        if (settings.prefix || settings.suffix) {
            if (!settings.suffix) {
                plotArea.append("text")
                    .attr("class", "suffixText")
                    .text(settings.prefix);
            } else {
                plotArea.append("text")
                    .attr("class", "suffixText")
                    .text(settings.suffix);
            }
            update_unit_position();
        }

        updatePlot(duration);

    };

    // settings getter/setter
    chart.data = function(value) {
        if (!arguments.length) return data;
        data = value;

        for (i = 0; i < colNames.length; i++) {
            selectedCol.push(1);
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
            // sums[i] = sums[i]/maxSum;
            tempNorm = [];
            for (j = 0; j < colNames.length; j++) {
                tempNorm.push(data[i][j]/maxSum);
            }
            normData.push(tempNorm);
            maxVal = Math.max(d3.max(normData[i]), maxVal);
            minVal = Math.min(d3.min(normData[i]), minVal);
        }
        return chart;
    };

    // settings getter/setter
    chart.settings = function(value) {
        if (!arguments.length) return settings;

        settings = value;
        colNames = settings.colNames;
        rowNames = settings.rowNames;
        weights = settings.weights;
        ncol = settings.colNames.length;
        colors = settings.colors;

        if (!colors) {
            colors = setup_colors();
        }

        param.sdBarMaxTxtL = 0;
        for (i = 0; i < colNames.length; i++) {
            param.sdBarMaxTxtL = Math.max(param.sdBarMaxTxtL, colNames[i].length);
        }


        return chart;
    };

    // resize
    chart.resize = function(el) {
        resize_chart(el);
    };

    chart.width = function(value) {
        // width getter/setter
        if (!arguments.length) return width;
        viewerWidth = value;
        return chart;
    };

    // height getter/setter
    chart.height = function(value) {
        if (!arguments.length) return height;
        viewerHeight = value;
        return chart;
    };

    return chart;
}


HTMLWidgets.widget({

    name: "PalmTreePlot",

    type: "output",

    initialize: function(el, width, height) {

        d3.select(el)
            .append("svg")
            .attr("class", "svgContent")
            .attr("width", width)
            .attr("height", height);

        return PalmPlot().width(width).height(height);
    },

    resize: function(el, width, height, instance) {

        d3.select(el).select("svg")
            .attr("width", width)
            .attr("height", height);

        return instance.width(width).height(height).resize(el);
    },

    renderValue: function(el, x, instance) {

        instance = instance.settings(x.settings);
        instance = instance.data(x.data);

        d3.select(el).call(instance);

    }
});
