import d3 from 'd3'
import _ from 'lodash'
import * as rootLog from 'loglevel'
import BaseComponent from './baseComponent'
import {
  splitIntoLinesByWord,
  getLabelDimensionsUsingSvgApproximation,
  truncateD3TextSelection
} from '../labelUtils'

const log = rootLog.getLogger('sidebar')

class Sidebar extends BaseComponent {
  static defaultSettings () {
    return _.cloneDeep({
      colors: [],
      backgroundColor: '#ffffff',
      hoverColor: '#eeeeee',
      borderColor: '#000000',
      columnNames: [],
      duration: 600,
      maxWidth: 200,
      maxHeight: 400,
      containerWidth: null,
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
      headingFontColor: '#000000'
    })
  }

  constructor ({ parentContainer, plotState, config }) {
    super()
    log.info('sidebar.constructor')
    this.parentContainer = parentContainer
    this.plotState = plotState
    this.config = _.defaults({}, config, Sidebar.defaultSettings)
    // this.config.fontSize = this._extractIntFromStringOrArray(this.config.fontSize)
    // this.config.headingFontSize = this._extractIntFromStringOrArray(this.config.headingFontSize)
    this.frondCount = config.columnNames.length

    this.sdBarFrondData = _.range(this.frondCount).map((frondGroupIndex) => {
      return {
        colName: this.config.columnNames[frondGroupIndex],
        color: this.config.colors[frondGroupIndex],
        index: frondGroupIndex
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
      rowMaxVerticalPadding: 5
    }

    this.collapsedDimensions = {
      fontSize: this.config.fontSize,
      rowHeight: this.config.fontSize + 2 * this._calcVerticalRowPadding(this.config.fontSize),
      headerHeight: (this.config.headingText)
        ? this.config.headingFontSize + 2 * this._calcVerticalRowPadding(this.config.headingFontSize)
        : 0
    }

    // second round of dimension settings that rely on first round
    const colorBarHeight = this.collapsedDimensions.rowHeight - 2 * this.constants.rowHorizontalPadding
    _.assign(this.collapsedDimensions, {
      height: Math.ceil(this.collapsedDimensions.headerHeight + this.constants.frondRowCount * this.collapsedDimensions.rowHeight),
      frondRadius: (this.collapsedDimensions.rowHeight - 2) / 2,
      colorBarHeight: colorBarHeight,
      colorBarWidth: Math.round(colorBarHeight * 0.6)
    })
  }

  // NB assumes width of control rows always <= main rows
  computePreferredDimensions () {
    let sideBarRowDesiredWidths = []

    const estimateDimensionsOfSingleLineSplitByWord = ({parentContainer, text, maxWidth, fontSize, fontFamily, rotation = 0}) => {
      const lines = splitIntoLinesByWord({parentContainer, text, maxWidth, maxLines: 1, fontSize, fontFamily, rotation})
      const dimensions = getLabelDimensionsUsingSvgApproximation({text: lines[0], parentContainer, fontSize, fontFamily, rotation})
      return dimensions
    }

    if (this.config.headingText) {
      const dimensions = estimateDimensionsOfSingleLineSplitByWord({
        parentContainer: this.parentContainer,
        text: this.config.headingText,
        maxWidth: this.maxWidth,
        fontSize: this.config.headingFontSize,
        fontFamily: this.config.headingFontFamily
      })
      sideBarRowDesiredWidths.push(dimensions.width)
    }

    const widthOfNonTextElementsInFrondRows =
      3 * this.constants.rowHorizontalPadding +
      this.collapsedDimensions.colorBarWidth +
      2 * this.collapsedDimensions.frondRadius
    const maxAllowedRowTextWidth = this.config.maxWidth - widthOfNonTextElementsInFrondRows

    this.config.columnNames.forEach(columnText => {
      const dimensions = estimateDimensionsOfSingleLineSplitByWord({
        parentContainer: this.parentContainer,
        text: columnText,
        maxWidth: maxAllowedRowTextWidth,
        fontSize: this.config.fontSize,
        fontFamily: this.config.fontFamily
      })
      sideBarRowDesiredWidths.push(dimensions.width)
    })

    return {
      width: Math.min(
        _(sideBarRowDesiredWidths).max() + widthOfNonTextElementsInFrondRows + 2 * this.constants.rowHorizontalPadding,
        this.config.maxWidth
      ),
      height: 0
    }
  }

  drawControl () {
    let sdBarCtrl = this.element.append('g').attr('id', 'g_sdBarControl').style('display', 'none')
    this.sdBarCtrl = sdBarCtrl
    sdBarCtrl.selectAll('option')
      .data([1, 2])
      .enter()
      .append('rect')
      .attr('class', 'sdBarAllRect')
      .attr('id', function (d, i) { return 'sdAC' + i })
      .style('stroke', this.config.borderColor)
      .style('fill', this.config.backgroundColor)
      .attr('y', 0)

    sdBarCtrl.append('text')
      .attr('class', 'sdBarAllOn')
      .attr('dy', '0.35em')
      .text('All On')
      .style('text-anchor', 'middle')
      .style('font-family', this.config.fontFamily)
      .style('fill', this.config.fontColor)

    sdBarCtrl.append('text')
      .attr('class', 'sdBarAllOff')
      .attr('dy', '0.35em')
      .text('All Off')
      .style('text-anchor', 'middle')
      .style('font-family', this.config.fontFamily)
      .style('fill', this.config.fontColor)

    sdBarCtrl.append('text')
      .attr('class', 'sdBarSortHeading')
      .attr('dy', '0.35em')
      .text('Order')
      .style('font-family', this.config.fontFamily)
      .style('fill', this.config.fontColor)

    let sortText = ['Original', 'Alphabetical', 'Ascending', 'Descending']
    let initialSort = this.plotState.getState().sortBy

    let sdBarCtrlEnter = sdBarCtrl.selectAll('g.span')
      .data(sortText)
      .enter()
      .append('g')
      .attr('class', 'sideBarElemSortRow')

    sdBarCtrlEnter.append('rect')
      .attr('class', (d) => `sideBarElemSortRect ${d.toLowerCase()}`)
      .attr('id', function (d, i) { return 's' + i })
      .style('stroke', this.config.borderColor)
      .style('fill', this.config.backgroundColor)
      .attr('x', 0)
      .attr('y', 0)

    sdBarCtrlEnter.append('circle')
      .attr('class', (d) => `sdBarSortRadioButton ${d.toLowerCase()}`)
      .attr('id', function (d, i) { return 'sortC' + i })
      .style('fill', (d) => (d.toLowerCase() === initialSort) ? 'steelblue' : this.config.backgroundColor)
      .style('stroke', (d) => (d.toLowerCase() === initialSort) ? 'steelblue' : '#999')

    sdBarCtrlEnter.append('text')
      .attr('class', (d) => `sdBarSortText ${d.toLowerCase()}`)
      .attr('id', function (d, i) { return 'sortT' + i })
      .attr('dy', '0.35em')
      .style('fill', (d) => (d.toLowerCase() === initialSort) ? this.config.fontColor : this.config.secondaryFontColor)
      .text(function (d) { return d })
      .style('font-family', this.config.fontFamily)
  }

  draw (bounds) {
    log.info('sidebar.draw()')
    const _this = this
    this.bounds = bounds

    this.element = this.parentContainer.append('g').attr('id', 'g_sideBar')
      .attr('transform', this.buildTransform(bounds))
    const sideBar = this.element

    // TODO not needed (just need to add border to "Order" then delete)
    sideBar.append('rect')
      .attr('class', 'sideBar')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.bounds.width)
      .style('stroke', this.config.borderColor)
      .style('fill', this.config.backgroundColor)

    let sdBarDisp = sideBar.append('g').attr('id', 'g_sideBarDisp')
    this.sdBarDisp = sdBarDisp
    // all on all off selector

    this.drawControl()

    if (this.config.headingText) {
      sdBarDisp.append('text')
        .attr('class', 'sdBarHeading')
        .attr('dy', '0.35em')
        .text(this.config.headingText)
        .style('font-family', this.config.headingFontFamily)
        .style('fill', this.config.headingFontColor)
        .style('font-size', this.config.headingFontSize + 'px')
    }

    this.sdBarPalms = sdBarDisp.selectAll('sdBarElem')
      .data(this.sdBarFrondData)
    let sdBarElemEnter = this.sdBarPalms.enter()
      .append('g')
      .attr('class', 'sdBarElem')

    sdBarElemEnter.append('rect')
      .attr('class', 'sideBarElemRect')
      .attr('id', function (d, i) { return 'sbRect' + i })
      .style('stroke', this.config.borderColor)
      .style('fill', this.config.backgroundColor)
      .attr('x', 0)
      .attr('y', 0)

    this.sdBarFrondGroup = sdBarElemEnter.append('g')
      .attr('class', 'sideBarFrondGroup')
      .attr('id', function (d, i) { return 'sideBarFrondGroup' + i })

    this.sdBarFronds = this.sdBarFrondGroup.selectAll('.sideBarFrond')
      .data(function (d) {
        return _.range(_this.frondCount).map((frondIndex) => {
          return {frondGroupIndex: d.index, frondIndex: frondIndex}
        })
      })

    this.sdBarFronds.enter()
      .append('path')
      .attr('class', 'sideBarFrond')
      .attr('d', this.line)
      .attr('transform', (d, i) => { return 'rotate(' + (i * 360 / this.frondCount - 90) + ')' })
      .style('fill', (d) => { return (d.frondGroupIndex === d.frondIndex) ? this.config.frondColorThis : this.config.frondColorThat })

    sdBarElemEnter.append('rect')
      .attr('class', 'sideBarColorBox')
      .attr('id', function (d, i) { return 'sbColor' + i })
      .attr('y', this.constants.rowHorizontalPadding + 0.5)

    sdBarElemEnter.append('text')
      .attr('class', 'sideBarText')
      .attr('id', function (d, i) { return 'sbTxt' + i })
      .attr('dy', '0.35em')
      .style('fill', this.config.fontColor)
      .style('font-size', this.config.fontSize + 'px')
      .style('font-family', this.config.fontFamily)
      .text(function (d) { return d.colName })

    this._adjustRowSizes()
    this.registerInteractionHandlers()
  }

  registerInteractionHandlers () {
    log.info('sidebar.registerInteractionHandlers()')
    const _this = this
    const sideBar = this.element
    const sdBarCtrl = this.sdBarCtrl

    function toggleColumn () {
      if (d3.event.defaultPrevented) return // click suppressed

      let index = Number(this.id.substring(6))
      _this.plotState.toggleColumnState(index)
      d3.event.stopPropagation()
    }

    const backgroundColor = this.config.backgroundColor
    const hoverColor = this.config.hoverColor

    sideBar.selectAll('.sideBarElemRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', hoverColor)
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', backgroundColor)
        d3.event.stopPropagation()
      })
      .on('click', toggleColumn)

