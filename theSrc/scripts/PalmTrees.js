import $ from 'jquery'
import _ from 'lodash'
import d3 from 'd3'
import * as log from 'loglevel'

import PlotState from './PlotState'
import PlotArea from './components/plotArea'
import Sidebar from './components/sidebar'
import XAxis from './components/xAxis'
import YAxis from './components/yAxis'
import YTitle from './components/yTItle'
import Title from './components/title'

import buildConfig from './buildConfig'
import { Layout, CellNames } from './layout'

log.setLevel('info') // NB default, adjusted later in initLogger
// log.setLevel('debug') // NB default, adjusted later in initLogger

class PalmTrees {
  static uniqueId () {
    return this._palmTreeInstanceCounter++
  }

  static initClass () {
    this._palmTreeInstanceCounter = 0
  }

  constructor () {
    log.info('PalmTree.constructor()')
    this.palmTreeId = PalmTrees.uniqueId()
    this.init()
  }

  static getLoggerNames () {
    return ['tooltip', 'sidebar', 'plotarea']
  }

  static defaultState () {
    return _.cloneDeep({
      selectedColumns: [],
      sortBy: 'descending',
      data: []
    })
  }

  init () {
    log.info('PalmTree.init()')
    this.components = {}
    this.plotState = new PlotState(PalmTrees.defaultState())
    this.data = []
    this.settings = {}
    this.param = {}
    this.normalizedData = [] // 2D array of values range [0-1]
    this.normalizedDataMax = 0
    this.normalizedDataMin = 1
    this.unweightedSums = []
    this.weightedSums = []
    this.rindices = null
    this.duration = 600
    this.nticks = 10
    this.colNames = null
    this.rowNames = null
    this.weights = null
    this.colors = null
    this.palmTreeCount = null
    this.dataMax = 0
    this.dataMin = 100000000
  }

  reset () {
    log.info('PalmTree.reset()')
    this.removeOrphanedTooltips()
    this.init()
  }

  // NB seeing orphaned tips in Displayr caused by stateUpdate->renderValue issue (see VIS-393)
  removeOrphanedTooltips () {
    $(`.d3-tip-palmtree-${this.palmTreeId}`).remove()
    $('#littleTriangle').remove()
  }

  // dataPoints is 2D Array
  setData (dataPoints) {
    // NB in the R layer we replace all null values with zero
    // but we preserve the null/NA values in rawData
    if (!this.settings.rawData) {
      this.settings.rawData = _.cloneDeep(dataPoints)
    }
    this.data = _.cloneDeep(dataPoints)

    _.range(this.palmTreeCount).map(palmTreeIndex => {
      this.weightedSums[palmTreeIndex] = _.sum(dataPoints[palmTreeIndex].map((val, frondIndex) => val * this.weights[frondIndex]))
      this.unweightedSums[palmTreeIndex] = _.sum(dataPoints[palmTreeIndex])
    })
    let maxSum = d3.max(this.unweightedSums)

    this.normalizedData = dataPoints.map(frondValues => {
      return frondValues.map(frondValue => {
        const normalizedValue = Math.sqrt(frondValue / maxSum)
        this.dataMax = Math.max(this.dataMax, frondValue)
        this.dataMin = Math.min(this.dataMin, frondValue)
        this.normalizedDataMax = Math.max(normalizedValue, this.normalizedDataMax)
        this.normalizedDataMin = Math.min(normalizedValue, this.normalizedDataMin)
        return normalizedValue
      })
    })

    this.rindices = d3.range(this.rowNames.length)

    return this
  }

  setConfig (value) {
    this.settings = buildConfig(value, 600, 600)

    this.initLogger(this.settings.logger || this.settings.log)
    this.colNames = this.settings.colNames
    this.rowNames = this.settings.rowNames
    this.weights = this.settings.weights
    this.colors = this.settings.colors

    this.palmTreeCount = this.settings.rowNames.length
    this.frondCount = this.settings.colNames.length

    if (!this.colors) {
      this.colors = this.setupColors()
    }

    return this
  }

