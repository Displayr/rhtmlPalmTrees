import d3 from 'd3'
import _ from 'lodash'
import * as log from 'loglevel'

const d3Tip = require('d3-tip')
d3Tip(d3)
log.setLevel('info') // NB default, adjusted later in init_logger

const defaultSettings = {
  'colFontSize': 11,
  'colFontFamily': 'sans-serif',
  'colHeadingFontSize': 0,
  'colHeadingFontFamily': 'sans-serif',
  'rowFontSize': 11,
  'rowFontFamily': 'sans-serif',
  'columnHeading': '',
  'rowHeading': '',
  'rowHeadingFontSize': 12,
  'rowHeadingFontFamily': 'sans-serif'
}

class PalmTrees {
  constructor () {
    this.viewerWidth = 600 // default width
    this.viewerHeight = 600 // default height
    this.init()
  }

  init () {
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
    this.selectedCol = []
    this.unweightedSums = []
    this.weightedSums = []
    this.barData = []
    this.frondData = []
    this.sdBarLeafData = []
    this.maxVal = null // TODO rename
    this.minVal = null // TODO rename
    this.rindices = null
    this.colSort = '3'
    this.colSortRestore = false
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
    this.tip = null
    this.leafTip = null
    this.maxXaxisLines = 1
    this.xFontSize = 11
    this.initR = []
    this.yPrefixText = ''
    this.leaves = null
    this.sdBarPalms = null
    this.sdBarLeaves = null
    this.commasFormatter = null
    this.commasFormatterE = null
    this.leafTips = []
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

    for (let i = 0; i < this.colNames.length; i++) {
      this.selectedCol.push(1)
    }

    let wtSum, unwtSum
    // compute weighted sum
    for (let i = 0; i < this.rowNames.length; i++) {
      wtSum = 0
      unwtSum = 0
      for (let j = 0; j < this.colNames.length; j++) {
        wtSum += this.selectedCol[j] * this.weights[j] * value[i][j]
        unwtSum += this.selectedCol[j] * value[i][j]
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

    this.param.sdBarMaxTxtL = 0
    for (let i = 0; i < this.colNames.length; i++) {
      this.param.sdBarMaxTxtL = Math.max(this.param.sdBarMaxTxtL, this.colNames[i].length)
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

  checkState (state) {
    let savedData = state.data
    if (this.data && savedData && this.data[0] && savedData[0]) {
      if (savedData.length !== this.data.length || savedData[0].length !== this.data[0].length) {
        return false
      }
    } else {
      return false
    }

    for (let i = 0; i < this.rowNames.length; i++) {
      for (let j = 0; j < this.colNames.length; j++) {
        if (this.data[i][j] !== savedData[i][j]) {
          return false
        }
      }
    }

    return true
  }

  resetState () {
    this.saveStatesFn(null)
    return this
  }

  // loads the state of the widget if it is saved
  restoreState (state) {
    this.colSort = state.colSort
    this.colSortRestore = true
    this.selectedCol = []
    for (let i = 0; i < this.settings.colNames.length; i++) {
      this.selectedCol.push(state.selectedCol[i])
    }
  }

  // set the state saver function
  stateSaver (stateChanged) {
    if (!arguments.length) return this.saveStatesFn
    this.saveStatesFn = stateChanged
  }

  saveStates () {
    if (_.isFunction(this.saveStatesFn)) {
      // save selectedCol and this.colSort
      this.saveStatesFn({
        selectedCol: this.selectedCol,
        colSort: this.colSort,
        data: this.data
      })
    }
  }

  // resize
  resize (el) {
    d3.select(el).select('svg')
      .attr('width', this.viewerWidth)
      .attr('height', this.viewerHeight)

    let baseSvg = d3.select(el).select('svg')

    if (this.viewerHeight < 100) {
      return
    }

    if (this.viewerWidth < 200) {
      return
    }

    // sidebar
    this.initSidebarParam()
    this.updateSidebar(baseSvg)
    // main plot area
    this.plotMargin.top = this.viewerHeight * 0.1
    this.plotMargin.right = 10 + this.param.sdBarWidth
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
      .attr('x', function (d) { return this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2) })
      .attr('y', function (d) { return this.yscale(d.value) })
      .attr('height', function (d) { return this.plotHeight - this.yscale(d.value) })
    baseSvg.selectAll('.plotAreaHeading')
      .attr('x', this.plotWidth / 2)
      .attr('y', this.plotHeight + this.plotMargin.bottom - 10)
    baseSvg.selectAll('.plotAreaYLab')
      .attr('transform', 'rotate(-90,' + (-this.plotMargin.left + 20) + ',' + (this.plotHeight / 2) + ')')
      .attr('x', -this.plotMargin.left + 20)
      .attr('y', this.plotHeight / 2)

    baseSvg.selectAll('.leaf')
      .attr('transform', function (d) {
        return 'translate(' + (this.xscale(d.name) + this.xscale.rangeBand() / 2) + ',' + this.yscale(d.value) + ')'
      })
    this.leaves.attr('d', this.line)

    if (this.settings.tooltips) {
      this.tip.destroy()
      this.leafTip.destroy()
      this.tip = d3Tip()
        .attr('class', 'd3-tip')
        .html(function (d) { return d.tip })
      this.leafTip = d3Tip()
        .attr('class', 'd3-tip1')
        .html(function (d, i) { return this.leafTips[d[0].i][d[0].j] })

      baseSvg.call(this.tip).call(this.leafTip)
      baseSvg.selectAll('.ghostCircle')
        .attr('x', function (d) {
          return Number(d3.select(this).attr('x')) * this.linearRadialScale(d.tipMaxR) / this.initR[d.index]
        })
        .attr('y', function (d) {
          return Number(d3.select(this).attr('y')) * this.linearRadialScale(d.tipMaxR) / this.initR[d.index]
        })
        .attr('width', function (d) {
          return Number(d3.select(this).attr('width')) * this.linearRadialScale(d.tipMaxR) / this.initR[d.index]
        })
        .attr('height', function (d) {
          return Number(d3.select(this).attr('height')) * this.linearRadialScale(d.tipMaxR) / this.initR[d.index]
        })
        .each((d) => { this.initR[d.index] = this.linearRadialScale(d.tipMaxR) })

      baseSvg.selectAll('.leaf')
        .on('mouseover', function (d) {
          this.mouseOverFrond(d, this, baseSvg)
        })
        .on('mouseout', function (d) {
          this.mouseOutFrond(d)
        })

      this.leaves.on('mouseover', function (d) {
        this.mouseOverLeaf(d, this, baseSvg)
      })
        .on('mouseout', function (d) {
          this.mouseOutLeaf(d)
        })
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
    for (let i = 0; i < this.rowNames.length; i++) {
      this.barData[i].value = this.weightedSums[i]
      this.frondData[i].value = this.weightedSums[i]
      for (let j = 0; j < this.colNames.length; j++) {
        let leafValue = this.linearRadialScale(this.normData[i][j])
        if (!this.settings.rawData[i][j]) {
          leafValue = 0
        }
        if (this.selectedCol[j] < 0.5) {
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
    const logger = log.getLogger('tips')

    let ghostRect = sel.select('#ghost' + d.index)
    let ghostRectHtmlElement = ghostRect[0][0]
    let ghostRectDimensions = ghostRectHtmlElement.getBoundingClientRect()
    let barRectBboxDimensions = sel.select('#bar' + d.index)[0][0].getBoundingClientRect()

    let thisTip = this.tip.show(d, ghostRectHtmlElement)
    let y = Number(ghostRect.attr('y'))
    let h = Number(ghostRect.attr('height'))

    let tipHeight = parseFloat(thisTip.style('height'))
    let tipWidth = parseFloat(thisTip.style('width'))
    let tipSouth = y + h + 5 + this.yscale(d.value) + this.plotMargin.top
    let tipNorth = y - 5 + this.yscale(d.value) + this.plotMargin.top

    const halfWidthOfTriangle = 7
    const heightOfTriangle = 10

    if (this.viewerHeight - tipSouth >= tipHeight) {
      logger.info('creating southward tip')
      thisTip = thisTip.direction('s').offset([10, 0]).show(d, ghostRectHtmlElement)

      d3.select('#littleTriangle')
        .attr('class', 'southTip')
        .style('visibility', 'visible')
        .style('top', `${ghostRectDimensions.y + ghostRectDimensions.height}px`)
        .style('left', `${barRectBboxDimensions.x - halfWidthOfTriangle}px`)
    } else if (tipNorth - tipHeight >= 0) {
      logger.info('creating northward tip')
      thisTip = thisTip.direction('n').offset([-10, 0]).show(d, ghostRectHtmlElement)
      d3.select('#littleTriangle')
        .attr('class', 'northTip')
        .style('visibility', 'visible')
        .style('top', `${ghostRectDimensions.y - heightOfTriangle}px`)
        .style('left', `${barRectBboxDimensions.x - halfWidthOfTriangle}px`)
    } else if (this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2) >= this.plotWidth * 0.5) {
      logger.info('creating westward tip')
      thisTip = thisTip.direction('w').offset([0, -10]).show(d, ghostRectHtmlElement)
      d3.select('#littleTriangle')
        .attr('class', 'westTip')
        .style('visibility', 'visible')
        .style('top', `${ghostRectDimensions.y + ghostRectDimensions.height / 2 - halfWidthOfTriangle}px`)
        .style('left', `${ghostRectDimensions.x - heightOfTriangle}px`)
    } else {
      logger.info('creating eastward tip')
      thisTip = thisTip.direction('e').offset([0, 10]).show(d, ghostRectHtmlElement)
      d3.select('#littleTriangle')
        .attr('class', 'eastTip')
        .style('visibility', 'visible')
        .style('top', `${ghostRectDimensions.y + ghostRectDimensions.height / 2 - halfWidthOfTriangle}px`)
        .style('left', `${ghostRectDimensions.x + ghostRectDimensions.width}px`)
    }

    if (parseFloat(thisTip.style('left')) < 0) {
      thisTip.style('left', '5px')
    } else if (parseFloat(thisTip.style('left')) + tipWidth > this.param.sdBarX) {
      thisTip.style('left', (this.param.sdBarX - 5 - tipWidth) + 'px')
    }
    if (parseFloat(thisTip.style('top')) < 0) {
      thisTip.style('top', '5px')
    } else if (parseFloat(thisTip.style('top')) + tipHeight > this.viewerHeight) {
      thisTip.style('top', this.viewerHeight - tipHeight - 5 + 'px')
    }

    let i = d.index
    let s = 1.1
    for (let j = 0; j < this.colNames.length; j++) {
      let leafValue = this.linearRadialScale(this.normData[i][j])
      if (!this.settings.rawData[i][j]) {
        leafValue = 0
      }
      if (this.selectedCol[j] < 0.5) {
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
    d3.select('#frond' + d.index).selectAll('path').transition('leafSize').duration(this.duration / 2).attr('d', this.line)
  }

  mouseOutFrond (d) {
    this.tip.hide(d)
    d3.select('#littleTriangle').style('visibility', 'hidden')
    let i = d.index
    for (let j = 0; j < this.colNames.length; j++) {
      let leafValue = this.linearRadialScale(this.normData[i][j])
      if (!this.settings.rawData[i][j]) {
        leafValue = 0
      }
      if (this.selectedCol[j] < 0.5) {
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
    d3.select('#frond' + d.index)
      .selectAll('path')
      .transition('leafSize')
      .duration(this.duration / 2)
      .attr('d', this.line)
  }

  // create leaf tooltip, which overlaps ghost rect tip to simulate selection effect
  mouseOverLeaf (d, el, sel) {
    let tipRect = sel.select('#ghost' + d[0].i)[0][0]
    let thisTip = this.leafTip.show(d, tipRect)
    let dPar = el.parentNode.__data__  // data of parent node

    let y = Number(sel.select('#ghost' + d[0].i).attr('y'))
    let h = Number(sel.select('#ghost' + d[0].i).attr('height'))

    // height of the tip
    let tipHeight = parseFloat(thisTip.style('height'))
    // width of the tip
    let tipWidth = parseFloat(thisTip.style('width'))
    // southward and northward tip top y position
    let tipSouth = y + h + 5 + this.yscale(dPar.value) + this.plotMargin.top
    let tipNorth = y - 5 + this.yscale(dPar.value) + this.plotMargin.top

    if (this.viewerHeight - tipSouth >= tipHeight) {
      // southward tip
      thisTip = thisTip.direction('s').offset([10, 0]).show(d, tipRect)

      if (parseFloat(thisTip.style('left')) < 0) {
        thisTip.style('left', '5px')
      } else if (parseFloat(thisTip.style('left')) + tipWidth > this.param.sdBarX) {
        thisTip.style('left', (this.param.sdBarX - 5 - tipWidth) + 'px')
      }
    } else if (tipNorth - tipHeight >= 0) {
      // northward tip
      thisTip = thisTip.direction('n').offset([-10, 0]).show(d, tipRect)

      if (parseFloat(thisTip.style('left')) < 0) {
        thisTip.style('left', '5px')
      } else if (parseFloat(thisTip.style('left')) + tipWidth > this.param.sdBarX) {
        thisTip.style('left', (this.param.sdBarX - 5 - tipWidth) + 'px')
      }
    } else if (this.xscale(dPar.name) + Math.round(this.xscale.rangeBand() / 2) >= this.plotWidth * 0.5) {
      // westward tip
      thisTip = thisTip.direction('w').offset([0, -10]).show(d, tipRect)
      if (parseFloat(thisTip.style('top')) < 0) {
        thisTip.style('top', '5px')
      } else if (parseFloat(thisTip.style('top')) + tipHeight > this.viewerHeight) {
        thisTip.style('top', this.viewerHeight - tipHeight - 5 + 'px')
      }
    } else {
      // eastward tip
      thisTip = thisTip.direction('e').offset([0, 10]).show(d, tipRect)

      if (parseFloat(thisTip.style('top')) < 0) {
        thisTip.style('top', '5px')
      } else if (parseFloat(thisTip.style('top')) + tipHeight > this.viewerHeight) {
        thisTip.style('top', this.viewerHeight - tipHeight - 5 + 'px')
      }
    }
  }

  mouseOutLeaf (d) {
    this.leafTip.hide(d)
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

  initSidebarParam () {
    this.param.sdBarOuterMargin = 5
    this.param.sdBarPadding = 3
    this.param.sdBarHdivF = 2   // ratio of height divided by font size
    this.param.sdBarY = this.param.sdBarOuterMargin + 0.5

    this.param.sdBarMaxWidth = Math.floor(this.viewerWidth * 0.25)
    this.param.sdBarMaxHeight = Math.floor(this.viewerHeight - 2 * this.param.sdBarOuterMargin)

    this.param.sdBarFontSize = this.settings.colFontSize
    this.param.sdBarHdFontSize = this.settings.colHeadingFontSize
    this.param.sdBarHdH = this.param.sdBarHdFontSize * this.param.sdBarHdivF
    this.param.sdBarElemH = this.param.sdBarFontSize * this.param.sdBarHdivF
    this.param.sdBarColorBarsH = this.param.sdBarElemH - 2 * this.param.sdBarPadding
    this.param.sdBarColorBarsW = Math.round(this.param.sdBarColorBarsH * 0.6)
    this.param.sdBarLeafR = (this.param.sdBarElemH - 2) / 2

    this.param.sdBarHdY = this.param.sdBarHdH / 2
    this.param.sdBarColorBarsY = this.param.sdBarHdH + this.param.sdBarPadding
  }

  // update side bar content on initialization and resize
  updateSidebar (baseSvg) {
    const _this = this
    this.param.sdBarMaxTextWidth = 0
    baseSvg.selectAll('.sideBarText')
      .style('font-size', this.param.sdBarFontSize + 'px')
      .each(function (d) {
        _this.param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), _this.param.sdBarMaxTextWidth)
      })

    this.param.sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth + 3 * this.param.sdBarPadding + this.param.sdBarColorBarsW + this.param.sdBarLeafR * 2)
    this.param.sdBarHeight = Math.ceil(this.param.sdBarHdH + this.colNames.length * this.param.sdBarElemH)

    const origSdBarHdFontSize = this.param.sdBarHdFontSize
    while (this.param.sdBarFontSize > 1 &&
    (this.param.sdBarWidth > this.param.sdBarMaxWidth || this.param.sdBarHeight > this.param.sdBarMaxHeight)) {
      log.getLogger('sizing').debug([
        'Shrinking sidebar dimensions:',
        `sdBarWidth(${this.param.sdBarWidth}) > sdBarMaxWidth(${this.param.sdBarMaxWidth}) || sdBarHeight(${this.param.sdBarHeight}) > sdBarMaxHeight(${this.param.sdBarMaxHeight})`,
        `sdBarFontSize(${this.param.sdBarFontSize})`,
        `sdBarHdFontSize(${this.param.sdBarHdFontSize})`,
        `sdBarHdH(${this.param.sdBarHdH})`,
        `sdBarElemH(${this.param.sdBarElemH})`,
        `sdBarColorBarsH(${this.param.sdBarColorBarsH})`,
        `sdBarColorBarsW(${this.param.sdBarColorBarsW})`
      ].join('\n'))

      this.param.sdBarFontSize = this.param.sdBarFontSize - 1
      this.param.sdBarHdFontSize = Math.min(origSdBarHdFontSize, this.param.sdBarFontSize + 2)
      this.param.sdBarHdH = this.param.sdBarHdFontSize * this.param.sdBarHdivF
      this.param.sdBarElemH = this.param.sdBarFontSize * this.param.sdBarHdivF
      this.param.sdBarColorBarsH = this.param.sdBarElemH - 2 * this.param.sdBarPadding
      this.param.sdBarColorBarsW = Math.round(this.param.sdBarColorBarsH * 0.6)

      this.param.sdBarHdY = this.param.sdBarHdH / 2
      this.param.sdBarColorBarsY = this.param.sdBarHdH + this.param.sdBarPadding
      this.param.sdBarMaxTextWidth = 0

      baseSvg.selectAll('.sideBarText')
        .style('font-size', this.param.sdBarFontSize + 'px')
        .each(function (d) {
          _this.param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), _this.param.sdBarMaxTextWidth)
        })

      this.param.sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth + 3 * this.param.sdBarPadding + this.param.sdBarColorBarsW + this.param.sdBarLeafR * 2)
      this.param.sdBarHeight = Math.ceil(this.param.sdBarHdH + this.colNames.length * this.param.sdBarElemH)
    }

    // account for heading
    baseSvg.select('.sdBarHeading')
      .style('font-size', this.param.sdBarHdFontSize + 'px')
      .each(function (d) {
        _this.param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), _this.param.sdBarMaxTextWidth)
      })

    // if heading is too long
    if (this.param.sdBarMaxTextWidth + 2 * this.param.sdBarPadding > this.param.sdBarWidth) {
      this.param.sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth + 2 * this.param.sdBarPadding)
    }

    // reduce heading font size
    while (this.param.sdBarWidth > this.param.sdBarMaxWidth) {
      this.param.sdBarHdFontSize = this.param.sdBarHdFontSize - 1
      this.param.sdBarHdH = this.param.sdBarHdFontSize * this.param.sdBarHdivF
      this.param.sdBarHdY = this.param.sdBarHdH / 2
      this.param.sdBarColorBarsY = this.param.sdBarHdH + this.param.sdBarPadding

      this.param.sdBarMaxTextWidth = 0
      const _this = this
      baseSvg.select('.sdBarHeading')
        .style('font-size', this.param.sdBarHdFontSize + 'px')
        .each(function (d) {
          _this.param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), _this.param.sdBarMaxTextWidth)
        })
      this.param.sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth + 2 * this.param.sdBarPadding)
      this.param.sdBarHeight = Math.ceil(this.param.sdBarHdH + this.colNames.length * this.param.sdBarElemH)
    }

