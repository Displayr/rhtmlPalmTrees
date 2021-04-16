import d3 from 'd3'
import _ from 'lodash'
import * as rootLog from 'loglevel'
import BaseComponent from './baseComponent'
import {
  splitIntoLinesByCharacter,
  getLabelDimensionsUsingSvgApproximation,
} from '../labelUtils'

const log = rootLog.getLogger('sidebar')
let sortTextOptions = ['Original', 'Alphabetical', 'Ascending', 'Descending']

class Sidebar extends BaseComponent {
  static get defaultSettings () {
    return _.cloneDeep({
      colors: [],
      backgroundColor: '#ffffff',
      hoverColor: '#eeeeee',
      borderColor: '#000000',
      frondNames: [],
      duration: 600, // TODO there are two animation duration values : this.config.duraiton and this.constants.animationDuration
      maxWidth: null,
      maxHeight: null,
      frondColorUnselected: '#cccccc',
      frondColorThis: '#000000',
      frondColorThat: '#cccccc',
      fontSize: 12,
      fontFamily: 'arial',
      fontColor: '#000000',
      secondaryFontColor: '#aaaaaa',
      headingText: null,
      headingFontSize: 14,
      headingFontFamily: 'arial',
      headingFontColor: '#000000',
      headingFontWeight: 'bold',
    })
  }

  constructor ({ parentContainer, plotState, config }) {
    super()
    log.debug('sidebar.constructor')
    this.parentContainer = parentContainer
    this.plotState = plotState
    this.config = _.defaultsDeep({}, config, Sidebar.defaultSettings)
    this.frondCount = config.frondNames.length

    this.sdBarFrondData = _.range(this.frondCount).map((frondGroupIndex) => {
      return {
        frondName: this.config.frondNames[frondGroupIndex],
        color: this.config.colors[frondGroupIndex],
        index: frondGroupIndex,
      }
    })

    this.line = d3.svg.line()
      .interpolate('cardinal-closed')
      .x(function (d) { return d.x })
      .y(function (d) { return d.y })

    this.constants = {
      frondRowCount: this.frondCount, // NB constants.frondRowCount is not necessary but aids readability throughout code
      controlRowCount: 6,
      animationDuration: 200,
      outerMargin: 5,
      rowHorizontalPadding: 3, // TODO used for both vertical and horizontal ... (for calc of colorBarHeight)
      rowMinVerticalPadding: 2,
      rowMaxVerticalPadding: 5,
    }

    this.computeStaticDimensions()
    this.buildD3Helpers()
  }

  buildD3Helpers () {
    const { borderColor, backgroundColor, hoverColor, fontColor, fontFamily } = this.config
    const { fontSize: expandedFontSize } = this.expandedDimensions

    this.styleRect = (rectSelection) => rectSelection
      .style('stroke', borderColor)
      .style('fill', backgroundColor)

    this.controlFont = (textSelection) => textSelection
      .style('font-size', `${expandedFontSize}px`)
      .style('font-family', fontFamily)
      .style('fill', fontColor)

    this.addHover = (rectSelection) => rectSelection
      .on('mouseover', function () {
        d3.select(this).style('fill', hoverColor)
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', backgroundColor)
        d3.event.stopPropagation()
      })
  }

  computeStaticDimensions () {
    this.collapsedDimensions = {
      fontSize: this.config.fontSize,
      rowHeight: this.config.fontSize + 2 * this._calcVerticalRowPadding(this.config.fontSize),
      headerHeight: (this.config.headingText)
        ? this.config.headingFontSize + 2 * this._calcVerticalRowPadding(this.config.headingFontSize)
        : 0,
    }

    // second round of dimension settings that rely on first round
    const colorBarHeight = this.collapsedDimensions.rowHeight - 2 * this.constants.rowHorizontalPadding
    _.assign(this.collapsedDimensions, {
      height: Math.ceil(this.collapsedDimensions.headerHeight + this.constants.frondRowCount * this.collapsedDimensions.rowHeight),
      frondRadius: (this.collapsedDimensions.rowHeight - 2) / 2,
      colorBarHeight: colorBarHeight,
      colorBarWidth: Math.round(colorBarHeight * 0.6),
    })

    // this.expandedDimensions specifies dimensions when mouse over sidebar and extra controls are shown
    // reduce hover font size and row height until total height is under the maxHeight
    this.expandedDimensions = _.cloneDeep(this.collapsedDimensions)
    this.expandedDimensions.radioButtonWidth = this.expandedDimensions.rowHeight / 2
    this.expandedDimensions.height = this.collapsedDimensions.height + this.expandedDimensions.rowHeight * this.constants.controlRowCount
    while (this.expandedDimensions.fontSize > 1 && (this.expandedDimensions.height > this.config.maxHeight)) {
      this.expandedDimensions.fontSize = this.expandedDimensions.fontSize - 1
      this.expandedDimensions.rowHeight = this.expandedDimensions.fontSize + 2 * this._calcVerticalRowPadding(this.expandedDimensions.fontSize)
      this.expandedDimensions.frondRadius = (this.expandedDimensions.rowHeight - 2) / 2
      this.expandedDimensions.colorBarHeight = this.expandedDimensions.rowHeight - 2 * this.constants.rowHorizontalPadding
      this.expandedDimensions.colorBarWidth = Math.round(this.expandedDimensions.colorBarHeight * 0.6)
      this.expandedDimensions.radioButtonWidth = this.expandedDimensions.rowHeight / 2

      const displaySectionHeight = Math.ceil(this.collapsedDimensions.headerHeight + this.constants.frondRowCount * this.expandedDimensions.rowHeight)
      const controlSectionHeight = this.expandedDimensions.rowHeight * this.constants.controlRowCount
      this.expandedDimensions.height = displaySectionHeight + controlSectionHeight
    }
  }

