import d3 from 'd3'
import _ from 'lodash'
import BaseComponent from './baseComponent'

import HorizontalWrappedLabel from './parts/horizontalWrappedLabel'
import VerticalBottomToTopWrappedLabel from './parts/verticalBottomToTopWrappedLabel'
import VerticalTopToBottomWrappedLabel from './parts/verticalTopToBottomWrappedLabel'
import DiagonalUpWrappedLabel from './parts/diagonalUpWrappedLabel'
import DiagonalDownWrappedLabel from './parts/diagonalDownWrappedLabel'

class XAxis extends BaseComponent {
  constructor ({
    plotState,
    palmMath,
    fontColor,
    fontFamily,
    fontSize,
    labels,
    maxHeight,
    orientation,
    parentContainer,
    placement,
  }) {
    super()
    _.assign(this, {
      plotState,
      palmMath,
      fontColor,
      fontFamily,
      fontSize,
      labels,
      maxHeight,
      orientation,
      parentContainer,
      placement,
    })

    // to deal with superfluous zoom calls at beginning of render
    this.amIZoomed = false
    this.labelCount = this.labels.length

    this.frondMaxSizeColumnProportion = 0.7 // keep in sync with frondMaxSizeColumnProportion in plotArea.js until better solution found

    if (this.orientation === 'horizontal') {
      this.LabelFactory = HorizontalWrappedLabel
    } else if (this.orientation === 'vertical' && this.placement === 'top') {
      this.LabelFactory = VerticalBottomToTopWrappedLabel
    } else if (this.orientation === 'vertical' && this.placement === 'bottom') {
      this.LabelFactory = VerticalTopToBottomWrappedLabel
    } else if (this.orientation === 'diagonal' && this.placement === 'top') {
      this.LabelFactory = DiagonalUpWrappedLabel
    } else if (this.orientation === 'diagonal' && this.placement === 'bottom') {
      this.LabelFactory = DiagonalDownWrappedLabel
    } else {
      throw new Error(`could not determine LabelFactory: orientation: '${this.orientation}', placement: ${this.placement}`)
    }
  }

  computePreferredDimensions (estimatedColumnWidth) {
    const { sortedWeightedSums } = this.palmMath.getData()
    this.labelObjects = sortedWeightedSums.map(({ name }) => {
      return new this.LabelFactory({
        classNames: `xaxis-label tick`,
        data: { name },
        fontColor: this.fontColor,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        maxHeight: this.maxHeight,
        maxWidth: estimatedColumnWidth,
        parentContainer: this.parentContainer,
        text: name,
        verticalAlignment: this.placement === 'top' ? 'bottom' : 'top',
        horizontalAlignment: 'center',
      })
    })
    let labelDimensions = this.labelObjects.map(labelObject => labelObject.computePreferredDimensions())

    const preferredDimensions = {
      width: 0, // NB xaxis width takes what is given, and does not force width on the chart
      height: _(labelDimensions).map('height').max(),
    }

    return preferredDimensions
  }

  draw (bounds) {
    this.bounds = bounds
    this.container = this.parentContainer.append('g')
      .classed('axis xaxis', true)
      .attr('transform', this.buildTransform(bounds))

    const xScale = d3.scale.ordinal().domain(_(this.labelObjects).map('data.name').value()).rangeRoundBands([0, this.bounds.width * this.labelCount / ((this.labelCount - 1) + 2 * this.frondMaxSizeColumnProportion)])
    const columnWidth = xScale.rangeBand()
    this.labelObjects.map((labelObject, i) => {
      labelObject.draw({
        container: this.container, // TODO this is odd given we already supply parentContainer to constructor
        bounds: {
          top: 0,
          left: (i + (this.frondMaxSizeColumnProportion - 0.5)) * columnWidth,
          height: bounds.height,
          width: columnWidth,
        },
      })
    })
  }

  updatePlot () {
    if (!this.plotState.areAllColumnOff()) {
      const names = _(this.labelObjects).map('data.name').value()
      const xScale = d3.scale.ordinal().domain(names).rangeRoundBands([0, this.bounds.width * this.labelCount / ((this.labelCount - 1) + 2 * this.frondMaxSizeColumnProportion)])
      const columnWidth = xScale.rangeBand()
      const { sortedWeightedSums } = this.palmMath.getData()
      sortedWeightedSums.forEach(({ name }, i) => {
        this.container.select('.xaxis-label[data-name="' + name.replace(/"/g, '&quot;').replace(/\\/g, '&bsol;') + '"]')
          .transition('barHeight')
          .duration(600)
          .attr('transform', `translate(${xScale(names[0]) + columnWidth * i + Math.round(columnWidth * (this.frondMaxSizeColumnProportion - 0.5))})`)
      })
    }
  }
}

module.exports = XAxis