  // set up default this.colors
  setupColors () {
    let _tempCol = d3.scale.category20().range()
    if (this.colNames.length > _tempCol.length) {
      let _l = _tempCol.length
      for (let i = 0; i < this.colNames.length - _l; i++) {
        _tempCol.push(_tempCol[i])
      }
    }
    return _tempCol
  }

  initLogger (loggerSettings) {
    if (_.isNull(loggerSettings)) {
      return
    }
    if (_.isString(loggerSettings)) {
      log.setLevel(loggerSettings)
      _(PalmTrees.getLoggerNames()).each((loggerName) => {
        log.getLogger(loggerName).setLevel(loggerSettings)
      })
      return
    }
    _(loggerSettings).each((loggerLevel, loggerName) => {
      if (loggerName === 'default') {
        log.setLevel(loggerLevel)
      } else {
        log.getLogger(loggerName).setLevel(loggerLevel)
      }
    })
  }

  checkState (previousUserState) {
    const previousData = _.get(previousUserState, 'data')
    const stateIsValid = !_.isNull(previousUserState) &&
      _.isEqual(previousData, this.data) &&
      _.has(previousUserState, 'sortBy') &&
      _.has(previousUserState, 'selectedColumns')
    log.info(`PalmTree.checkState() returning ${stateIsValid}`)
    return stateIsValid
  }

  resetState () {
    log.info('PalmTree.resetState()')
    const selectedColumns = new Array(this.data[0].length) // want num columns, not num rows
    selectedColumns.fill(1)
    this.plotState.setState({
      data: this.data,
      sortBy: this.settings.order,
      selectedColumns
    })
    return this
  }

  restoreState (previousUserState) {
    log.info('PalmTree.restoreState()')
    this.plotState.initialiseState(previousUserState)
  }

  saveStateChangedCallback (stateChanged) {
    // this.saveStatesFn = stateChanged
    this.deregisterExternalStateListenerFn = this.plotState.addListener(stateChanged)
  }

  registerInternalListeners () {
    this.plotState.addListener((newState) => {
      this.updatePlot(false)
    })
  }

  // resize
  resize (rootElement) {
    log.info('PalmTree.resize()')

    const {width, height} = getContainerDimensions(_.has(rootElement, 'length') ? rootElement[0] : rootElement)
    this.viewerWidth = width
    this.viewerHeight = height

    throw new Error('resize not implemented')
  }

  // update side bar content on initialization and resize
  draw (rootElement) {
    log.info('PalmTree.draw()')

    const {width, height} = getContainerDimensions(_.has(rootElement, 'length') ? rootElement[0] : rootElement)
    this.viewerWidth = width
    this.viewerHeight = height

    let baseSvg = d3.select(rootElement).append('svg')
      .attr('class', 'svgContent')
      .attr('width', width)
      .attr('height', height)

    this.baseSvg = baseSvg

    this.param.ymax = d3.max(this.weightedSums)
    this.param.ymin = 0

    this.buildLayout()
    this.wireupController()

    const simpleCells = _.omit(CellNames, [CellNames.PLOT, CellNames.YAXIS])
    _(simpleCells).each(cellName => {
      if (this.layout.enabled(cellName)) {
        this.components[cellName].draw(this.layout.getCellBounds(cellName))
      }
    })

    this.components[CellNames.PLOT].setParam(this.param)
    this.components[CellNames.PLOT].draw(this.layout.getCellBounds(CellNames.PLOT))

    if (this.layout.enabled(CellNames.YAXIS)) {
      this.components[CellNames.YAXIS].setmaxLeafSize(this.components[CellNames.PLOT].maxLeafSize)
      this.components[CellNames.YAXIS].setParam(this.param)
      this.components[CellNames.YAXIS].draw(this.layout.getCellBounds(CellNames.YAXIS))
    }

    // start old stuff

    /* stop computing stuff / start drawing stuff */

    this.updatePlot(true)
  }

