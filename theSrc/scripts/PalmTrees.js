import $ from 'jquery'
import _ from 'lodash'
import d3 from 'd3'
import * as log from 'loglevel'

import PlotState from './PlotState'
import Sidebar from './Sidebar'
import makeTipContent from './TipContentFactory'
import {splitIntoLines} from './labelUtils'

const d3Tip = require('d3-tip')
d3Tip(d3)
log.setLevel('info') // NB default, adjusted later in initLogger
const tooltipLogger = log.getLogger('tooltip')

const defaultSettings = {
  'digits': 0,
  'colFontSize': 11,
  'colFontFamily': 'sans-serif',
  'colHeading': '',
  'colHeadingFontSize': 0,
  'colHeadingFontFamily': 'sans-serif',
  'sidebarMaxProportion': 0.25,
  'rowFontSize': 11,
  'rowFontFamily': 'sans-serif',
  'rowHeading': '',
  'rowHeadingFontSize': 12,
  'rowHeadingFontFamily': 'sans-serif',
  'order': 'descending',
  'ylab': ''
}

class PalmTrees {
  static uniqueId () {
    return this._palmTreeInstanceCounter++
  }

  static initClass () {
    this._palmTreeInstanceCounter = 0
  }

  constructor () {
    log.info('PalmTree.constructor()')
    this.viewerWidth = 600 // default width
    this.viewerHeight = 600 // default height
    this.palmTreeId = PalmTrees.uniqueId()
    this.init()
  }

  static getLoggerNames () {
    return ['tooltip', 'sidebar']
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
    this.plotState = new PlotState(PalmTrees.defaultState())
    this.sidebar = null
    this.plotWidth = null
    this.plotHeight = null
    this.leftMargin = 35
    this.bottomMargin = 20
    this.yaxisFormat = 0
    this.data = []
    this.settings = {}
    this.plotMargin = {}
    this.param = {}
    this.normalizedData = [] // 2D array of values range [0-1]
    this.normalizedDataMax = 0
    this.normalizedDataMin = 1
    this.unweightedSums = []
    this.weightedSums = []
    this.barData = [] // D3 data set for the vertical bars (palm tree trunks)
    this.frondData = [] // D3 data set for the palm tree tops
    this.rindices = null
    this.duration = 600
    this.nticks = 10
    this.colNames = null
    this.rowNames = null
    this.weights = null
    this.colors = null
    this.frondCount = null
    this.palmTreeCount = null
    this.xscale = null
    this.yscale = null
    this.frondScale = d3.scale.linear()
    this.tipBarScale = d3.scale.linear()
    this.dataMax = 0
    this.dataMin = 100000000
    this.xAxis = null
    this.yAxis = null
    this.line = null
    this.bars = null
    this.palms = null

    this.maxXaxisLines = 1
    this.xFontSize = 11
    this.yPrefixText = ''
    this.leaves = null
    this.commasFormatter = null
    this.commasFormatterE = null

    this.tooltipDebounceTime = 50
    this.showTooltipDesiredState = false
    this.showTooltipActualState = false
    this.currentlyDisplayedTooltipIndex = null
    this.tip = null
  }

  reset () {
    log.info('PalmTree.reset()')
    this.removeOrphanedTooltips()
    this.init()
    return this
  }

  // NB seeing orphaned tips in Displayr caused by stateUpdate->renderValue issue (see VIS-393)
  removeOrphanedTooltips () {
    $(`.d3-tip-palmtree-${this.palmTreeId}`).remove()
    $('#littleTriangle').remove()
  }

  // settings getter/setter. dataPoints is 2D Array
  setData (dataPoints) {
    if (!arguments.length) return this.data

    // NB in the R layer we replace all null values with zero
    // but we preserve the null/NA values in rawData
    if (!this.settings.rawData) { this.settings.rawData = _.cloneDeep(dataPoints) }
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

    this.frondScale.domain([this.normalizedDataMin, this.normalizedDataMax])
    this.tipBarScale.domain([this.dataMin, this.dataMax]).range([2, 30])

    return this
  }

