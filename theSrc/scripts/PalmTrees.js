import d3 from 'd3'
import _ from 'lodash'
import * as log from 'loglevel'

import PlotState from './PlotState'
import Sidebar from './Sidebar'
import makeTipContent from './TipContentFactory'

const d3Tip = require('d3-tip')
d3Tip(d3)
log.setLevel('info') // NB default, adjusted later in initLogger
const tooltipLogger = log.getLogger('tooltip')

const defaultSettings = {
  'digits': 0,
  'colFontSize': 11,
  'colFontFamily': 'sans-serif',
  'colHeadingFontSize': 0,
  'colHeadingFontFamily': 'sans-serif',
  'rowFontSize': 11,
  'rowFontFamily': 'sans-serif',
  'columnHeading': '',
  'rowHeading': '',
  'rowHeadingFontSize': 12,
  'rowHeadingFontFamily': 'sans-serif',
  'order': 'descending'
}

class PalmTrees {
  constructor () {
    this.viewerWidth = 600 // default width
    this.viewerHeight = 600 // default height
    this.init()
  }

  static getLoggerNames () {
    return ['tooltip', 'sidebar']
  }

  static defaultState () {
    return _.cloneDeep({
      selectedCol: [],
      sortBy: 'descending',
      data: []
    })
  }

  init () {
    this.plotState = new PlotState(PalmTrees.defaultState())
    this.sidebar = null
    this.plotWidth = 400
    this.plotHeight = 400
    this.leftMargin = 35
    this.bottomMargin = 20
    this.yaxisFormat = 0
    this.data = []
    this.settings = {}
    this.plotMargin = {}
    this.param = {}
    this.tempNorm = []
    this.normData = []
    this.unweightedSums = []
    this.weightedSums = []
    this.barData = []
    this.frondData = []
    this.maxVal = null // TODO rename
    this.minVal = null // TODO rename
    this.rindices = null
    this.duration = 600
    this.nticks = 10
    this.colNames = null
    this.rowNames = null
    this.weights = null
    this.colors = null
    this.ncol = null
    this.xscale = null
    this.yscale = null
    this.linearRadialScale = null
    this.tipBarScale = null
    this.dataMax = 0
    this.dataMin = 100000000
    this.xAxis = null
    this.yAxis = null
    this.line = null
    this.bars = null
    this.palms = null

    this.maxXaxisLines = 1
    this.xFontSize = 11
    this.initR = []
    this.yPrefixText = ''
    this.leaves = null
    this.commasFormatter = null
    this.commasFormatterE = null

    this.showTooltipDesiredState = false
    this.showTooltipActualState = false
    this.currentlyDisplayedTooltipIndex = null
    this.tip = null
  }

  reset () {
    this.init()
    return this
  }

  // settings getter/setter
  setData (value) {
    if (!arguments.length) return this.data

    if (!this.settings.rawData) {
      this.settings.rawData = _.cloneDeep(value)
    }

    // TODO TEMP assuming all columns are on
    let wtSum, unwtSum
    // compute weighted sum
    // TODO this is repeated in updatePlot and in constructor
    for (let i = 0; i < this.rowNames.length; i++) {
      wtSum = 0
      unwtSum = 0
      for (let j = 0; j < this.colNames.length; j++) {
        wtSum += 1 * this.weights[j] * value[i][j]
        unwtSum += 1 * value[i][j]
      }
      this.weightedSums.push(wtSum)
      this.unweightedSums.push(unwtSum)
      if (this.settings.barHeights) {
        this.weightedSums[i] = this.settings.barHeights[i]
      }
    }

    let maxSum = d3.max(this.unweightedSums)
    this.rindices = d3.range(this.rowNames.length)

    // normalize leaf data
    this.maxVal = 0
    this.minVal = 1
    for (let i = 0; i < this.rowNames.length; i++) {
      this.tempNorm = []
      for (let j = 0; j < this.colNames.length; j++) {
        this.tempNorm.push(Math.sqrt(value[i][j] / maxSum))
      }
      this.normData.push(this.tempNorm)
      this.maxVal = Math.max(d3.max(this.normData[i]), this.maxVal)
      this.minVal = Math.min(d3.min(this.normData[i]), this.minVal)
    }

    // now set the original data values for tips
    for (let i = 0; i < this.rowNames.length; i++) {
      let tempData = []
      for (let j = 0; j < this.colNames.length; j++) {
        tempData.push(value[i][j])
      }
      this.data.push(tempData)
      this.dataMax = Math.max(this.dataMax, d3.max(tempData))
      this.dataMin = Math.min(this.dataMin, d3.min(tempData))
    }

    this.tipBarScale = d3.scale.linear().domain([this.dataMin, this.dataMax]).range([2, 30])

    return this
  }

