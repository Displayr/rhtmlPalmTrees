HTMLWidgets.widget({

  name: "palmtree",

  type: "output",

  initialize: function(el, width, height) {

  },

  renderValue: function(el, x, instance) {
        var data = x.data;
        var settings = x.settings;
        var colNames = settings.colNames;
        var rowNames = settings.rowNames;
        var weights = [];
        var sdBarMaxTxtL = 0;

        for (var i = 0; i < colNames.length; i++) {
            weights.push(1);
            sdBarMaxTxtL = Math.max(sdBarMaxTxtL, colNames[i].length);
        }

        var viewerWidth = el.getBoundingClientRect().width;
        var viewerHeight = el.getBoundingClientRect().height;

        var baseSvg = d3.select(el)
                        .append("svg")
                        .classed("svgContent", true)
                        .attr("width", "100%")
                        .attr("height", "100%");

        var plotArea = baseSvg.append("g");
        var sideBar = baseSvg.append("g");

        // make the side bar
        var sdBarWidth = viewerWidth*0.2;
        var sdBarHeight = viewerHeight;
        var sdBarX = viewerWidth - sdBarWidth;
        var sdBarY = 0;

        sideBar.append("rect")
                .attr("x", sdBarX)
                .attr("y", sdBarY)
                .attr("rx", 5)
                .attr("ry", 5)
                .attr("width",sdBarWidth)
                .attr("height",sdBarHeight)
                .classed("sideBar", true);

        var sdBarElem = sideBar.selectAll("sdBar.g")
                                .data(colNames);

        var sdBarElemEnter = sdBarElem.enter()
                                    .append("g");

        var sdBarElemMargin = 3;
        var sdBarTextPadding = 3;
        var sdBarElemW = sdBarWidth - 2*sdBarElemMargin;
        var fontSize = sdBarElemW/sdBarMaxTxtL;
        var sdBarElemH = fontSize * 2;

        sdBarElemEnter.append("rect")
                        .classed("sideBarElemRect",true)
                        .attr("x", sdBarX + sdBarElemMargin)
                        .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + i*sdBarElemH})
                        .attr("width", sdBarElemW)
                        .attr("height", sdBarElemH);

        var sdBarText = sdBarElemEnter.append("text")
                                        .classed("sideBarText",true)
                                        .attr("x", sdBarX + sdBarElemMargin + sdBarTextPadding)
                                        .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + i*sdBarElemH + sdBarElemH/2})
                                        .attr("dy", "0.35em")
                                        .text(function(d) { return d;})
                                        .style("font-size", fontSize)
                                        .style("cursor", "default");

        function clickText() {
            if (d3.event.defaultPrevented) return; // click suppressed
            d3.select(this).style("display", "none");
            var selector = "#c" + this.id.substring(1);
            sideBar.select(selector).style("display", "inline");
        }

        function clickHiddenText() {
            if (d3.event.defaultPrevented) return; // click suppressed
            d3.select(this).style("display", "none");
            var selector = "#t" + this.id.substring(1);
            sideBar.select(selector).style("display", "inline");
        }

        var sdBarSwitchOn = sdBarElemEnter.append("text")
                                            .attr("id", function(d,i) { return "t" + i;})
                                            .attr("x", sdBarX + sdBarWidth - sdBarElemMargin - sdBarTextPadding)
                                            .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + i*sdBarElemH + sdBarElemH/2})
                                            .attr("dy", "0.35em")
                                            .attr("text-anchor", "end")
                                            .text("ON")
                                            .classed("sideBarText",true)
                                            .style("font-size", fontSize)
                                            .style("cursor", "pointer")
                                            .on("click", clickText);

        var sdBarSwitchOff = sdBarElemEnter.append("text")
                                            .attr("id", function(d,i) { return "c" + i;})
                                            .attr("x", sdBarX + sdBarWidth - sdBarElemMargin - sdBarTextPadding)
                                            .attr("y", function(d,i) { return sdBarY + sdBarElemMargin + i*sdBarElemH + sdBarElemH/2})
                                            .attr("dy", "0.35em")
                                            .attr("text-anchor", "end")
                                            .text("OFF")
                                            .classed("sideBarText",true)
                                            .style("font-size", fontSize)
                                            .style("display", "none")
                                            .style("cursor", "pointer")
                                            .on("click", clickHiddenText);

  },

  resize: function(el, width, height, instance) {

  }
});
