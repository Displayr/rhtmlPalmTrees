import $ from 'jquery'
import _ from 'lodash'
import d3 from 'd3'
import * as log from 'loglevel'

import PlotState from './plotState'
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

class PalmTrees {
  static uniqueId () {
    return this._palmTreeInstanceCounter++
  }

  static initClass () {
    this._palmTreeInstanceCounter = 0
  }

  constructor () {
    log.debug('PalmTree.constructor()')
    this.palmTreeId = PalmTrees.uniqueId()
    this.init()
  }

  static getLoggerNames () {
    return ['tooltip', 'sidebar', 'plotarea', 'layout']
  }

  static defaultState () {
    return _.cloneDeep({
      selectedColumns: [],
      sortBy: 'descending',
      data: [],
    })
  }

  init () {
    log.debug('PalmTree.init()')
    this.components = {}
    this.plotState = new PlotState(PalmTrees.defaultState())
    this.plotMath = null
    this.data = []
    this.settings = {}
    this.registeredStateListeners = []

    this.duration = 600
    this.colNames = null
    this.rowNames = null
    this.weights = null
    this.colors = null
    this.palmTreeCount = null
  }

  reset () {
    log.debug('PalmTree.reset()')
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
    this.settings = buildConfig(value)

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
      weights: this.settings.weights,
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
    if (_.isNull(loggerSettings) || _.isUndefined(loggerSettings)) {
      log.setLevel('info')
      _(PalmTrees.getLoggerNames()).each((loggerName) => {
        log.getLogger(loggerName).setLevel('info')
      })
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
    log.debug(`PalmTree.checkState() returning ${stateIsValid}`)
    return stateIsValid
  }

  resetState () {
    log.debug('PalmTree.resetState()')
    const selectedColumns = new Array(this.data[0].length) // want num columns, not num rows
    selectedColumns.fill(true)
    this.plotState.setState({
      data: this.data,
      sortBy: this.settings.order,
      selectedColumns,
    })
    return this
  }

  restoreState (previousUserState) {
    log.debug('PalmTree.restoreState()')
    this.plotState.initialiseState(previousUserState)
  }

  addStateListener (stateChanged) {
    // this.saveStatesFn = stateChanged
    this.registeredStateListeners.push(this.plotState.addListener(stateChanged))
  }

  // update side bar content on initialization and resize
  draw (rootElement) {
    log.debug('PalmTree.draw()')

    rootElement.setAttribute('rhtmlwidget-status', 'loading')

    const { width, height } = getContainerDimensions(_.has(rootElement, 'length') ? rootElement[0] : rootElement)
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
      this.components[CellNames.YAXIS].setmaxFrondSize(this.components[CellNames.PLOT].maxFrondSize)
      this.components[CellNames.YAXIS].draw(this.layout.getCellBounds(CellNames.YAXIS))
    }

    this.updatePlot(true)

    // register self as a listener for stae changes, and update plot any time an update is made
    this.addStateListener(newState => this.updatePlot(false))

    rootElement.setAttribute('rhtmlwidget-status', 'ready')
  }