  computePreferredDimensions () {
    // when adding to this array, include the 2 * this.constants.rowHorizontalPadding
    let sideBarRowsDesiredWidths = []

    const estimateDimensionsOfSingleLineSplitByCharacter = ({ parentContainer, text, maxWidth, fontSize, fontFamily, fontWeight = 'normal', rotation = 0 }) => {
      const lines = splitIntoLinesByCharacter({ parentContainer, text, maxWidth, maxLines: 1, fontSize, fontFamily, rotation })
      const dimensions = getLabelDimensionsUsingSvgApproximation({ text: lines[0], parentContainer, fontSize, fontFamily, fontWeight, rotation })
      return dimensions
    }

    if (this.config.headingText) {
      const dimensions = estimateDimensionsOfSingleLineSplitByCharacter({
        parentContainer: this.parentContainer,
        text: this.config.headingText,
        maxWidth: this.maxWidth - 2 * this.constants.rowHorizontalPadding,
        fontSize: this.config.headingFontSize,
        fontFamily: this.config.headingFontFamily,
        fontWeight: 'bold',
      })
      sideBarRowsDesiredWidths.push(dimensions.width + 2 * this.constants.rowHorizontalPadding)
    }

    sortTextOptions.forEach(sortText => {
      const dimensions = estimateDimensionsOfSingleLineSplitByCharacter({
        parentContainer: this.parentContainer,
        text: sortText,
        maxWidth: this.maxWidth - 2 * this.constants.rowHorizontalPadding,
        fontSize: this.expandedDimensions.fontSize,
        fontFamily: this.config.fontFamily,
      })
      // NB: why 3 * padding ? 2 for outer, one for inner padding between radioButton and text
      sideBarRowsDesiredWidths.push(dimensions.width + this.expandedDimensions.radioButtonWidth + 3 * this.constants.rowHorizontalPadding)
    })

    const toggleAllControlDimensions = estimateDimensionsOfSingleLineSplitByCharacter({
      parentContainer: this.parentContainer,
      text: 'All On All Off',
      maxWidth: this.maxWidth - 2 * this.constants.rowHorizontalPadding,
      fontSize: this.expandedDimensions.fontSize,
      fontFamily: this.config.fontFamily,
    })
    sideBarRowsDesiredWidths.push(toggleAllControlDimensions.width + 2 * this.constants.rowHorizontalPadding)

    const widthOfNonTextElementsInFrondRows =
      3 * this.constants.rowHorizontalPadding +
      this.collapsedDimensions.colorBarWidth +
      2 * this.collapsedDimensions.frondRadius

    this.config.frondNames.forEach(columnText => {
      const dimensions = estimateDimensionsOfSingleLineSplitByCharacter({
        parentContainer: this.parentContainer,
        text: columnText,
        maxWidth: this.config.maxWidth - widthOfNonTextElementsInFrondRows,
        fontSize: this.collapsedDimensions.fontSize,
        fontFamily: this.config.fontFamily,
      })
      sideBarRowsDesiredWidths.push(dimensions.width + widthOfNonTextElementsInFrondRows)
    })

    return {
      width: Math.min(
        _(sideBarRowsDesiredWidths).max(),
        this.config.maxWidth
      ),
      height: 0,
    }
  }

