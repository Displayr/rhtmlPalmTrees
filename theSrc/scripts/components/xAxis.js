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
    this.columnCount = this.labels.length

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
    this.labelObjects = this.labels.map((text, index) => {
      return new this.LabelFactory({
        classNames: `xaxis-label tick-${index}`,
        fontColor: this.fontColor,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        maxHeight: this.maxHeight,
        maxWidth: estimatedColumnWidth,
        parentContainer: this.parentContainer,
        text: text,
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
    const container = this.parentContainer.append('g')
      .classed('axis xaxis', true)
      .attr('transform', this.buildTransform(bounds))

    const columnWidth = bounds.width / this.columnCount
    this.labelObjects.map((labelObject, i) => {
      labelObject.draw({
        container, // this is odd given we already supply parentContainer to constructor
        bounds: {
          top: 0,
          left: i * columnWidth,
          height: bounds.height,
          width: columnWidth
        }
      })
    })
  }

  updatePlot (initialization) {
    if (this.plotState.getState().selectedColumns.length > 0) {
      this.sortLabels(initialization)
    }
  }

  sortLabels (initialization) {
    console.log('must fix')
  }
}

module.exports = XAxis
