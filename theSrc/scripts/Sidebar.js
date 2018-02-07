import d3 from 'd3'
import _ from 'lodash'
import * as rootLog from 'loglevel'
const log = rootLog.getLogger('sidebar')

class Sidebar {
  static defaultSettings () {
    return _.cloneDeep({
      colors: [],
      columnNames: [],
      maxWidth: 200,
      maxHeight: 400,
      containerWidth: null,
      fontSize: 12,
      fontFamily: 'arial',
      fontWeight: '600',
      headingText: null,
      headingFontSize: 14,
      headingFontFamily: 'arial',
      headingFontWeight: 800
    })
  }

  constructor ({ element, plotState, config }) {
    this.element = element
    this.plotState = plotState
    this.config = _.defaults(config, Sidebar.defaultSettings)

    this.line = d3.svg.line()
      .interpolate('cardinal-closed')
      .x(function (d) { return d.x })
      .y(function (d) { return d.y })

    this.initSidebarParam()
  }

  // TODO rename to this.dimensions and computeDimensions
  // remove all sdBar from vars, and make vars names that dont suck
  initSidebarParam () {
    this.sdBarLeafData = []

    this.param = {}
    this.param.sdBarMaxTxtL = _(this.config.columnNames).map('length').max()

    this.param.sdBarFontSize = this.config.fontSize
    this.param.sdBarHdFontSize = this.config.headingFontSize

    this.param.sdBarMenuItems = 4
    this.param.sdBarOuterMargin = 5
    this.param.sdBarPadding = 3
    this.param.sdBarHdivF = 2   // ratio of height divided by font size
    this.param.sdBarY = this.param.sdBarOuterMargin + 0.5

    this.param.sdBarHdH = this.config.headingFontSize * this.param.sdBarHdivF
    this.param.sdBarElemH = this.config.fontSize * this.param.sdBarHdivF
    this.param.sdBarColorBarsH = this.param.sdBarElemH - 2 * this.param.sdBarPadding
    this.param.sdBarColorBarsW = Math.round(this.param.sdBarColorBarsH * 0.6)
    this.param.sdBarLeafR = (this.param.sdBarElemH - 2) / 2

    this.param.sdBarHdY = this.param.sdBarHdH / 2
    this.param.sdBarColorBarsY = this.param.sdBarHdH + this.param.sdBarPadding

    for (let i = 0; i < this.config.columnNames.length; i++) {
      let sdBarLeafDatum = {}
      let sdBarLeaf = []
      for (let j = 0; j < this.config.columnNames.length; j++) {
        sdBarLeaf.push([
          {x: 0, y: 0, color: this.config.colors[i], index: i},
          {x: this.param.sdBarLeafR * 0.25, y: -this.param.sdBarLeafR * 0.07},
          {x: this.param.sdBarLeafR * 0.75, y: -this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR, y: 0},
          {x: this.param.sdBarLeafR * 0.75, y: this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR * 0.25, y: this.param.sdBarLeafR * 0.07}
        ])
      }
      sdBarLeafDatum = {leaves: sdBarLeaf, colName: this.config.columnNames[i], color: this.config.colors[i], index: i}
      this.sdBarLeafData.push(sdBarLeafDatum)
    }
  }

  getDimensions () {
    return {
      width: this.param.sdBarWidth,
      height: this.param.sdBarHeight,
      x: this.param.sdBarX,
      y: this.param.sdBarY
    }
  }

  resize (sizeUpdates) {
    _.assign(this.config, sizeUpdates)
    this.initSidebarParam()
    this.adjustDimensionsToFit()
  }