  // settings getter/setter
  setConfig (value) {
    if (!arguments.length) return this.settings

    this.settings = _.defaultsDeep(value, defaultSettings)

    this.initLogger(this.settings.logger || this.settings.log)
    this.colNames = this.settings.colNames
    this.rowNames = this.settings.rowNames
    this.weights = this.settings.weights
    this.ncol = this.settings.colNames.length
    this.colors = this.settings.colors

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
    return _.isEqual(previousData, this.data)
  }

  resetState () {
    const selectedColumns = new Array(this.data[0].length) // want num columns, not num rows
    selectedColumns.fill(1)
    this.plotState.setState({
      data: this.data,
      sortBy: this.settings.order,
      selectedColumns
    })
    return this
  }

  // loads the state of the widget if it is saved
  restoreState (previousUserState) {
    this.plotState.initialiseState(previousUserState)
  }

  // set the state saver function
  stateSaver (stateChanged) {
    // this.saveStatesFn = stateChanged
    this.deregisterExternalStateListenerFn = this.plotState.addListener(stateChanged)
  }

  saveStates () {
    throw new Error('saveStates is not a thing any more')
  }

  registerInternalListeners () {
    this.plotState.addListener((newState) => {
      this.updatePlot(this.duration, false)
    })
  }

  // resize
  resize (el) {
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
      maxWidth: Math.floor(this.viewerWidth * 0.25),
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
    this.linearRadialScale.range([this.param.maxLeafWidth * this.minVal / this.maxVal, this.param.maxLeafWidth])
    this.updateData()
    this.palms.data(this.frondData)
    this.leaves.data(function (d) { return d.leaves })

    baseSvg.select('.xaxis')
      .attr('transform', 'translate(0,' + this.plotHeight + ')')
      .call(this.xAxis)
      .selectAll('.tick text')
      .style('font-size', this.settings.rowFontSize + 'px')
      .style('font-family', this.settings.rowFontFamily)
      .call(this.wrapNew.bind(this), this.xscale.rangeBand())

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
    this.leaves.attr('d', this.line)

    if (this.settings.tooltips) {
      baseSvg.selectAll('.ghostCircle')
        .attr('x', function (d) {
          return Number(d3.select(this).attr('x')) * _this.linearRadialScale(d.tipMaxR) / _this.initR[d.index]
        })
        .attr('y', function (d) {
          return Number(d3.select(this).attr('y')) * _this.linearRadialScale(d.tipMaxR) / _this.initR[d.index]
        })
        .attr('width', function (d) {
          return Number(d3.select(this).attr('width')) * _this.linearRadialScale(d.tipMaxR) / _this.initR[d.index]
        })
        .attr('height', function (d) {
          return Number(d3.select(this).attr('height')) * _this.linearRadialScale(d.tipMaxR) / _this.initR[d.index]
        })
        .each(function (d) { _this.initR[d.index] = _this.linearRadialScale(d.tipMaxR) })
    }

    if (this.settings.barHeights) {
      if (this.settings.yprefix || this.settings.ysuffix) {
        this.updateUnitPosition()
      }
    } else {
      if (this.settings.prefix || this.settings.suffix) {
        this.updateUnitPosition()
      }
    }

    return this
  }

