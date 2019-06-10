import BaseComponent from './baseComponent'
import _ from 'lodash'
import { getLabelDimensionsUsingSvgApproximation, splitIntoLinesByCharacter } from '../labelUtils'

// TODO preferred dimensions must account for maxes
class YTitle extends BaseComponent {
  constructor ({ parentContainer, text, fontSize, fontFamily, fontColor, bold, maxWidth, maxHeight }) {
    super()
    _.assign(this, { parentContainer, text, fontSize, fontFamily, fontColor, bold, maxWidth, maxHeight })
  }

  computePreferredDimensions () {
    // NB note the height / width inversion so we can avoid passing rotation: -90 to splitIntoLinesByCharacter and getLabelDimensionsUsingSvgApproximation
    //   * as of apr 2019, splitIntoLinesByCharacter and getLabelDimensionsUsingSvgApproximation appear off by 10-15 px when estimating vertical text

    const truncatedText = splitIntoLinesByCharacter({
      parentContainer: this.parentContainer,
      text: this.text,
      maxWidth: this.maxHeight,
      maxLines: 1,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: (this.bold) ? 'bold' : 'normal'
    })[0]
    const dimensions = getLabelDimensionsUsingSvgApproximation({
      text: truncatedText,
      parentContainer: this.parentContainer,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: (this.bold) ? 'bold' : 'normal'
    })

    return {
      width: dimensions.height,
      height: 0 // NB yTitle height takes what is given, and does not force height on the chart
    }
  }

  draw (bounds) {
    // NB note the height / width inversion so we can avoid passing rotation: -90 to splitIntoLinesByCharacter and getLabelDimensionsUsingSvgApproximation
    //   * as of apr 2019, splitIntoLinesByCharacter and getLabelDimensionsUsingSvgApproximation appear off by 10-15 px when estimating vertical text

    const titleContainer = this.parentContainer.append('g')
      .classed('ytitle', true)
      .attr('transform', this.buildTransform(bounds))

    const truncatedText = splitIntoLinesByCharacter({
      parentContainer: this.parentContainer,
      text: this.text,
      maxWidth: bounds.height,
      maxLines: 1,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: (this.bold) ? 'bold' : 'normal'
    })[0]

    titleContainer.append('text')
      .text(truncatedText)
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', 0)
      .attr('transform', `translate(0,${bounds.height / 2}),rotate(-90)`)
      .style('font-weight', (this.bold) ? 'bold' : 'normal')
      .style('font-size', this.fontSize)
      .style('fill', this.fontColor)
      .style('font-family', this.fontFamily)
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'text-before-edge')
  }
}

module.exports = YTitle