  // settings getter/setter
  setConfig (value) {
    console.log('setCOnfig called with:')
    console.log(JSON.stringify(value, {}, 2))

    if (!arguments.length) return this.settings

    this.settings = _.defaultsDeep({}, value, defaultSettings)

    this.initLogger(this.settings.logger || this.settings.log)
    this.colNames = this.settings.colNames
    this.rowNames = this.settings.rowNames
    this.weights = this.settings.weights
    this.colors = this.settings.colors

    this.palmTreeCount = this.settings.rowNames.length
    this.frondCount = this.settings.colNames.length

    this.commasFormatter = d3.format(',.' + this.settings.ydigits + 'f')
    this.commasFormatterE = d3.format(',.' + this.settings.ydigits + 'e')
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
      _(PalmTrees.getLoggerNames()).each((loggerName) => { log.getLogger(loggerName).setLevel(loggerSettings) })
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
  resize (el) {
    log.info('PalmTree.resize()')
    const _this = this
    d3.select(el).select('svg')
      .attr('width', this.viewerWidth)
      .attr('height', this.viewerHeight)

    let baseSvg = d3.select(el).select('svg')
    this.baseSvg = baseSvg

    if (this.viewerHeight < 100) {
      return
    }

    if (this.viewerWidth < 200) {
      return
    }

    // sidebar
    this.sidebar.resize({
      maxWidth: Math.floor(this.viewerWidth * this.settings.sidebarMaxProportion),
      maxHeight: Math.floor(this.viewerHeight - 2 * 5), // TODO NB 5 is meant to be sidebar outer margin
      containerWidth: this.viewerWidth
    })

    // main plot area
    this.plotMargin.top = this.viewerHeight * 0.1
    this.plotMargin.right = 10 + this.sidebar.getDimensions().width
    this.plotWidth = this.viewerWidth - this.plotMargin.left - this.plotMargin.right
    this.plotHeight = this.viewerHeight - this.plotMargin.top - this.plotMargin.bottom
    this.xscale.rangeRoundBands([0, this.plotWidth], 0.1, 0.3)
    // update leaf size
    this.param.maxLeafWidth = Math.min(this.plotMargin.top, Math.floor((this.xscale.range()[1] - this.xscale.range()[0]) / 1.4), 60)
    this.frondScale.range([this.param.maxLeafWidth * this.normalizedDataMin / this.normalizedDataMax, this.param.maxLeafWidth])
    this.updateData()

    baseSvg.select('.xaxis')
      .attr('transform', 'translate(0,' + this.plotHeight + ')')
      .call(this.xAxis)
      .selectAll('.tick text')
      .style('font-size', this.settings.rowFontSize + 'px')
      .style('font-family', this.settings.rowFontFamily)
      .call(this.wrapAxisLabels.bind(this), this.xscale.rangeBand())

    this.plotMargin.bottom = this.bottomMargin + this.maxXaxisLines * this.xFontSize * 1.1
    this.plotHeight = this.viewerHeight - this.plotMargin.top - this.plotMargin.bottom
    baseSvg.select('.xaxis').attr('transform', 'translate(0,' + this.plotHeight + ')')
    baseSvg.select('#g_plotArea').attr('transform', 'translate(' + this.plotMargin.left + ',' + this.plotMargin.top + ')')

    this.yscale.range([this.plotHeight, 0])
    this.yAxis.scale(this.yscale)
    this.xAxis.scale(this.xscale)
    baseSvg.select('.yaxis')
      .call(this.yAxis)
      .selectAll('.tick text')
      .style('font-size', this.settings.yFontSize + 'px')
      .style('font-family', this.settings.yFontFamily)

    baseSvg.selectAll('.bar')
      .attr('x', function (d) { return _this.xscale(d.name) + Math.round(_this.xscale.rangeBand() / 2) })
      .attr('y', function (d) { return _this.yscale(d.value) })
      .attr('height', function (d) { return _this.plotHeight - _this.yscale(d.value) })

    baseSvg.selectAll('.plotAreaHeading')
      .attr('x', this.plotWidth / 2)
      .attr('y', this.plotHeight + this.plotMargin.bottom - 10)

    baseSvg.selectAll('.plotAreaYLab')
      .attr('transform', 'rotate(-90,' + (-this.plotMargin.left + 20) + ',' + (this.plotHeight / 2) + ')')
      .attr('x', -this.plotMargin.left + 20)
      .attr('y', this.plotHeight / 2)

    baseSvg.selectAll('.leaf')
      .attr('transform', function (d) {
        return 'translate(' + (_this.xscale(d.name) + _this.xscale.rangeBand() / 2) + ',' + _this.yscale(d.value) + ')'
      })

    this.leaves.attr('d', this.makeFrondPath.bind(this))

    if (this.settings.tooltips) {
      const ghostPadding = 4
      baseSvg.selectAll('.ghostCircle')
        .attr('x', function ({palmTreeIndex}) { return -1 * (ghostPadding + _this.maxFrondLength(palmTreeIndex)) })
        .attr('y', function ({palmTreeIndex}) { return -1 * (ghostPadding + _this.maxFrondLength(palmTreeIndex)) })
        .attr('width', function ({palmTreeIndex}) { return (_this.maxFrondLength(palmTreeIndex) + ghostPadding) * 2 })
        .attr('height', function ({palmTreeIndex}) { return (_this.maxFrondLength(palmTreeIndex) + ghostPadding) * 2 })
    }

    if (this.settings.prefix || this.settings.suffix) {
      this.updateUnitPosition()
    }

    return this
  }

  wrapAxisLabels (textElements, maxWidth) {
    const fontSize = this.settings.rowFontSize
    const fontFamily = this.settings.rowFontFamily

    let maxXaxisLines = 0
    textElements.each(function () {
      let textElement = d3.select(this)
      let textContent = textElement.text()
      const lines = splitIntoLines(textContent, maxWidth, fontSize, fontFamily)
      maxXaxisLines = Math.max(maxXaxisLines, lines.length)

      const lineHeight = 1.1 // ems
      const x = textElement.attr('x')
      const y = textElement.attr('y')
      const dy = parseFloat(textElement.attr('dy'))
      textElement.text(null)
      _(lines).forEach((lineContent, lineIndex) => {
        textElement.append('tspan').attr('x', x).attr('y', y).attr('dy', lineIndex * lineHeight + dy + 'em').text(lineContent)
      })
    })
    this.maxXaxisLines = maxXaxisLines
  }

  width (value) {
    // width getter/setter
    if (!arguments.length) return this.viewerWidth
    this.viewerWidth = value
    return this
  }

  // height getter/setter
  height (value) {
    if (!arguments.length) return this.viewerHeight
    this.viewerHeight = value
    return this
  }

  // update date on resize, column toggle and initialization
  // TODO look at start of updatePlot, why is it updating data then calling update data ?
  updateData () {
    // TODO: this compute leafdata code is repeated in three places
    for (let i = 0; i < this.rowNames.length; i++) {
      this.barData[i].value = this.weightedSums[i]
      this.frondData[i].value = this.weightedSums[i]
    }
  }

  makeFrondPath ({palmTreeIndex, frondIndex, amplifier = 1}) {
    const frondValue = this.frondScale(this.normalizedData[palmTreeIndex][frondIndex])
    const frondIsSelected = this.plotState.isColumnOn(frondIndex)
    const pathData = (frondIsSelected)
      ? this.makeEnabledFrondPath(frondValue * amplifier)
      : this.makeDisabledFrondPath(frondValue * amplifier)
    return this.line(pathData)
  }

  makeDisabledFrondPath (frondValue) {
    return [
      {x: 0, y: 0},
      {x: frondValue * 0.25, y: -frondValue * 0.03},
      {x: frondValue * 0.75, y: -frondValue * 0.05},
      {x: frondValue, y: 0},
      {x: frondValue * 0.75, y: frondValue * 0.05},
      {x: frondValue * 0.25, y: frondValue * 0.03}
    ]
  }

  makeEnabledFrondPath (frondValue) {
    return [
      {x: 0, y: 0},
      {x: frondValue * 0.25, y: -frondValue * 0.07},
      {x: frondValue * 0.75, y: -frondValue * 0.13},
      {x: frondValue, y: 0},
      {x: frondValue * 0.75, y: frondValue * 0.13},
      {x: frondValue * 0.25, y: frondValue * 0.07}
    ]
  }

  // create ghost rectangle tooltip
  mouseOverFrond (d) {
    tooltipLogger.debug('mouseOverFrond')
    this.showTooltipDesiredState = true
    this.updateToolTipWithDebounce(d)
  }

  mouseOutFrond (d) {
    tooltipLogger.debug('mouseOutFrond')
    this.showTooltipDesiredState = false
    this.updateToolTipWithDebounce(d)
  }

  mouseOverLeaf (d, i) {
    // NB the timeout here is to ensure that the tooltip has had a chance to render before running the CSS selector
    setTimeout(() => {
      tooltipLogger.debug('mouseOverLeaf')
      d3.selectAll(`.tip-column`).classed('selected', false)
      d3.selectAll(`.tip-column-${i}`).classed('selected', true)
    }, this.tooltipDebounceTime * 2)
  }

  mouseOutLeaf () {
    tooltipLogger.debug('mouseOutLeaf')
    d3.selectAll(`.tip-column`).classed('selected', false)
  }

  updateToolTipWithDebounce ({palmTreeIndex, name, value} = {}) {
    if (this.updateToolTipWithDebounceTimeoutHandler) {
      clearTimeout(this.updateToolTipWithDebounceTimeoutHandler)
      delete this.updateToolTipWithDebounceTimeoutHandler
    }

    let htmlContent = null
    if (this.showTooltipDesiredState) {
      htmlContent = makeTipContent({
        rowName: this.rowNames[palmTreeIndex],
        rowIndex: palmTreeIndex,
        rowTotal: this.weightedSums[palmTreeIndex].toFixed(this.settings.digits),
        yLabel: this.settings.ylab,
        columnNames: this.colNames,
        columnStates: this.plotState.getState().selectedColumns,
        hFamily: this.settings.tooltipsHeadingFontFamily,
        hSize: this.settings.tooltipsHeadingFontSize,
        fFamily: this.settings.tooltipsFontFamily,
        fSize: this.settings.tooltipsFontSize,
        digits: this.settings.digits,
        prefix: this.settings.prefix,
        suffix: this.settings.suffix,
        data: this.settings.rawData[palmTreeIndex],
        tipScale: this.tipBarScale,
        colors: this.colors
      })
    }

    // NB make copies of these now, when the timeout below is called d, el, and sel will be undefined
    const params = {
      palmTreeIndex,
      yPos: value,
      xPos: name,
      html: htmlContent
    }

    this.updateToolTipWithDebounceTimeoutHandler = setTimeout(() => {
      if (this.showTooltipDesiredState && !this.showTooltipActualState) {
        this.showTooltip(params)
      } else if (!this.showTooltipDesiredState && this.showTooltipActualState) {
        this.hideTooltip(params)
      } else if (this.showTooltipDesiredState && this.showTooltipActualState && this.currentlyDisplayedTooltipIndex !== params.palmTreeIndex) {
        this.showTooltip(params)
      }
    }, this.tooltipDebounceTime)
  }

  showTooltip ({ palmTreeIndex, html, yPos, xPos }) {
    const _this = this
    this.showTooltipActualState = true
    this.currentlyDisplayedTooltipIndex = palmTreeIndex
    let ghostRect = this.baseSvg.select('#ghost' + palmTreeIndex)
    let ghostRectHtmlElement = ghostRect[0][0]
    let ghostRectDimensions = ghostRectHtmlElement.getBoundingClientRect()
    let barRectBboxDimensions = this.baseSvg.select('#bar' + palmTreeIndex)[0][0].getBoundingClientRect()

    this.tip.html(html)
    let y = Number(ghostRect.attr('y'))
    let h = Number(ghostRect.attr('height'))

    // NB TODO tipHeight and tipWidth are wrong on the very first time the tip is shown,
    // because we have not shown it yet so it doesn't have dimensions
    let tipHeight = parseFloat(this.tip.style('height'))
    let tipWidth = parseFloat(this.tip.style('width'))
    let tipSouth = y + h + 5 + this.yscale(yPos) + this.plotMargin.top
    let tipNorth = y - 5 + this.yscale(yPos) + this.plotMargin.top

    tooltipLogger.debug(`tipHeight: ${tipHeight}, tipWidth: ${tipWidth}, tipSouth: ${tipSouth}, tipNorth: ${tipNorth} `)

    const halfWidthOfTriangle = 7
    const heightOfTriangle = 10

    let direction, directionClass, offset, triangleTop, triangleLeft
    if (this.viewerHeight - tipSouth >= tipHeight) {
      direction = 's'
      offset = [10, 0]
      directionClass = 'southTip'
      triangleTop = ghostRectDimensions.y + ghostRectDimensions.height
      triangleLeft = barRectBboxDimensions.x - halfWidthOfTriangle
    } else if (tipNorth - tipHeight >= 0) {
      direction = 'n'
      offset = [-10, 0]
      directionClass = 'northTip'
      triangleTop = ghostRectDimensions.y - heightOfTriangle
      triangleLeft = barRectBboxDimensions.x - halfWidthOfTriangle
    } else if (this.xscale(xPos) + Math.round(this.xscale.rangeBand() / 2) >= this.plotWidth * 0.5) {
      direction = 'w'
      offset = [0, -10]
      directionClass = 'westTip'
      triangleTop = ghostRectDimensions.y + ghostRectDimensions.height / 2 - halfWidthOfTriangle
      triangleLeft = ghostRectDimensions.x - heightOfTriangle
    } else {
      direction = 'e'
      offset = [0, 10]
      directionClass = 'eastTip'
      triangleTop = ghostRectDimensions.y + ghostRectDimensions.height / 2 - halfWidthOfTriangle
      triangleLeft = ghostRectDimensions.x + ghostRectDimensions.width
    }

    tooltipLogger.debug(`chose ${directionClass} top: ${triangleTop}, left: ${triangleLeft}`)

    this.tip.direction(direction).offset(offset).show({}, ghostRectHtmlElement)
    d3.select('#littleTriangle')
      .attr('class', directionClass)
      .style('visibility', 'visible')
      .style('top', `${triangleTop}px`)
      .style('left', `${triangleLeft}px`)

    d3.select('#frond' + palmTreeIndex)
      .selectAll('path')
      .transition('leafSize')
      .duration(this.duration / 2)
      .attr('d', function ({palmTreeIndex, frondIndex}) {
        return _this.makeFrondPath({palmTreeIndex, frondIndex, amplifier: 1.1})
      })
  }

  hideTooltip ({ palmTreeIndex }) {
    this.showTooltipActualState = false
    this.currentlyDisplayedTooltipIndex = null
    if (this.tip) { this.tip.hide() }
    d3.select('#littleTriangle').style('visibility', 'hidden')

    d3.select('#frond' + palmTreeIndex)
      .selectAll('path')
      .transition('leafSize')
      .duration(this.duration / 2)
      .attr('d', this.makeFrondPath.bind(this))
  }

  // update the position of y axis unit on resize
  updateUnitPosition () {
    const _this = this
    d3.select('.suffixText')
      .attr('x', function () {
        let len = this.getComputedTextLength()
        if (len < _this.plotMargin.left - 10) { return -len - 10 } else { return -_this.plotMargin.left }
      })
      .attr('y', -_this.plotMargin.top / 2)
  }

  // TODO placement (file organization)
  maxFrondLength (palmTreeIndex) {
    return _(this.normalizedData[palmTreeIndex]).map(this.frondScale).max()
  }

  // update side bar content on initialization and resize
  draw (chartWindowSelection) {
    log.info('PalmTree.draw()')
    let baseSvg = chartWindowSelection.select('svg')
    this.baseSvg = baseSvg
    const _this = this

    this.line = d3.svg.line()
      .interpolate('cardinal-closed')
      .x(function (d) { return d.x })
      .y(function (d) { return d.y })

    /* create the side bar */
    /* this part goes first to set plot width */
    // TODO remove local variables and stick with this. . Also move them to this.elements. or something
    this.plotArea = baseSvg.append('g').attr('id', 'g_plotArea')
    const plotArea = this.plotArea
    this.sideBar = baseSvg.append('g').attr('id', 'g_sideBar')
    const sideBar = this.sideBar

    this.sidebar = new Sidebar({
      element: sideBar,
      plotState: this.plotState,
      config: {
        colors: this.colors,
        columnNames: this.colNames,
        headingText: this.settings.colHeading,
        maxWidth: Math.floor(this.viewerWidth * this.settings.sidebarMaxProportion),
        maxHeight: Math.floor(this.viewerHeight - 2 * 5), // TODO NB 5 is meant to be sidebar outer margin
        containerWidth: this.viewerWidth,
        fontSize: this.settings.colFontSize,
        fontFamily: this.settings.colFontFamily,
        headingFontSize: this.settings.colHeadingFontSize,
        headingFontFamily: this.settings.colHeadingFontFamily
      }
    })
    this.sidebar.draw()

    /* main plot area */

    this.param.ymax = d3.max(this.weightedSums)
    this.param.ymin = 0

    // set left margin based on numbers, prefix and if there is ylabel
    if (this.settings.showYAxis) {
      if (this.param.ymax >= 10000) {
        this.yaxisFormat = 1
        this.leftMargin = 55
      } else {
        this.yaxisFormat = 0
        this.leftMargin = ((Math.floor(this.param.ymax)).toString().length + this.settings.ydigits) * 7 + 25
      }
    } else {
      this.leftMargin = 10
    }

    if (this.settings.prefix && this.settings.suffix && this.settings.showYAxis) {
      this.yPrefixText = this.settings.prefix
      let prefixLength = 0
      plotArea.append('text')
        .style('font-size', '11px')
        .style('font-family', 'sans-serif')
        .text(this.settings.prefix)
        .each(function () {
          prefixLength = this.getComputedTextLength()
        })
        .remove()
      this.leftMargin = this.leftMargin + prefixLength
    }

    this.plotMargin = {
      top: this.viewerHeight * 0.1,
      right: 10 + this.sidebar.getDimensions().width,
      bottom: this.bottomMargin,
      left: this.leftMargin
    }
    this.plotWidth = this.viewerWidth - this.plotMargin.left - this.plotMargin.right
    this.plotHeight = this.viewerHeight - this.plotMargin.top - this.plotMargin.bottom

    // left
    if (this.settings.ylab) {
      this.leftMargin = this.leftMargin + 30
      this.plotMargin.left = this.leftMargin
      this.plotWidth = this.viewerWidth - this.plotMargin.left - this.plotMargin.right
    }

    // bottom
    if (this.settings.rowHeading) {
      this.bottomMargin = this.bottomMargin + this.settings.rowHeadingFontSize
      this.plotMargin.bottom = this.bottomMargin
      this.plotHeight = this.viewerHeight - this.plotMargin.top - this.plotMargin.bottom
    }

    // x axis
    this.xscale = d3.scale.ordinal()
      .domain(this.rowNames)
      .rangeRoundBands([0, this.plotWidth], 0.1, 0.3)

    this.yscale = d3.scale.linear()
      .domain([this.param.ymin, this.param.ymax])
      .nice(this.nticks)
      .range([this.plotHeight, 0])

    this.yAxis = d3.svg.axis()
      .scale(this.yscale)
      .orient('left')
      .ticks(this.nticks)
      .tickFormat(function (d) {
        if (_this.yaxisFormat === 0) {
          return _this.yPrefixText + _this.commasFormatter(d)
        } else if (_this.yaxisFormat === 1) {
          return _this.yPrefixText + _this.commasFormatterE(d)
        }
      })

    this.param.maxLeafWidth = Math.min(this.plotMargin.top, Math.floor((this.xscale.range()[1] - this.xscale.range()[0]) / 1.4), 60)
    this.frondScale.range([this.param.maxLeafWidth * this.normalizedDataMin / this.normalizedDataMax, this.param.maxLeafWidth])

    this.frondData = _.range(this.palmTreeCount).map((palmTreeIndex) => {
      return {
        name: this.rowNames[palmTreeIndex],
        value: this.weightedSums[palmTreeIndex],
        index: palmTreeIndex, // TODO remove this once everything uses palmTreeIndex
        palmTreeIndex: palmTreeIndex
      }
    })

    // TODO can I just use frondData ?
    this.barData = _.range(this.palmTreeCount).map((palmTreeIndex) => {
      return {
        name: this.rowNames[palmTreeIndex],
        value: this.weightedSums[palmTreeIndex],
        index: palmTreeIndex // TODO remove this once everything uses palmTreeIndex
      }
    })

    /* stop computing stuff / start drawing stuff */

    // vertical this.bars

    this.bars = plotArea.selectAll('.bar')
      .data(this.barData)

    this.bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('id', function (d) { return `bar${d.index}` })
      .attr('x', function (d) { return _this.xscale(d.name) + Math.round(_this.xscale.rangeBand() / 2) })
      .attr('width', 1)
      .attr('y', function (d) { return _this.yscale(d.value) })
      .attr('height', function (d) { return _this.plotHeight - _this.yscale(d.value) })

    this.palms = plotArea.selectAll('.palm') // TODO there are no class palm ! ...
      .data(this.frondData)

    let palmEnter = this.palms.enter().append('g')

    this.xAxis = d3.svg.axis()
      .scale(this.xscale)
      .orient('bottom')

    plotArea.append('g')
      .attr('class', 'xaxis')
      .call(this.xAxis)
      .selectAll('.tick text')
      .attr('id', function (d, i) { return 'tickTxt' + i })
      .style('font-size', this.settings.rowFontSize + 'px')
      .style('font-family', this.settings.rowFontFamily)
      .call(this.wrapAxisLabels.bind(this), this.xscale.rangeBand())

    // update bottom margin based on x axis
    this.plotMargin.bottom = this.bottomMargin + this.maxXaxisLines * this.xFontSize * 1.1
    this.plotHeight = this.viewerHeight - this.plotMargin.top - this.plotMargin.bottom
    log.info(`this.plotHeight(${this.plotHeight}) = this.viewerHeight(${this.viewerHeight}) - this.plotMargin.top(${this.plotMargin.top}) - this.plotMargin.bottom(${this.plotMargin.bottom})`)
    plotArea.select('.xaxis')
      .attr('transform', 'translate(0,' + this.plotHeight + ')')

    if (this.settings.rowHeading) {
      plotArea.append('text')
        .attr('class', 'plotAreaHeading')
        .attr('x', this.plotWidth / 2)
        .attr('y', this.plotHeight + this.plotMargin.bottom - 10)
        .text(this.settings.rowHeading)
        .style('text-anchor', 'middle')
        .style('font-size', this.settings.rowHeadingFontSize + 'px')
        .style('font-family', this.settings.rowHeadingFontFamily)
    }

    // y axis
    if (this.settings.ylab) {
      plotArea.append('text')
        .attr('class', 'plotAreaYLab')
        .text(this.settings.ylab)
        .attr('transform', 'rotate(-90,' + (-this.plotMargin.left + 20) + ',' + (this.plotHeight / 2) + ')')
        .attr('x', -this.plotMargin.left + 20)
        .attr('y', this.plotHeight / 2)
        .style('text-anchor', 'middle')
        .style('font-size', this.settings.yLabFontSize + 'px')
        .style('font-family', this.settings.yLabFontFamily)
    }

    plotArea.attr('transform', 'translate(' + this.plotMargin.left + ',' + this.plotMargin.top + ')')

    if (this.settings.showYAxis) {
      plotArea.append('g')
        .attr('class', 'yaxis')
        .call(this.yAxis)
        .selectAll('.tick text')
        .style('font-size', this.settings.yFontSize + 'px')
        .style('font-family', this.settings.yFontFamily)
    }

    // leaves
    if (this.settings.tooltips) {
      palmEnter.append('rect')
        .attr('class', 'ghostCircle')
        .attr('id', function ({palmTreeIndex}) { return `ghost${palmTreeIndex}` })
    }

    this.leaves = palmEnter.attr('class', 'leaf')
      .attr('id', function (d) { return 'frond' + d.index })
      .selectAll('path')
      .data(function (palmTreeData) {
        return _.range(_this.frondCount).map((frondIndex) => _.merge({}, palmTreeData, { frondIndex }))
      })

    this.leaves.enter()
      .append('path')
      .style('cursor', 'pointer')
      .attr('class', ({frondIndex}) => `actual-leaf actual-leaf-${frondIndex}`)
      .attr('transform', ({frondIndex}) => 'rotate(' + (frondIndex * 360 / _this.frondCount - 90) + ')')

    plotArea.selectAll('.leaf')
      .attr('transform', function (d) {
        return 'translate(' + (_this.xscale(d.name) + _this.xscale.rangeBand() / 2) + ',' + _this.yscale(d.value) + ')'
      })

    this.leaves.style('fill', function (d, i) {
      return _this.plotState.isColumnOn(i) === 0 ? '#ccc' : _this.colors[i]
    })

    // work on tooltip
    if (this.settings.tooltips) {
      this.tip = d3Tip().attr('class', `d3-tip d3-tip-palmtree-${this.palmTreeId}`)

      baseSvg.call(this.tip)

      d3.select('body')
        .append('div')
        .attr('id', 'littleTriangle')
        .style('visibility', 'hidden')

      baseSvg.selectAll('.leaf')
        .on('mouseover', function (d) {
          _this.mouseOverFrond(d)
        })
        .on('mouseout', function (d) {
          _this.mouseOutFrond(d)
        })

      this.leaves
        .on('mouseover', function (leafData, leafIndex) {
          _this.mouseOverLeaf(leafData, leafIndex)
        })
        .on('mouseout', function (d) {
          _this.mouseOutLeaf(d)
        })
        .on('click', (d) => {
          tooltipLogger.debug('clickLeaf')
          this.showTooltipDesiredState = false
          // TODO can i reverse order of below ?
          this.updateToolTipWithDebounce(d)
          this.plotState.toggleColumnState(d.frondIndex)
        })
    }

    if (this.settings.showYAxis) {
      if (this.settings.prefix || this.settings.suffix) {
        if (!this.settings.suffix) {
          plotArea.append('text')
            .attr('class', 'suffixText')
            .text(this.settings.prefix)
            .style('font-size', this.settings.yFontSize + 'px')
            .style('font-family', this.settings.yFontFamily)
        } else {
          plotArea.append('text')
            .attr('class', 'suffixText')
            .text(this.settings.suffix)
            .style('font-size', this.settings.yFontSize + 'px')
            .style('font-family', this.settings.yFontFamily)
        }
        this.updateUnitPosition()
      }
    }

    this.updatePlot(true)
  }

  updatePlot (initialization) {
    log.info('PalmTree.updatePlot()')
    const _this = this
    const baseSvg = this.baseSvg
    const plotArea = this.plotArea

    // TODO this is repeated in updatePlot and in constructor
    for (let i = 0; i < _this.rowNames.length; i++) {
      this.unweightedSums[i] = 0
      this.weightedSums[i] = 0
      for (let j = 0; j < this.colNames.length; j++) {
        this.unweightedSums[i] += this.plotState.isColumnOn(j) * this.data[i][j]
        this.weightedSums[i] += this.plotState.isColumnOn(j) * this.weights[j] * this.data[i][j]
      }
    }

    this.updateData()

    this.param.ymax = d3.max(this.weightedSums)
    this.param.ymin = 0

    this.yscale.domain([this.param.ymin, this.param.ymax])
      .nice(this.nticks)
      .range([this.plotHeight, 0])

    this.yAxis.scale(this.yscale)

    if (initialization) {
      plotArea.select('.yaxis')
        .call(this.yAxis)
        .selectAll('.tick text')
        .style('font-size', this.settings.yFontSize + 'px')
        .style('font-family', this.settings.yFontFamily)

      this.leaves
        .attr('d', this.makeFrondPath.bind(this))
        .style('fill', function (d, i) {
          return _this.plotState.isColumnOn(i) === 0 ? '#ccc' : _this.colors[i]
        })

      const ghostPadding = 4
      baseSvg.selectAll('.ghostCircle')
        .attr('x', function ({palmTreeIndex}) { return -1 * (ghostPadding + _this.maxFrondLength(palmTreeIndex)) })
        .attr('y', function ({palmTreeIndex}) { return -1 * (ghostPadding + _this.maxFrondLength(palmTreeIndex)) })
        .attr('width', function ({palmTreeIndex}) { return (_this.maxFrondLength(palmTreeIndex) + ghostPadding) * 2 })
        .attr('height', function ({palmTreeIndex}) { return (_this.maxFrondLength(palmTreeIndex) + ghostPadding) * 2 })
    } else {
      plotArea.select('.yaxis')
        .transition()
        .duration(this.duration)
        .call(this.yAxis)
        .selectAll('.tick text')
        .style('font-size', this.settings.yFontSize + 'px')
        .style('font-family', this.settings.yFontFamily)

      this.leaves
        .transition('leafColor')
        .duration(_this.duration)
        .attr('d', this.makeFrondPath.bind(this))
        .style('fill', function (d, i) {
          return _this.plotState.isColumnOn(i) === 0 ? '#ccc' : _this.colors[i]
        })
    }

    this.bars.data(this.barData)

    // TODO this should be handled bv the sidebar !
    baseSvg.selectAll('.sideBarColorBox').transition('boxColor')
      .duration(_this.duration)
      .style('fill', function (d, i) {
        return _this.plotState.isColumnOn(i) === 0 ? '#ccc' : _this.colors[i]
      })

    // TODO this should be handled bv the sidebar !
    baseSvg.selectAll('.sideBarText').transition('textColor')
      .duration(_this.duration)
      .style('fill', function (d, i) {
        return _this.plotState.isColumnOn(i) === 0 ? '#aaa' : '#000'
      })

    if (d3.sum(_this.plotState.getState().selectedColumns) === 0) {
      plotArea.selectAll('.bar')
        .transition('barHeight')
        .duration(_this.duration)
        .attr('x', function (d) { return _this.xscale(d.name) + Math.round(_this.xscale.rangeBand() / 2) })
        .attr('y', function (d) { return _this.yscale(d.value) })
        .attr('height', function (d) { return _this.plotHeight - _this.yscale(d.value) })

      plotArea.selectAll('.leaf')
        .transition('leafHeight')
        .duration(_this.duration)
        .attr('transform', function (d) {
          return 'translate(' + (_this.xscale(d.name) + _this.xscale.rangeBand() / 2) + ',' + _this.yscale(d.value) + ')'
        })
    } else {
      this.sortBars(initialization)
    }
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
      sortfun = function (a, b) { return a.index - b.index }
    } else if (sortStrategy === 'alphabetical') {
      for (let i = 0; i < _this.rowNames.length; i++) {
        rowNamesTemp.push(_this.rowNames[i])
      }
      _this.rindices = this.sortWithIndices(rowNamesTemp, 0)
      _this.xscale.domain(rowNames1)
      sortfun = function (a, b) { return _this.xscale(a.name) - _this.xscale(b.name) }
    } else if (sortStrategy === 'ascending') {
      for (let i = 0; i < _this.rowNames.length; i++) {
        sumsTemp.push(_this.weightedSums[i])
      }
      _this.rindices = this.sortWithIndices(sumsTemp, 0)
      _this.xscale.domain(this.sortFromIndices(_this.rowNames, _this.rindices))
      sortfun = function (a, b) { return a.value - b.value }
    } else if (sortStrategy === 'descending') {
      for (let i = 0; i < _this.rowNames.length; i++) {
        sumsTemp.push(_this.weightedSums[i])
      }
      _this.rindices = this.sortWithIndices(sumsTemp, 1)
      _this.xscale.domain(this.sortFromIndices(_this.rowNames, _this.rindices))
      sortfun = function (a, b) { return -(a.value - b.value) }
    }

    if (initialization) {
      plotArea.selectAll('.bar')
        .sort(sortfun)
        .attr('x', function (d) { return _this.xscale(d.name) + Math.round(_this.xscale.rangeBand() / 2) })
        .attr('y', function (d) { return _this.yscale(d.value) })
        .attr('height', function (d) { return _this.plotHeight - _this.yscale(d.value) })

      plotArea.select('.xaxis')
        .call(_this.xAxis)
        .selectAll('.tick text')
        .style('font-size', _this.settings.rowFontSize + 'px')
        .style('font-family', _this.settings.rowFontFamily)
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
        .attr('x', function (d) { return _this.xscale(d.name) + Math.round(_this.xscale.rangeBand() / 2) })
        .attr('y', function (d) { return _this.yscale(d.value) })
        .attr('height', function (d) { return _this.plotHeight - _this.yscale(d.value) })

      plotArea.select('.xaxis')
        .transition('xtickLocation')
        .duration(_this.duration)
        .call(_this.xAxis)
        .selectAll('.tick text')
        .style('font-size', _this.settings.rowFontSize + 'px')
        .style('font-family', _this.settings.rowFontFamily)
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
}

PalmTrees.initClass()
module.exports = PalmTrees