  updatePlot (initialization) {
    log.debug('PalmTree.updatePlot()')

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
        frondNames: this.colNames,
        duration: this.duration,
        headingText: this.settings.colHeading,
        maxWidth: Math.floor(this.viewerWidth * this.settings.sidebarMaxProportion),
        maxHeight: Math.floor(this.viewerHeight - 2 * outerPadding),
        frondColorUnselected: this.settings.frondColorUnselected,
        frondColorThis: this.settings.frondColorThis,
        frondColorThat: this.settings.frondColorThat,
        fontSize: this.settings.colFontSize,
        fontFamily: this.settings.colFontFamily,
        fontColor: this.settings.colFontColor,
        secondaryFontColor: this.settings.colFontColorUnselected,
        headingFontSize: this.settings.colHeadingFontSize,
        headingFontFamily: this.settings.colHeadingFontFamily,
        headingFontColor: this.settings.colHeadingFontColor,
      },
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
      tooltipsFontSize: this.settings.tooltipsFontSize,
    })
    this.layout.enable(CellNames.PLOT)
    this.layout.setFillCell(CellNames.PLOT)

    if (this.settings.ylab) {
      this.components[CellNames.YAXIS_TITLE] = new YTitle({
        parentContainer: this.baseSvg,
        text: this.settings.ylab,
        bold: true,
        fontFamily: this.settings.yLabFontFamily,
        fontSize: this.settings.yLabFontSize,
        fontColor: this.settings.yLabFontColor,
        maxHeight: 0.8 * this.viewerHeight, // TODO make configurable
      })

      const dimensions = this.components[CellNames.YAXIS_TITLE].computePreferredDimensions()
      this.layout.enable(CellNames.YAXIS_TITLE)
      this.layout.setPreferredDimensions(CellNames.YAXIS_TITLE, dimensions)
    }

    if (this.settings.showYAxis) {
      this.components[CellNames.YAXIS] = new YAxis({
        palmMath: this.palmMath,
        prefix: this.settings.prefix,
        suffix: this.settings.suffix,
        parentContainer: this.baseSvg,
        duration: this.duration,
        yDigits: this.settings.ydigits,
        fontFamily: this.settings.yFontFamily,
        fontSize: this.settings.yFontSize,
        fontColor: this.settings.yFontColor,
        maxWidth: 1000, // hard code
        maxLines: 1,
        innerPadding: 1,
      })

      const dimensions = this.components[CellNames.YAXIS].computePreferredDimensions()
      this.layout.enable(CellNames.YAXIS)
      this.layout.setPreferredDimensions(CellNames.YAXIS, dimensions)
    }

    this.components[CellNames.XAXIS] = new XAxis({
      parentContainer: this.baseSvg,
      plotState: this.plotState,
      palmMath: this.palmMath,
      labels: this.rowNames,
      maxHeight: this.viewerHeight * 0.2, // TODO expose the 0.2 proportion as a parameter
      orientation: 'horizontal',
      placement: 'bottom',
      fontSize: this.settings.rowFontSize,
      fontFamily: this.settings.rowFontFamily,
      fontColor: this.settings.rowFontColor,
    })

    // NB Xaxis, title, subtitle, and footer, xtitle complication: wrapping.
    // To know the required height (due to wrapping),
    // we need to know the available width. (this is why it is done near end and why the computeFn takes a param)

    // NB title/subtitle/footer : we want to center align with the plotarea midpoint,
    // but we want to wrap using the canvas boundaries, not the plotarea boundaries.
    // we cannot currently express this in the layout component, so we need to do a bit of manual work here

    const estimatedPlotAreaBoundsWidth = this.layout.getEstimatedCellBounds(CellNames.PLOT).width
    const xaxisDimensions = this.components[CellNames.XAXIS].computePreferredDimensions(estimatedPlotAreaBoundsWidth / this.rowNames.length)
    this.layout.enable(CellNames.XAXIS)
    this.layout.setPreferredDimensions(CellNames.XAXIS, xaxisDimensions)

    if (this.settings.rowHeading) {
      this.components[CellNames.XAXIS_TITLE] = new Title({
        parentContainer: this.baseSvg,
        text: this.settings.rowHeading,
        bold: true,
        fontSize: this.settings.rowHeadingFontSize,
        fontFamily: this.settings.rowHeadingFontFamily,
        fontColor: this.settings.rowHeadingFontColor,
        innerPadding: 1, // TODO make configurable
      })

      const axisTitleDimensions = this.components[CellNames.XAXIS_TITLE].computePreferredDimensions(estimatedPlotAreaBoundsWidth)
      this.layout.enable(CellNames.XAXIS_TITLE)
      this.layout.setPreferredDimensions(CellNames.XAXIS_TITLE, axisTitleDimensions)
    }

    if (!_.isEmpty(this.settings.title)) {
      const { width: estimatedWidth, left: estimatedLeftBound } = this.layout.getEstimatedCellBounds(CellNames.TITLE)
      const midpoint = estimatedLeftBound + 0.5 * estimatedWidth
      const shorterSide = Math.min(midpoint, this.viewerWidth - midpoint)

      this.components[CellNames.TITLE] = new Title({
        parentContainer: this.baseSvg,
        text: this.settings.title,
        fontColor: this.settings.titleFontColor,
        fontSize: this.settings.titleFontSize,
        fontFamily: this.settings.titleFontFamily,
        maxWidth: 2 * shorterSide,
        maxHeight: this.viewerHeight / 4, // TODO make this configurable
        bold: false,
        innerPadding: 2, // TODO make configurable
      })

      const dimensions = this.components[CellNames.TITLE].computePreferredDimensions()
      this.layout.enable(CellNames.TITLE)
      this.layout.setPreferredDimensions(CellNames.TITLE, dimensions)
    }

    if (!_.isEmpty(this.settings.subtitle)) {
      const { width: estimatedWidth, left: estimatedLeftBound } = this.layout.getEstimatedCellBounds(CellNames.SUBTITLE)
      const midpoint = estimatedLeftBound + 0.5 * estimatedWidth
      const shorterSide = Math.min(midpoint, this.viewerWidth - midpoint)

      this.components[CellNames.SUBTITLE] = new Title({
        parentContainer: this.baseSvg,
        text: this.settings.subtitle,
        fontColor: this.settings.subtitleFontColor,
        fontSize: this.settings.subtitleFontSize,
        fontFamily: this.settings.subtitleFontFamily,
        maxWidth: 2 * shorterSide,
        maxHeight: this.viewerHeight / 4, // TODO make this configurable
        bold: false,
        innerPadding: 2, // TODO make configurable
      })

      const dimensions = this.components[CellNames.SUBTITLE].computePreferredDimensions()
      this.layout.enable(CellNames.SUBTITLE)
      this.layout.setPreferredDimensions(CellNames.SUBTITLE, dimensions)
    }

    if (!_.isEmpty(this.settings.footer)) {
      const { width: estimatedWidth, left: estimatedLeftBound } = this.layout.getEstimatedCellBounds(CellNames.FOOTER)
      const midpoint = estimatedLeftBound + 0.5 * estimatedWidth
      const shorterSide = Math.min(midpoint, this.viewerWidth - midpoint)

      this.components[CellNames.FOOTER] = new Title({
        parentContainer: this.baseSvg,
        text: this.settings.footer,
        fontColor: this.settings.footerFontColor,
        fontSize: this.settings.footerFontSize,
        fontFamily: this.settings.footerFontFamily,
        maxWidth: 2 * shorterSide,
        maxHeight: this.viewerHeight / 4, // TODO make this configurable
        bold: false,
        innerPadding: 2, // TODO make configurable
      })

      const dimensions = this.components[CellNames.FOOTER].computePreferredDimensions()
      this.layout.enable(CellNames.FOOTER)
      this.layout.setPreferredDimensions(CellNames.FOOTER, dimensions)
    }

    this.layout.allComponentsRegistered()
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
