import d3 from 'd3'
import _ from 'lodash'
import BaseComponent from './baseComponent'
import makeTipContent from '../TipContentFactory'
import $ from 'jquery'

import * as rootLog from 'loglevel'
const log = rootLog.getLogger('plotarea')
const tooltipLogger = rootLog.getLogger('tooltip')

const d3Tip = require('d3-tip')
d3Tip(d3)

class PlotArea extends BaseComponent {
  constructor ({
    parentContainer,
    plotState,
    palmMath,
    rowNames,
    colNames,
    nticks,
    digits,
    prefix,
    suffix,
    yDigits,
    yLabel,
    hoverColor,
    tooltips,
    palmTreeId,
    colors,
    duration,
    rawData,
    tipScale,
    tooltipsHeadingFontFamily,
    tooltipsHeadingFontSize,
    tooltipsFontFamily,
    tooltipsFontSize,
    frondColorUnselected

  }) {
    super()
    _.assign(this, {
      parentContainer,
      plotState,
      palmMath,
      rowNames,
      colNames,
      nticks,
      digits,
      prefix,
      suffix,
      yDigits,
      yLabel,
      hoverColor,
      tooltips,
      palmTreeId,
      colors,
      duration,
      rawData,
      tipScale,
      tooltipsHeadingFontFamily,
      tooltipsHeadingFontSize,
      tooltipsFontFamily,
      tooltipsFontSize,
      frondColorUnselected
    })
    log.info('plotArea.constructor')

    this.palmTreeCount = this.rowNames.length
    this.frondCount = this.colNames.length
  }

  resize () {
    log.info('plotArea.resize()')
  }