  wrapNew (text, width) {
    let separators = {'-': 1, ' ': 1}
    let lineNumbers = []
    text.each(function () {
      let text = d3.select(this)
      let chars = text.text().split('').reverse()
      let c
      let c1
      let isnum = /[0-9]/
      let nextchar
      let sep
      let newline = []   // the chars from the current line that should be breaked and wrapped
      let lineTemp = []  // the current, temporary line (tspan) that needs to be filled
      let lineNumber = 0
      let lineHeight = 1.1 // ems
      let x = text.attr('x')
      let y = text.attr('y')
      let dy = parseFloat(text.attr('dy'))
      let tspan = text.text(null).append('tspan').attr('x', x).attr('y', y).attr('dy', dy + 'em')

      while (c = chars.pop()) { // eslint-disable-line no-cond-assign
        // remove leading space
        if (lineTemp.length === 0 && c === ' ') {
          continue
        }
        lineTemp.push(c)
        tspan.text(lineTemp.join(''))
        if (tspan.node().getComputedTextLength() > width) {
          // if no separator detected before c, wait until there is one
          // otherwise, wrap texts
          // The or case handles situations when the negative sign is the first char
          if (sep === undefined || lineTemp[0] === '-') {
            if (c in separators) {
              if (c === ' ') {
                lineTemp.pop()
              } else if (c === '-') {
                // check negation or hyphen
                c1 = chars.pop()
                if (c1) {
                  if (isnum.test(c1)) {
                    chars.push(c1)
                    chars.push(lineTemp.pop())
                  } else {
                    chars.push(c1)
                  }
                }
              }
              // make new line
              sep = undefined
              tspan.text(lineTemp.join(''))
              tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text('')
              lineTemp = []
              newline = []
            }
          } else {
            // handles the case when the last char is a separator and c === sep
            if (c in separators) {
              newline.push(lineTemp.pop())
            }
            // pop chars until it reaches the previous separator recorded
            nextchar = lineTemp.pop()
            while (nextchar !== sep && lineTemp.length > 0) {
              newline.push(nextchar)
              nextchar = lineTemp.pop()
            }
            // handles negative sign and space
            if (sep === '-') {
              c1 = newline.pop()
              if (c1) {
                if (isnum.test(c1)) {
                  newline.push(c1)
                  newline.push(sep)
                } else {
                  lineTemp.push(sep)
                  newline.push(c1)
                }
              } else {
                lineTemp.push(sep)
                newline.push(c1)
              }
            } else if (sep !== ' ') {
              lineTemp.push(sep)
            }
            // put chars back into the string that needs to be wrapped
            newline.reverse()
            while (nextchar = newline.pop()) { // eslint-disable-line no-cond-assign
              chars.push(nextchar)
            }
            // make new line
            sep = undefined
            tspan.text(lineTemp.join(''))
            tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text('')
            lineTemp = []
            newline = []
          }
        } else {
          if (c in separators) {
            sep = c
          }
        }
      }
      lineNumbers.push(lineNumber + 1)
    })
    this.maxXaxisLines = d3.max(lineNumbers)
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
  updateData () {
    // TODO: this compute leafdata code is repeated in three places
    for (let i = 0; i < this.rowNames.length; i++) {
      this.barData[i].value = this.weightedSums[i]
      this.frondData[i].value = this.weightedSums[i]
      for (let j = 0; j < this.colNames.length; j++) {
        let leafValue = this.linearRadialScale(this.normData[i][j])
        if (!this.settings.rawData[i][j]) {
          leafValue = 0
        }
        if (this.plotState.isColumnOn(j) < 0.5) {
          this.frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
            {x: leafValue * 0.25, y: -leafValue * 0.03},
            {x: leafValue * 0.75, y: -leafValue * 0.05},
            {x: leafValue, y: 0},
            {x: leafValue * 0.75, y: leafValue * 0.05},
            {x: leafValue * 0.25, y: leafValue * 0.03}]
        } else {
          this.frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
            {x: leafValue * 0.25, y: -leafValue * 0.07},
            {x: leafValue * 0.75, y: -leafValue * 0.13},
            {x: leafValue, y: 0},
            {x: leafValue * 0.75, y: leafValue * 0.13},
            {x: leafValue * 0.25, y: leafValue * 0.07}]
        }
      }
    }
  }

  // create ghost rectangle tooltip
  mouseOverFrond (d, el, sel) {
    tooltipLogger.debug('mouseOverFrond')
    this.showTooltipDesiredState = true
    this.updateToolTipWithDebounce(d, el, sel)
  }

  mouseOutFrond (d) {
    tooltipLogger.debug('mouseOutFrond')
    this.showTooltipDesiredState = false
    this.updateToolTipWithDebounce(d)
  }

  mouseOverLeaf (d, i) {
    tooltipLogger.debug('mouseOverLeaf')
    d3.selectAll(`.tip-column`).classed('selected', false)
    d3.selectAll(`.tip-column-${i}`).classed('selected', true)
  }

  mouseOutLeaf (d) {
    tooltipLogger.debug('mouseOutLeaf')
    d3.selectAll(`.tip-column`).classed('selected', false)
  }

  updateToolTipWithDebounce (d, el, sel) {
    if (this.updateToolTipWithDebounceTimeoutHandler) {
      clearTimeout(this.updateToolTipWithDebounceTimeoutHandler)
      delete this.updateToolTipWithDebounceTimeoutHandler
    }

    // NB make copies of these now, when the timeout below is called d, el, and sel will be undefined
    const params = {
      palmTreeIndex: d.index,
      yPos: d.value,
      xPos: d.name,
      html: d.tip
    }

    this.updateToolTipWithDebounceTimeoutHandler = setTimeout(() => {
      if (this.showTooltipDesiredState && !this.showTooltipActualState) {
        this.showTooltip(params)
      } else if (!this.showTooltipDesiredState && this.showTooltipActualState) {
        this.hideTooltip(params)
      } else if (this.showTooltipDesiredState && this.showTooltipActualState && this.currentlyDisplayedTooltipIndex !== params.palmTreeIndex) {
        this.showTooltip(params)
      }
    }, 50) // NB TODO from a config somewhere
  }

  showTooltip ({ palmTreeIndex, html, yPos, xPos }) {
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

    // TODO: this compute leafdata code is repeated in three places
    let i = palmTreeIndex
    let s = 1.1
    for (let j = 0; j < this.colNames.length; j++) {
      let leafValue = this.linearRadialScale(this.normData[i][j])
      if (!this.settings.rawData[i][j]) {
        leafValue = 0
      }
      if (this.plotState.isColumnOn(j) < 0.5) {
        this.frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
          {x: leafValue * 0.25 * s, y: -leafValue * 0.03 * s},
          {x: leafValue * 0.75 * s, y: -leafValue * 0.05 * s},
          {x: leafValue * s, y: 0},
          {x: leafValue * 0.75 * s, y: leafValue * 0.05 * s},
          {x: leafValue * 0.25 * s, y: leafValue * 0.03 * s}]
      } else {
        this.frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
          {x: leafValue * 0.25 * s, y: -leafValue * 0.07 * s},
          {x: leafValue * 0.75 * s, y: -leafValue * 0.13 * s},
          {x: leafValue * s, y: 0},
          {x: leafValue * 0.75 * s, y: leafValue * 0.13 * s},
          {x: leafValue * 0.25 * s, y: leafValue * 0.07 * s}]
      }
    }
    this.palms.data(this.frondData)
    this.leaves.data(function (d) { return d.leaves })
    d3.select('#frond' + palmTreeIndex).selectAll('path').transition('leafSize').duration(this.duration / 2).attr('d', this.line)
  }

  hideTooltip ({ palmTreeIndex }) {
    this.showTooltipActualState = false
    this.currentlyDisplayedTooltipIndex = null
    if (this.tip) { this.tip.hide() }
    d3.select('#littleTriangle').style('visibility', 'hidden')
    // TODO: this compute leafdata code is repeated in three places
    let i = palmTreeIndex
    for (let j = 0; j < this.colNames.length; j++) {
      let leafValue = this.linearRadialScale(this.normData[i][j])
      if (!this.settings.rawData[i][j]) {
        leafValue = 0
      }
      if (this.plotState.isColumnOn(j) < 0.5) {
        this.frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
          {x: leafValue * 0.25, y: -leafValue * 0.03},
          {x: leafValue * 0.75, y: -leafValue * 0.05},
          {x: leafValue, y: 0},
          {x: leafValue * 0.75, y: leafValue * 0.05},
          {x: leafValue * 0.25, y: leafValue * 0.03}]
      } else {
        this.frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
          {x: leafValue * 0.25, y: -leafValue * 0.07},
          {x: leafValue * 0.75, y: -leafValue * 0.13},
          {x: leafValue, y: 0},
          {x: leafValue * 0.75, y: leafValue * 0.13},
          {x: leafValue * 0.25, y: leafValue * 0.07}]
      }
    }
    this.palms.data(this.frondData)
    this.leaves.data(function (d) { return d.leaves })
    d3.select('#frond' + palmTreeIndex)
      .selectAll('path')
      .transition('leafSize')
      .duration(this.duration / 2)
      .attr('d', this.line)
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

  // update side bar content on initialization and resize
  draw (chartWindowSelection) {
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
        maxWidth: Math.floor(this.viewerWidth * 0.25),
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

    if (this.settings.barHeights) {
      if (this.settings.yprefix && this.settings.ysuffix && this.settings.showYAxis) {
        this.yPrefixText = this.settings.yprefix
        let prefixLength = 0
        plotArea.append('text')
          .style('font-size', '11px')
          .style('font-family', 'sans-serif')
          .text(this.settings.yprefix)
          .each(function () {
            prefixLength = this.getComputedTextLength()
          })
          .remove()
        this.leftMargin = this.leftMargin + prefixLength
      }
    } else {
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
      this.bottomMargin = this.bottomMargin + 20
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
    this.linearRadialScale = d3.scale.linear()
      .domain([this.minVal, this.maxVal])
      .range([this.param.maxLeafWidth * this.minVal / this.maxVal, this.param.maxLeafWidth])

    // TODO: this compute leafdata code is repeated in three places
    for (let i = 0; i < this.rowNames.length; i++) {
      let frondDatum = {}
      let leafData = []
      for (let j = 0; j < this.colNames.length; j++) {
        let leafValue = this.linearRadialScale(this.normData[i][j])
        if (!this.settings.rawData[i][j]) {
          leafValue = 0
        }
        if (this.plotState.isColumnOn(j) < 0.5) { // this means IF column is selected ...
          leafData.push([{x: 0, y: 0, i: i, j: j},
            {x: leafValue * 0.25, y: -leafValue * 0.03},
            {x: leafValue * 0.75, y: -leafValue * 0.05},
            {x: leafValue, y: 0},
            {x: leafValue * 0.75, y: leafValue * 0.05},
            {x: leafValue * 0.25, y: leafValue * 0.03}])
        } else {
          leafData.push([{x: 0, y: 0, i: i, j: j},
            {x: leafValue * 0.25, y: -leafValue * 0.07},
            {x: leafValue * 0.75, y: -leafValue * 0.13},
            {x: leafValue, y: 0},
            {x: leafValue * 0.75, y: leafValue * 0.13},
            {x: leafValue * 0.25, y: leafValue * 0.07}])
        }
      }
      frondDatum = {
        leaves: leafData,
        name: this.rowNames[i],
        value: this.weightedSums[i],
        index: i,
        tip: 's',
        tipR: d3.mean(this.normData[i]),
        tipMaxR: d3.max(this.normData[i])
      }
      this.frondData.push(frondDatum)
    }

    for (let i = 0; i < this.rowNames.length; i++) {
      this.barData.push({name: this.rowNames[i], value: this.weightedSums[i], index: i})
    }

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
      .call(this.wrapNew.bind(this), this.xscale.rangeBand())

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
    }

    this.leaves = palmEnter.attr('class', 'leaf')
      .attr('id', function (d) { return 'frond' + d.index })
      .selectAll('path')
      .data(function (d) { return d.leaves })

    this.leaves.enter().append('path')
      .style('cursor', 'pointer')
      .attr('class', function (d, i) { return `actual-leaf actual-leaf-${i}` })
      .attr('d', this.line)

    plotArea.selectAll('.leaf')
      .attr('transform', function (d) {
        return 'translate(' + (_this.xscale(d.name) + _this.xscale.rangeBand() / 2) + ',' + _this.yscale(d.value) + ')'
      })

    this.leaves.attr('transform', function (d, i) {
      return 'rotate(' + (i * 360 / _this.ncol - 90) + ')'
    })

    this.leaves.style('fill', function (d, i) {
      return _this.plotState.isColumnOn(i) === 0 ? '#ccc' : _this.colors[i]
    })

    // update html tip content on ghost rectangle
    const makeTipData = () => {
      for (let i = 0; i < this.rowNames.length; i++) {
        this.frondData[i].tip = makeTipContent({
          rowName: this.rowNames[i],
          rowIndex: i,
          columnNames: this.colNames,
          hFamily: this.settings.tooltipsHeadingFontFamily,
          hSize: this.settings.tooltipsHeadingFontSize,
          fFamily: this.settings.tooltipsFontFamily,
          fSize: this.settings.tooltipsFontSize,
          digits: this.settings.digits,
          prefix: this.settings.prefix,
          suffix: this.settings.suffix,
          data: this.settings.rawData[i],
          columnState: this.plotState.getState().selectedColumns,
          tipScale: this.tipBarScale,
          colors: this.colors
        })
      }
    }

    // work on tooltip
    if (this.settings.tooltips) {
      makeTipData()
      this.tip = d3Tip().attr('class', 'd3-tip')

      baseSvg.call(this.tip)

      d3.select('body')
        .append('div')
        .attr('id', 'littleTriangle')
        .style('visibility', 'hidden')

      const ghostPadding = 4
      baseSvg.selectAll('.ghostCircle')
        .attr('id', function (d, i) { return 'ghost' + i })
        .attr('x', function (d) {
          return -1 * (ghostPadding + this.parentNode.getBoundingClientRect().width / 2)
        })
        .attr('y', function (d) {
          return -1 * (ghostPadding + this.parentNode.getBoundingClientRect().height / 2)
        })
        .attr('width', function (d) { return this.parentNode.getBoundingClientRect().width + 2 * ghostPadding })
        .attr('height', function (d) { return this.parentNode.getBoundingClientRect().height + 2 * ghostPadding })
        .each((d) => { this.initR.push(this.linearRadialScale(d.tipMaxR)) })

      baseSvg.selectAll('.leaf')
        .on('mouseover', function (d, i) {
          _this.mouseOverFrond(d, this, baseSvg)
        })
        .on('mouseout', function (d, i) {
          _this.mouseOutFrond(d)
        })

      this.leaves
        .on('mouseover', function (leafData, leafIndex) {
          _this.mouseOverLeaf(leafData, leafIndex)
        })
        .on('mouseout', function (d, leafIndex) {
          _this.mouseOutLeaf(d)
        })
        .on('click', (d) => {
          let index = d[0].j
          // if (d3.event.defaultPrevented) return // click suppressed
          tooltipLogger.debug('clickLeaf')
          this.showTooltipDesiredState = false
          this.updateToolTipWithDebounce(d)
          this.plotState.toggleColumnState(index)
          // d3.event.stopPropagation()
        })
    }

    if (this.settings.barHeights) {
      if (this.settings.showYAxis) {
        if (this.settings.yprefix || this.settings.ysuffix) {
          if (!this.settings.ysuffix) {
            plotArea.append('text')
              .attr('class', 'suffixText')
              .text(this.settings.yprefix)
              .style('font-size', this.settings.yFontSize + 'px')
              .style('font-family', this.settings.yFontFamily)
          } else {
            plotArea.append('text')
              .attr('class', 'suffixText')
              .text(this.settings.ysuffix)
              .style('font-size', this.settings.yFontSize + 'px')
              .style('font-family', this.settings.yFontFamily)
          }
          this.updateUnitPosition()
        }
      }
    } else {
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
    }

    this.updatePlot(this.duration, true)
  }

  updatePlot (duration, initialization) {
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
      if (this.settings.barHeights) {
        this.weightedSums[i] = this.settings.barHeights[i]
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
    } else {
      plotArea.select('.yaxis')
        .transition()
        .duration(this.duration)
        .call(this.yAxis)
        .selectAll('.tick text')
        .style('font-size', this.settings.yFontSize + 'px')
        .style('font-family', this.settings.yFontFamily)
    }

    this.bars.data(this.barData)
    this.palms.data(this.frondData)
    this.leaves.data(function (d) { return d.leaves })

    this.leaves.transition('leafColor')
      .duration(_this.duration)
      .attr('d', _this.line)
      .style('fill', function (d, i) {
        return _this.plotState.isColumnOn(i) === 0 ? '#ccc' : _this.colors[i]
      })

    baseSvg.selectAll('.sideBarColorBox').transition('boxColor')
      .duration(_this.duration)
      .style('fill', function (d, i) {
        return _this.plotState.isColumnOn(i) === 0 ? '#ccc' : _this.colors[i]
      })

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
        .call(_this.wrapNew.bind(_this), _this.xscale.rangeBand())

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
        .call(_this.wrapNew.bind(_this), _this.xscale.rangeBand())

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

module.exports = PalmTrees