  draw (bounds) {
    log.debug('sidebar.draw()')
    this.bounds = bounds

    this.element = this.parentContainer.append('g').attr('id', 'g_sideBar')
      .attr('transform', this.buildTransform(bounds))
      .on('mouseenter', this._mouseEnterSidebar.bind(this))
      .on('mouseleave', this._mouseLeaveSidebar.bind(this))

    this.drawControl()
    this.drawDisplay()
    this._applyDynamicDimensionsToDom({ dimensions: this.collapsedDimensions, showControlPanel: false, animate: false })
  }

  drawControl () {
    this.sdBarCtrl = this.element.append('g').attr('id', 'g_sdBarControl').style('display', 'none')

    this.sdBarCtrl.append('rect')
      .attr('class', 'sdBarAllRect on')
      .call(this.styleRect)
      .call(this.addHover)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.bounds.width / 2)
      .attr('height', this.expandedDimensions.rowHeight)
      .on('click', () => this.plotState.turnOnAllColumns())

    this.sdBarCtrl.append('rect')
      .attr('class', 'sdBarAllRect off')
      .call(this.styleRect)
      .call(this.addHover)
      .attr('x', this.bounds.width / 2)
      .attr('y', 0)
      .attr('width', this.bounds.width / 2)
      .attr('height', this.expandedDimensions.rowHeight)
      .on('click', () => this.plotState.turnOffAllColumns())

    this.sdBarCtrl.append('text')
      .attr('class', 'sdBarAllOn')
      .call(this.controlFont)
      .attr('x', this.bounds.width / 4)
      .attr('y', this.expandedDimensions.rowHeight / 2)
      .attr('dy', '0.35em')
      .text('All On')
      .style('text-anchor', 'middle')

    this.sdBarCtrl.append('text')
      .attr('class', 'sdBarAllOff')
      .call(this.controlFont)
      .attr('x', this.bounds.width * 3 / 4)
      .attr('y', this.expandedDimensions.rowHeight / 2)
      .attr('dy', '0.35em')
      .text('All Off')
      .style('text-anchor', 'middle')

    this.sdBarCtrl.append('rect')
      .attr('class', 'sdBarSortHeadingRect')
      .call(this.styleRect)
      .attr('x', 0)
      .attr('y', this.expandedDimensions.rowHeight)
      .attr('width', this.bounds.width)
      .attr('height', this.expandedDimensions.rowHeight)

    this.sdBarCtrl.append('text')
      .attr('class', 'sdBarSortHeading')
      .call(this.controlFont)
      .attr('x', this.constants.rowHorizontalPadding)
      .attr('y', this.expandedDimensions.rowHeight / 2 + this.expandedDimensions.rowHeight)
      .attr('dy', '0.35em')
      .text('Order')
      .style('font-weight', 'bold')

    let initialSort = this.plotState.getState().sortBy

    let sdBarCtrlEnter = this.sdBarCtrl.selectAll('g')
      .data(sortTextOptions)
      .enter()
      .append('g')
      .attr('class', 'sideBarElemSortRow')
      // NB (2 + i) accounts for two static rows above the sort options (ie., "all on / all off" and "order")
      .attr('transform', (d, i) => `translate(0,${(2 + i) * this.expandedDimensions.rowHeight})`)