    this.param.sdBarX = this.viewerWidth - this.param.sdBarOuterMargin - this.param.sdBarWidth - 0.5
    this.param.sdBarElemW = this.param.sdBarWidth
    this.param.sdBarLeafR = (this.param.sdBarElemH - 2) / 2
    for (let i = 0; i < this.colNames.length; i++) {
      for (let j = 0; j < this.colNames.length; j++) {
        this.sdBarLeafData[i].leaves[j] = [{x: 0, y: 0, color: this.colors[i], index: i},
          {x: this.param.sdBarLeafR * 0.25, y: -this.param.sdBarLeafR * 0.07},
          {x: this.param.sdBarLeafR * 0.75, y: -this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR, y: 0},
          {x: this.param.sdBarLeafR * 0.75, y: this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR * 0.25, y: this.param.sdBarLeafR * 0.07}]
      }
    }
    this.sdBarPalms.data(this.sdBarLeafData)
    this.sdBarLeaves.data(function (d) { return d.leaves })
    // transform the object into position
    baseSvg.select('#g_sideBarDisp').attr('transform', 'translate(' + this.param.sdBarX + ',' + this.param.sdBarY + ')')
    baseSvg.select('#g_sdBarControl').attr('transform', 'translate(' + this.param.sdBarX + ',' + this.param.sdBarY + ')')
    // set attributes
    baseSvg.select('.sideBar')
      .attr('x', this.param.sdBarX)
      .attr('y', this.param.sdBarY)
      .attr('width', this.param.sdBarWidth + 'px')
      .attr('height', this.param.sdBarHeight + 'px')

