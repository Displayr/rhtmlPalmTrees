## Concerns / Questions

* Question: How many palmtree configs are in the field ?
  ** Can I change up the config much ?
* Question: what does this.settings.ylab
* Question: why data and settings.rawData ? Can I delete this ?
* TO JIRA: turning on settings.ylab breaks things
* TO JIRA: when two palmtree on same page, 1 row, 2 col, second suffix text does not get x=-20 y=-20 causing the % to sit in wrong spot
* TO JIRA: all widgets must be defensive against stateChanged is not being passed to PalmTrees
* TO JIRA: bug: when one row the leafs do not render
* TODO BDD: test north / east / west tooltips (only southe is tested)
* TODO BDD: test multiple calls to renderValue
* TODO BDD: test multiple calls to resize
* TODO BDD/CSS: the class "leaf" refers to the top of the palm tree. maybe "treeTops" ?
* Concern: extensive use of inaccurate math to determine text sizes when doing layout:
** example : this.leftMargin = ((Math.floor(this.param.ymax)).toString().length + this.settings.ydigits) * 7 + 25
* Refactor: plotWidth and plotHeight appear to be computed fields
* Refactor: this.minVal and this.maxVal are terrible names
* Refactor: this.linearRadialScale does not imply what it is used for
* Refactor: the compute leafData code
    * in initialDraw, updateData, mouseOverFrond, mouseOutFrond
* Refactor: selectCol should be a boolean
* Refactor: makeTipData is poorly done - generating HTML in JS, massive if else fn

## Overview

## Code Path

From the `chart` function called in factory.js:

* 

### Factory initialisation:

    let palm = new PalmTrees().width(w).height(h).stateSaver(stateChanged)
   
This calls the constructor. The constructor is responsible for:
    
 * creates a lot of private (via closure) variables and functions
 * then registers a series of methods on a function/object called chart
 * returns chart object as the new instance of PalmTrees 

Interestingly the PalTrees class returns another JS object called chart which is both a function and an object. This serves as the class instance. 

### Factory renderValue call:

In the code below `palm` is the `chart` instance returned by the PalmTrees constructor

    palm = palm.reset()
    palm = palm.settings(x.settings)
    palm = palm.data(x.data)
    d3.select(el).call(palm)


In factory.js when we pass chart to d3 (via `d3.select(el).call(palm)`) we are invoking the chart function defined in PalmTrees (i.e. `function chart(chartWindowSelection) ...`).

## Main Data Structures and Modules

## Relevent Config Options To Test

* barHeights

## Relevent User State To Test

### what does updateSidebar do ?


### What does PalTrees.draw() do

/* (line 1191 ) start fn */

* initialise this.line to an SVG line factory
* initialise the side bar parameters via call to this.initSidebarParams
  **


* create basic SVG layout
  * g_plotArea
  * g_sideBar
    * g_sdBarControl
    * g_sideBarDisp
    
* lots of initialisation of sidebar SVG elements 
* call this.updateSideBar(baseSvg)
  **      
* register mouse interaction handlers for sidebar
 ** mouse in, mouse out, click on sideBarElemRect -> toggleColumn
 ** mouse in, mouse out, click on sideBarAll (both all or none) -> clickAllToggle
 ** mouse in, mouse out, click con sideBarElemSortRect -> clickSort   
    
    
/* (line 1439 ) main plot area */

* compute y axis margin calcs, setting the:
 ** this.yaxisFormat
 ** this.leftMargin

* compute bar heights / prefix calcs (?), setting the: 
 ** this.leftMargin (adds prefix length to the lefttMargin)

sets plotMargin[top,right,bottom,left] and plotWidth and plotHeight

* compute leaf and front Data, updating
 ** this.linearRadialScale
 ** this.frondData
 
* compute barData, updating
 ** this.barData
 
/* line 1565 - stop drawing stuff / start drawing stuff */

start drawing things

/* line 1687 - makeTipData */

start making tip data
  * makeTipData produced base HTML for each palmtree
  * makeLeafTipeData produces custom HTML for when a specific leaf is selected
  
/* line 1938 - sort and return indices

poorly implemented sorting code 

/* line 2055 - update plot when something is clicked

* define updatePlot, which calls makeTipData, makeLeafTipData, this.updateData, and sortBars