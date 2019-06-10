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
    placement
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
      placement
    })

    // to deal with superfluous zoom calls at beginning of render
    this.amIZoomed = false
    this.labelCount = this.labels.length

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
        horizontalAlignment: 'center'
      })
    })
    let labelDimensions = this.labelObjects.map(labelObject => labelObject.computePreferredDimensions())

    const preferredDimensions = {
      width: 0, // NB xaxis width takes what is given, and does not force width on the chart
      height: _(labelDimensions).map('height').max()
    }

    return preferredDimensions
  }

  draw (bounds) {
    this.bounds = bounds
    this.container = this.parentContainer.append('g')
      .classed('axis xaxis', true)
      .attr('transform', this.buildTransform(bounds))

    const columnWidth = bounds.width / this.labelCount
    this.labelObjects.map((labelObject, i) => {
      labelObject.draw({
        container: this.container, // TODO this is odd given we already supply parentContainer to constructor
        bounds: {
          top: 0,
          left: i * columnWidth,
          height: bounds.height,
          width: columnWidth
        }
      })
    })
  }

  updatePlot () {
    if (!this.plotState.areAllColumnOff()) {
      const columnWidth = this.bounds.width / this.labelCount
      const { sortedWeightedSums } = this.palmMath.getData()
      sortedWeightedSums.forEach(({ name }, i) => {
        this.container.select(`.xaxis-label[data-name="${name}"]`)
          .transition('barHeight')
          .duration(600)
          .attr('transform', `translate(${columnWidth * i},0)`)
      })
    }
  }
}

module.exports = XAxis
