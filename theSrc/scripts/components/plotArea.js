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

    const {
      dataMin,
      dataMax,
      weightedSumMax,
      normalizedDataMin,
      normalizedDataMax
    } = this.palmMath.getData()
    const sortedWeightedSums = this.palmMath.getSortedWeightedSums()

    // TODO put somewhere ?
    this.line = d3.svg.line()
      .interpolate('cardinal-closed')
      .x(_.property('x'))
      .y(_.property('y'))

    // TODO put somewhere ?
    this.tipBarScale = d3.scale.linear()
      .domain([dataMin, dataMax])
      .range([2, 30])

    this.xscale = d3.scale.ordinal()
      .domain(_(sortedWeightedSums).map('name').value())
      .rangeRoundBands([0, bounds.width])

    this.maxLeafSize = Math.min(
      60,
      bounds.height * 0.1,
      Math.floor((this.xscale.range()[1] - this.xscale.range()[0]) / 1.4)
    )

    this.yscale = d3.scale.linear()
      .nice(this.nticks)
      .domain([0, weightedSumMax])
      .range([bounds.height, this.maxLeafSize])

    this.frondScale = d3.scale.linear()
    this.frondScale.domain([normalizedDataMin, normalizedDataMax])
    this.frondScale.range([this.maxLeafSize * normalizedDataMin / normalizedDataMax, this.maxLeafSize])

    /* stop computing stuff / start drawing stuff */
    this.bars = this.plotArea.selectAll('.bar').data(sortedWeightedSums, d => d.treeId)
    this.palms = this.plotArea.selectAll('.palm').data(sortedWeightedSums, d => d.treeId)

    this.bars.enter()
      .append('rect')
      .attr('id', d => `bar${d.treeId}`)
      .attr('class', 'bar')
      .attr('data-name', d => d.name)
      // .attr('id', function (d) {
      //   return `bar${d.index}`
      // })
      .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2))
      .attr('width', 1)
      .attr('y', d => this.yscale(d.value))
      .attr('height', d => bounds.height - this.yscale(d.value))

    let palmEnter = this.palms.enter()
      .append('g')

    if (this.tooltips) {
      palmEnter.append('rect')
        .attr('class', 'ghostCircle')
        .attr('id', d => `ghost${d.treeId}`)
    }

    this.leaves = palmEnter
      .attr('id', d => `leaf${d.treeId}`)
      .attr('data-name', d => d.name)
      .attr('class', 'leaf')
      .attr('transform', d => `translate(${this.xscale(d.name) + this.xscale.rangeBand() / 2},${this.yscale(d.value)})`)
      .selectAll('path')
      .data(palmTreeData => _.range(this.frondCount).map((frondIndex) => _.merge({}, palmTreeData, {frondIndex})))

    this.leaves.enter()
      .append('path')
      .style('cursor', 'pointer')
      .attr('class', ({frondIndex}) => `actual-leaf actual-leaf-${frondIndex}`)
      .attr('transform', ({frondIndex}) => 'rotate(' + (frondIndex * 360 / this.frondCount - 90) + ')')

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
        .on('mouseover', (leafData, leafIndex) => this.mouseOverLeaf(leafData, leafIndex)) // TODO leafData should contain frondIndex -> leadIndex should not be necessary
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
    // TODO return sortedWeightedSums in palmMath.getData()
    const { normalizedDataMap, weightedSumMax } = this.palmMath.getData()
    const sortedWeightedSums = this.palmMath.getSortedWeightedSums()

    console.log('sortedWeightedSums')
    console.log(JSON.stringify(sortedWeightedSums, {}, 2))
    console.log('this.yscale(0)')
    console.log(JSON.stringify(this.yscale(0), {}, 2))
    console.log('this.yscale(19)')
    console.log(JSON.stringify(this.yscale(19), {}, 2))

    this.bars.data(sortedWeightedSums, d => d.treeId)
    this.palms.data(sortedWeightedSums, d => d.treeId)
    this.xscale.domain(_(sortedWeightedSums).map('name').value())
    this.yscale.domain([0, weightedSumMax])

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
        .attr('d', this.makeFrondPathFactory(normalizedDataMap).bind(this))
        .style('fill', (d, i) => this.plotState.isColumnOn(i) === 0 ? this.frondColorUnselected : this.colors[i])
    } else {
      this.leaves
        .transition('leafColor')
        .duration(this.duration)
        .attr('d', this.makeFrondPathFactory(normalizedDataMap).bind(this))
        .style('fill', (d, i) => this.plotState.isColumnOn(i) === 0 ? this.frondColorUnselected : this.colors[i])
    }

    if (this.plotState.areAllColumnOff()) {
      this.plotArea.selectAll('.bar')
        .transition('barHeight')
        .duration(this.duration)
        // .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2))
        .attr('y', d => this.yscale(0))
        .attr('height', d => 0)

      this.plotArea.selectAll('.leaf')
        .transition('leafHeight')
        .duration(this.duration)
        .attr('y', d => this.yscale(0))
        // .attr('transform', d => `translate(${this.xscale(d.name) + this.xscale.rangeBand() / 2},${this.yscale(d.value)})`)
    } else {
      if (initialization) {
        this.plotArea.selectAll('.bar')
          .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() / 2))
          .attr('y', d => this.yscale(d.value))
          .attr('height', d => this.bounds.height - this.yscale(d.value))
      } else {
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
      }
    }
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

  updateToolTipWithDebounce ({treeId, name, value} = {}) {
    const sortedWeightedSums = this.palmMath.getSortedWeightedSums()
    const weightedSum = _(sortedWeightedSums)
      .filter({ treeId })
      .map('value')
      .first()

    if (this.updateToolTipWithDebounceTimeoutHandler) {
      clearTimeout(this.updateToolTipWithDebounceTimeoutHandler)
      delete this.updateToolTipWithDebounceTimeoutHandler
    }

    const params = {
      treeId,
      yPos: value,
      xPos: name
    }

    if (this.showTooltipDesiredState) {
      params.html = makeTipContent({
        rowName: name,
        rowIndex: treeId,
        rowTotal: weightedSum.toFixed(this.digits),
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
        data: this.rawData[treeId],
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
      } else if (this.showTooltipDesiredState && this.showTooltipActualState && this.currentlyDisplayedTooltipIndex !== params.treeId) {
        this.showTooltip(params)
      }
    }, this.tooltipDebounceTime)
  }

  showTooltip ({treeId, html, yPos, xPos, width: tipWidth, height: tipHeight}) {
    const { normalizedDataMap } = this.palmMath.getData()
    this.showTooltipActualState = true
    this.currentlyDisplayedTooltipIndex = treeId
    let ghostRect = this.plotArea.select('#ghost' + treeId)
    let ghostRectHtmlElement = ghostRect[0][0]
    let ghostRectDimensions = ghostRectHtmlElement.getBoundingClientRect()

    let barRectBboxDimensions = this.plotArea.select('#bar' + treeId)[0][0].getBoundingClientRect()

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
    const makeFrondPath = this.makeFrondPathFactory(normalizedDataMap).bind(this)
    d3.select('#frond' + treeId)
      .selectAll('path')
      .transition('leafSize')
      .duration(this.duration / 2)
      .attr('d', ({treeId, frondIndex}) => makeFrondPath({treeId, frondIndex, amplifier: 1.1}))
  }

  hideTooltip ({treeId}) {
    const { normalizedDataMap } = this.palmMath.getData()
    this.showTooltipActualState = false
    this.currentlyDisplayedTooltipIndex = null
    if (this.tip) {
      this.tip.hide()
    }
    d3.select('#littleTriangle').style('visibility', 'hidden')

    d3.select('#frond' + treeId)
      .selectAll('path')
      .transition('leafSize')
      .duration(this.duration / 2)
      .attr('d', this.makeFrondPathFactory(normalizedDataMap).bind(this))
  }

  makeFrondPathFactory (normalizedDataMap) {
    return ({treeId, frondIndex, name, amplifier = 1}) => {
      const frondValue = this.frondScale(normalizedDataMap[name][frondIndex])
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