  draw (bounds) {
    this.bounds = bounds
    log.info('plotArea.draw()')
    this.plotArea = this.parentContainer.append('g').attr('id', 'g_plotArea')
      .attr('transform', this.buildTransform(bounds))
    const plotArea = this.plotArea

    const data = this.palmMath.getData()
    console.log('data')
    console.log(JSON.stringify(data, {}, 2))

    // TODO put somewhere ?
    this.line = d3.svg.line()
      .interpolate('cardinal-closed')
      .x(_.property('x'))
      .y(_.property('y'))

    // TODO put somewhere ?
    this.tipBarScale = d3.scale.linear()
      .domain([data.dataMin, data.dataMax])
      .range([2, 30])

    this.xscale = d3.scale.ordinal()
      .domain(this.rowNames)
      .rangeRoundBands([0, bounds.width])

    this.maxLeafSize = Math.min(
      60,
      bounds.height * 0.1,
      Math.floor((this.xscale.range()[1] - this.xscale.range()[0]) / 1.4)
    )

    this.yscale = d3.scale.linear()
      .nice(this.nticks)
      .domain([0, data.weightedSumMax])
      .range([bounds.height, this.maxLeafSize])

    this.frondScale = d3.scale.linear()
    this.frondScale.domain([data.normalizedDataMin, data.normalizedDataMax])
    this.frondScale.range([this.maxLeafSize * data.normalizedDataMin / data.normalizedDataMax, this.maxLeafSize])

    this.frondData = _.range(this.palmTreeCount).map((palmTreeIndex) => {
      return {
        name: this.rowNames[palmTreeIndex],
        value: data.weightedSums[palmTreeIndex],
        index: palmTreeIndex, // TODO remove this once everything uses palmTreeIndex
        palmTreeIndex: palmTreeIndex
      }
    })

    // TODO can I just use frondData ?
    this.barData = _.range(this.palmTreeCount).map((palmTreeIndex) => {
      return {
        name: this.rowNames[palmTreeIndex],
        value: data.weightedSums[palmTreeIndex],
        index: palmTreeIndex // TODO remove this once everything uses palmTreeIndex
      }
    })

    /* stop computing stuff / start drawing stuff */

    // TODO rename to trunks ?
    this.bars = plotArea.selectAll('.bar')
      .data(this.barData)

    this.bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('id', function (d) {
        return `bar${d.index}`
      })
      .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2))
      .attr('width', 1)
      .attr('y', d => this.yscale(d.value))
      .attr('height', d => bounds.height - this.yscale(d.value))

    this.palms = plotArea.selectAll('.palm')
      .data(this.frondData)

    let palmEnter = this.palms.enter()
      .append('g')

    if (this.tooltips) {
      palmEnter.append('rect')
        .attr('class', 'ghostCircle')
        .attr('id', d => `ghost${d.palmTreeIndex}`)
    }

    this.leaves = palmEnter.attr('class', 'leaf')
      .attr('id', d => `frond${d.index}`)
      .selectAll('path')
      .data((palmTreeData) => _.range(this.frondCount).map((frondIndex) => _.merge({}, palmTreeData, {frondIndex})))

    this.leaves.enter()
      .append('path')
      .style('cursor', 'pointer')
      .attr('class', ({frondIndex}) => `actual-leaf actual-leaf-${frondIndex}`)
      .attr('transform', ({frondIndex}) => 'rotate(' + (frondIndex * 360 / this.frondCount - 90) + ')')

    plotArea.selectAll('.leaf')
      .attr('transform', d => `translate(${this.xscale(d.name) + this.xscale.rangeBand() / 2},${this.yscale(d.value)})`)

    this.leaves.style('fill', (d, i) => this.plotState.isColumnOn(i) === 0 ? this.frondColorUnselected : this.colors[i])

    if (this.tooltips) {
      this.tip = d3Tip().attr('class', `d3-tip d3-tip-palmtree-${this.palmTreeId}`)

      // TODO can i use this.plotArea here ?
      this.parentContainer.call(this.tip)

      // TODO can i use this.plotArea here ?
      d3.select('body')
        .append('div')
        .attr('id', 'littleTriangle')
        .style('visibility', 'hidden')

      this.plotArea.selectAll('.leaf')
        .on('mouseover', d => this.mouseOverFrond(d))
        .on('mouseout', d => this.mouseOutFrond(d))

      this.leaves
        .on('mouseover', (leafData, leafIndex) => this.mouseOverLeaf(leafData, leafIndex))
        .on('mouseout', d => this.mouseOutLeaf(d))
        .on('click', d => {
          tooltipLogger.debug('clickLeaf')
          this.showTooltipDesiredState = false
          // TODO can i reverse order of below ?
          this.updateToolTipWithDebounce(d)
          this.plotState.toggleColumnState(d.frondIndex)
        })
    }
  }

  updatePlot (initialization) {
    const { weightedSums, normalizedData } = this.palmMath.getData()

    for (let i = 0; i < this.rowNames.length; i++) {
      this.barData[i].value = weightedSums[i]
      this.frondData[i].value = weightedSums[i]
    }

    if (initialization) {
      const ghostPadding = 4
      // NB I have made all ghost circles the same, they dont grow shrink based on the palmtree weight
      // TODO ghostCircle can be moved to draw
      this.plotArea.selectAll('.ghostCircle')
        .attr('x', -1 * (ghostPadding + this.maxLeafSize))
        .attr('y', -1 * (ghostPadding + this.maxLeafSize))
        .attr('width', (this.maxLeafSize + ghostPadding) * 2)
        .attr('height', (this.maxLeafSize + ghostPadding) * 2)

      // TODO combine the if/else
      this.leaves
        .attr('d', this.makeFrondPathFactory(normalizedData).bind(this))
        .style('fill', (d, i) => this.plotState.isColumnOn(i) === 0 ? this.frondColorUnselected : this.colors[i])
    } else {
      this.leaves
        .transition('leafColor')
        .duration(this.duration)
        .attr('d', this.makeFrondPathFactory(normalizedData).bind(this))
        .style('fill', (d, i) => this.plotState.isColumnOn(i) === 0 ? this.frondColorUnselected : this.colors[i])
    }

    this.bars.data(this.barData)

    if (this.plotState.getState().selectedColumns.length === 0) {
      this.plotArea.selectAll('.bar')
        .transition('barHeight')
        .duration(this.duration)
        .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2))
        .attr('y', d => this.yscale(d.value))
        .attr('height', d => this.bounds.height - this.yscale(d.value))

      this.plotArea.selectAll('.leaf')
        .transition('leafHeight')
        .duration(this.duration)
        .attr('transform', d => `translate(${this.xscale(d.name) + this.xscale.rangeBand() / 2},${this.yscale(d.value)})`)
    } else {
      // TODO implement sort bars
      this.sortBars(initialization)
    }
  }

  sortBars (initialization) {
    const { weightedSums } = this.palmMath.getData()
    const sortedWeightedSums = this.palmMath.getSortedWeightedSums()

    log.info('PalmTree.sortBars()')
    const plotArea = this.plotArea

    if (initialization) {
      plotArea.selectAll('.bar')
        .sort(sortfun)
        .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2))
        .attr('y', d => this.yscale(d.value)) // TODO if this is just about sorting i shouldn;t need to change the height or the y
        .attr('height', d => this.bounds.height - this.yscale(d.value)) // TODO if this is just about sorting i shouldn;t need to change the height or the y

      // plotArea.select('.xaxis')
      //   .call(this.xAxis)
      //   .selectAll('.tick text')
      //   .style('font-size', this.settings.rowFontSize + 'px')
      //   .style('font-family', this.settings.rowFontFamily)
      //   .style('fill', this.settings.rowFontColor)
      //   .call(this.wrapAxisLabels.bind(this), this.xscale.rangeBand())

      plotArea.selectAll('.leaf')
        .sort(sortfun)
        .attr('transform', d => `translate(${this.xscale(d.name) + this.xscale.rangeBand() / 2},${this.yscale(d.value)})`)
    } else {
      plotArea.selectAll('.bar')
        .sort(sortfun)
        .transition('barHeight')
        .duration(this.duration)
        .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2))
        .attr('y', d => this.yscale(d.value)) // TODO if this is just about sorting i shouldn;t need to change the height or the y
        .attr('height', d => this.bounds.height - this.yscale(d.value)) // TODO if this is just about sorting i shouldn;t need to change the height or the y

      // plotArea.select('.xaxis')
      //   .transition('xtickLocation')
      //   .duration(this.duration)
      //   .call(this.xAxis)
      //   .selectAll('.tick text')
      //   .style('font-size', this.settings.rowFontSize + 'px')
      //   .style('font-family', this.settings.rowFontFamily)
      //   .style('fill', this.settings.rowFontColor)
      //   .call(this.wrapAxisLabels.bind(this), this.xscale.rangeBand())

      plotArea.selectAll('.leaf')
        .sort(sortfun)
        .transition('leafHeight')
        .duration(this.duration)
        .attr('transform', d => `translate(${this.xscale(d.name) + this.xscale.rangeBand() / 2},${this.yscale(d.value)})`)
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
      d3.selectAll(`.tip-column`)
        .classed('selected', false)
        .style('background-color', '#ffffff')
      d3.selectAll(`.tip-column-${i}`)
        .classed('selected', true)
        .style('background-color', this.hoverColor)
    }, this.tooltipDebounceTime * 2)
  }

  mouseOutLeaf () {
    tooltipLogger.debug('mouseOutLeaf')
    d3.selectAll(`.tip-column`).classed('selected', false)
    d3.selectAll(`.tip-column`).style('background-color', '#ffffff')
  }

  updateToolTipWithDebounce ({palmTreeIndex, name, value} = {}) {
    const { weightedSums } = this.palmMath.getData()
    if (this.updateToolTipWithDebounceTimeoutHandler) {
      clearTimeout(this.updateToolTipWithDebounceTimeoutHandler)
      delete this.updateToolTipWithDebounceTimeoutHandler
    }

    const params = {
      palmTreeIndex,
      yPos: value,
      xPos: name
    }

    if (this.showTooltipDesiredState) {
      params.html = makeTipContent({
        rowName: this.rowNames[palmTreeIndex],
        rowIndex: palmTreeIndex,
        rowTotal: weightedSums[palmTreeIndex].toFixed(this.digits),
        yLabel: this.yLabel,
        columnNames: this.colNames,
        columnStates: this.plotState.getState().selectedColumns,
        headingFontFamily: this.tooltipsHeadingFontFamily,
        headingFontSize: this.tooltipsHeadingFontSize,
        fontFamily: this.tooltipsFontFamily,
        fontSize: this.tooltipsFontSize,
        digits: this.digits,
        prefix: this.prefix,
        suffix: this.suffix,
        data: this.rawData[palmTreeIndex],
        tipScale: this.tipBarScale,
        colors: this.colors,
        unselectedColor: this.frondColorUnselected
      })

      const {width, height} = getBoundsOfTip(params.html, this.tooltipsFontSize, this.tooltipsFontfamily)
      params.width = width
      params.height = height
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

  showTooltip ({palmTreeIndex, html, yPos, xPos, width: tipWidth, height: tipHeight}) {
    const { normalizedData } = this.palmMath.getData()
    this.showTooltipActualState = true
    this.currentlyDisplayedTooltipIndex = palmTreeIndex
    let ghostRect = this.plotArea.select('#ghost' + palmTreeIndex)
    let ghostRectHtmlElement = ghostRect[0][0]
    let ghostRectDimensions = ghostRectHtmlElement.getBoundingClientRect()

    let barRectBboxDimensions = this.plotArea.select('#bar' + palmTreeIndex)[0][0].getBoundingClientRect()

    this.tip.html(html)
    let ghostRectYPosition = Number(ghostRect.attr('y'))
    let ghostRectHeight = Number(ghostRect.attr('height'))

    let frondLowerBound = ghostRectYPosition + ghostRectHeight + 5 + this.yscale(yPos) + this.bounds.top
    let frondUpperBound = ghostRectYPosition - 5 + this.yscale(yPos) + this.bounds.top

    tooltipLogger.debug(`tipHeight: ${tipHeight}, tipWidth: ${tipWidth}, tipSouth: ${frondLowerBound}, tipNorth: ${frondUpperBound} `)

    const halfWidthOfTriangle = 7
    const heightOfTriangle = 10

    const availableWidthToLeft = barRectBboxDimensions.x
    const availableWidthToRight = this.bounds.canvasWidth - barRectBboxDimensions.x
    const requiredWidth = tipWidth / 2

    let xTipOffset = 0
    if (availableWidthToLeft < requiredWidth) {
      xTipOffset = requiredWidth - availableWidthToLeft
    }
    if (availableWidthToRight < requiredWidth) {
      xTipOffset = -1 * (requiredWidth - availableWidthToRight)
    }

    // TODO consider just supporting N and S
    // TODO these conditions dont really make sense ?
    let direction, directionClass, offset, triangleTop, triangleLeft
    if (this.bounds.canvasHeight - frondLowerBound >= tipHeight) {
      direction = 's'
      offset = [10, xTipOffset]
      directionClass = 'southTip'
      triangleTop = ghostRectDimensions.y + ghostRectDimensions.height
      triangleLeft = barRectBboxDimensions.x - halfWidthOfTriangle
    } else if (frondUpperBound - tipHeight >= 0) {
      direction = 'n'
      offset = [-10, xTipOffset]
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

    tooltipLogger.debug(`chose ${directionClass} top: ${triangleTop}, left: ${triangleLeft} offset: ${offset}`)

    this.tip.direction(direction).offset(offset).show({}, ghostRectHtmlElement)
    d3.select('#littleTriangle')
      .attr('class', directionClass)
      .style('visibility', 'visible')
      .style('top', `${triangleTop}px`)
      .style('left', `${triangleLeft}px`)

    // TODO NB this is a bit ugly ...
    const makeFrondPath = this.makeFrondPathFactory(normalizedData).bind(this)
    d3.select('#frond' + palmTreeIndex)
      .selectAll('path')
      .transition('leafSize')
      .duration(this.duration / 2)
      .attr('d', ({palmTreeIndex, frondIndex}) => makeFrondPath({palmTreeIndex, frondIndex, amplifier: 1.1}))
  }

  hideTooltip ({palmTreeIndex}) {
    const { normalizedData } = this.palmMath.getData()
    this.showTooltipActualState = false
    this.currentlyDisplayedTooltipIndex = null
    if (this.tip) {
      this.tip.hide()
    }
    d3.select('#littleTriangle').style('visibility', 'hidden')

    d3.select('#frond' + palmTreeIndex)
      .selectAll('path')
      .transition('leafSize')
      .duration(this.duration / 2)
      .attr('d', this.makeFrondPathFactory(normalizedData).bind(this))
  }

  makeFrondPathFactory (normalizedData) {
    return ({palmTreeIndex, frondIndex, amplifier = 1}) => {
      const frondValue = this.frondScale(normalizedData[palmTreeIndex][frondIndex])
      const frondIsSelected = this.plotState.isColumnOn(frondIndex)
      const pathData = (frondIsSelected)
        ? this.makeEnabledFrondPath(frondValue * amplifier)
        : this.makeDisabledFrondPath(frondValue * amplifier)
      return this.line(pathData)
    }
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
}

module.exports = PlotArea

// TODO put this somewhere
let uniqId = 1
function getBoundsOfTip (tipContent, fontSize, fontFamily) {
  const uniqueId = `tip-estimate-${uniqId++}`
  const divWrapper = $(`<div id="${uniqueId}" style="display:inline-block; font-size: ${fontSize}px; font-family: ${fontFamily}">${tipContent}</div>`)
  $(document.body).append(divWrapper)
  const bounds = document.getElementById(uniqueId).getBoundingClientRect()
  divWrapper.remove()

  return bounds
}
