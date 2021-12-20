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

const hardCodes = {
  tipBarScale: [2, 30],
  frondMaxSizePlotProportion: 0.1,
  frondMaxSizeColumnProportion: 0.7, // keep in sync with frondMaxSizeColumnProportion in xAxis.js until better solution found
}

class PlotArea extends BaseComponent {
  constructor ({
    parentContainer,
    plotState,
    palmMath,
    rowNames,
    colNames,
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
    frondColorUnselected,

  }) {
    super()
    _.assign(this, {
      parentContainer,
      plotState,
      palmMath,
      rowNames,
      colNames,

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
      frondColorUnselected,
    })
    _.assign(this, _.pick(this.palmMath.getData(), ['normalizedDataMap']))
    log.debug('plotArea.constructor')

    this.frondCount = this.colNames.length
  }

  draw (bounds) {
    this.bounds = bounds
    log.debug('plotArea.draw()')
    this.plotArea = this.parentContainer.append('g')
      .attr('id', 'g_plotArea')
      .attr('transform', this.buildTransform(bounds))

    const {
      dataMin,
      dataMax,
      weightedSumMax,
      normalizedDataMin,
      normalizedDataMax,
      sortedWeightedSums,
    } = this.palmMath.getData()

    this.line = d3.svg.line()
      .interpolate('cardinal-closed')
      .x(_.property('x'))
      .y(_.property('y'))

    this.tipBarScale = d3.scale.linear()
      .domain([dataMin, dataMax])
      .range(hardCodes.tipBarScale)

    this.xscale = d3.scale.ordinal()
      .domain(_(sortedWeightedSums).map('name').value())
      .rangeRoundBands([0, bounds.width * sortedWeightedSums.length / ((sortedWeightedSums.length - 1) + 2 * hardCodes.frondMaxSizeColumnProportion)])

    this.maxFrondSize = Math.min(
      bounds.height * hardCodes.frondMaxSizePlotProportion,
      Math.floor(this.xscale.rangeBand() * hardCodes.frondMaxSizeColumnProportion)
    )

    this.yscale = d3.scale.linear()
      .domain([0, weightedSumMax])
      .nice()
      .range([bounds.height, this.maxFrondSize])

    this.frondScale = d3.scale.linear()
      .domain([normalizedDataMin, normalizedDataMax])
      .range([this.maxFrondSize * normalizedDataMin / normalizedDataMax, this.maxFrondSize])

    this.treeTrunks = this.plotArea.selectAll('.treeTrunk').data(sortedWeightedSums, d => d.treeId)
    this.treeTrunks.enter()
      .append('rect')
      .attr('id', d => `treeTrunk${d.treeId}`)
      .attr('class', 'treeTrunk')
      .attr('data-name', d => d.name.replace(/"/g, '&quot;').replace(/\\/g, '&bsol;'))
      .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() * hardCodes.frondMaxSizeColumnProportion))
      .attr('width', 1)
      .attr('y', d => this.yscale(d.value))
      .attr('height', d => bounds.height - this.yscale(d.value))

    let treeTopsEnter = this.plotArea.selectAll('.treeTop')
      .data(sortedWeightedSums, d => d.treeId)
      .enter()
      .append('g')

    if (this.tooltips) {
      // must draw ghost rects "underneath" (i.e. before) the fronds, or mouse over frond wont work
      const ghostPadding = 4
      treeTopsEnter.append('rect')
        .attr('class', 'ghostCircle')
        .attr('id', d => `ghost${d.treeId}`)
        .attr('x', -1 * (ghostPadding + this.maxFrondSize))
        .attr('y', -1 * (ghostPadding + this.maxFrondSize))
        .attr('width', (this.maxFrondSize + ghostPadding) * 2)
        .attr('height', (this.maxFrondSize + ghostPadding) * 2)
    }

    this.treeTops = treeTopsEnter
      .attr('id', d => `treeTop${d.treeId}`)
      .attr('data-name', d => d.name.replace(/"/g, '&quot;').replace(/\\/g, '&bsol;'))
      .attr('class', 'treeTop')
      .attr('transform', d => `translate(${this.xscale(d.name) + this.xscale.rangeBand() * hardCodes.frondMaxSizeColumnProportion},${this.yscale(d.value)})`)

    this.fronds = this.treeTops
      .selectAll('path')
      .data(palmTreeData => _.range(this.frondCount).map((frondIndex) => _.merge({}, palmTreeData, { frondIndex })))

    this.fronds.enter()
      .append('path')
      .style('cursor', 'pointer')
      .attr('class', ({ frondIndex }) => `frond frond${frondIndex}`)
      .attr('transform', ({ frondIndex }) => 'rotate(' + (frondIndex * 360 / this.frondCount - 90) + ')')
      .style('fill', (d, i) => this.plotState.isColumnOn(i) ? this.colors[i] : this.frondColorUnselected)

    if (this.tooltips) {
      this.tip = d3Tip().attr('class', `d3-tip d3-tip-palmtree-${this.palmTreeId}`)

      d3.select('body')
        .append('div')
        .attr('id', 'littleTriangle')
        .style('visibility', 'hidden')

      this.plotArea.call(this.tip)

      this.treeTops
        .on('mouseover', d => this.mouseOverTreeTop(d))
        .on('mouseout', d => this.mouseOutTreeTop(d))

      this.fronds
        .on('mouseover', d => this.mouseOverFrond(d))
        .on('mouseout', d => this.mouseOutFrond(d))
        .on('click', d => {
          tooltipLogger.debug('clickFrond')
          this.showTooltipDesiredState = false
          this.updateToolTipWithDebounce(d)
          this.plotState.toggleColumnState(d.frondIndex)
        })
    }
  }

  updatePlot (initialization) {
    const { weightedSumMax, sortedWeightedSums } = this.palmMath.getData()

    this.treeTrunks.data(sortedWeightedSums, d => d.treeId)
    this.treeTops.data(sortedWeightedSums, d => d.treeId)
    this.xscale.domain(_(sortedWeightedSums).map('name').value())
    this.yscale.domain([0, weightedSumMax]).nice()

    const withConditionalTransition = (selection, transitionName = 'transition1') => (initialization)
      ? selection
      : selection.transition(transitionName).duration(this.duration)

    withConditionalTransition(this.fronds)
      .attr('d', this.makeFrondPath.bind(this))
      .style('fill', (d, i) => this.plotState.isColumnOn(i) ? this.colors[i] : this.frondColorUnselected)

    if (this.plotState.areAllColumnOff()) {
      withConditionalTransition(this.treeTrunks, 'treeTrunkHeight')
        .attr('y', this.yscale(0))
        .attr('height', 0)

      const _this = this
      withConditionalTransition(this.treeTops, 'treeTopHeight')
        .attr('y', this.yscale(0))
        .attr('transform', function (d) {
          // NB the desired effect is to drop straight to the x axis, and do no transition left/right. So preserve X, and 0 out Y
          // how? get current transform, extract x, set transform using current x and new y
          const currentX = d3.transform(d3.select(this).attr('transform')).translate[0]
          return `translate(${currentX},${_this.yscale(0)})`
        })
    } else {
      withConditionalTransition(this.treeTrunks, 'treeTrunkHeight')
        .attr('x', d => this.xscale(d.name) + Math.round(this.xscale.rangeBand() * hardCodes.frondMaxSizeColumnProportion))
        .attr('y', d => this.yscale(d.value))
        .attr('height', d => this.bounds.height - this.yscale(d.value))

      withConditionalTransition(this.treeTops, 'treeTopHeight')
        .attr('transform', d => `translate(${this.xscale(d.name) + this.xscale.rangeBand() * hardCodes.frondMaxSizeColumnProportion},${this.yscale(d.value)})`)
    }
  }

  // create ghost rectangle tooltip
  mouseOverTreeTop (d) {
    tooltipLogger.debug('mouseOverTreeTop')
    this.showTooltipDesiredState = true
    this.updateToolTipWithDebounce(d)
  }

  mouseOutTreeTop (d) {
    tooltipLogger.debug('mouseOutTreeTop')
    this.showTooltipDesiredState = false
    this.updateToolTipWithDebounce(d)
  }

  mouseOverFrond ({ frondIndex }) {
    // NB the timeout here is to ensure that the tooltip has had a chance to render before running the CSS selector
    setTimeout(() => {
      tooltipLogger.debug('mouseOverFrond')
      d3.selectAll(`.tip-column`)
        .classed('selected', false)
        .style('background-color', '#ffffff')
      d3.selectAll(`.tip-column-${frondIndex}`)
        .classed('selected', true)
        .style('background-color', this.hoverColor)
    }, this.tooltipDebounceTime * 2)
  }

  mouseOutFrond () {
    tooltipLogger.debug('mouseOutFrond')
    d3.selectAll(`.tip-column`).classed('selected', false)
    d3.selectAll(`.tip-column`).style('background-color', '#ffffff')
  }

  updateToolTipWithDebounce ({ treeId, name, value } = {}) {
    const { sortedWeightedSums } = this.palmMath.getData()
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
      xPos: name,
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
        unselectedColor: this.frondColorUnselected,
      })

      const { width, height } = getBoundsOfTip(params.html, this.tooltipsFontSize, this.tooltipsFontfamily)
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

  showTooltip ({ treeId, html, yPos, xPos, width: tipWidth, height: tipHeight }) {
    this.showTooltipActualState = true
    this.currentlyDisplayedTooltipIndex = treeId
    let ghostRect = this.plotArea.select(`#ghost${treeId}`)
    let ghostRectHtmlElement = ghostRect[0][0]
    let ghostRectDimensions = ghostRectHtmlElement.getBoundingClientRect()

    let treeTrunkRectBboxDimensions = this.plotArea.select('#treeTrunk' + treeId)[0][0].getBoundingClientRect()

    this.tip.html(html)
    let ghostRectYPosition = Number(ghostRect.attr('y'))
    let ghostRectHeight = Number(ghostRect.attr('height'))

    let frondLowerBound = ghostRectYPosition + ghostRectHeight + 5 + this.yscale(yPos) + this.bounds.top
    let frondUpperBound = ghostRectYPosition - 5 + this.yscale(yPos) + this.bounds.top

    tooltipLogger.debug(`tipHeight: ${tipHeight}, tipWidth: ${tipWidth}, tipSouth: ${frondLowerBound}, tipNorth: ${frondUpperBound} `)

    const halfWidthOfTriangle = 7
    const heightOfTriangle = 10

    const availableWidthToLeft = treeTrunkRectBboxDimensions.x
    const availableWidthToRight = this.bounds.canvasWidth - treeTrunkRectBboxDimensions.x
    const requiredWidth = tipWidth / 2

    let xTipOffset = 0
    if (availableWidthToLeft < requiredWidth) {
      xTipOffset = requiredWidth - availableWidthToLeft
    }
    if (availableWidthToRight < requiredWidth) {
      xTipOffset = -1 * (requiredWidth - availableWidthToRight)
    }

    // TODO refactor tip direction:
    // * consider just supporting N and S
    // * current conditional logic doesnt really make sense ?
    let direction, directionClass, offset, triangleTop, triangleLeft
    if (this.bounds.canvasHeight - frondLowerBound >= tipHeight) {
      direction = 's'
      offset = [10, xTipOffset]
      directionClass = 'southTip'
      triangleTop = ghostRectDimensions.y + ghostRectDimensions.height
      triangleLeft = treeTrunkRectBboxDimensions.x - halfWidthOfTriangle
    } else if (frondUpperBound - tipHeight >= 0) {
      direction = 'n'
      offset = [-10, xTipOffset]
      directionClass = 'northTip'
      triangleTop = ghostRectDimensions.y - heightOfTriangle
      triangleLeft = treeTrunkRectBboxDimensions.x - halfWidthOfTriangle
    } else if (this.xscale(xPos) + Math.round(this.xscale.rangeBand() * hardCodes.frondMaxSizeColumnProportion) >= this.plotWidth * 0.5) {
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

    tooltipLogger.debug(`show tree ${treeId} : chose ${directionClass} top: ${triangleTop}, left: ${triangleLeft} offset: ${offset}`)

    this.tip.direction(direction).offset(offset).show({}, ghostRectHtmlElement)
    d3.select('#littleTriangle')
      .attr('class', directionClass)
      .style('visibility', 'visible')
      .style('top', `${triangleTop}px`)
      .style('left', `${triangleLeft}px`)

    d3.select(`#treeTop${treeId}`)
      .selectAll('path')
      .transition('frondSize')
      .duration(this.duration / 2)
      .attr('d', ({ treeId, name, frondIndex }) => this.makeFrondPath({ treeId, frondIndex, name, amplifier: 1.1 }))
  }

  hideTooltip ({ treeId }) {
    this.showTooltipActualState = false
    this.currentlyDisplayedTooltipIndex = null
    if (this.tip) {
      this.tip.hide()
    }
    d3.select('#littleTriangle').style('visibility', 'hidden')

    d3.select(`#treeTop${treeId}`)
      .selectAll('path')
      .transition('frondSize')
      .duration(this.duration / 2)
      .attr('d', this.makeFrondPath.bind(this))
  }

  makeFrondPath ({ treeId, frondIndex, name, amplifier = 1 }) {
    const frondValue = this.frondScale(this.normalizedDataMap[name][frondIndex])
    const frondIsSelected = this.plotState.isColumnOn(frondIndex)
    const pathData = (frondIsSelected)
      ? this.makeEnabledFrondPath(frondValue * amplifier)
      : this.makeDisabledFrondPath(frondValue * amplifier)
    return this.line(pathData)
  }

  makeDisabledFrondPath (frondValue) {
    return [
      { x: 0, y: 0 },
      { x: frondValue * 0.25, y: -frondValue * 0.03 },
      { x: frondValue * 0.75, y: -frondValue * 0.05 },
      { x: frondValue, y: 0 },
      { x: frondValue * 0.75, y: frondValue * 0.05 },
      { x: frondValue * 0.25, y: frondValue * 0.03 },
    ]
  }

  makeEnabledFrondPath (frondValue) {
    return [
      { x: 0, y: 0 },
      { x: frondValue * 0.25, y: -frondValue * 0.07 },
      { x: frondValue * 0.75, y: -frondValue * 0.13 },
      { x: frondValue, y: 0 },
      { x: frondValue * 0.75, y: frondValue * 0.13 },
      { x: frondValue * 0.25, y: frondValue * 0.07 },
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