    sdBarCtrlEnter.append('rect')
      .attr('class', (d) => `sdBarElemSortRect ${d.toLowerCase()}`)
      .call(this.styleRect)
      .call(this.addHover)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.bounds.width + 'px')
      .attr('height', this.expandedDimensions.rowHeight + 'px')
      .on('click', (sortValue) => {
        this.sdBarCtrl.selectAll('.sdBarSortRadioButton').style('fill', this.config.backgroundColor).style('stroke', '#999')
        this.sdBarCtrl.select(`.sdBarSortRadioButton.${sortValue.toLowerCase()}`).style('fill', 'steelblue').style('stroke', 'steelblue')
        this.sdBarCtrl.selectAll('.sdBarSortText').style('fill', this.config.secondaryFontColor)
        this.sdBarCtrl.select(`.sdBarSortText.${sortValue.toLowerCase()}`).style('fill', this.config.fontColor)
        this.plotState.sortBy(sortValue)
      })

    sdBarCtrlEnter.append('circle')
      .attr('class', (d) => `sdBarSortRadioButton ${d.toLowerCase()}`)
      .attr('cx', this.constants.rowHorizontalPadding + this.expandedDimensions.radioButtonWidth * 0.5)
      .attr('cy', 0.5 * this.expandedDimensions.rowHeight)
      .attr('r', this.expandedDimensions.radioButtonWidth * 0.35)
      .style('fill', (d) => (d.toLowerCase() === initialSort) ? 'steelblue' : this.config.backgroundColor)
      .style('stroke', (d) => (d.toLowerCase() === initialSort) ? 'steelblue' : '#999')

    sdBarCtrlEnter.append('text')
      .attr('class', (d) => `sdBarSortText ${d.toLowerCase()}`)
      .attr('x', 2 * this.constants.rowHorizontalPadding + this.expandedDimensions.radioButtonWidth)
      .attr('y', 0.5 * this.expandedDimensions.rowHeight)
      .attr('dy', '0.35em')
      .style('fill', (d) => (d.toLowerCase() === initialSort) ? this.config.fontColor : this.config.secondaryFontColor)
      .text(function (d) { return d })
      .style('font-family', this.config.fontFamily)
      .style('font-size', this.expandedDimensions.fontSize + 'px')
  }

  drawDisplay () {
    const sideBar = this.element
    let sdBarDisp = sideBar.append('g').attr('id', 'g_sideBarDisp')

    if (this.config.headingText) {
      sdBarDisp.append('rect')
        .attr('class', 'sdBarHeadingRect')
        .attr('x', 0)
        .attr('y', 0)
        .call(this.styleRect)
        .attr('width', this.bounds.width)
        .attr('height', this.collapsedDimensions.headerHeight)

      const truncatedHeading = splitIntoLinesByCharacter({
        parentContainer: this.parentContainer,
        text: this.config.headingText,
        maxWidth: this.bounds.width - 2 * this.constants.rowHorizontalPadding,
        maxLines: 1,
        fontSize: this.config.headingFontSize,
        fontFamily: this.config.headingFontFamily,
        fontWeight: this.config.headingFontWeight,
      })[0]
      sdBarDisp.append('text')
        .attr('class', 'sdBarHeading')
        .attr('dy', '0.35em')
        .attr('x', this.constants.rowHorizontalPadding)
        .attr('y', this.collapsedDimensions.headerHeight / 2)
        .text(truncatedHeading)
        .style('font-family', this.config.headingFontFamily)
        .style('font-weight', this.config.headingFontWeight)
        .style('fill', this.config.headingFontColor)
        .style('font-size', this.config.headingFontSize + 'px')
    }

    const widthOfNonTextElementsInFrondRows =
      3 * this.constants.rowHorizontalPadding +
      this.collapsedDimensions.colorBarWidth +
      2 * this.collapsedDimensions.frondRadius

    // compute truncated strings
    const columnNameData = this.sdBarFrondData.map(d => {
      const truncatedText = splitIntoLinesByCharacter({
        parentContainer: this.parentContainer,
        text: d.frondName,
        maxWidth: this.bounds.width - widthOfNonTextElementsInFrondRows,
        maxLines: 1,
        fontSize: this.config.fontSize,
        fontFamily: this.config.fontFamily,
      })[0]
      return _.assign(d, { truncatedText })
    })

    this.sdBarFrondRows = sdBarDisp.selectAll('sdBarElem')
      .data(columnNameData)

    let sdBarFrondRowsEnter = this.sdBarFrondRows.enter()
      .append('g')
      .attr('class', 'sdBarElem')

    sdBarFrondRowsEnter.append('rect')
      .call(this.styleRect)
      .call(this.addHover)
      .attr('id', ({ index }) => `sideBarElemRect${index}`)
      .attr('class', 'sideBarElemRect')
      .attr('x', 0)
      .attr('y', 0)
      .on('click', ({ index }) => {
        if (d3.event.defaultPrevented) return // click suppressed
        this.plotState.toggleColumnState(index)
        d3.event.stopPropagation()
      })

    sdBarFrondRowsEnter.append('g')
      .attr('class', 'sdBarTreeTop')
      .attr('id', function (d, i) { return 'sdBarTreeTop' + i })
      .selectAll('.sdBarFrond')
      .data(d => _.range(this.frondCount).map(() => ({ hilightedFrondIndex: d.index })))
      .enter()
      .append('path')
      .attr('class', (d, i) => `sdBarFrond sdBarFrond${i}`)
      .attr('d', this.line)
      .attr('transform', (d, i) => { return 'rotate(' + (i * 360 / this.frondCount - 90) + ')' })
      .style('fill', (d, i) => { return (d.hilightedFrondIndex === i) ? this.config.frondColorThis : this.config.frondColorThat })

    sdBarFrondRowsEnter.append('rect')
      .attr('class', 'sideBarColorBox')
      .attr('y', this.constants.rowHorizontalPadding + 0.5)

    sdBarFrondRowsEnter.append('text')
      .attr('class', 'sideBarText')
      .attr('dy', '0.35em')
      .style('fill', this.config.fontColor)
      .style('font-size', this.config.fontSize + 'px')
      .style('font-family', this.config.fontFamily)
      .text(function (d) { return d.truncatedText })
  }

  _calcVerticalRowPadding (fontSize) {
    const halfFontSize = fontSize / 2
    if (halfFontSize < this.constants.rowMinVerticalPadding) { return this.constants.rowMinVerticalPadding }
    if (halfFontSize > this.constants.rowMaxVerticalPadding) { return this.constants.rowMaxVerticalPadding }
    return halfFontSize
  }

  _mouseEnterSidebar () {
    log.debug('sidebar._mouseEnterSidebar()')
    this._applyDynamicDimensionsToDom({ dimensions: this.expandedDimensions, showControlPanel: true, animate: true })
  }

  _mouseLeaveSidebar () {
    log.debug('sidebar._mouseLeaveSidebar()')
    this._applyDynamicDimensionsToDom({ dimensions: this.collapsedDimensions, showControlPanel: false, animate: true })
  }

  _applyDynamicDimensionsToDom ({ dimensions, showControlPanel, animate = false }) {
    let sideBar = (animate)
      ? this.element.transition().duration(this.constants.animationDuration)
      : this.element

    sideBar.select('.sideBar')
      .attr('height', dimensions.height)

    sideBar.selectAll('.sdBarTreeTop')
      .attr('transform', 'translate(' + dimensions.rowHeight / 2 + ',' + dimensions.rowHeight / 2 + ')')

    sideBar.selectAll('.sdBarFrond')
      .attr('d', this.line(this._makeFrondPath(dimensions.frondRadius)))

    sideBar.selectAll('.sdBarElem')
      .attr('transform', (d, i) => {
        return 'translate(' + 0 + ',' + (dimensions.headerHeight + i * dimensions.rowHeight) + ')'
      })

    sideBar.selectAll('.sideBarElemRect')
      .attr('width', this.bounds.width + 'px')
      .attr('height', dimensions.rowHeight + 'px')

    const frondRowColorBoxXOffset = dimensions.frondRadius * 2 + this.constants.rowHorizontalPadding
    const frondRowTextOffset = frondRowColorBoxXOffset + this.constants.rowHorizontalPadding + dimensions.colorBarWidth
    sideBar.selectAll('.sideBarColorBox')
      .attr('x', frondRowColorBoxXOffset)
      .attr('width', dimensions.colorBarWidth - 1) // TODO why -1 ?
      .attr('height', dimensions.colorBarHeight - 1) // TODO why -1 ?
      .style('fill', (d, i) => this.plotState.isColumnOn(i) ? this.config.colors[i] : this.config.secondaryFontColor)

    sideBar.selectAll('.sideBarText')
      .attr('x', frondRowTextOffset)
      .attr('y', dimensions.rowHeight / 2)
      .style('font-size', dimensions.fontSize + 'px')
      .style('fill', (d, i) => this.plotState.isColumnOn(i) ? this.config.fontColor : this.config.secondaryFontColor)

    // NB control is initially hidden and placed just vertically below the header.
    // It is placed below header as opposed to at zero to prevent an animation bug where
    // the control panel can be seen through the header rect
    const controlPanelY = (showControlPanel)
      ? dimensions.headerHeight + this.constants.frondRowCount * dimensions.rowHeight
      : dimensions.headerHeight

    this.sdBarCtrl
      .transition('sidebarControl')
      .duration(this.constants.animationDuration)
      .style('display', (showControlPanel) ? 'inline' : 'none')
      .attr('transform', `translate(0,${controlPanelY})`)
  }

  _makeFrondPath (radius) {
    return [
      { x: 0, y: 0 },
      { x: radius * 0.25, y: -radius * 0.07 },
      { x: radius * 0.75, y: -radius * 0.13 },
      { x: radius, y: 0 },
      { x: radius * 0.75, y: radius * 0.13 },
      { x: radius * 0.25, y: radius * 0.07 },
    ]
  }

  updatePlot () {
    this.element.selectAll('.sideBarColorBox')
      .transition('boxColor')
      .duration(this.config.duration)
      .style('fill', (d, i) => this.plotState.isColumnOn(i) ? this.config.colors[i] : this.config.frondColorUnselected)

    this.element.selectAll('.sideBarText')
      .transition('textColor')
      .duration(this.config.duration)
      .style('fill', (d, i) => this.plotState.isColumnOn(i) ? this.config.fontColor : this.config.secondaryFontColor)
  }
}

module.exports = Sidebar
