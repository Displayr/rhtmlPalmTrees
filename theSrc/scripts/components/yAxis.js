import BaseComponent from './baseComponent'
import _ from 'lodash'
import {getLabelDimensionsUsingSvgApproximation, splitIntoLinesByWord} from '../labelUtils'
import d3 from 'd3'

// TODO account for resize

class YAxis extends BaseComponent {
  constructor ({parentContainer, duration, weightedSums, nTicks, fontSize, fontFamily, fontColor, maxWidth, maxLines, innerPadding, yDigits}) {
    super()
    _.assign(this, {parentContainer, duration, weightedSums, nTicks, fontSize, fontFamily, fontColor, maxWidth, maxLines, innerPadding, yDigits})

    const commasFormatter = d3.format(',.' + this.yDigits + 'f')
    const commasFormatterE = d3.format(',.' + this.yDigits + 'e')
    this.tickFormatterFactory = (ymax) => (y) => this.yPrefixText + (ymax >= 10000)
      ? commasFormatterE(y)
      : commasFormatter(y)

    // TODO hack
    this.setParam({ ymin: 0, ymax: d3.max(this.weightedSums) })
  }

  setParam ({ ymin, ymax }) {
    this.param = { ymin, ymax }
    console.log('this.param')
    console.log(JSON.stringify(this.param, {}, 2))
  }

  // TODO must account for prefix and suffix and formatting
  computePreferredDimensions (estimatedWidth) {
    const estimateDimensionsOfSingleLineSplitByWord = ({parentContainer, text, fontSize, fontFamily, rotation = 0}) => {
      const lines = splitIntoLinesByWord({parentContainer, text, maxLines: 1, fontSize, fontFamily, rotation})
      const dimensions = getLabelDimensionsUsingSvgApproximation({text: lines[0], parentContainer, fontSize, fontFamily, rotation})
      return dimensions
    }

    const boundaryValues = [
      this.tickFormatterFactory(this.param.ymax)(this.param.ymin),
      this.tickFormatterFactory(this.param.ymax)(this.param.ymax)
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

    console.log('boundaryValues')
    console.log(JSON.stringify(boundaryValues, {}, 2))
    console.log(`yaxis max width : `, _(dimensions).map('width').max())

    return {
      width: _(dimensions).map('width').max(),
      height: 0
    }
  }

  setmaxLeafSize (maxLeafSize) {
    this.maxLeafSize = maxLeafSize
  }

  draw (bounds) {
    this.bounds = bounds
    const magicD3AxisOffsetCorrection = 6
    const axisContainer = this.parentContainer.append('g')
      .classed('yaxis', true)
      .attr('transform', `translate(${bounds.left + bounds.width + magicD3AxisOffsetCorrection},${bounds.top})`)
    this.axisContainer = axisContainer

    this.yscale = d3.scale.linear()
      .nice(this.nticks)
      .range([this.bounds.height, this.maxLeafSize])

    this.yAxis = d3.svg.axis()
      .orient('left')
      .ticks(this.nticks)
      .tickPadding(0)
      .tickFormat(this.tickFormatterFactory(this.param.ymax).bind(this))
  }

  // anything state related should be done in updatePlot, as updatePlot is called every time state is updated
  updatePlot (initialization) {
    this.yscale.domain([this.param.ymin, this.param.ymax])
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

// if (this.settings.showYAxis) {
//   if (this.settings.prefix || this.settings.suffix) {
//     if (!this.settings.suffix) {
//       plotArea.append('text')
//         .attr('class', 'suffixText')
//         .text(this.settings.prefix)
//         .style('font-size', this.settings.yFontSize + 'px')
//         .style('font-family', this.settings.yFontFamily)
//         .style('fill', this.settings.yFontColor)
//     } else {
//       plotArea.append('text')
//         .attr('class', 'suffixText')
//         .text(this.settings.suffix)
//         .style('font-size', this.settings.yFontSize + 'px')
//         .style('font-family', this.settings.yFontFamily)
//         .style('fill', this.settings.yFontColor)
//     }
//     this.updateUnitPosition()
//   }
// }
