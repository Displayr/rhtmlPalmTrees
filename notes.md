## Concerns / TODOs

* Refactor: the CSS classes leaf vs front vs palmtree etc need to be cleaned up, and a readme note needs to be added that defines terminology
  ** palmTreePlot.js -> still referencing old sort classes, and toggle all on/off old classes
* Refactor: More use of functions to clean up the main draw() and resize() code. Try to reuse more accross resize() and updatePlot(). Break updatePlot() into more modular units  
* BUG TO JIRA: when two palmtree on same page, 1 row, 2 col, second suffix text does not get x=-20 y=-20 causing the % to sit in wrong spot
* BUG TO JIRA: bug: when there is only one row the leafs do not render
* TODO BDD: test north / east / west tooltips (only south is tested)
* TODO BDD: test multiple calls to renderValue
* TODO BDD: test that when i disable a frond, the sort order sometimes changes
* Concern: extensive use of inaccurate math to determine text sizes when doing layout:
** example : this.leftMargin = ((Math.floor(this.param.ymax)).toString().length + this.settings.ydigits) * 7 + 25
* Refactor: plotWidth and plotHeight appear to be computed fields
* Refactor: this.minVal and this.maxVal are terrible names
* Refactor: this.linearRadialScale does not imply what it is used for
* Refactor: selectColumns should be a boolean
* Refactor : barData : can I just use frondData ?
* To Test : handling R "na" do they result in a "No data" in the tooltip 

NB line by line review you are here : PalmTrees.js : resize (line 256), Sidebar needs review too

## Overview