  updatePlot (initialization) {
    log.info('PalmTree.updatePlot()')

    // TODO this is repeated in updatePlot and in constructor
    for (let i = 0; i < this.rowNames.length; i++) {
      this.unweightedSums[i] = 0
      this.weightedSums[i] = 0
      for (let j = 0; j < this.colNames.length; j++) {
        this.unweightedSums[i] += this.plotState.isColumnOn(j) * this.data[i][j]
        this.weightedSums[i] += this.plotState.isColumnOn(j) * this.weights[j] * this.data[i][j]
      }
    }

    this.param.ymax = d3.max(this.weightedSums)
    this.param.ymin = 0

    this.components[CellNames.PLOT].setParam(this.param)
    this.components[CellNames.YAXIS].setParam(this.param)

    this.components[CellNames.PLOT].updatePlot(initialization, this.weightedSums)
    this.components[CellNames.YAXIS].updatePlot(initialization)
    this.components[CellNames.SIDEBAR].updatePlot(initialization)
  }

  sortBars (initialization) {
    log.info('PalmTree.sortBars()')
    const _this = this
    const plotArea = this.plotArea

    const sortStrategy = this.plotState.getState().sortBy || 'descending' // pull from config
    let rowNamesTemp = []
    let sortfun = null
    let sumsTemp = []

    // additional stuff
    let rowNames1 = _.clone(this.rowNames)
    rowNames1.sort()

    if (sortStrategy === 'original') {
      _this.xscale.domain(_this.rowNames)
      sortfun = function (a, b) {
        return a.index - b.index
      }
    } else if (sortStrategy === 'alphabetical') {
      for (let i = 0; i < _this.rowNames.length; i++) {
        rowNamesTemp.push(_this.rowNames[i])
      }
      _this.rindices = this.sortWithIndices(rowNamesTemp, 0)
      _this.xscale.domain(rowNames1)
      sortfun = function (a, b) {
        return _this.xscale(a.name) - _this.xscale(b.name)
      }
    } else if (sortStrategy === 'ascending') {
      for (let i = 0; i < _this.rowNames.length; i++) {
        sumsTemp.push(_this.weightedSums[i])
      }
      _this.rindices = this.sortWithIndices(sumsTemp, 0)
      _this.xscale.domain(this.sortFromIndices(_this.rowNames, _this.rindices))
      sortfun = function (a, b) {
        return a.value - b.value
      }
    } else if (sortStrategy === 'descending') {
      for (let i = 0; i < _this.rowNames.length; i++) {
        sumsTemp.push(_this.weightedSums[i])
      }
      _this.rindices = this.sortWithIndices(sumsTemp, 1)
      _this.xscale.domain(this.sortFromIndices(_this.rowNames, _this.rindices))
      sortfun = function (a, b) {
        return -(a.value - b.value)
      }
    }

    if (initialization) {
      plotArea.selectAll('.bar')
        .sort(sortfun)
        .attr('x', function (d) {
          return _this.xscale(d.name) + Math.round(_this.xscale.rangeBand() / 2)
        })
        .attr('y', function (d) {
          return _this.yscale(d.value)
        })
        .attr('height', function (d) {
          return _this.plotHeight - _this.yscale(d.value)
        })

      plotArea.select('.xaxis')
        .call(_this.xAxis)
        .selectAll('.tick text')
        .style('font-size', _this.settings.rowFontSize + 'px')
        .style('font-family', _this.settings.rowFontFamily)
        .style('fill', this.settings.rowFontColor)
        .call(_this.wrapAxisLabels.bind(_this), _this.xscale.rangeBand())

      plotArea.selectAll('.leaf')
        .sort(sortfun)
        .attr('transform', function (d) {
          return 'translate(' + (_this.xscale(d.name) + _this.xscale.rangeBand() / 2) + ',' + _this.yscale(d.value) + ')'
        })
    } else {
      plotArea.selectAll('.bar')
        .sort(sortfun)
        .transition('barHeight')
        .duration(_this.duration)
        .attr('x', function (d) {
          return _this.xscale(d.name) + Math.round(_this.xscale.rangeBand() / 2)
        })
        .attr('y', function (d) {
          return _this.yscale(d.value)
        })
        .attr('height', function (d) {
          return _this.plotHeight - _this.yscale(d.value)
        })

      plotArea.select('.xaxis')
        .transition('xtickLocation')
        .duration(_this.duration)
        .call(_this.xAxis)
        .selectAll('.tick text')
        .style('font-size', _this.settings.rowFontSize + 'px')
        .style('font-family', _this.settings.rowFontFamily)
        .style('fill', this.settings.rowFontColor)
        .call(_this.wrapAxisLabels.bind(_this), _this.xscale.rangeBand())

      plotArea.selectAll('.leaf')
        .sort(sortfun)
        .transition('leafHeight')
        .duration(_this.duration)
        .attr('transform', function (d) {
          return 'translate(' + (_this.xscale(d.name) + _this.xscale.rangeBand() / 2) + ',' + _this.yscale(d.value) + ')'
        })
    }
  }