    function clickAllToggle () {
      if (this.id.substring(4) === '0') {
        _this.plotState.turnOnAllColumns()
      } else {
        _this.plotState.turnOffAllColumns()
      }
    }

    sideBar.selectAll('.sdBarAllRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', hoverColor)
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', backgroundColor)
        d3.event.stopPropagation()
      })
      .on('click', clickAllToggle)

    function clickSort (sortValue) {
      // change selected sort Box
      sdBarCtrl.selectAll('.sdBarSortRadioButton').style('fill', this.config.backgroundColor).style('stroke', '#999')
      sdBarCtrl.select(`.sdBarSortRadioButton.${sortValue.toLowerCase()}`).style('fill', 'steelblue').style('stroke', 'steelblue')

      // change selected sort Text
      sdBarCtrl.selectAll('.sdBarSortText').style('fill', this.config.secondaryFontColor)
      sdBarCtrl.select(`.sdBarSortText.${sortValue.toLowerCase()}`).style('fill', this.config.fontColor)

      this.plotState.sortBy(sortValue)
    }

    sideBar.selectAll('.sideBarElemSortRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', hoverColor)
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', backgroundColor)
        d3.event.stopPropagation()
      })

    sdBarCtrl.selectAll('.sideBarElemSortRect').on('click', clickSort.bind(this))

    sideBar
      .on('mouseenter', this._mouseEnterSidebar.bind(this))
      .on('mouseleave', this._mouseLeaveSidebar.bind(this))
  }

  _calcVerticalRowPadding (fontSize) {
    const halfFontSize = fontSize / 2
    if (halfFontSize < this.constants.rowMinVerticalPadding) { return this.constants.rowMinVerticalPadding }
    if (halfFontSize > this.constants.rowMaxVerticalPadding) { return this.constants.rowMaxVerticalPadding }
    return halfFontSize
  }

  _adjustRowSizes () {
    log.info('sidebar._adjustRowSizes()')
    const _this = this
    const sideBar = this.element

    // determine width of sidebar, and truncate text as necessary
    let sideBarRowDesiredWidths = []

    if (this.config.headingText) {
      const headerTextWidth = this.element.select('.sdBarHeading').node().getComputedTextLength()
      const headerWidth = headerTextWidth + 2 * this.constants.rowHorizontalPadding
      sideBarRowDesiredWidths.push(headerWidth)

      if (headerWidth > this.config.maxWidth) {
        truncateD3TextSelection({
          d3Selection: this.element.select('.sdBarHeading'),
          maxTextWidth: this.config.maxWidth - 2 * this.constants.rowHorizontalPadding,
          minTextCharacters: 1
        })
      }
    }

    const widthOfNonTextElementsInFrondRows =
      3 * this.constants.rowHorizontalPadding +
      this.collapsedDimensions.colorBarWidth +
      2 * this.collapsedDimensions.frondRadius
    const maxAllowedRowTextWidth = this.config.maxWidth - widthOfNonTextElementsInFrondRows

    this.element.selectAll('.sideBarText')
      .each(function (d) {
        const desiredRowWidth = this.getComputedTextLength() + widthOfNonTextElementsInFrondRows
        sideBarRowDesiredWidths.push(desiredRowWidth)

        if (desiredRowWidth > _this.config.maxWidth) {
          truncateD3TextSelection({
            d3Selection: d3.select(this),
            maxTextWidth: maxAllowedRowTextWidth,
            minTextCharacters: 1
          })
        }
      })

    // this.expandedDimensions specifies dimensions when mouse over sidebar and extra controls are shown
    // reduce hover font size and row height until under the maxHeight
    this.expandedDimensions = _.cloneDeep(this.collapsedDimensions)
    this.expandedDimensions.radioButtonWidth = this.expandedDimensions.rowHeight / 2
    this.expandedDimensions.height = this.collapsedDimensions.height + this.expandedDimensions.rowHeight * this.constants.controlRowCount
    while (this.expandedDimensions.fontSize > 1 && (this.expandedDimensions.height > this.config.maxHeight - 2 * this.bounds.top)) {
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

    // NB this appears out of order becasue we must set new font-size before computing maxSortTextSize
    let sortTextWidths = []
    sideBar.selectAll('.sdBarSortText')
      .attr('x', 2 * this.constants.rowHorizontalPadding + this.expandedDimensions.radioButtonWidth)
      .attr('y', 0.5 * this.expandedDimensions.rowHeight)
      .style('font-size', this.expandedDimensions.fontSize + 'px')
      .each(function () {
        sortTextWidths.push(d3.select(this).node().getComputedTextLength())
      })

    sideBar.select('.sdBarHeading')
      .attr('x', this.constants.rowHorizontalPadding)
      .attr('y', this.collapsedDimensions.headerHeight / 2)
      .style('font-size', this.config.headingFontSize + 'px')

    sideBar.select('.sdBarAllOn')
      .style('font-size', this.expandedDimensions.fontSize + 'px')

    sideBar.select('.sdBarAllOff')
      .style('font-size', this.expandedDimensions.fontSize + 'px')

    sideBar.select('.sdBarSortHeading')
      .attr('x', this.constants.rowHorizontalPadding)
      .attr('y', this.expandedDimensions.rowHeight / 2 + this.expandedDimensions.rowHeight)
      .style('font-size', this.expandedDimensions.fontSize + 'px')

    sideBar.selectAll('.sdBarSortRadioButton')
      .attr('cx', this.constants.rowHorizontalPadding + this.expandedDimensions.radioButtonWidth * 0.5)
      .attr('cy', 0.5 * this.expandedDimensions.rowHeight)
      .attr('r', this.expandedDimensions.radioButtonWidth * 0.35)

    sideBar.selectAll('.sideBarElemSortRect')
      .attr('height', this.expandedDimensions.rowHeight + 'px')

    this._applyDynamicDimensionsToDom({ dimensions: this.collapsedDimensions, showControlPanel: false, animate: false })
  }

  _mouseEnterSidebar () {
    log.info('sidebar._mouseEnterSidebar()')
    this._applyDynamicDimensionsToDom({ dimensions: this.expandedDimensions, showControlPanel: true, animate: true })
  }

  _mouseLeaveSidebar () {
    log.info('sidebar._mouseLeaveSidebar()')
    this._applyDynamicDimensionsToDom({ dimensions: this.collapsedDimensions, showControlPanel: false, animate: true })
  }

  _applyDynamicDimensionsToDom ({ dimensions, showControlPanel, animate = false }) {
    let sideBar = (animate)
      ? this.element.transition().duration(this.constants.animationDuration)
      : this.element

    sideBar.select('.sideBar')
      .attr('height', dimensions.height)

    sideBar.selectAll('.sideBarFrondGroup')
      .attr('transform', 'translate(' + dimensions.rowHeight / 2 + ',' + dimensions.rowHeight / 2 + ')')

    sideBar.selectAll('.sideBarFrond')
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
      .style('fill', (d, i) => { return this.plotState.isColumnOn(i) ? this.config.colors[i] : this.config.secondaryFontColor })

    sideBar.selectAll('.sideBarText')
      .attr('x', frondRowTextOffset)
      .attr('y', dimensions.rowHeight / 2)
      .style('font-size', dimensions.fontSize + 'px')
      .style('fill', (d, i) => this.plotState.isColumnOn(i) === 0 ? this.config.secondaryFontColor : this.config.fontColor)

    // TODO This is sus
    sideBar.selectAll('.sdBarAllRect')
      .attr('x', (d, i) => { return i === 0 ? 0 : Math.floor(this.bounds.width / 2) })
      .attr('width', (d, i) => { return i === 0 ? Math.floor(this.bounds.width / 2) : Math.ceil(this.bounds.width / 2) })
      .attr('height', dimensions.rowHeight)

    sideBar.select('.sdBarAllOn')
      .attr('x', this.bounds.width / 4)
      .attr('y', dimensions.rowHeight / 2)

    sideBar.select('.sdBarAllOff')
      .attr('x', this.bounds.width * 3 / 4)
      .attr('y', dimensions.rowHeight / 2)

    sideBar.selectAll('.sideBarElemSortRow')
      .attr('transform', (d, i) => {
        return 'translate(' + 0 + ',' + (2 + i) * dimensions.rowHeight + ')' // 2 is for two static rows above
      })

    sideBar.selectAll('.sideBarElemSortRect')
      .attr('width', this.bounds.width + 'px')

    // NB control is initially hidden and placed just vertically below the header.
    // It is placed below header as opposed to at zero to prevent an animation bug where
    // the control panel can be seen through the header rect
    const controlPanelY = (showControlPanel)
      ? dimensions.headerHeight + this.constants.frondRowCount * dimensions.rowHeight
      : dimensions.headerHeight + 5

    this.sdBarCtrl
      .style('display', (showControlPanel) ? 'inline' : 'none')
      .attr('transform', `translate(0,${controlPanelY})`)
  }

  _makeFrondPath (radius) {
    return [
      {x: 0, y: 0},
      {x: radius * 0.25, y: -radius * 0.07},
      {x: radius * 0.75, y: -radius * 0.13},
      {x: radius, y: 0},
      {x: radius * 0.75, y: radius * 0.13},
      {x: radius * 0.25, y: radius * 0.07}
    ]
  }

  updatePlot () {
    this.element.selectAll('.sideBarColorBox')
      .transition('boxColor')
      .duration(this.config.duration)
      .style('fill', (d, i) => this.plotState.isColumnOn(i) === 0 ? this.config.frondColorUnselected : this.config.colors[i])

    this.element.selectAll('.sideBarText')
      .transition('textColor')
      .duration(this.config.duration)
      .style('fill', (d, i) => this.plotState.isColumnOn(i) === 0 ? this.config.secondaryFontColor : this.config.fontColor)
  }
}

module.exports = Sidebar
