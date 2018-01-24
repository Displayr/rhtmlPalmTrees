## Concerns / Questions

* why data and settings.rawData ?
* when two palmtree on same page, 1 row, 2 col, second suffix text does not get x=-20 y=-20 causing the % to sit in wrong spot
* where does getComputedTextLength() come from ?
* stateChanged is not being passed to PalmTrees


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