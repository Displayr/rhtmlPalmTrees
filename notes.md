## Concerns / Questions

* why data and settings.rawData ?
* when two palmtree on same page, 1 row, 2 col, second suffix text does not get x=-20 y=-20 causing the % to sit in wrong spot



## Overview

## Code Path

From the `chart` function called in factory.js:

* 

Factory calls:

    let palm = new PalmTrees().width(w).height(h).stateSaver(stateChanged)
    
then in render:

    palm = palm.reset()
    palm = palm.settings(x.settings)
    palm = palm.data(x.data)
    d3.select(el).call(palm)

The constructor is responsible for:
    
creates a lot of private (via closure) variables and functions, then registers a series of methods on a function/object called chart.

Interestingly the PalTrees class returns another JS object called chart which is both a function and an object. This serves as the class instance. 

In factory.js when we pass chart to d3 (via `d3.select(el).call(palm)`) we are invoking the chart function defined in PalmTrees (i.e. `function chart(chartWindowSelection) ...`).

The class instance (internally called chart) has the following methods:

* reset: resets a bunch of internal arrays 
* data: getter/setter for data. Does some formatting 
* settings: getter/setter for settings. Does some formatting 
* checkState:  
* resetState:  
* restoreState:  
* stateSaver:  
* resize:  
* width: simple getter/setter 
* height: simple getter/setter

## Main Data Structures and Modules

## Relevent Config Options To Test

## Relevent User State To Test