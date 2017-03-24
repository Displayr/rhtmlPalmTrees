HTMLWidgets.widget({

    name: "rhtmlPalmTrees",

    type: "output",

    factory: function(el, width, height, stateChanged) {

        var w = width < 200 ? 200 : width,
            h = height < 100 ? 100 : height;

        d3.select(el).append("svg")
            .attr("class", "svgContent")
            .attr("width", w)
            .attr("height", h);

        // an empty instance of the PalmPlot object with width and height initialized
        var palm = new PalmTrees().width(w).height(h).stateSaver(stateChanged);

        return {

            renderValue: function(x, state) {
                palm = palm.reset();
                palm = palm.settings(x.settings);
                palm = palm.data(x.data);
                if (state) {
                    if (palm.checkState(state)) {
                        palm.restoreState(state);
                    } else {
                        palm.resetState();
                    }
                }
                d3.select(el).selectAll('g').remove();
                d3.select(el).call(palm);
            },

            resize: function(width, height) {
                return palm.width(width).height(height).resize(el);
            },

            palm: palm

        };
    }
});

