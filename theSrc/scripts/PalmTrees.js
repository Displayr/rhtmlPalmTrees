import $ from 'jquery'
import _ from 'lodash'
import d3 from 'd3'
import * as log from 'loglevel'

import PlotState from './PlotState'
import PalmMath from './palmMath'
import PlotArea from './components/plotArea'
import Sidebar from './components/sidebar'
import XAxis from './components/xAxis'
import YAxis from './components/yAxis'
import YTitle from './components/yTitle'
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
    this.plotMath = null
    this.data = []
    this.settings = {}
    this.registeredStateListeners = []

    this.duration = 600
    this.nticks = 10
    this.colNames = null
    this.rowNames = null
    this.weights = null
    this.colors = null
    this.palmTreeCount = null
  }

  reset () {
    log.info('PalmTree.reset()')
    this.removeOrphanedTooltips()
    this.registeredStateListeners.forEach(dergisterFn => dergisterFn())
    this.init()
  }

  // NB seeing orphaned tips in Displayr caused by stateUpdate->renderValue issue (see VIS-393)
  removeOrphanedTooltips () {
    $(`.d3-tip-palmtree-${this.palmTreeId}`).remove()
    $('#littleTriangle').remove()
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
  }

  // dataPoints is 2D Array
  setData (dataPoints) {
    // NB in the R layer we replace all null values with zero
    // but we preserve the null/NA values in rawData
    if (!this.settings.rawData) {
      this.settings.rawData = _.cloneDeep(dataPoints)
    }
    this.data = dataPoints

    // NB must call setConfig first !
    this.palmMath = new PalmMath({
      data: dataPoints,
      plotState: this.plotState,
      rowNames: this.settings.rowNames,
      weights: this.settings.weights
    })
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

  addStateListener (stateChanged) {
    // this.saveStatesFn = stateChanged
    this.registeredStateListeners.push(this.plotState.addListener(stateChanged))
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

    this.initialiseComponents()

    const simpleCells = _.omit(CellNames, [CellNames.YAXIS])
    _(simpleCells).each(cellName => {
      if (this.layout.enabled(cellName)) {
        this.components[cellName].draw(this.layout.getCellBounds(cellName))
      }
    })

    if (this.layout.enabled(CellNames.YAXIS)) {
      this.components[CellNames.YAXIS].setmaxLeafSize(this.components[CellNames.PLOT].maxLeafSize)
      this.components[CellNames.YAXIS].draw(this.layout.getCellBounds(CellNames.YAXIS))
    }

    this.updatePlot(true)

    // register self as a listener for stae changes, and update plot any time an update is made
    this.addStateListener(newState => this.updatePlot(false))
  }

  updatePlot (initialization) {
    log.info('PalmTree.updatePlot()')

    if (this.layout.enabled(CellNames.PLOT)) { this.components[CellNames.PLOT].updatePlot(initialization) }
    if (this.layout.enabled(CellNames.YAXIS)) { this.components[CellNames.YAXIS].updatePlot(initialization) }
    if (this.layout.enabled(CellNames.SIDEBAR)) { this.components[CellNames.SIDEBAR].updatePlot(initialization) }
    if (this.layout.enabled(CellNames.XAXIS)) { this.components[CellNames.XAXIS].updatePlot(initialization) }
  }

  initialiseComponents () {
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
      palmMath: this.palmMath,
      rowNames: this.rowNames,
      colNames: this.colNames,
      yDigits: this.settings.yDigits,
      nticks: this.nticks,
      palmTreeId: this.palmTreeId,
      colors: this.colors,
      duration: this.duration,
      hoverColor: this.settings.hoverColor,
      // for tooltip
      frondColorUnselected: this.settings.frondColorUnselected,
      tooltips: this.settings.tooltips,
      rawData: this.settings.rawData,
      digits: this.settings.digits,
      prefix: this.settings.prefix,
      suffix: this.settings.suffix,
      yLabel: this.settings.ylab,
      tooltipsHeadingFontFamily: this.settings.tooltipsHeadingFontFamily,
      tooltipsHeadingFontSize: this.settings.tooltipsHeadingFontSize,
      tooltipsFontFamily: this.settings.tooltipsFontFamily,
      tooltipsFontSize: this.settings.tooltipsFontSize
    })
    this.layout.enable(CellNames.PLOT)
    this.layout.setFillCell(CellNames.PLOT)

    this.components[CellNames.XAXIS] = new XAxis({
      parentContainer: this.baseSvg,
      plotState: this.plotState,
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
        palmMath: this.palmMath,
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