  // sort and return sort indices
  sortWithIndices (toSort, mode) {
    for (let i = 0; i < toSort.length; i++) {
      toSort[i] = [toSort[i], i]
    }
    if (mode === 0) {
      toSort.sort(function (left, right) {
        return left[0] < right[0] ? -1 : 1
      })
    } else {
      toSort.sort(function (left, right) {
        return left[0] < right[0] ? 1 : -1
      })
    }
    toSort.sortIndices = []
    for (let j = 0; j < toSort.length; j++) {
      toSort.sortIndices.push(toSort[j][1])
      toSort[j] = toSort[j][0]
    }
    return toSort.sortIndices
  }

  // sort using supplied indices
  sortFromIndices (toSort, indices) {
    let output = []
    for (let i = 0; i < toSort.length; i++) {
      output.push(toSort[indices[i]])
    }
    return output
  }

  wireupController () {
    _(this.components).each(component => component.setController(this.controller))
    // this.controller.addComponents(this.components)
    // this.controller.addOuter(this.inner)
  }

  buildLayout () {
    // TODO wire in inner and outer padding
    const innerPadding = 5
    const outerPadding = 5

    this.layout = new Layout(this.viewerWidth, this.viewerHeight, innerPadding, outerPadding)

    this.components[CellNames.SIDEBAR] = new Sidebar({
      parentContainer: this.baseSvg,
      plotState: this.plotState,
      config: {
        borderColor: this.settings.sidebarBorderColor,
        backgroundColor: this.settings.sidebarBackgroundColor,
        hoverColor: this.settings.hoverColor,
        colors: this.colors,
        columnNames: this.colNames,
        duration: this.duration,
        headingText: this.settings.colHeading,
        maxWidth: Math.floor(this.viewerWidth * this.settings.sidebarMaxProportion),
        maxHeight: Math.floor(this.viewerHeight - 2 * 5), // TODO NB 5 is meant to be sidebar outer margin
        containerWidth: this.viewerWidth, // TODO can I pull this from bounds ?
        frondColorUnselected: this.settings.frondColorUnselected,
        frondColorThis: this.settings.frondColorThis,
        frondColorThat: this.settings.frondColorThat,
        fontSize: this.settings.colFontSize,
        fontFamily: this.settings.colFontFamily,
        fontColor: this.settings.colFontColor,
        secondaryFontColor: this.settings.colFontColorUnselected,
        headingFontSize: this.settings.colHeadingFontSize,
        headingFontFamily: this.settings.colHeadingFontFamily,
        headingFontColor: this.settings.colHeadingFontColor
      }
    })
    const dimensions = this.components[CellNames.SIDEBAR].computePreferredDimensions()
    this.layout.enable(CellNames.SIDEBAR)
    this.layout.setPreferredDimensions(CellNames.SIDEBAR, dimensions)

    this.components[CellNames.PLOT] = new PlotArea({
      parentContainer: this.baseSvg,
      plotState: this.plotState,
      rowNames: this.rowNames,
      colNames: this.colNames,
      weightedSums: this.weightedSums,
      yDigits: this.settings.yDigits,
      nticks: this.nticks,
      normalizedData: this.normalizedData,
      normalizedDataMax: this.normalizedDataMax, // TODO dont need min and max
      normalizedDataMin: this.normalizedDataMin, // TODO dont need min and max
      palmTreeId: this.palmTreeId,
      colors: this.colors,
      duration: this.duration,
      hoverColor: this.settings.hoverColor,
      // for tooltip
      frondColorUnselected: this.settings.frondColorUnselected,
      dataMin: this.dataMin,
      dataMax: this.dataMax,
      tooltips: this.settings.tooltips,
      rawData: this.settings.rawData,
      digits: this.settings.digits,
      prefix: this.settings.prefix,
      suffix: this.settings.suffix,
      yLabel: this.settings.ylab,
      tooltipsHeadingFontFamily: this.settings.tooltipsHeadingFontFamily,
      tooltipsHeadingFontSize: this.settings.tooltipsHeadingFontSize,
      tooltipsFontFamily: this.settings.tooltipsFontFamily,
      tooltipsFontSize: this.settings.tooltipsFontSize,
    })
    this.layout.enable(CellNames.PLOT)
    this.layout.setFillCell(CellNames.PLOT)

    this.components[CellNames.XAXIS] = new XAxis({
      parentContainer: this.baseSvg,
      labels: this.rowNames,
      maxHeight: '200', // TODO hard code
      orientation: 'horizontal',
      placement: 'bottom',
      fontSize: this.settings.rowFontSize,
      fontFamily: this.settings.rowFontFamily,
      fontColor: this.settings.rowFontColor
    })

    // TODO do something better here for estimated width
    const xaxisDimensions = this.components[CellNames.XAXIS].computePreferredDimensions((this.viewerWidth / this.rowNames.length) * (1 - this.settings.sidebarMaxProportion))
    this.layout.enable(CellNames.XAXIS)
    this.layout.setPreferredDimensions(CellNames.XAXIS, xaxisDimensions)

    if (this.settings.rowHeading) {
      this.components[CellNames.XAXIS_TITLE] = new Title({
        parentContainer: this.baseSvg,
        text: this.settings.rowHeading,
        fontSize: this.settings.rowHeadingFontSize,
        fontFamily: this.settings.rowHeadingFontFamily,
        fontColor: this.settings.rowHeadingFontColor,
        innerPadding: 1 // TODO make configurable
      })

      // TODO do something better here for estimated width
      const axisTitleDimensions = this.components[CellNames.XAXIS_TITLE].computePreferredDimensions(this.viewerWidth * (1 - this.settings.sidebarMaxProportion))
      this.layout.enable(CellNames.XAXIS_TITLE)
      this.layout.setPreferredDimensions(CellNames.XAXIS_TITLE, axisTitleDimensions)
    }

    if (this.settings.ylab) {
      this.components[CellNames.YAXIS_TITLE] = new YTitle({
        parentContainer: this.baseSvg,
        text: this.settings.ylab,
        type: 'FOO', // TODO can I leave this out
        fontFamily: this.settings.yLabFontFamily,
        fontSize: this.settings.yLabFontSize,
        fontColor: this.settings.yLabFontColor,
        maxHeight: 1000 // hard code
      })

      const dimensions = this.components[CellNames.YAXIS_TITLE].computePreferredDimensions()
      this.layout.enable(CellNames.YAXIS_TITLE)
      this.layout.setPreferredDimensions(CellNames.YAXIS_TITLE, dimensions)
    }

    if (this.settings.showYAxis) {
      this.components[CellNames.YAXIS] = new YAxis({
        weightedSums: this.weightedSums,
        parentContainer: this.baseSvg,
        nTicks: this.nticks,
        duration: this.duration,
        yDigits: this.settings.ydigits,
        fontFamily: this.settings.yFontFamily,
        fontSize: this.settings.yFontSize,
        fontColor: this.settings.yFontColor,
        maxWidth: 1000, // hard code
        maxLines: 1,
        innerPadding: 1
      })

      const dimensions = this.components[CellNames.YAXIS].computePreferredDimensions()
      this.layout.enable(CellNames.YAXIS)
      this.layout.setPreferredDimensions(CellNames.YAXIS, dimensions)
    }
  }
}

PalmTrees.initClass()
module.exports = PalmTrees

// TODO to utils
function getContainerDimensions (rootElement) {
  try {
    return rootElement.getBoundingClientRect()
  } catch (err) {
    err.message = `fail in getContainerDimensions: ${err.message}`
    throw err
  }
}
