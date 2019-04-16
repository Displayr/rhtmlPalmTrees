import BaseComponent from './baseComponent'
import _ from 'lodash'
import {getLabelDimensionsUsingSvgApproximation, splitIntoLinesByWord} from '../labelUtils'
import d3 from 'd3'

class YAxis extends BaseComponent {
  constructor ({parentContainer, duration, palmMath, prefix = '', suffix, fontSize, fontFamily, fontColor, maxWidth, maxLines, innerPadding, yDigits}) {
    super()
    _.assign(this, {
      parentContainer,
      duration,
      palmMath,
      prefix,
      suffix,
      fontSize,
      fontFamily,
      fontColor,
      maxWidth,
      maxLines,
      innerPadding,
      yDigits
    })

    const commasFormatter = d3.format(',.' + this.yDigits + 'f')
    const commasFormatterE = d3.format(',.' + this.yDigits + 'e')
    this.tickFormatterFactory = (ymax) => (y) => (ymax >= 10000)
      ? `${this.prefix}${commasFormatterE(y)}`
      : `${this.prefix}${commasFormatter(y)}`
  }

  computePreferredDimensions (estimatedWidth) {
    const estimateDimensionsOfSingleLineSplitByWord = ({parentContainer, text, fontSize, fontFamily, rotation = 0}) => {
      const lines = splitIntoLinesByWord({parentContainer, text, maxLines: 1, fontSize, fontFamily, rotation})
      const dimensions = getLabelDimensionsUsingSvgApproximation({
        text: lines[0],
        parentContainer,
        fontSize,
        fontFamily,
        rotation
      })
      return dimensions
    }

    const {weightedSumMin, weightedSumMax} = this.palmMath.getData()

    const boundaryValues = [
      this.tickFormatterFactory(weightedSumMax)(weightedSumMin),
      this.tickFormatterFactory(weightedSumMax)(weightedSumMax)
    ]

    const dimensions = boundaryValues.map(value => {
      return estimateDimensionsOfSingleLineSplitByWord({
        parentContainer: this.parentContainer,
        text: value,
        maxWidth: this.maxWidth,
        fontSize: this.fontSize,
        fontFamily: this.fontFamily
      })
    })

    this.maxLabelWidth = _(dimensions).map('width').max()
    return {
      width: this.maxLabelWidth,
      height: 0
    }
  }

  // NB this is only dependency between yaxis and plotArea (aside from shared math and state)
  setmaxFrondSize (maxFrondSize) {
    this.maxFrondSize = maxFrondSize
  }

  draw (bounds) {
    this.bounds = bounds
    const magicD3AxisOffsetCorrection = 6
    const axisContainer = this.parentContainer.append('g')
      .classed('yaxis', true)
      .attr('transform', `translate(${bounds.left + bounds.width + magicD3AxisOffsetCorrection},${bounds.top})`)
    this.axisContainer = axisContainer

    if (this.suffix || this.prefix) {
      axisContainer.append('text')
        .attr('class', 'yaxis-header')
        .attr('y', this.maxFrondSize / 2)
        // NB the x is a -1 * X because the d3.svg.axis(orient:left) places to left of origin
        .attr('x', (-1 * this.maxLabelWidth / 2) + magicD3AxisOffsetCorrection)
        .text(this.suffix || this.prefix)
        .style('text-anchor', 'middle')
        .style('font-size', this.fontSize + 'px')
        .style('font-family', this.fontFamily)
        .style('fill', this.fontColor)
    }

    this.yscale = d3.scale.linear()
      .range([this.bounds.height, this.maxFrondSize])

    const {weightedSumMax} = this.palmMath.getData()
    this.yAxis = d3.svg.axis()
      .orient('left')
      .tickPadding(0)
      .tickFormat(this.tickFormatterFactory(weightedSumMax).bind(this))
  }

  // anything state related should be done in updatePlot, as updatePlot is called every time state is updated
  updatePlot (initialization) {
    const {weightedSumMax} = this.palmMath.getData()
    this.yscale.domain([0, weightedSumMax]).nice()
    this.yAxis.scale(this.yscale)

    const container = (initialization)
      ? this.axisContainer
      : this.axisContainer.transition().duration(this.duration)

    container
      .call(this.yAxis)
      .selectAll('.tick text')
      .style('font-size', this.fontSize + 'px')
      .style('font-family', this.fontFamily)
      .style('fill', this.fontColor)
  }
}

module.exports = YAxis