    // heading
    baseSvg.select('.sdBarHeading')
      .attr('x', this.param.sdBarPadding)
      .attr('y', this.param.sdBarHdY)
      .style('font-size', this.param.sdBarHdFontSize + 'px')

    baseSvg.selectAll('.sdBarElem')
      .attr('transform', function (d, i) {
        return 'translate(' + 0 + ',' + (_this.param.sdBarHdH + i * _this.param.sdBarElemH) + ')'
      })

    // column names
    baseSvg.selectAll('.sideBarText')
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarLeafR * 2 + this.param.sdBarColorBarsW)
      .attr('y', this.param.sdBarElemH / 2)
      .style('fill', function (d, i) {
        return _this.selectedCol[i] === 0 ? '#aaa' : '#000'
      })

    baseSvg.selectAll('.sideBarFrond')
      .attr('transform', 'translate(' + this.param.sdBarElemH / 2 + ',' + this.param.sdBarElemH / 2 + ')')
      .selectAll('path')
      .attr('d', this.line)

    // column this.colors
    baseSvg.selectAll('.sideBarColorBox')
      .attr('x', this.param.sdBarPadding + this.param.sdBarLeafR * 2 + 0.5)
      .attr('y', this.param.sdBarPadding + 0.5)
      .attr('width', this.param.sdBarColorBarsW - 1)
      .attr('height', this.param.sdBarColorBarsH - 1)
      .style('fill', function (d, i) {
        return _this.selectedCol[i] === 0 ? '#ccc' : _this.colors[i]
      })

    baseSvg.selectAll('.sideBarElemRect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.param.sdBarElemW + 'px')
      .attr('height', this.param.sdBarElemH + 'px')

    // set font size on hover: height
    this.param.sdBarMenuItems = 4
    this.param.sdBarHoverFontSize = this.param.sdBarFontSize
    this.param.sdBarHoverElemH = this.param.sdBarElemH
    this.param.sdBarHoverColorBarsW = this.param.sdBarColorBarsW
    this.param.sdBarHoverColorBarsH = this.param.sdBarColorBarsH
    this.param.sdBarHoverColorBarsY = this.param.sdBarColorBarsY
    this.param.sdBarHoverHeight = this.param.sdBarHeight
    while (this.param.sdBarHoverFontSize > 1 &&
    (this.param.sdBarHoverHeight + this.param.sdBarHoverElemH * (this.param.sdBarMenuItems + 2) > this.viewerHeight - 2 * this.param.sdBarY)) {
      this.param.sdBarHoverFontSize = this.param.sdBarHoverFontSize - 1
      this.param.sdBarHoverElemH = this.param.sdBarHoverFontSize * this.param.sdBarHdivF
      this.param.sdBarHoverColorBarsH = this.param.sdBarHoverElemH - 2 * this.param.sdBarPadding
      this.param.sdBarHoverColorBarsW = Math.round(this.param.sdBarHoverColorBarsH * 0.6)

      this.param.sdBarHoverColorBarsY = this.param.sdBarHdH + this.param.sdBarPadding
      this.param.sdBarHoverHeight = Math.ceil(this.param.sdBarHdH + this.colNames.length * this.param.sdBarHoverElemH)
    }

    // set font size on hover: width
    this.param.sdBarHoverX = this.param.sdBarX
    this.param.sdBarHoverDeltaX = 0
    this.param.sdBarHoverWidth = this.param.sdBarWidth
    this.param.sdBarHoverElemW = this.param.sdBarHoverWidth

    this.param.sdBarMaxTextWidth = 0
    baseSvg.selectAll('.sdBarSortText')
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarHoverColorBarsW)
      .attr('y', function (d, i) {
        return _this.param.sdBarHdH + _this.param.sdBarHoverElemH / 2 +
          2 * _this.param.sdBarHoverElemH + i * _this.param.sdBarHoverElemH
      })
      .style('font-size', this.param.sdBarHoverFontSize + 'px')
      .each(function () {
        _this.param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), _this.param.sdBarMaxTextWidth)
      })
    this.param.sdBarCtrlWidth = Math.ceil(this.param.sdBarMaxTextWidth + 3 * this.param.sdBarPadding + this.param.sdBarHoverColorBarsW)

    if (this.param.sdBarCtrlWidth > this.param.sdBarHoverWidth) {
      this.param.sdBarHoverWidth = this.param.sdBarCtrlWidth
      this.param.sdBarHoverElemW = this.param.sdBarHoverWidth
      this.param.sdBarHoverX = this.viewerWidth - this.param.sdBarOuterMargin - this.param.sdBarHoverWidth - 0.5
      this.param.sdBarHoverDeltaX = this.param.sdBarX - this.param.sdBarHoverX
    }

    // All on and all off buttons
    baseSvg.selectAll('.sdBarAllRect')
      .attr('x', function (d, i) {
        return i === 0 ? 0 : Math.floor(_this.param.sdBarElemW / 2)
      })
      .attr('y', this.param.sdBarHdH)
      .attr('width', function (d, i) {
        return i === 0 ? Math.floor(_this.param.sdBarElemW / 2) : Math.ceil(_this.param.sdBarElemW / 2)
      })
      .attr('height', this.param.sdBarHoverElemH)

    baseSvg.select('.sdBarAllOn')
      .attr('x', this.param.sdBarElemW / 4)
      .attr('y', this.param.sdBarHdH + this.param.sdBarHoverElemH / 2)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')

    baseSvg.select('.sdBarAllOff')
      .attr('x', this.param.sdBarElemW * 3 / 4)
      .attr('y', this.param.sdBarHdH + this.param.sdBarHoverElemH / 2)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')

    baseSvg.selectAll('.sdBarSortText')
      .style('font-size', this.param.sdBarHoverFontSize + 'px')
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarColorBarsW)

    baseSvg.select('.sdBarSortHeading')
      .attr('x', this.param.sdBarPadding)
      .attr('y', this.param.sdBarHdH + this.param.sdBarHoverElemH / 2 + this.param.sdBarHoverElemH)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')

    baseSvg.selectAll('.sideBarElemSortRect')
      .attr('x', 0)
      .attr('y', function (d, i) {
        return _this.param.sdBarHdH + 2 * _this.param.sdBarHoverElemH + i * _this.param.sdBarHoverElemH
      })
      .attr('width', this.param.sdBarElemW + 'px')
      .attr('height', this.param.sdBarHoverElemH + 'px')

    baseSvg.selectAll('.sdBarSortBox')
      .attr('cx', this.param.sdBarPadding + 0.5 + this.param.sdBarHoverColorBarsW * 0.5)
      .attr('cy', function (d, i) {
        return _this.param.sdBarHdH + _this.param.sdBarHoverElemH / 2 +
          2 * _this.param.sdBarHoverElemH + i * _this.param.sdBarHoverElemH
      })
      .attr('r', this.param.sdBarHoverColorBarsW * 0.35)

    let dur = 200
    baseSvg.select('#g_sideBar')
      .on('mouseenter', function () {
        _this.param.sdBarLeafR = (_this.param.sdBarHoverElemH - 2) / 2
        for (let i = 0; i < _this.colNames.length; i++) {
          for (let j = 0; j < _this.colNames.length; j++) {
            _this.sdBarLeafData[i].leaves[j] = [
              {x: 0, y: 0, color: _this.colors[i], index: i},
              {x: _this.param.sdBarLeafR * 0.25, y: -_this.param.sdBarLeafR * 0.07},
              {x: _this.param.sdBarLeafR * 0.75, y: -_this.param.sdBarLeafR * 0.13},
              {x: _this.param.sdBarLeafR, y: 0},
              {x: _this.param.sdBarLeafR * 0.75, y: _this.param.sdBarLeafR * 0.13},
              {x: _this.param.sdBarLeafR * 0.25, y: _this.param.sdBarLeafR * 0.07}]
          }
        }
        _this.sdBarPalms.data(_this.sdBarLeafData)
        _this.sdBarLeaves.data(function (d) { return d.leaves })

        baseSvg.selectAll('.sdBarElem')
          .transition()
          .duration(dur)
          .attr('transform', function (d, i) {
            return 'translate(' + 0 + ',' + (_this.param.sdBarHdH + i * _this.param.sdBarHoverElemH) + ')'
          })

        baseSvg.selectAll('.sideBarElemRect')
          .transition()
          .duration(dur)
          .attr('width', _this.param.sdBarHoverElemW + 'px')
          .attr('height', _this.param.sdBarHoverElemH + 'px')

        baseSvg.selectAll('.sideBarFrond')
          .transition()
          .duration(dur)
          .attr('transform', 'translate(' + _this.param.sdBarHoverElemH / 2 + ',' + _this.param.sdBarHoverElemH / 2 + ')')
          .selectAll('path')
          .attr('d', _this.line)

        baseSvg.selectAll('.sideBarColorBox')
          .transition()
          .duration(dur)
          .attr('x', _this.param.sdBarPadding + _this.param.sdBarLeafR * 2 + 0.5)
          .attr('width', _this.param.sdBarHoverColorBarsW - 1)
          .attr('height', _this.param.sdBarHoverColorBarsH - 1)

        baseSvg.selectAll('.sideBarText')
          .transition()
          .duration(dur)
          .attr('x', 2 * _this.param.sdBarPadding + _this.param.sdBarLeafR * 2 + _this.param.sdBarHoverColorBarsW)
          .attr('y', _this.param.sdBarHoverElemH / 2)
          .style('font-size', _this.param.sdBarHoverFontSize + 'px')

        baseSvg.select('.sideBar')
          .transition()
          .duration(dur)
          .attr('x', _this.param.sdBarHoverX)
          .attr('width', _this.param.sdBarHoverWidth)
          .attr('height', _this.param.sdBarHoverHeight + _this.param.sdBarHoverElemH * 6)

        baseSvg.selectAll('.sdBarAllRect')
          .transition()
          .duration(dur)
          .attr('x', function (d, i) {
            return i === 0 ? 0 : Math.floor(_this.param.sdBarHoverElemW / 2)
          })
          .attr('width', function (d, i) {
            return i === 0 ? Math.floor(_this.param.sdBarHoverElemW / 2) : Math.ceil(_this.param.sdBarHoverElemW / 2)
          })

        baseSvg.select('.sdBarAllOn')
          .transition()
          .duration(dur)
          .attr('x', _this.param.sdBarHoverElemW / 4)

        baseSvg.select('.sdBarAllOff')
          .transition()
          .duration(dur)
          .attr('x', _this.param.sdBarHoverElemW * 3 / 4)

        baseSvg.selectAll('.sideBarElemSortRect')
          .transition()
          .duration(dur)
          .attr('width', _this.param.sdBarHoverElemW + 'px')

        baseSvg.selectAll('.sdBarSortText')
          .transition()
          .duration(dur)
          .style('font-size', _this.param.sdBarHoverFontSize + 'px')
          .attr('x', 2 * _this.param.sdBarPadding + _this.param.sdBarHoverColorBarsW)

        baseSvg.select('#g_sdBarControl')
          .transition()
          .duration(dur)
          .style('display', 'inline')
          .attr('transform', 'translate(' + _this.param.sdBarHoverX + ',' + (_this.param.sdBarY + _this.ncol * _this.param.sdBarHoverElemH) + ')')

        baseSvg.select('#g_sideBarDisp')
          .transition()
          .duration(dur)
          .attr('transform', 'translate(' + _this.param.sdBarHoverX + ',' + _this.param.sdBarY + ')')
      })
      .on('mouseleave', function () {
        _this.param.sdBarLeafR = (_this.param.sdBarElemH - 2) / 2
        for (let i = 0; i < _this.colNames.length; i++) {
          for (let j = 0; j < _this.colNames.length; j++) {
            _this.sdBarLeafData[i].leaves[j] = [{x: 0, y: 0, color: _this.colors[i], index: i},
              {x: _this.param.sdBarLeafR * 0.25, y: -_this.param.sdBarLeafR * 0.07},
              {x: _this.param.sdBarLeafR * 0.75, y: -_this.param.sdBarLeafR * 0.13},
              {x: _this.param.sdBarLeafR, y: 0},
              {x: _this.param.sdBarLeafR * 0.75, y: _this.param.sdBarLeafR * 0.13},
              {x: _this.param.sdBarLeafR * 0.25, y: _this.param.sdBarLeafR * 0.07}]
          }
        }
        _this.sdBarPalms.data(_this.sdBarLeafData)
        _this.sdBarLeaves.data(function (d) { return d.leaves })

        baseSvg.selectAll('.sdBarElem')
          .transition()
          .duration(dur)
          .attr('transform', function (d, i) {
            return 'translate(' + 0 + ',' + (_this.param.sdBarHdH + i * _this.param.sdBarElemH) + ')'
          })

        baseSvg.selectAll('.sideBarElemRect')
          .transition()
          .duration(dur)
          .attr('width', _this.param.sdBarElemW + 'px')
          .attr('height', _this.param.sdBarElemH + 'px')

        baseSvg.selectAll('.sideBarFrond')
          .transition()
          .duration(dur)
          .attr('transform', 'translate(' + _this.param.sdBarElemH / 2 + ',' + _this.param.sdBarElemH / 2 + ')')
          .selectAll('path')
          .attr('d', _this.line)

        baseSvg.selectAll('.sideBarColorBox')
          .transition()
          .duration(dur)
          .attr('x', _this.param.sdBarPadding + _this.param.sdBarLeafR * 2 + 0.5)
          .attr('width', _this.param.sdBarColorBarsW - 1)
          .attr('height', _this.param.sdBarColorBarsH - 1)

        baseSvg.selectAll('.sideBarText')
          .transition()
          .duration(dur)
          .attr('x', 2 * _this.param.sdBarPadding + _this.param.sdBarLeafR * 2 + _this.param.sdBarColorBarsW)
          .attr('y', _this.param.sdBarElemH / 2)
          .style('font-size', _this.param.sdBarFontSize + 'px')

        baseSvg.selectAll('.sdBarAllRect')
          .transition()
          .duration(dur)
          .attr('x', function (d, i) {
            return i === 0 ? 0 : Math.floor(_this.param.sdBarElemW / 2)
          })
          .attr('width', function (d, i) {
            return i === 0 ? Math.floor(_this.param.sdBarElemW / 2) : Math.ceil(_this.param.sdBarElemW / 2)
          })

        baseSvg.select('.sdBarAllOn')
          .transition()
          .duration(dur)
          .attr('x', _this.param.sdBarElemW / 4)

        baseSvg.select('.sdBarAllOff')
          .transition()
          .duration(dur)
          .attr('x', _this.param.sdBarElemW * 3 / 4)

        baseSvg.selectAll('.sideBarElemSortRect')
          .transition()
          .duration(dur)
          .attr('width', _this.param.sdBarElemW + 'px')

        baseSvg.selectAll('.sdBarSortText')
          .transition()
          .duration(dur)
          .style('font-size', _this.param.sdBarHoverFontSize + 'px')
          .attr('x', 2 * _this.param.sdBarPadding + _this.param.sdBarColorBarsW)

        baseSvg.select('#g_sdBarControl')
          .transition()
          .duration(dur)
          .attr('transform', 'translate(' + _this.param.sdBarX + ',' + _this.param.sdBarY + ')')
          .style('display', 'none')

        baseSvg.select('#g_sideBarDisp')
          .transition()
          .duration(dur)
          .attr('transform', 'translate(' + _this.param.sdBarX + ',' + _this.param.sdBarY + ')')

        baseSvg.select('.sideBar')
          .transition()
          .duration(dur)
          .attr('x', _this.param.sdBarX)
          .attr('width', _this.param.sdBarWidth)
          .attr('height', _this.param.sdBarHeight)
      })
  }

  draw (chartWindowSelection) {
    let baseSvg = chartWindowSelection.select('svg')
    const _this = this

    this.line = d3.svg.line()
      .interpolate('cardinal-closed')
      .x(function (d) { return d.x })
      .y(function (d) { return d.y })

    /* create the side bar */
    /* this part goes first to set plot width */

    this.initSidebarParam()

    let plotArea = baseSvg.append('g').attr('id', 'g_plotArea')

    let sideBar = baseSvg.append('g').attr('id', 'g_sideBar')
    sideBar.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('class', 'sideBar')

    let sdBarCtrl = sideBar.append('g').attr('id', 'g_sdBarControl').style('display', 'none')
    let sdBarDisp = sideBar.append('g').attr('id', 'g_sideBarDisp')

    sdBarCtrl.selectAll('option')
      .data([1, 2])
      .enter()
      .append('rect')
      .attr('class', 'sdBarAllRect')
      .attr('id', function (d, i) { return 'sdAC' + i })

    sdBarCtrl.append('text')
      .attr('class', 'sdBarAllOn')
      .attr('dy', '0.35em')
      .text('All On')
      .style('text-anchor', 'middle')
      .style('font-family', this.settings.colFontFamily)

    sdBarCtrl.append('text')
      .attr('class', 'sdBarAllOff')
      .attr('dy', '0.35em')
      .text('All Off')
      .style('text-anchor', 'middle')
      .style('font-family', this.settings.colFontFamily)

    sdBarCtrl.append('text')
      .attr('class', 'sdBarSortHeading')
      .attr('dy', '0.35em')
      .text('Order')
      .style('font-family', this.settings.colFontFamily)

    let sortText = ['Original', 'Alphabetical', 'Ascending', 'Descending']
    let sdBarCtrlEnter = sdBarCtrl.selectAll('g.span')
      .data(sortText)
      .enter()
      .append('g')

    sdBarCtrlEnter.append('rect')
      .attr('class', 'sideBarElemSortRect')
      .attr('id', function (d, i) { return 's' + i })

    sdBarCtrlEnter.append('circle')
      .attr('class', 'sdBarSortBox')
      .attr('id', function (d, i) { return 'sortC' + i })

    sdBarCtrlEnter.append('text')
      .attr('class', 'sdBarSortText')
      .attr('id', function (d, i) { return 'sortT' + i })
      .attr('dy', '0.35em')
      .text(function (d) { return d })
      .style('font-family', this.settings.colFontFamily)

    sdBarDisp.append('text')
      .attr('class', 'sdBarHeading')
      .attr('dy', '0.35em')
      .text(this.settings.colHeading)
      .style('font-family', this.settings.colHeadingFontFamily)

    for (let i = 0; i < this.colNames.length; i++) {
      let sdBarLeafDatum = {}
      let sdBarLeaf = []
      for (let j = 0; j < this.colNames.length; j++) {
        sdBarLeaf.push([{x: 0, y: 0, color: this.colors[i], index: i},
          {x: this.param.sdBarLeafR * 0.25, y: -this.param.sdBarLeafR * 0.07},
          {x: this.param.sdBarLeafR * 0.75, y: -this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR, y: 0},
          {x: this.param.sdBarLeafR * 0.75, y: this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR * 0.25, y: this.param.sdBarLeafR * 0.07}])
      }
      sdBarLeafDatum = {leaves: sdBarLeaf, colName: this.colNames[i], color: this.colors[i], index: i}
      this.sdBarLeafData.push(sdBarLeafDatum)
    }

    this.sdBarPalms = sdBarDisp.selectAll('sdBar.g')
      .data(this.sdBarLeafData)
    let sdBarElemEnter = this.sdBarPalms.enter()
      .append('g')
      .attr('class', 'sdBarElem')

    sdBarElemEnter.append('rect')
      .attr('class', 'sideBarElemRect')
      .attr('id', function (d, i) { return 'sbRect' + i })

    this.sdBarLeaves = sdBarElemEnter.append('g')
      .attr('class', 'sideBarFrond')
      .attr('id', function (d, i) { return 'sbFrond' + i })
      .selectAll('.le')
      .data(function (d) { return d.leaves })

    this.sdBarLeaves.enter()
      .append('path')
      .attr('d', this.line)
      .attr('transform', function (d, i) {
        return 'rotate(' + (i * 360 / _this.ncol - 90) + ')'
      })
      .style('fill', function (d, i) {
        if (d[0].index === i) {
          return '#000'
        } else {
          return '#ccc'
        }
      })

    sdBarElemEnter.append('rect')
      .attr('class', 'sideBarColorBox')
      .attr('id', function (d, i) { return 'sbColor' + i })

    sdBarElemEnter.append('text')
      .attr('class', 'sideBarText')
      .attr('id', function (d, i) { return 'sbTxt' + i })
      .attr('dy', '0.35em')
      .text(function (d) { return d.colName })
      .style('font-family', this.settings.colFontFamily)

    this.updateSidebar(baseSvg)

    function toggleColumn () {
      if (d3.event.defaultPrevented) return // click suppressed

      let index = Number(this.id.substring(6))
      if (_this.selectedCol[index] === 0) {
        _this.selectedCol[index] = 1
      } else {
        _this.selectedCol[index] = 0
      }
      _this.saveStates()
      updatePlot(_this.duration, false)
      d3.event.stopPropagation()
    }

    function toggleLeaf (d, sel) {
      if (d3.event.defaultPrevented) return // click suppressed

      if (_this.selectedCol[d[0].j] === 0) {
        _this.selectedCol[d[0].j] = 1
      } else {
        _this.selectedCol[d[0].j] = 0
      }
      _this.saveStates()
      updatePlot(_this.duration, false)
      d3.event.stopPropagation()
    }

    baseSvg.selectAll('.sideBarElemRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', '#eee')
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', 'white')
        d3.event.stopPropagation()
      })
      .on('click', toggleColumn)

    function clickAllToggle () {
      if (d3.event.defaultPrevented) return // click suppressed
      if (this.id.substring(4) === '0') {
        _this.selectedCol.forEach(function (d, i) {
          _this.selectedCol[i] = 1
        })
      } else {
        _this.selectedCol.forEach(function (d, i) {
          _this.selectedCol[i] = 0
        })
      }
      _this.saveStates()
      updatePlot(_this.duration, false)
      d3.event.stopPropagation()
    }

    baseSvg.selectAll('.sdBarAllRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', '#eee')
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', 'white')
        d3.event.stopPropagation()
      })
      .on('click', clickAllToggle)

    // sort rows
    function clickSort () {
      if (d3.event.defaultPrevented) return // click suppressed
      let thisid = this.id.substring(1)

      if (thisid !== _this.colSort) {
        _this.colSort = thisid
        _this.saveStates()
        sdBarCtrl.selectAll('.sdBarSortBox').style('fill', '#fff').style('stroke', '#999')
        sdBarCtrl.selectAll('.sdBarSortText').style('fill', '#999')

        sdBarCtrl.select('#sortC' + thisid).style('fill', 'steelblue').style('stroke', 'steelblue')
        sdBarCtrl.select('#sortT' + thisid).style('fill', '#000')

        sortBars(false)
      }
    }

    baseSvg.selectAll('.sideBarElemSortRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', '#eee')
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', 'white')
        d3.event.stopPropagation()
      })

    if (!this.colSortRestore) {
      switch (this.settings.order) {
        case 'original':
          this.colSort = '0'
          break
        case 'alphabetical':
          this.colSort = '1'
          break
        case 'ascending':
          this.colSort = '2'
          break
        case 'descending':
          this.colSort = '3'
          break
      }
    }

    sdBarCtrl.select('#sortC' + this.colSort).style('fill', 'steelblue').style('stroke', 'steelblue')
    sdBarCtrl.select('#sortT' + this.colSort).style('fill', '#000')
    sdBarCtrl.selectAll('.sideBarElemSortRect').on('click', clickSort)

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
      right: 10 + this.param.sdBarWidth,
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

    this.param.maxLeafWidth = Math.min(this.plotMargin.top, Math.floor((this.xscale.range()[1] - this.xscale.range()[0]) / 1.4), 60)
    this.linearRadialScale = d3.scale.linear()
      .domain([this.minVal, this.maxVal])
      .range([this.param.maxLeafWidth * this.minVal / this.maxVal, this.param.maxLeafWidth])

    for (let i = 0; i < this.rowNames.length; i++) {
      let frondDatum = {}
      let leafData = []
      for (let j = 0; j < this.colNames.length; j++) {
        let leafValue = this.linearRadialScale(this.normData[i][j])
        if (!this.settings.rawData[i][j]) {
          leafValue = 0
        }
        if (this.selectedCol[j] < 0.5) {
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

    this.bars = plotArea.selectAll('.vbar')
      .data(this.barData)
    let barsEnter = this.bars.enter()
    let barRect = barsEnter.append('rect')

    this.palms = plotArea.selectAll('.palm')
      .data(this.frondData)

    let palmEnter = this.palms.enter().append('g')

    // let xtickRect = barsEnter.append("rect")
    //                        .attr("class", "xtickBg");

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

    plotArea.attr('transform', 'translate(' + this.plotMargin.left + ',' + this.plotMargin.top + ')')

    if (this.settings.showYAxis) {
      plotArea.append('g')
        .attr('class', 'yaxis')
        .call(this.yAxis)
        .selectAll('.tick text')
        .style('font-size', this.settings.yFontSize + 'px')
        .style('font-family', this.settings.yFontFamily)
    }

    // vertical this.bars

    barRect.attr('class', 'bar')
      .attr('id', function (d) { return `bar${d.index}` })
      .attr('x', function (d) { return _this.xscale(d.name) + Math.round(_this.xscale.rangeBand() / 2) })
      .attr('width', 1)
      .attr('y', function (d) { return _this.yscale(d.value) })
      .attr('height', function (d) { return _this.plotHeight - _this.yscale(d.value) })

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
      return _this.selectedCol[i] === 0 ? '#ccc' : _this.colors[i]
    })

    // update html tip content on ghost rectangle
    const makeTipData = () => {
      let val
      for (let i = 0; i < this.rowNames.length; i++) {
        let atip = ''

        atip = atip + '<div class=\'tipHeading\' style=\'font-family:' + this.settings.tooltipsHeadingFontFamily + ';font-size:' + this.settings.tooltipsHeadingFontSize + 'px' + '\'>' + this.rowNames[i]
        if (this.settings.ylab) {
          if (this.settings.barHeights) {
            atip = atip + ' - ' + this.settings.ylab + ' '
            if (this.settings.yprefix) {
              atip = atip + this.settings.yprefix + this.weightedSums[i].toFixed(this.settings.digits)
            } else {
              atip = atip + this.weightedSums[i].toFixed(this.settings.digits)
            }
            if (this.settings.ysuffix) {
              atip = atip + this.settings.ysuffix
            }
          } else {
            atip = atip + ' -'
            if (this.settings.ylab) {
              atip = atip + ' ' + this.settings.ylab
            }
            atip = atip + ' '
            if (this.settings.prefix) {
              atip = atip + this.settings.prefix + this.weightedSums[i].toFixed(this.settings.digits)
            } else {
              atip = atip + this.weightedSums[i].toFixed(this.settings.digits)
            }
            if (this.settings.suffix) {
              atip = atip + this.settings.suffix
            }
          }
        }

        atip = atip + '</div>'
        atip = atip + '<div class=\'tipTableContainer\'>' + '<table class=\'tipTable\'>'
        for (let j = 0; j < this.colNames.length; j++) {
          atip = atip + '<tr>'
          // val = round(this.data[i][j],2) >= 0.01? data[i][j].toFixed(this.settings.digits) : 0;
          val = this.data[i][j].toFixed(this.settings.digits)
          if (this.selectedCol[j] === 1) {
            if (this.settings.rawData[i][j]) {
              if (this.settings.prefix) {
                if (this.settings.suffix) {
                  atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'>' + this.settings.prefix + val + this.settings.suffix + '</td>'
                } else {
                  atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'>' + this.settings.prefix + val + '</td>'
                }
              } else {
                if (this.settings.suffix) {
                  atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'>' + val + this.settings.suffix + '</td>'
                } else {
                  atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'>' + val + '</td>'
                }
              }
            } else {
              atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'>' + 'No data' + '</td>'
            }

            atip = atip + '<td style=\'text-align:left;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'>' + this.colNames[j] + '</td>'
            atip = atip + '<td style=\'text-align:center\'>'
            atip = atip + '<div style=\'width:' + this.tipBarScale(this.data[i][j]) + 'px;height:8px;background-color:' + this.colors[j] + '\'></div>' + '</td>'
          } else {
            if (this.settings.rawData[i][j]) {
              if (this.settings.prefix) {
                if (this.settings.suffix) {
                  atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + this.settings.prefix + val + this.settings.suffix + '</font></td>'
                } else {
                  atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + this.settings.prefix + val + '</font></td>'
                }
              } else {
                if (this.settings.suffix) {
                  atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + val + this.settings.suffix + '</font></td>'
                } else {
                  atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + val + '</font></td>'
                }
              }
            } else {
              atip = atip + '<td style=\'text-align:right;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + 'No data' + '</font></td>'
            }

            atip = atip + '<td style=\'text-align:left;font-family:' + this.settings.tooltipsFontFamily + ';font-size:' + this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + this.colNames[j] + '</font></td>'
            atip = atip + '<td style=\'text-align:center\'>'
            atip = atip + '<div style=\'width:' + this.tipBarScale(this.data[i][j]) + 'px;height:8px;background-color:#ccc\'></div>' + '</td>'
          }

          atip = atip + '</tr>'
        }
        atip = atip + '</table>'
        atip = atip + '</div>'

        this.frondData[i].tip = atip
      }
    }

    // update html on leaf tips
    function makeLeafTipData () {
      let val
      _this.leafTips = []
      // if (_this.settings.suffix) {tb_len = 4;} else {tb_len = 3;}
      for (let i = 0; i < _this.rowNames.length; i++) {
        let tempTips = []
        for (let jj = 0; jj < _this.colNames.length; jj++) {
          let atip = ''

          atip = atip + '<div class=\'tipHeading\' style=\'font-family:' + _this.settings.tooltipsHeadingFontFamily + ';font-size:' + _this.settings.tooltipsHeadingFontSize + 'px' + '\'>' + _this.rowNames[i]
          if (_this.settings.ylab) {
            if (_this.settings.barHeights) {
              atip = atip + ' - ' + _this.settings.ylab + ' '
              if (_this.settings.yprefix) {
                atip = atip + _this.settings.yprefix + _this.weightedSums[i].toFixed(_this.settings.digits)
              } else {
                atip = atip + _this.weightedSums[i].toFixed(_this.settings.digits)
              }
              if (_this.settings.ysuffix) {
                atip = atip + _this.settings.ysuffix
              }
            } else {
              atip = atip + ' -'
              if (_this.settings.ylab) {
                atip = atip + ' ' + _this.settings.ylab
              }
              atip = atip + ' '
              if (_this.settings.prefix) {
                atip = atip + _this.settings.prefix + _this.weightedSums[i].toFixed(_this.settings.digits)
              } else {
                atip = atip + _this.weightedSums[i].toFixed(_this.settings.digits)
              }
              if (_this.settings.suffix) {
                atip = atip + _this.settings.suffix
              }
            }
          }

          atip = atip + '</div>'
          atip = atip + '<div class=\'tipTableContainer\'>' + '<table class=\'tipTable\'>'
          for (let j = 0; j < _this.colNames.length; j++) {
            if (j === jj) {
              atip = atip + '<tr style =\'background-color:#eee\'>'
            } else {
              atip = atip + '<tr>'
            }
            // val = round(_this.data[i][j],2) >= 0.01? data[i][j].toFixed(_this.settings.digits) : 0;
            val = _this.data[i][j].toFixed(_this.settings.digits)
            if (_this.selectedCol[j] === 1) {
              if (_this.settings.rawData[i][j]) {
                if (_this.settings.prefix) {
                  if (_this.settings.suffix) {
                    atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'>' + _this.settings.prefix + val + _this.settings.suffix + '</td>'
                  } else {
                    atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'>' + _this.settings.prefix + val + '</td>'
                  }
                } else {
                  if (_this.settings.suffix) {
                    atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'>' + val + _this.settings.suffix + '</td>'
                  } else {
                    atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'>' + val + '</td>'
                  }
                }
              } else {
                atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'>' + 'No data' + '</td>'
              }
              atip = atip + '<td style=\'text-align:left;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'>' + _this.colNames[j] + '</td>'
              atip = atip + '<td style=\'text-align:center\'>'
              atip = atip + '<div style=\'width:' + _this.tipBarScale(_this.data[i][j]) + 'px;height:8px;background-color:' + _this.colors[j] + '\'></div>' + '</td>'
            } else {
              if (_this.settings.rawData[i][j]) {
                if (_this.settings.prefix) {
                  if (_this.settings.suffix) {
                    atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + _this.settings.prefix + val + _this.settings.suffix + '</font></td>'
                  } else {
                    atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + _this.settings.prefix + val + '</font></td>'
                  }
                } else {
                  if (_this.settings.suffix) {
                    atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + val + _this.settings.suffix + '</font></td>'
                  } else {
                    atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + val + '</font></td>'
                  }
                }
              } else {
                atip = atip + '<td style=\'text-align:right;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + 'No data' + '</font></td>'
              }
              atip = atip + '<td style=\'text-align:left;font-family:' + _this.settings.tooltipsFontFamily + ';font-size:' + _this.settings.tooltipsFontSize + 'px' + '\'><font color=#999>' + _this.colNames[j] + '</font></td>'
              atip = atip + '<td style=\'text-align:center\'>'
              atip = atip + '<div style=\'width:' + _this.tipBarScale(_this.data[i][j]) + 'px;height:8px;background-color:#ccc\'></div>' + '</td>'
            }

            atip = atip + '</tr>'
          }
          atip = atip + '</table>'
          atip = atip + '</div>'
          tempTips.push(atip)
        }
        _this.leafTips.push(tempTips)
      }
    }

    // work on tooltip

    if (this.settings.tooltips) {
      makeTipData()
      makeLeafTipData()
      this.tip = d3Tip()
        .attr('class', 'd3-tip')
        .html(function (d) { return d.tip })

      this.leafTip = d3Tip()
        .attr('class', 'd3-tip1')
        .html(function (d, i) { return _this.leafTips[d[0].i][d[0].j] })

      baseSvg.call(this.tip).call(this.leafTip)

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
        .on('mouseover', function (d) {
          _this.mouseOverFrond(d, this, baseSvg)
        })
        .on('mouseout', function (d) {
          _this.mouseOutFrond(d)
        })

      this.leaves.on('mouseover', function (d) {
        _this.mouseOverLeaf(d, this, baseSvg)
      })
        .on('mouseout', function (d) {
          _this.mouseOutLeaf(d)
        })
        .on('click', function (d) {
          toggleLeaf(d, baseSvg)
        })
    }

    // sort and return sort indices
    function sortWithIndices (toSort, mode) {
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
    function sortFromIndices (toSort, indices) {
      let output = []
      for (let i = 0; i < toSort.length; i++) {
        output.push(toSort[indices[i]])
      }
      return output
    }

    // sort this.bars
    function sortBars (initialization) {
      let rowNamesTemp = []
      let sortfun
      let sumsTemp = []
      if (_this.colSort === '0') {
        // as is
        _this.xscale.domain(_this.rowNames)
        sortfun = function (a, b) { return a.index - b.index }
      } else if (_this.colSort === '1') {
        // alphabetical
        for (let i = 0; i < _this.rowNames.length; i++) {
          rowNamesTemp.push(_this.rowNames[i])
        }
        _this.rindices = sortWithIndices(rowNamesTemp, 0)
        _this.xscale.domain(rowNames1)
        sortfun = function (a, b) { return _this.xscale(a.name) - _this.xscale(b.name) }
      } else if (_this.colSort === '2') {
        // low to high

        for (let i = 0; i < _this.rowNames.length; i++) {
          sumsTemp.push(_this.weightedSums[i])
        }
        _this.rindices = sortWithIndices(sumsTemp, 0)
        rowNames2 = sortFromIndices(_this.rowNames, _this.rindices)
        _this.xscale.domain(rowNames2)
        sortfun = function (a, b) { return a.value - b.value }
      } else if (_this.colSort === '3') {
        // high to low

        for (let i = 0; i < _this.rowNames.length; i++) {
          sumsTemp.push(_this.weightedSums[i])
        }
        _this.rindices = sortWithIndices(sumsTemp, 1)
        rowNames2 = sortFromIndices(_this.rowNames, _this.rindices)
        _this.xscale.domain(rowNames2)
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

    // update plot when something is clicked
    function updatePlot (duration, initialization) {
      for (let i = 0; i < _this.rowNames.length; i++) {
        _this.unweightedSums[i] = 0
        _this.weightedSums[i] = 0
        for (let j = 0; j < _this.colNames.length; j++) {
          _this.unweightedSums[i] += _this.selectedCol[j] * _this.data[i][j]
          _this.weightedSums[i] += _this.selectedCol[j] * _this.weights[j] * _this.data[i][j]
        }
        if (_this.settings.barHeights) {
          _this.weightedSums[i] = _this.settings.barHeights[i]
        }
      }

      makeTipData()
      makeLeafTipData()
      _this.updateData()

      _this.param.ymax = d3.max(_this.weightedSums)
      _this.param.ymin = 0

      _this.yscale.domain([_this.param.ymin, _this.param.ymax])
        .nice(_this.nticks)
        .range([_this.plotHeight, 0])

      _this.yAxis.scale(_this.yscale)

      if (initialization) {
        plotArea.select('.yaxis')
          .call(_this.yAxis)
          .selectAll('.tick text')
          .style('font-size', _this.settings.yFontSize + 'px')
          .style('font-family', _this.settings.yFontFamily)
      } else {
        plotArea.select('.yaxis')
          .transition()
          .duration(_this.duration)
          .call(_this.yAxis)
          .selectAll('.tick text')
          .style('font-size', _this.settings.yFontSize + 'px')
          .style('font-family', _this.settings.yFontFamily)
      }

      _this.bars.data(_this.barData)
      _this.palms.data(_this.frondData)
      _this.leaves.data(function (d) { return d.leaves })

      _this.leaves.transition('leafColor')
        .duration(_this.duration)
        .attr('d', _this.line)
        .style('fill', function (d, i) {
          return _this.selectedCol[i] === 0 ? '#ccc' : _this.colors[i]
        })

      baseSvg.selectAll('.sideBarColorBox').transition('boxColor')
        .duration(_this.duration)
        .style('fill', function (d, i) {
          return _this.selectedCol[i] === 0 ? '#ccc' : _this.colors[i]
        })

      baseSvg.selectAll('.sideBarText').transition('textColor')
        .duration(_this.duration)
        .style('fill', function (d, i) {
          return _this.selectedCol[i] === 0 ? '#aaa' : '#000'
        })

      if (d3.sum(_this.selectedCol) === 0) {
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
        sortBars(initialization)
      }
    }

    // additional stuff
    let rowNames1 = []
    let rowNames2 = []
    for (let i = 0; i < this.rowNames.length; i++) {
      rowNames1.push(this.rowNames[i])
    }
    rowNames1.sort()

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

    updatePlot(this.duration, true)
  }
}

module.exports = PalmTrees