  draw () {
    const sideBar = this.element

    sideBar.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('class', 'sideBar')

    let sdBarCtrl = sideBar.append('g').attr('id', 'g_sdBarControl').style('display', 'none')
    let sdBarDisp = sideBar.append('g').attr('id', 'g_sideBarDisp')

    // all on all off selector
    sdBarCtrl.selectAll('option')
      .data([1, 2])
      .enter()
      .append('rect')
      .attr('class', 'sdBarAllRect')
      .attr('id', function (d, i) { return 'sdAC' + i })

    sdBarCtrl.append('text')
      .attr('class', 'sdBarAllOn')
      .attr('dy', '0.35em')
      .text('All On')
      .style('text-anchor', 'middle')
      .style('font-family', this.config.fontFamily)

    sdBarCtrl.append('text')
      .attr('class', 'sdBarAllOff')
      .attr('dy', '0.35em')
      .text('All Off')
      .style('text-anchor', 'middle')
      .style('font-family', this.config.fontFamily)

    sdBarCtrl.append('text')
      .attr('class', 'sdBarSortHeading')
      .attr('dy', '0.35em')
      .text('Order')
      .style('font-family', this.config.fontFamily)

    let sortText = ['Original', 'Alphabetical', 'Ascending', 'Descending']
    let initialSort = this.plotState.getState().sortBy

    let sdBarCtrlEnter = sdBarCtrl.selectAll('g.span')
      .data(sortText)
      .enter()
      .append('g')

    sdBarCtrlEnter.append('rect')
      .attr('class', (d) => `sideBarElemSortRect ${d.toLowerCase()}`)
      .attr('id', function (d, i) { return 's' + i })

    sdBarCtrlEnter.append('circle')
      .attr('class', (d) => `sdBarSortBox ${d.toLowerCase()}`)
      .attr('id', function (d, i) { return 'sortC' + i })
      .style('fill', (d) => { return (d.toLowerCase() === initialSort) ? 'steelblue' : '#fff' })
      .style('stroke', (d) => { return (d.toLowerCase() === initialSort) ? 'steelblue' : '#999' })

    sdBarCtrlEnter.append('text')
      .attr('class', (d) => `sdBarSortText ${d.toLowerCase()}`)
      .attr('id', function (d, i) { return 'sortT' + i })
      .attr('dy', '0.35em')
      .style('fill', (d) => { return (d.toLowerCase() === initialSort) ? '#000' : '#999' })
      .text(function (d) { return d })
      .style('font-family', this.config.fontFamily)

    sdBarDisp.append('text')
      .attr('class', 'sdBarHeading')
      .attr('dy', '0.35em')
      .text(this.config.headingText)
      .style('font-family', this.config.headingFontFamily)

    this.sdBarPalms = sdBarDisp.selectAll('sdBar.g')
      .data(this.sdBarLeafData)
    let sdBarElemEnter = this.sdBarPalms.enter()
      .append('g')
      .attr('class', 'sdBarElem')

    sdBarElemEnter.append('rect')
      .attr('class', 'sideBarElemRect')
      .attr('id', function (d, i) { return 'sbRect' + i })

    this.sdBarLeaves = sdBarElemEnter.append('g')
      .attr('class', 'sideBarFrond')
      .attr('id', function (d, i) { return 'sbFrond' + i })
      .selectAll('.le')
      .data(function (d) { return d.leaves })

    this.sdBarLeaves.enter()
      .append('path')
      .attr('d', this.line)
      .attr('transform', (d, i) => {
        return 'rotate(' + (i * 360 / this.config.columnNames.length - 90) + ')'
      })
      .style('fill', function (d, i) {
        if (d[0].index === i) {
          return '#000'
        } else {
          return '#ccc'
        }
      })

    sdBarElemEnter.append('rect')
      .attr('class', 'sideBarColorBox')
      .attr('id', function (d, i) { return 'sbColor' + i })

    sdBarElemEnter.append('text')
      .attr('class', 'sideBarText')
      .attr('id', function (d, i) { return 'sbTxt' + i })
      .attr('dy', '0.35em')
      .text(function (d) { return d.colName })
      .style('font-family', this.config.fontFamily)

    this.adjustDimensionsToFit()

    const _this = this
    function toggleColumn () {
      if (d3.event.defaultPrevented) return // click suppressed

      let index = Number(this.id.substring(6))
      _this.plotState.toggleColumnState(index)
      d3.event.stopPropagation()
    }

    sideBar.selectAll('.sideBarElemRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', '#eee')
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', 'white')
        d3.event.stopPropagation()
      })
      .on('click', toggleColumn)

    function clickAllToggle () {
      if (d3.event.defaultPrevented) return // click suppressed
      if (this.id.substring(4) === '0') {
        _this.plotState.turnOnAllColumns()
      } else {
        _this.plotState.turnOffAllColumns()
      }
      d3.event.stopPropagation()
    }

    sideBar.selectAll('.sdBarAllRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', '#eee')
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', 'white')
        d3.event.stopPropagation()
      })
      .on('click', clickAllToggle)

    function clickSort (sortValue) {
      if (d3.event.defaultPrevented) return // click suppressed

      // change selected sort Box
      sdBarCtrl.selectAll('.sdBarSortBox').style('fill', '#fff').style('stroke', '#999')
      sdBarCtrl.select(`.sdBarSortBox.${sortValue.toLowerCase()}`).style('fill', 'steelblue').style('stroke', 'steelblue')

      // change selected sort Text
      sdBarCtrl.selectAll('.sdBarSortText').style('fill', '#999')
      sdBarCtrl.select(`.sdBarSortText.${sortValue.toLowerCase()}`).style('fill', '#000')

      this.plotState.sortBy(sortValue)
    }

    sideBar.selectAll('.sideBarElemSortRect')
      .on('mouseover', function () {
        d3.select(this).style('fill', '#eee')
        d3.event.stopPropagation()
      })
      .on('mouseout', function () {
        d3.select(this).style('fill', 'white')
        d3.event.stopPropagation()
      })

    sdBarCtrl.selectAll('.sideBarElemSortRect').on('click', clickSort.bind(this))

    sideBar
      .on('mouseenter', this.mouseEnterSidebar.bind(this))
      .on('mouseleave', this.mouseLeaveSidebar.bind(this))
  }

  setFontSizeAndGetMaxTextWidth (newFontSize) {
    const textWidths = []
    this.element.selectAll('.sideBarText')
      .style('font-size', newFontSize + 'px')
      .each(function (d) {
        textWidths.push(this.getComputedTextLength())
      })
    return _.max(textWidths)
  }

  adjustDimensionsToFit () {
    const sideBar = this.element

    const _this = this
    this.param.sdBarMaxTextWidth = this.setFontSizeAndGetMaxTextWidth(this.param.sdBarFontSize)

    this.param.sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth + 3 * this.param.sdBarPadding + this.param.sdBarColorBarsW + this.param.sdBarLeafR * 2)
    this.param.sdBarHeight = Math.ceil(this.param.sdBarHdH + this.config.columnNames.length * this.param.sdBarElemH)

    const origSdBarHdFontSize = this.param.sdBarHdFontSize
    while (this.param.sdBarFontSize > 1 &&
    (this.param.sdBarWidth > this.config.maxWidth || this.param.sdBarHeight > this.config.maxHeight)) {
      log.debug([
        'Shrinking sidebar dimensions phase 1:',
        `because sdBarWidth(${this.param.sdBarWidth}) > sdBarMaxWidth(${this.config.maxWidth}) || sdBarHeight(${this.param.sdBarHeight}) > sdBarMaxHeight(${this.config.maxHeight})`,
        `sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth(${this.param.sdBarMaxTextWidth}) + 3 * this.param.sdBarPadding(${this.param.sdBarPadding}) + this.param.sdBarColorBarsW(${this.param.sdBarColorBarsW}) + this.param.sdBarLeafR(${this.param.sdBarLeafR}) * 2)`,
        `sdBarHeight = Math.ceil(this.param.sdBarHdH(${this.param.sdBarHdH}) + this.config.columnNames.length(${this.config.columnNames.length}) * this.param.sdBarElemH(${this.param.sdBarElemH}))`,
        `sdBarFontSize(${this.param.sdBarFontSize})`,
        `sdBarHdFontSize(${this.param.sdBarHdFontSize})`,
        `sdBarHdH(${this.param.sdBarHdH})`,
        `sdBarElemH(${this.param.sdBarElemH})`,
        `sdBarLeafR(${this.param.sdBarLeafR})`,
        `sdBarColorBarsH(${this.param.sdBarColorBarsH})`,
        `sdBarColorBarsW(${this.param.sdBarColorBarsW})`
      ].join('\n'))

      this.param.sdBarFontSize = this.param.sdBarFontSize - 1
      this.param.sdBarHdFontSize = Math.min(origSdBarHdFontSize, this.param.sdBarFontSize + 2)
      this.param.sdBarHdH = this.param.sdBarHdFontSize * this.param.sdBarHdivF
      this.param.sdBarElemH = this.param.sdBarFontSize * this.param.sdBarHdivF
      this.param.sdBarColorBarsH = this.param.sdBarElemH - 2 * this.param.sdBarPadding
      this.param.sdBarColorBarsW = Math.round(this.param.sdBarColorBarsH * 0.6)
      this.param.sdBarLeafR = (this.param.sdBarElemH - 2) / 2
      this.param.sdBarHdY = this.param.sdBarHdH / 2
      this.param.sdBarColorBarsY = this.param.sdBarHdH + this.param.sdBarPadding
      this.param.sdBarMaxTextWidth = 0

      this.param.sdBarMaxTextWidth = this.setFontSizeAndGetMaxTextWidth(this.param.sdBarFontSize)

      this.param.sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth + 3 * this.param.sdBarPadding + this.param.sdBarColorBarsW + this.param.sdBarLeafR * 2)
      this.param.sdBarHeight = Math.ceil(this.param.sdBarHdH + this.config.columnNames.length * this.param.sdBarElemH)
    }

    // account for heading
    // TODO use setFontSizeAndGetMaxTextWidth (must extend to take in selector)
    sideBar.select('.sdBarHeading')
      .style('font-size', this.param.sdBarHdFontSize + 'px')
      .each(function (d) {
        _this.param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), _this.param.sdBarMaxTextWidth)
      })

    // if heading is too long
    if (this.param.sdBarMaxTextWidth + 2 * this.param.sdBarPadding > this.param.sdBarWidth) {
      this.param.sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth + 2 * this.param.sdBarPadding)
    }

    // reduce heading font size
    while (this.param.sdBarWidth > this.config.maxWidth) {
      log.debug([
        'Shrinking sidebar dimensions phase 2 (col header phase):',
        `sdBarWidth(${this.param.sdBarWidth}) > sdBarMaxWidth(${this.config.maxWidth})`,
        `sdBarHdFontSize(${this.param.sdBarHdFontSize})`,
        `sdBarHdH(${this.param.sdBarHdH})`,
        `sdBarElemH(${this.param.sdBarElemH})`,
        `sdBarColorBarsH(${this.param.sdBarColorBarsH})`,
        `sdBarColorBarsW(${this.param.sdBarColorBarsW})`
      ].join('\n'))

      this.param.sdBarHdFontSize = this.param.sdBarHdFontSize - 1
      this.param.sdBarHdH = this.param.sdBarHdFontSize * this.param.sdBarHdivF
      this.param.sdBarHdY = this.param.sdBarHdH / 2
      this.param.sdBarColorBarsY = this.param.sdBarHdH + this.param.sdBarPadding

      this.param.sdBarMaxTextWidth = 0
      sideBar.select('.sdBarHeading')
        .style('font-size', this.param.sdBarHdFontSize + 'px')
        .each(function (d) {
          _this.param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), _this.param.sdBarMaxTextWidth)
        })
      this.param.sdBarWidth = Math.ceil(this.param.sdBarMaxTextWidth + 2 * this.param.sdBarPadding)
      this.param.sdBarHeight = Math.ceil(this.param.sdBarHdH + this.config.columnNames.length * this.param.sdBarElemH)
    }

    this.param.sdBarX = this.config.containerWidth - this.param.sdBarOuterMargin - this.param.sdBarWidth - 0.5
    this.param.sdBarElemW = this.param.sdBarWidth
    this.param.sdBarLeafR = (this.param.sdBarElemH - 2) / 2
    for (let i = 0; i < this.config.columnNames.length; i++) {
      for (let j = 0; j < this.config.columnNames.length; j++) {
        this.sdBarLeafData[i].leaves[j] = [
          {x: 0, y: 0, color: this.config.colors[i], index: i},
          {x: this.param.sdBarLeafR * 0.25, y: -this.param.sdBarLeafR * 0.07},
          {x: this.param.sdBarLeafR * 0.75, y: -this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR, y: 0},
          {x: this.param.sdBarLeafR * 0.75, y: this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR * 0.25, y: this.param.sdBarLeafR * 0.07}
        ]
      }
    }
    this.sdBarPalms.data(this.sdBarLeafData)
    this.sdBarLeaves.data(function (d) { return d.leaves })
    // transform the object into position
    sideBar.select('#g_sideBarDisp').attr('transform', 'translate(' + this.param.sdBarX + ',' + this.param.sdBarY + ')')
    sideBar.select('#g_sdBarControl').attr('transform', 'translate(' + this.param.sdBarX + ',' + this.param.sdBarY + ')')
    // set attributes
    sideBar.select('.sideBar')
      .attr('x', this.param.sdBarX)
      .attr('y', this.param.sdBarY)
      .attr('width', this.param.sdBarWidth + 'px')
      .attr('height', this.param.sdBarHeight + 'px')

    // heading
    sideBar.select('.sdBarHeading')
      .attr('x', this.param.sdBarPadding)
      .attr('y', this.param.sdBarHdY)
      .style('font-size', this.param.sdBarHdFontSize + 'px')

    sideBar.selectAll('.sdBarElem')
      .attr('transform', function (d, i) {
        return 'translate(' + 0 + ',' + (_this.param.sdBarHdH + i * _this.param.sdBarElemH) + ')'
      })

    // column names
    sideBar.selectAll('.sideBarText')
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarLeafR * 2 + this.param.sdBarColorBarsW)
      .attr('y', this.param.sdBarElemH / 2)
      .style('fill', (d, i) => { return this.plotState.isColumnOn(i) === 0 ? '#aaa' : '#000' })

    sideBar.selectAll('.sideBarFrond')
      .attr('transform', 'translate(' + this.param.sdBarElemH / 2 + ',' + this.param.sdBarElemH / 2 + ')')
      .selectAll('path')
      .attr('d', this.line)

    // column this.config.colors
    sideBar.selectAll('.sideBarColorBox')
      .attr('x', this.param.sdBarPadding + this.param.sdBarLeafR * 2 + 0.5)
      .attr('y', this.param.sdBarPadding + 0.5)
      .attr('width', this.param.sdBarColorBarsW - 1)
      .attr('height', this.param.sdBarColorBarsH - 1)
      .style('fill', (d, i) => {
        return this.plotState.isColumnOn(i) === 0 ? '#ccc' : _this.config.colors[i]
      })

    sideBar.selectAll('.sideBarElemRect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.param.sdBarElemW + 'px')
      .attr('height', this.param.sdBarElemH + 'px')

    // set font size on hover: height
    this.param.sdBarHoverFontSize = this.param.sdBarFontSize
    this.param.sdBarHoverElemH = this.param.sdBarElemH
    this.param.sdBarHoverColorBarsW = this.param.sdBarColorBarsW
    this.param.sdBarHoverColorBarsH = this.param.sdBarColorBarsH
    this.param.sdBarHoverColorBarsY = this.param.sdBarColorBarsY
    this.param.sdBarHoverHeight = this.param.sdBarHeight
    while (this.param.sdBarHoverFontSize > 1 &&
    (this.param.sdBarHoverHeight + this.param.sdBarHoverElemH * (this.param.sdBarMenuItems + 2) > this.config.maxHeight - 2 * this.param.sdBarY)) {
      this.param.sdBarHoverFontSize = this.param.sdBarHoverFontSize - 1
      this.param.sdBarHoverElemH = this.param.sdBarHoverFontSize * this.param.sdBarHdivF
      this.param.sdBarHoverColorBarsH = this.param.sdBarHoverElemH - 2 * this.param.sdBarPadding
      this.param.sdBarHoverColorBarsW = Math.round(this.param.sdBarHoverColorBarsH * 0.6)

      this.param.sdBarHoverColorBarsY = this.param.sdBarHdH + this.param.sdBarPadding
      this.param.sdBarHoverHeight = Math.ceil(this.param.sdBarHdH + this.config.columnNames.length * this.param.sdBarHoverElemH)
    }

    // set font size on hover: width
    this.param.sdBarHoverX = this.param.sdBarX
    this.param.sdBarHoverDeltaX = 0
    this.param.sdBarHoverWidth = this.param.sdBarWidth
    this.param.sdBarHoverElemW = this.param.sdBarHoverWidth

    this.param.sdBarMaxTextWidth = 0
    sideBar.selectAll('.sdBarSortText')
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarHoverColorBarsW)
      .attr('y', function (d, i) {
        return _this.param.sdBarHdH + _this.param.sdBarHoverElemH / 2 +
          2 * _this.param.sdBarHoverElemH + i * _this.param.sdBarHoverElemH
      })
      .style('font-size', this.param.sdBarHoverFontSize + 'px')
      .each(function () {
        _this.param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), _this.param.sdBarMaxTextWidth)
      })
    this.param.sdBarCtrlWidth = Math.ceil(this.param.sdBarMaxTextWidth + 3 * this.param.sdBarPadding + this.param.sdBarHoverColorBarsW)

    if (this.param.sdBarCtrlWidth > this.param.sdBarHoverWidth) {
      this.param.sdBarHoverWidth = this.param.sdBarCtrlWidth
      this.param.sdBarHoverElemW = this.param.sdBarHoverWidth
      this.param.sdBarHoverX = this.config.containerWidth - this.param.sdBarOuterMargin - this.param.sdBarHoverWidth - 0.5
      this.param.sdBarHoverDeltaX = this.param.sdBarX - this.param.sdBarHoverX
    }

    // All on and all off buttons
    sideBar.selectAll('.sdBarAllRect')
      .attr('x', function (d, i) {
        return i === 0 ? 0 : Math.floor(_this.param.sdBarElemW / 2)
      })
      .attr('y', this.param.sdBarHdH)
      .attr('width', function (d, i) {
        return i === 0 ? Math.floor(_this.param.sdBarElemW / 2) : Math.ceil(_this.param.sdBarElemW / 2)
      })
      .attr('height', this.param.sdBarHoverElemH)

    sideBar.select('.sdBarAllOn')
      .attr('x', this.param.sdBarElemW / 4)
      .attr('y', this.param.sdBarHdH + this.param.sdBarHoverElemH / 2)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')

    sideBar.select('.sdBarAllOff')
      .attr('x', this.param.sdBarElemW * 3 / 4)
      .attr('y', this.param.sdBarHdH + this.param.sdBarHoverElemH / 2)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')

    sideBar.selectAll('.sdBarSortText')
      .style('font-size', this.param.sdBarHoverFontSize + 'px')
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarColorBarsW)

    sideBar.select('.sdBarSortHeading')
      .attr('x', this.param.sdBarPadding)
      .attr('y', this.param.sdBarHdH + this.param.sdBarHoverElemH / 2 + this.param.sdBarHoverElemH)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')

    sideBar.selectAll('.sideBarElemSortRect')
      .attr('x', 0)
      .attr('y', function (d, i) {
        return _this.param.sdBarHdH + 2 * _this.param.sdBarHoverElemH + i * _this.param.sdBarHoverElemH
      })
      .attr('width', this.param.sdBarElemW + 'px')
      .attr('height', this.param.sdBarHoverElemH + 'px')

    sideBar.selectAll('.sdBarSortBox')
      .attr('cx', this.param.sdBarPadding + 0.5 + this.param.sdBarHoverColorBarsW * 0.5)
      .attr('cy', function (d, i) {
        return _this.param.sdBarHdH + _this.param.sdBarHoverElemH / 2 +
          2 * _this.param.sdBarHoverElemH + i * _this.param.sdBarHoverElemH
      })
      .attr('r', this.param.sdBarHoverColorBarsW * 0.35)
  }

  mouseEnterSidebar () {
    const sideBar = this.element
    const dur = 200 // NB pull from config

    this.param.sdBarLeafR = (this.param.sdBarHoverElemH - 2) / 2
    for (let i = 0; i < this.config.columnNames.length; i++) {
      for (let j = 0; j < this.config.columnNames.length; j++) {
        this.sdBarLeafData[i].leaves[j] = [
          {x: 0, y: 0, color: this.config.colors[i], index: i},
          {x: this.param.sdBarLeafR * 0.25, y: -this.param.sdBarLeafR * 0.07},
          {x: this.param.sdBarLeafR * 0.75, y: -this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR, y: 0},
          {x: this.param.sdBarLeafR * 0.75, y: this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR * 0.25, y: this.param.sdBarLeafR * 0.07}]
      }
    }
    this.sdBarPalms.data(this.sdBarLeafData)
    this.sdBarLeaves.data(function (d) { return d.leaves })

    sideBar.selectAll('.sdBarElem')
      .transition()
      .duration(dur)
      .attr('transform', (d, i) => {
        return 'translate(' + 0 + ',' + (this.param.sdBarHdH + i * this.param.sdBarHoverElemH) + ')'
      })

    sideBar.selectAll('.sideBarElemRect')
      .transition()
      .duration(dur)
      .attr('width', this.param.sdBarHoverElemW + 'px')
      .attr('height', this.param.sdBarHoverElemH + 'px')

    sideBar.selectAll('.sideBarFrond')
      .transition()
      .duration(dur)
      .attr('transform', 'translate(' + this.param.sdBarHoverElemH / 2 + ',' + this.param.sdBarHoverElemH / 2 + ')')
      .selectAll('path')
      .attr('d', this.line)

    sideBar.selectAll('.sideBarColorBox')
      .transition()
      .duration(dur)
      .attr('x', this.param.sdBarPadding + this.param.sdBarLeafR * 2 + 0.5)
      .attr('width', this.param.sdBarHoverColorBarsW - 1)
      .attr('height', this.param.sdBarHoverColorBarsH - 1)

    sideBar.selectAll('.sideBarText')
      .transition()
      .duration(dur)
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarLeafR * 2 + this.param.sdBarHoverColorBarsW)
      .attr('y', this.param.sdBarHoverElemH / 2)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')

    sideBar.select('.sideBar')
      .transition()
      .duration(dur)
      .attr('x', this.param.sdBarHoverX)
      .attr('width', this.param.sdBarHoverWidth)
      .attr('height', this.param.sdBarHoverHeight + this.param.sdBarHoverElemH * 6)

    sideBar.selectAll('.sdBarAllRect')
      .transition()
      .duration(dur)
      .attr('x', (d, i) => {
        return i === 0 ? 0 : Math.floor(this.param.sdBarHoverElemW / 2)
      })
      .attr('width', (d, i) => {
        return i === 0 ? Math.floor(this.param.sdBarHoverElemW / 2) : Math.ceil(this.param.sdBarHoverElemW / 2)
      })

    sideBar.select('.sdBarAllOn')
      .transition()
      .duration(dur)
      .attr('x', this.param.sdBarHoverElemW / 4)

    sideBar.select('.sdBarAllOff')
      .transition()
      .duration(dur)
      .attr('x', this.param.sdBarHoverElemW * 3 / 4)

    sideBar.selectAll('.sideBarElemSortRect')
      .transition()
      .duration(dur)
      .attr('width', this.param.sdBarHoverElemW + 'px')

    sideBar.selectAll('.sdBarSortText')
      .transition()
      .duration(dur)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarHoverColorBarsW)

    sideBar.select('#g_sdBarControl')
      .transition()
      .duration(dur)
      .style('display', 'inline')
      .attr('transform', 'translate(' + this.param.sdBarHoverX + ',' + (this.param.sdBarY + this.config.columnNames.length * this.param.sdBarHoverElemH) + ')')

    sideBar.select('#g_sideBarDisp')
      .transition()
      .duration(dur)
      .attr('transform', 'translate(' + this.param.sdBarHoverX + ',' + this.param.sdBarY + ')')
  }

  mouseLeaveSidebar () {
    const sideBar = this.element
    const dur = 200 // NB pull from config

    this.param.sdBarLeafR = (this.param.sdBarElemH - 2) / 2
    for (let i = 0; i < this.config.columnNames.length; i++) {
      for (let j = 0; j < this.config.columnNames.length; j++) {
        this.sdBarLeafData[i].leaves[j] = [{x: 0, y: 0, color: this.config.colors[i], index: i},
          {x: this.param.sdBarLeafR * 0.25, y: -this.param.sdBarLeafR * 0.07},
          {x: this.param.sdBarLeafR * 0.75, y: -this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR, y: 0},
          {x: this.param.sdBarLeafR * 0.75, y: this.param.sdBarLeafR * 0.13},
          {x: this.param.sdBarLeafR * 0.25, y: this.param.sdBarLeafR * 0.07}]
      }
    }
    this.sdBarPalms.data(this.sdBarLeafData)
    this.sdBarLeaves.data(function (d) { return d.leaves })

    sideBar.selectAll('.sdBarElem')
      .transition()
      .duration(dur)
      .attr('transform', (d, i) => {
        return 'translate(' + 0 + ',' + (this.param.sdBarHdH + i * this.param.sdBarElemH) + ')'
      })

    sideBar.selectAll('.sideBarElemRect')
      .transition()
      .duration(dur)
      .attr('width', this.param.sdBarElemW + 'px')
      .attr('height', this.param.sdBarElemH + 'px')

    sideBar.selectAll('.sideBarFrond')
      .transition()
      .duration(dur)
      .attr('transform', 'translate(' + this.param.sdBarElemH / 2 + ',' + this.param.sdBarElemH / 2 + ')')
      .selectAll('path')
      .attr('d', this.line)

    sideBar.selectAll('.sideBarColorBox')
      .transition()
      .duration(dur)
      .attr('x', this.param.sdBarPadding + this.param.sdBarLeafR * 2 + 0.5)
      .attr('width', this.param.sdBarColorBarsW - 1)
      .attr('height', this.param.sdBarColorBarsH - 1)

    sideBar.selectAll('.sideBarText')
      .transition()
      .duration(dur)
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarLeafR * 2 + this.param.sdBarColorBarsW)
      .attr('y', this.param.sdBarElemH / 2)
      .style('font-size', this.param.sdBarFontSize + 'px')

    sideBar.selectAll('.sdBarAllRect')
      .transition()
      .duration(dur)
      .attr('x', (d, i) => {
        return i === 0 ? 0 : Math.floor(this.param.sdBarElemW / 2)
      })
      .attr('width', (d, i) => {
        return i === 0 ? Math.floor(this.param.sdBarElemW / 2) : Math.ceil(this.param.sdBarElemW / 2)
      })

    sideBar.select('.sdBarAllOn')
      .transition()
      .duration(dur)
      .attr('x', this.param.sdBarElemW / 4)

    sideBar.select('.sdBarAllOff')
      .transition()
      .duration(dur)
      .attr('x', this.param.sdBarElemW * 3 / 4)

    sideBar.selectAll('.sideBarElemSortRect')
      .transition()
      .duration(dur)
      .attr('width', this.param.sdBarElemW + 'px')

    sideBar.selectAll('.sdBarSortText')
      .transition()
      .duration(dur)
      .style('font-size', this.param.sdBarHoverFontSize + 'px')
      .attr('x', 2 * this.param.sdBarPadding + this.param.sdBarColorBarsW)

    sideBar.select('#g_sdBarControl')
      .transition()
      .duration(dur)
      .attr('transform', 'translate(' + this.param.sdBarX + ',' + this.param.sdBarY + ')')
      .style('display', 'none')

    sideBar.select('#g_sideBarDisp')
      .transition()
      .duration(dur)
      .attr('transform', 'translate(' + this.param.sdBarX + ',' + this.param.sdBarY + ')')

    sideBar.select('.sideBar')
      .transition()
      .duration(dur)
      .attr('x', this.param.sdBarX)
      .attr('width', this.param.sdBarWidth)
      .attr('height', this.param.sdBarHeight)
  }
}

module.exports = Sidebar
