import d3 from 'd3'
import _ from 'lodash'
import * as log from 'loglevel'

const d3Tip = require('d3-tip')
d3Tip(d3)
log.setLevel('info') // NB default, adjusted later in init_logger

const defaultSettings = {
  'colFontSize': 11,
  'colFontFamily': 'sans-serif',
  'colHeadingFontSize': 0,
  'colHeadingFontFamily': 'sans-serif',
  'rowFontSize': 11,
  'rowFontFamily': 'sans-serif',
  'columnHeading': '',
  'rowHeading': '',
  'rowHeadingFontSize': 12,
  'rowHeadingFontFamily': 'sans-serif'
}

function PalmTrees () {
  let viewerWidth = 600 // default width
  let viewerHeight = 600 // default height
  let plotWidth = 400
  let plotHeight = 400
  let leftMargin = 35
  let bottomMargin = 20
  let yaxisFormat = 0
  let data = []
  let settings = {}
  let plotMargin = {}
  let param = {}
  let tempNorm = []
  let normData = []
  let selectedCol = []
  let unweightedSums = []
  let weightedSums = []
  let barData = []
  let frondData = []
  let sdBarLeafData = []
  let maxVal
  let minVal
  let rindices
  let colSort = '3'
  let colSortRestore = false
  let duration = 600
  let nticks = 10
  let colNames
  let rowNames
  let weights
  let colors
  let ncol
  let xscale
  let yscale
  let linearRadialScale
  let tipBarScale
  let dataMax = 0
  let dataMin = 100000000
  let xAxis
  let yAxis
  let line
  let bars
  let palms
  let tip
  let leafTip
  let maxXaxisLines = 1
  let xFontSize = 11
  let initR = []
  let yPrefixText = ''
  let leaves
  let sdBarPalms
  let sdBarLeaves
  let commasFormatter
  let commasFormatterE
  let leafTips = []

  let saveStatesFn

    // set up default colors
  function setupColors () {
    let _tempCol = d3.scale.category20().range()
    if (colNames.length > _tempCol.length) {
      let _l = _tempCol.length
      for (let i = 0; i < colNames.length - _l; i++) {
        _tempCol.push(_tempCol[i])
      }
    }
    return _tempCol
  }

    // update date on resize, column toggle and initialization
  function updateData () {
    for (let i = 0; i < rowNames.length; i++) {
      barData[i].value = weightedSums[i]
      frondData[i].value = weightedSums[i]
      for (let j = 0; j < colNames.length; j++) {
        let leafValue = linearRadialScale(normData[i][j])
        if (!settings.rawData[i][j]) {
          leafValue = 0
        }
        if (selectedCol[j] < 0.5) {
          frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
                                        {x: leafValue * 0.25, y: -leafValue * 0.03},
                                        {x: leafValue * 0.75, y: -leafValue * 0.05},
                                        {x: leafValue, y: 0},
                                        {x: leafValue * 0.75, y: leafValue * 0.05},
                                        {x: leafValue * 0.25, y: leafValue * 0.03}]
        } else {
          frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
                                        {x: leafValue * 0.25, y: -leafValue * 0.07},
                                        {x: leafValue * 0.75, y: -leafValue * 0.13},
                                        {x: leafValue, y: 0},
                                        {x: leafValue * 0.75, y: leafValue * 0.13},
                                        {x: leafValue * 0.25, y: leafValue * 0.07}]
        }
      }
    }
  }

    // create ghost rectangle tooltip
  function mouseOverFrond (d, el, sel) {
    let tipRect = sel.select('#ghost' + d.index)[0][0]
    let thisTip = tip.show(d, tipRect)
    let x = Number(sel.select('#ghost' + d.index).attr('x'))
    let y = Number(sel.select('#ghost' + d.index).attr('y'))
    let w = Number(sel.select('#ghost' + d.index).attr('width'))
    let h = Number(sel.select('#ghost' + d.index).attr('height'))

        // height of the tip
    let tipHeight = parseFloat(thisTip.style('height'))
        // width of the tip
    let tipWidth = parseFloat(thisTip.style('width'))
        // southward and northward tip top y position
    let tipSouth = y + h + 5 + yscale(d.value) + plotMargin.top
    let tipNorth = y - 5 + yscale(d.value) + plotMargin.top

    if (viewerHeight - tipSouth >= tipHeight) {
            // southward tip
      thisTip = thisTip.direction('s').offset([10, 0]).show(d, tipRect)
      d3.select('#littleTriangle')
            .attr('class', 'southTip')
            .style('visibility', 'visible')
            .style('top', (y + h + 5 + yscale(d.value) + plotMargin.top) + 'px')
            .style('left', (xscale(d.name) + xscale.rangeBand() / 2 + plotMargin.left) + 'px')

      if (parseFloat(thisTip.style('left')) < 0) {
        thisTip.style('left', '5px')
      } else if (parseFloat(thisTip.style('left')) + tipWidth > param.sdBarX) {
        thisTip.style('left', (param.sdBarX - 5 - tipWidth) + 'px')
      }
    } else if (tipNorth - tipHeight >= 0) {
            // northward tip
      thisTip = thisTip.direction('n').offset([-10, 0]).show(d, tipRect)
      d3.select('#littleTriangle')
            .attr('class', 'northTip')
            .style('visibility', 'visible')
            .style('top', (y - 5 + yscale(d.value) + plotMargin.top) + 'px')
            .style('left', (xscale(d.name) + xscale.rangeBand() / 2 + plotMargin.left) + 'px')

      if (parseFloat(thisTip.style('left')) < 0) {
        thisTip.style('left', '5px')
      } else if (parseFloat(thisTip.style('left')) + tipWidth > param.sdBarX) {
        thisTip.style('left', (param.sdBarX - 5 - tipWidth) + 'px')
      }
    } else if (xscale(d.name) + Math.round(xscale.rangeBand() / 2) >= plotWidth * 0.5) {
            // westward tip
      thisTip = thisTip.direction('w').offset([0, -10]).show(d, tipRect)
      d3.select('#littleTriangle')
            .attr('class', 'westTip')
            .style('visibility', 'visible')
            .style('top', (yscale(d.value) + plotMargin.top) + 'px')
            .style('left', (x - 5 + xscale(d.name) + xscale.rangeBand() / 2 + plotMargin.left) + 'px')

      if (parseFloat(thisTip.style('top')) < 0) {
        thisTip.style('top', '5px')
      } else if (parseFloat(thisTip.style('top')) + tipHeight > viewerHeight) {
        thisTip.style('top', viewerHeight - tipHeight - 5 + 'px')
      }
    } else {
            // eastward tip
      thisTip = thisTip.direction('e').offset([0, 10]).show(d, tipRect)
      d3.select('#littleTriangle')
            .attr('class', 'eastTip')
            .style('visibility', 'visible')
            .style('top', (yscale(d.value) + plotMargin.top) + 'px')
            .style('left', (x + w + 5 + xscale(d.name) + xscale.rangeBand() / 2 + plotMargin.left) + 'px')

      if (parseFloat(thisTip.style('top')) < 0) {
        thisTip.style('top', '5px')
      } else if (parseFloat(thisTip.style('top')) + tipHeight > viewerHeight) {
        thisTip.style('top', viewerHeight - tipHeight - 5 + 'px')
      }
    }

    let i = d.index
    let s = 1.1
    for (let j = 0; j < colNames.length; j++) {
      let leafValue = linearRadialScale(normData[i][j])
      if (!settings.rawData[i][j]) {
        leafValue = 0
      }
      if (selectedCol[j] < 0.5) {
        frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
                                    {x: leafValue * 0.25 * s, y: -leafValue * 0.03 * s},
                                    {x: leafValue * 0.75 * s, y: -leafValue * 0.05 * s},
                                    {x: leafValue * s, y: 0},
                                    {x: leafValue * 0.75 * s, y: leafValue * 0.05 * s},
                                    {x: leafValue * 0.25 * s, y: leafValue * 0.03 * s}]
      } else {
        frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
                                    {x: leafValue * 0.25 * s, y: -leafValue * 0.07 * s},
                                    {x: leafValue * 0.75 * s, y: -leafValue * 0.13 * s},
                                    {x: leafValue * s, y: 0},
                                    {x: leafValue * 0.75 * s, y: leafValue * 0.13 * s},
                                    {x: leafValue * 0.25 * s, y: leafValue * 0.07 * s}]
      }
    }
    palms.data(frondData)
    leaves.data(function (d) { return d.leaves })
    d3.select('#frond' + d.index).selectAll('path').transition('leafSize').duration(duration / 2).attr('d', line)
  }

  function mouseOutFrond (d) {
    tip.hide(d)
    d3.select('#littleTriangle').style('visibility', 'hidden')
    let i = d.index
    for (let j = 0; j < colNames.length; j++) {
      let leafValue = linearRadialScale(normData[i][j])
      if (!settings.rawData[i][j]) {
        leafValue = 0
      }
      if (selectedCol[j] < 0.5) {
        frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
                                    {x: leafValue * 0.25, y: -leafValue * 0.03},
                                    {x: leafValue * 0.75, y: -leafValue * 0.05},
                                    {x: leafValue, y: 0},
                                    {x: leafValue * 0.75, y: leafValue * 0.05},
                                    {x: leafValue * 0.25, y: leafValue * 0.03}]
      } else {
        frondData[i].leaves[j] = [{x: 0, y: 0, i: i, j: j},
                                    {x: leafValue * 0.25, y: -leafValue * 0.07},
                                    {x: leafValue * 0.75, y: -leafValue * 0.13},
                                    {x: leafValue, y: 0},
                                    {x: leafValue * 0.75, y: leafValue * 0.13},
                                    {x: leafValue * 0.25, y: leafValue * 0.07}]
      }
    }
    palms.data(frondData)
    leaves.data(function (d) { return d.leaves })
    d3.select('#frond' + d.index).selectAll('path').transition('leafSize').duration(duration / 2).attr('d', line)
  }

    // create leaf tooltip, which overlaps ghost rect tip to simulate selection effect
  function mouseOverLeaf (d, el, sel) {
    let tipRect = sel.select('#ghost' + d[0].i)[0][0]
    let thisTip = leafTip.show(d, tipRect)
    let dPar = el.parentNode.__data__  // data of parent node

    let y = Number(sel.select('#ghost' + d[0].i).attr('y'))
    let h = Number(sel.select('#ghost' + d[0].i).attr('height'))

        // height of the tip
    let tipHeight = parseFloat(thisTip.style('height'))
        // width of the tip
    let tipWidth = parseFloat(thisTip.style('width'))
        // southward and northward tip top y position
    let tipSouth = y + h + 5 + yscale(dPar.value) + plotMargin.top
    let tipNorth = y - 5 + yscale(dPar.value) + plotMargin.top

    if (viewerHeight - tipSouth >= tipHeight) {
            // southward tip
      thisTip = thisTip.direction('s').offset([10, 0]).show(d, tipRect)

      if (parseFloat(thisTip.style('left')) < 0) {
        thisTip.style('left', '5px')
      } else if (parseFloat(thisTip.style('left')) + tipWidth > param.sdBarX) {
        thisTip.style('left', (param.sdBarX - 5 - tipWidth) + 'px')
      }
    } else if (tipNorth - tipHeight >= 0) {
            // northward tip
      thisTip = thisTip.direction('n').offset([-10, 0]).show(d, tipRect)

      if (parseFloat(thisTip.style('left')) < 0) {
        thisTip.style('left', '5px')
      } else if (parseFloat(thisTip.style('left')) + tipWidth > param.sdBarX) {
        thisTip.style('left', (param.sdBarX - 5 - tipWidth) + 'px')
      }
    } else if (xscale(dPar.name) + Math.round(xscale.rangeBand() / 2) >= plotWidth * 0.5) {
            // westward tip
      thisTip = thisTip.direction('w').offset([0, -10]).show(d, tipRect)
      if (parseFloat(thisTip.style('top')) < 0) {
        thisTip.style('top', '5px')
      } else if (parseFloat(thisTip.style('top')) + tipHeight > viewerHeight) {
        thisTip.style('top', viewerHeight - tipHeight - 5 + 'px')
      }
    } else {
            // eastward tip
      thisTip = thisTip.direction('e').offset([0, 10]).show(d, tipRect)

      if (parseFloat(thisTip.style('top')) < 0) {
        thisTip.style('top', '5px')
      } else if (parseFloat(thisTip.style('top')) + tipHeight > viewerHeight) {
        thisTip.style('top', viewerHeight - tipHeight - 5 + 'px')
      }
    }
  }

  function mouseOutLeaf (d) {
    leafTip.hide(d)
  }

    // update the position of y axis unit on resize
  function updateUnitPosition () {
    d3.select('.suffixText')
      .attr('x', function () {
        let len = this.getComputedTextLength()
        if (len < plotMargin.left - 10) { return -len - 10 } else { return -plotMargin.left }
      })
      .attr('y', -plotMargin.top / 2)
  }

  function initSidebarParam () {
    param.sdBarOuterMargin = 5
    param.sdBarPadding = 3
    param.sdBarHdivF = 2   // ratio of height divided by font size
    param.sdBarY = param.sdBarOuterMargin + 0.5

    param.sdBarMaxWidth = Math.floor(viewerWidth * 0.25)
    param.sdBarMaxHeight = Math.floor(viewerHeight - 2 * param.sdBarOuterMargin)

    param.sdBarFontSize = settings.colFontSize
    param.sdBarHdFontSize = settings.colHeadingFontSize
    param.sdBarHdH = param.sdBarHdFontSize * param.sdBarHdivF
    param.sdBarElemH = param.sdBarFontSize * param.sdBarHdivF
    param.sdBarColorBarsH = param.sdBarElemH - 2 * param.sdBarPadding
    param.sdBarColorBarsW = Math.round(param.sdBarColorBarsH * 0.6)
    param.sdBarLeafR = (param.sdBarElemH - 2) / 2

    param.sdBarHdY = param.sdBarHdH / 2
    param.sdBarColorBarsY = param.sdBarHdH + param.sdBarPadding
  }

    // update side bar content on initialization and resize
  function updateSidebar (baseSvg) {
    param.sdBarMaxTextWidth = 0
    baseSvg.selectAll('.sideBarText')
                .style('font-size', param.sdBarFontSize + 'px')
                .each(function (d) {
                  param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), param.sdBarMaxTextWidth)
                })

    param.sdBarWidth = Math.ceil(param.sdBarMaxTextWidth + 3 * param.sdBarPadding + param.sdBarColorBarsW + param.sdBarLeafR * 2)
    param.sdBarHeight = Math.ceil(param.sdBarHdH + colNames.length * param.sdBarElemH)

    const origSdBarHdFontSize = param.sdBarHdFontSize
    while (param.sdBarFontSize > 1 &&
            (param.sdBarWidth > param.sdBarMaxWidth || param.sdBarHeight > param.sdBarMaxHeight)) {
      log.getLogger('sizing').debug([
        'Shrinking sidebar dimensions:',
        `sdBarWidth(${param.sdBarWidth}) > sdBarMaxWidth(${param.sdBarMaxWidth}) || sdBarHeight(${param.sdBarHeight}) > sdBarMaxHeight(${param.sdBarMaxHeight})`,
        `sdBarFontSize(${param.sdBarFontSize})`,
        `sdBarHdFontSize(${param.sdBarHdFontSize})`,
        `sdBarHdH(${param.sdBarHdH})`,
        `sdBarElemH(${param.sdBarElemH})`,
        `sdBarColorBarsH(${param.sdBarColorBarsH})`,
        `sdBarColorBarsW(${param.sdBarColorBarsW})`
      ].join('\n'))

      param.sdBarFontSize = param.sdBarFontSize - 1
      param.sdBarHdFontSize = Math.min(origSdBarHdFontSize, param.sdBarFontSize + 2)
      param.sdBarHdH = param.sdBarHdFontSize * param.sdBarHdivF
      param.sdBarElemH = param.sdBarFontSize * param.sdBarHdivF
      param.sdBarColorBarsH = param.sdBarElemH - 2 * param.sdBarPadding
      param.sdBarColorBarsW = Math.round(param.sdBarColorBarsH * 0.6)

      param.sdBarHdY = param.sdBarHdH / 2
      param.sdBarColorBarsY = param.sdBarHdH + param.sdBarPadding
      param.sdBarMaxTextWidth = 0

      baseSvg.selectAll('.sideBarText')
                .style('font-size', param.sdBarFontSize + 'px')
                .each(function (d) {
                  param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), param.sdBarMaxTextWidth)
                })

      param.sdBarWidth = Math.ceil(param.sdBarMaxTextWidth + 3 * param.sdBarPadding + param.sdBarColorBarsW + param.sdBarLeafR * 2)
      param.sdBarHeight = Math.ceil(param.sdBarHdH + colNames.length * param.sdBarElemH)
    }

        // account for heading
    baseSvg.select('.sdBarHeading')
                .style('font-size', param.sdBarHdFontSize + 'px')
                .each(function (d) {
                  param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), param.sdBarMaxTextWidth)
                })

        // if heading is too long
    if (param.sdBarMaxTextWidth + 2 * param.sdBarPadding > param.sdBarWidth) {
      param.sdBarWidth = Math.ceil(param.sdBarMaxTextWidth + 2 * param.sdBarPadding)
    }

        // reduce heading font size
    while (param.sdBarWidth > param.sdBarMaxWidth) {
      param.sdBarHdFontSize = param.sdBarHdFontSize - 1
      param.sdBarHdH = param.sdBarHdFontSize * param.sdBarHdivF
      param.sdBarHdY = param.sdBarHdH / 2
      param.sdBarColorBarsY = param.sdBarHdH + param.sdBarPadding

      param.sdBarMaxTextWidth = 0
      baseSvg.select('.sdBarHeading')
                .style('font-size', param.sdBarHdFontSize + 'px')
                .each(function (d) {
                  param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), param.sdBarMaxTextWidth)
                })
      param.sdBarWidth = Math.ceil(param.sdBarMaxTextWidth + 2 * param.sdBarPadding)
      param.sdBarHeight = Math.ceil(param.sdBarHdH + colNames.length * param.sdBarElemH)
    }

    param.sdBarX = viewerWidth - param.sdBarOuterMargin - param.sdBarWidth - 0.5
    param.sdBarElemW = param.sdBarWidth
    param.sdBarLeafR = (param.sdBarElemH - 2) / 2
    for (let i = 0; i < colNames.length; i++) {
      for (let j = 0; j < colNames.length; j++) {
        sdBarLeafData[i].leaves[j] = [{x: 0, y: 0, color: colors[i], index: i},
                                {x: param.sdBarLeafR * 0.25, y: -param.sdBarLeafR * 0.07},
                                {x: param.sdBarLeafR * 0.75, y: -param.sdBarLeafR * 0.13},
                                {x: param.sdBarLeafR, y: 0},
                                {x: param.sdBarLeafR * 0.75, y: param.sdBarLeafR * 0.13},
                                {x: param.sdBarLeafR * 0.25, y: param.sdBarLeafR * 0.07}]
      }
    }
    sdBarPalms.data(sdBarLeafData)
    sdBarLeaves.data(function (d) { return d.leaves })
        // transform the object into position
    baseSvg.select('#g_sideBarDisp').attr('transform', 'translate(' + param.sdBarX + ',' + param.sdBarY + ')')
    baseSvg.select('#g_sdBarControl').attr('transform', 'translate(' + param.sdBarX + ',' + param.sdBarY + ')')
        // set attributes
    baseSvg.select('.sideBar')
                .attr('x', param.sdBarX)
                .attr('y', param.sdBarY)
                .attr('width', param.sdBarWidth + 'px')
                .attr('height', param.sdBarHeight + 'px')

        // heading
    baseSvg.select('.sdBarHeading')
                .attr('x', param.sdBarPadding)
                .attr('y', param.sdBarHdY)
                .style('font-size', param.sdBarHdFontSize + 'px')

    baseSvg.selectAll('.sdBarElem')
                .attr('transform', function (d, i) {
                  return 'translate(' + 0 + ',' + (param.sdBarHdH + i * param.sdBarElemH) + ')'
                })

        // column names
    baseSvg.selectAll('.sideBarText')
                .attr('x', 2 * param.sdBarPadding + param.sdBarLeafR * 2 + param.sdBarColorBarsW)
                .attr('y', param.sdBarElemH / 2)
                .style('fill', function (d, i) {
                  return selectedCol[i] === 0 ? '#aaa' : '#000'
                })

    baseSvg.selectAll('.sideBarFrond')
                .attr('transform', 'translate(' + param.sdBarElemH / 2 + ',' + param.sdBarElemH / 2 + ')')
                .selectAll('path')
                .attr('d', line)

        // column colors
    baseSvg.selectAll('.sideBarColorBox')
                .attr('x', param.sdBarPadding + param.sdBarLeafR * 2 + 0.5)
                .attr('y', param.sdBarPadding + 0.5)
                .attr('width', param.sdBarColorBarsW - 1)
                .attr('height', param.sdBarColorBarsH - 1)
                .style('fill', function (d, i) {
                  return selectedCol[i] === 0 ? '#ccc' : colors[i]
                })

    baseSvg.selectAll('.sideBarElemRect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', param.sdBarElemW + 'px')
                .attr('height', param.sdBarElemH + 'px')

        // set font size on hover: height
    param.sdBarMenuItems = 4
    param.sdBarHoverFontSize = param.sdBarFontSize
    param.sdBarHoverElemH = param.sdBarElemH
    param.sdBarHoverColorBarsW = param.sdBarColorBarsW
    param.sdBarHoverColorBarsH = param.sdBarColorBarsH
    param.sdBarHoverColorBarsY = param.sdBarColorBarsY
    param.sdBarHoverHeight = param.sdBarHeight
    while (param.sdBarHoverFontSize > 1 &&
            (param.sdBarHoverHeight + param.sdBarHoverElemH * (param.sdBarMenuItems + 2) > viewerHeight - 2 * param.sdBarY)) {
      param.sdBarHoverFontSize = param.sdBarHoverFontSize - 1
      param.sdBarHoverElemH = param.sdBarHoverFontSize * param.sdBarHdivF
      param.sdBarHoverColorBarsH = param.sdBarHoverElemH - 2 * param.sdBarPadding
      param.sdBarHoverColorBarsW = Math.round(param.sdBarHoverColorBarsH * 0.6)

      param.sdBarHoverColorBarsY = param.sdBarHdH + param.sdBarPadding
      param.sdBarHoverHeight = Math.ceil(param.sdBarHdH + colNames.length * param.sdBarHoverElemH)
    }

        // set font size on hover: width
    param.sdBarHoverX = param.sdBarX
    param.sdBarHoverDeltaX = 0
    param.sdBarHoverWidth = param.sdBarWidth
    param.sdBarHoverElemW = param.sdBarHoverWidth

    param.sdBarMaxTextWidth = 0
    baseSvg.selectAll('.sdBarSortText')
                .attr('x', 2 * param.sdBarPadding + param.sdBarHoverColorBarsW)
                .attr('y', function (d, i) {
                  return param.sdBarHdH + param.sdBarHoverElemH / 2 +
                            2 * param.sdBarHoverElemH + i * param.sdBarHoverElemH
                })
                .style('font-size', param.sdBarHoverFontSize + 'px')
                .each(function () {
                  param.sdBarMaxTextWidth = Math.max(this.getComputedTextLength(), param.sdBarMaxTextWidth)
                })
    param.sdBarCtrlWidth = Math.ceil(param.sdBarMaxTextWidth + 3 * param.sdBarPadding + param.sdBarHoverColorBarsW)

    if (param.sdBarCtrlWidth > param.sdBarHoverWidth) {
      param.sdBarHoverWidth = param.sdBarCtrlWidth
      param.sdBarHoverElemW = param.sdBarHoverWidth
      param.sdBarHoverX = viewerWidth - param.sdBarOuterMargin - param.sdBarHoverWidth - 0.5
      param.sdBarHoverDeltaX = param.sdBarX - param.sdBarHoverX
    }

        // All on and all off buttons
    baseSvg.selectAll('.sdBarAllRect')
                .attr('x', function (d, i) {
                  return i === 0 ? 0 : Math.floor(param.sdBarElemW / 2)
                })
                .attr('y', param.sdBarHdH)
                .attr('width', function (d, i) {
                  return i === 0 ? Math.floor(param.sdBarElemW / 2) : Math.ceil(param.sdBarElemW / 2)
                })
                .attr('height', param.sdBarHoverElemH)

    baseSvg.select('.sdBarAllOn')
                .attr('x', param.sdBarElemW / 4)
                .attr('y', param.sdBarHdH + param.sdBarHoverElemH / 2)
                .style('font-size', param.sdBarHoverFontSize + 'px')

    baseSvg.select('.sdBarAllOff')
                .attr('x', param.sdBarElemW * 3 / 4)
                .attr('y', param.sdBarHdH + param.sdBarHoverElemH / 2)
                .style('font-size', param.sdBarHoverFontSize + 'px')

    baseSvg.selectAll('.sdBarSortText')
                .style('font-size', param.sdBarHoverFontSize + 'px')
                .attr('x', 2 * param.sdBarPadding + param.sdBarColorBarsW)

    baseSvg.select('.sdBarSortHeading')
                .attr('x', param.sdBarPadding)
                .attr('y', param.sdBarHdH + param.sdBarHoverElemH / 2 + param.sdBarHoverElemH)
                .style('font-size', param.sdBarHoverFontSize + 'px')

    baseSvg.selectAll('.sideBarElemSortRect')
                .attr('x', 0)
                .attr('y', function (d, i) {
                  return param.sdBarHdH + 2 * param.sdBarHoverElemH + i * param.sdBarHoverElemH
                })
                .attr('width', param.sdBarElemW + 'px')
                .attr('height', param.sdBarHoverElemH + 'px')

    baseSvg.selectAll('.sdBarSortBox')
                .attr('cx', param.sdBarPadding + 0.5 + param.sdBarHoverColorBarsW * 0.5)
                .attr('cy', function (d, i) {
                  return param.sdBarHdH + param.sdBarHoverElemH / 2 +
                            2 * param.sdBarHoverElemH + i * param.sdBarHoverElemH
                })
                .attr('r', param.sdBarHoverColorBarsW * 0.35)

    let dur = 200
    baseSvg.select('#g_sideBar')
                .on('mouseenter', function () {
                  param.sdBarLeafR = (param.sdBarHoverElemH - 2) / 2
                  for (let i = 0; i < colNames.length; i++) {
                    for (let j = 0; j < colNames.length; j++) {
                      sdBarLeafData[i].leaves[j] = [{x: 0, y: 0, color: colors[i], index: i},
                                            {x: param.sdBarLeafR * 0.25, y: -param.sdBarLeafR * 0.07},
                                            {x: param.sdBarLeafR * 0.75, y: -param.sdBarLeafR * 0.13},
                                            {x: param.sdBarLeafR, y: 0},
                                            {x: param.sdBarLeafR * 0.75, y: param.sdBarLeafR * 0.13},
                                            {x: param.sdBarLeafR * 0.25, y: param.sdBarLeafR * 0.07}]
                    }
                  }
                  sdBarPalms.data(sdBarLeafData)
                  sdBarLeaves.data(function (d) { return d.leaves })

                  baseSvg.selectAll('.sdBarElem')
                    .transition()
                    .duration(dur)
                    .attr('transform', function (d, i) {
                      return 'translate(' + 0 + ',' + (param.sdBarHdH + i * param.sdBarHoverElemH) + ')'
                    })

                  baseSvg.selectAll('.sideBarElemRect')
                    .transition()
                    .duration(dur)
                    .attr('width', param.sdBarHoverElemW + 'px')
                    .attr('height', param.sdBarHoverElemH + 'px')

                  baseSvg.selectAll('.sideBarFrond')
                    .transition()
                    .duration(dur)
                    .attr('transform', 'translate(' + param.sdBarHoverElemH / 2 + ',' + param.sdBarHoverElemH / 2 + ')')
                    .selectAll('path')
                    .attr('d', line)

                  baseSvg.selectAll('.sideBarColorBox')
                    .transition()
                    .duration(dur)
                    .attr('x', param.sdBarPadding + param.sdBarLeafR * 2 + 0.5)
                    .attr('width', param.sdBarHoverColorBarsW - 1)
                    .attr('height', param.sdBarHoverColorBarsH - 1)

                  baseSvg.selectAll('.sideBarText')
                    .transition()
                    .duration(dur)
                    .attr('x', 2 * param.sdBarPadding + param.sdBarLeafR * 2 + param.sdBarHoverColorBarsW)
                    .attr('y', param.sdBarHoverElemH / 2)
                    .style('font-size', param.sdBarHoverFontSize + 'px')

                  baseSvg.select('.sideBar')
                    .transition()
                    .duration(dur)
                    .attr('x', param.sdBarHoverX)
                    .attr('width', param.sdBarHoverWidth)
                    .attr('height', param.sdBarHoverHeight + param.sdBarHoverElemH * 6)

                  baseSvg.selectAll('.sdBarAllRect')
                    .transition()
                    .duration(dur)
                    .attr('x', function (d, i) {
                      return i === 0 ? 0 : Math.floor(param.sdBarHoverElemW / 2)
                    })
                    .attr('width', function (d, i) {
                      return i === 0 ? Math.floor(param.sdBarHoverElemW / 2) : Math.ceil(param.sdBarHoverElemW / 2)
                    })

                  baseSvg.select('.sdBarAllOn')
                    .transition()
                    .duration(dur)
                    .attr('x', param.sdBarHoverElemW / 4)

                  baseSvg.select('.sdBarAllOff')
                    .transition()
                    .duration(dur)
                    .attr('x', param.sdBarHoverElemW * 3 / 4)

                  baseSvg.selectAll('.sideBarElemSortRect')
                    .transition()
                    .duration(dur)
                    .attr('width', param.sdBarHoverElemW + 'px')

                  baseSvg.selectAll('.sdBarSortText')
                    .transition()
                    .duration(dur)
                    .style('font-size', param.sdBarHoverFontSize + 'px')
                    .attr('x', 2 * param.sdBarPadding + param.sdBarHoverColorBarsW)

                  baseSvg.select('#g_sdBarControl')
                    .transition()
                    .duration(dur)
                    .style('display', 'inline')
                    .attr('transform', 'translate(' + param.sdBarHoverX + ',' + (param.sdBarY + ncol * param.sdBarHoverElemH) + ')')

                  baseSvg.select('#g_sideBarDisp')
                    .transition()
                    .duration(dur)
                    .attr('transform', 'translate(' + param.sdBarHoverX + ',' + param.sdBarY + ')')
                })
                .on('mouseleave', function () {
                  param.sdBarLeafR = (param.sdBarElemH - 2) / 2
                  for (let i = 0; i < colNames.length; i++) {
                    for (let j = 0; j < colNames.length; j++) {
                      sdBarLeafData[i].leaves[j] = [{x: 0, y: 0, color: colors[i], index: i},
                                            {x: param.sdBarLeafR * 0.25, y: -param.sdBarLeafR * 0.07},
                                            {x: param.sdBarLeafR * 0.75, y: -param.sdBarLeafR * 0.13},
                                            {x: param.sdBarLeafR, y: 0},
                                            {x: param.sdBarLeafR * 0.75, y: param.sdBarLeafR * 0.13},
                                            {x: param.sdBarLeafR * 0.25, y: param.sdBarLeafR * 0.07}]
                    }
                  }
                  sdBarPalms.data(sdBarLeafData)
                  sdBarLeaves.data(function (d) { return d.leaves })

                  baseSvg.selectAll('.sdBarElem')
                    .transition()
                    .duration(dur)
                    .attr('transform', function (d, i) {
                      return 'translate(' + 0 + ',' + (param.sdBarHdH + i * param.sdBarElemH) + ')'
                    })

                  baseSvg.selectAll('.sideBarElemRect')
                    .transition()
                    .duration(dur)
                    .attr('width', param.sdBarElemW + 'px')
                    .attr('height', param.sdBarElemH + 'px')

                  baseSvg.selectAll('.sideBarFrond')
                    .transition()
                    .duration(dur)
                    .attr('transform', 'translate(' + param.sdBarElemH / 2 + ',' + param.sdBarElemH / 2 + ')')
                    .selectAll('path')
                    .attr('d', line)

                  baseSvg.selectAll('.sideBarColorBox')
                    .transition()
                    .duration(dur)
                    .attr('x', param.sdBarPadding + param.sdBarLeafR * 2 + 0.5)
                    .attr('width', param.sdBarColorBarsW - 1)
                    .attr('height', param.sdBarColorBarsH - 1)

                  baseSvg.selectAll('.sideBarText')
                    .transition()
                    .duration(dur)
                    .attr('x', 2 * param.sdBarPadding + param.sdBarLeafR * 2 + param.sdBarColorBarsW)
                    .attr('y', param.sdBarElemH / 2)
                    .style('font-size', param.sdBarFontSize + 'px')

                  baseSvg.selectAll('.sdBarAllRect')
                    .transition()
                    .duration(dur)
                    .attr('x', function (d, i) {
                      return i === 0 ? 0 : Math.floor(param.sdBarElemW / 2)
                    })
                    .attr('width', function (d, i) {
                      return i === 0 ? Math.floor(param.sdBarElemW / 2) : Math.ceil(param.sdBarElemW / 2)
                    })

                  baseSvg.select('.sdBarAllOn')
                    .transition()
                    .duration(dur)
                    .attr('x', param.sdBarElemW / 4)

                  baseSvg.select('.sdBarAllOff')
                    .transition()
                    .duration(dur)
                    .attr('x', param.sdBarElemW * 3 / 4)

                  baseSvg.selectAll('.sideBarElemSortRect')
                    .transition()
                    .duration(dur)
                    .attr('width', param.sdBarElemW + 'px')

                  baseSvg.selectAll('.sdBarSortText')
                    .transition()
                    .duration(dur)
                    .style('font-size', param.sdBarHoverFontSize + 'px')
                    .attr('x', 2 * param.sdBarPadding + param.sdBarColorBarsW)

                  baseSvg.select('#g_sdBarControl')
                    .transition()
                    .duration(dur)
                    .attr('transform', 'translate(' + param.sdBarX + ',' + param.sdBarY + ')')
                    .style('display', 'none')

                  baseSvg.select('#g_sideBarDisp')
                    .transition()
                    .duration(dur)
                    .attr('transform', 'translate(' + param.sdBarX + ',' + param.sdBarY + ')')

                  baseSvg.select('.sideBar')
                    .transition()
                    .duration(dur)
                    .attr('x', param.sdBarX)
                    .attr('width', param.sdBarWidth)
                    .attr('height', param.sdBarHeight)
                })
  }

  function resizeChart (el) {
    d3.select(el).select('svg')
            .attr('width', viewerWidth)
            .attr('height', viewerHeight)

    let baseSvg = d3.select(el).select('svg')

    if (viewerHeight < 100) {
      return
    }

    if (viewerWidth < 200) {
      return
    }

        // sidebar
    initSidebarParam()
    updateSidebar(baseSvg)
        // main plot area
    plotMargin.top = viewerHeight * 0.1
    plotMargin.right = 10 + param.sdBarWidth
    plotWidth = viewerWidth - plotMargin.left - plotMargin.right
    plotHeight = viewerHeight - plotMargin.top - plotMargin.bottom
    xscale.rangeRoundBands([0, plotWidth], 0.1, 0.3)
        // update leaf size
    param.maxLeafWidth = Math.min(plotMargin.top, Math.floor((xscale.range()[1] - xscale.range()[0]) / 1.4), 60)
    linearRadialScale.range([param.maxLeafWidth * minVal / maxVal, param.maxLeafWidth])
    updateData()
    palms.data(frondData)
    leaves.data(function (d) { return d.leaves })

    baseSvg.select('.xaxis')
                .attr('transform', 'translate(0,' + plotHeight + ')')
                .call(xAxis)
                .selectAll('.tick text')
                .style('font-size', settings.rowFontSize + 'px')
                .style('font-family', settings.rowFontFamily)
                .call(wrapNew, xscale.rangeBand())

    plotMargin.bottom = bottomMargin + maxXaxisLines * xFontSize * 1.1
    plotHeight = viewerHeight - plotMargin.top - plotMargin.bottom
    baseSvg.select('.xaxis').attr('transform', 'translate(0,' + plotHeight + ')')
    baseSvg.select('#g_plotArea').attr('transform', 'translate(' + plotMargin.left + ',' + plotMargin.top + ')')

    yscale.range([plotHeight, 0])
    yAxis.scale(yscale)
    xAxis.scale(xscale)
    baseSvg.select('.yaxis')
                .call(yAxis)
                .selectAll('.tick text')
                .style('font-size', settings.yFontSize + 'px')
                .style('font-family', settings.yFontFamily)

    baseSvg.selectAll('.bar')
                .attr('x', function (d) { return xscale(d.name) + Math.round(xscale.rangeBand() / 2) })
                .attr('y', function (d) { return yscale(d.value) })
                .attr('height', function (d) { return plotHeight - yscale(d.value) })
    baseSvg.selectAll('.plotAreaHeading')
                .attr('x', plotWidth / 2)
                .attr('y', plotHeight + plotMargin.bottom - 10)
    baseSvg.selectAll('.plotAreaYLab')
                .attr('transform', 'rotate(-90,' + (-plotMargin.left + 20) + ',' + (plotHeight / 2) + ')')
                .attr('x', -plotMargin.left + 20)
                .attr('y', plotHeight / 2)

    baseSvg.selectAll('.leaf')
                .attr('transform', function (d) {
                  return 'translate(' + (xscale(d.name) + xscale.rangeBand() / 2) + ',' + yscale(d.value) + ')'
                })
    leaves.attr('d', line)

    if (settings.tooltips) {
      tip.destroy()
      leafTip.destroy()
      tip = d3Tip()
                    .attr('class', 'd3-tip')
                    .html(function (d) { return d.tip })
      leafTip = d3Tip()
                    .attr('class', 'd3-tip1')
                    .html(function (d, i) { return leafTips[d[0].i][d[0].j] })

      baseSvg.call(tip).call(leafTip)
      baseSvg.selectAll('.ghostCircle')
                    .attr('x', function (d) {
                      return Number(d3.select(this).attr('x')) * linearRadialScale(d.tipMaxR) / initR[d.index]
                    })
                    .attr('y', function (d) {
                      return Number(d3.select(this).attr('y')) * linearRadialScale(d.tipMaxR) / initR[d.index]
                    })
                    .attr('width', function (d) {
                      return Number(d3.select(this).attr('width')) * linearRadialScale(d.tipMaxR) / initR[d.index]
                    })
                    .attr('height', function (d) {
                      return Number(d3.select(this).attr('height')) * linearRadialScale(d.tipMaxR) / initR[d.index]
                    })
                    .each(function (d) { initR[d.index] = linearRadialScale(d.tipMaxR) })

      baseSvg.selectAll('.leaf')
                    .on('mouseover', function (d) {
                      mouseOverFrond(d, this, baseSvg)
                    })
                    .on('mouseout', function (d) {
                      mouseOutFrond(d)
                    })

      leaves.on('mouseover', function (d) {
        mouseOverLeaf(d, this, baseSvg)
      })
                    .on('mouseout', function (d) {
                      mouseOutLeaf(d)
                    })
    }

    if (settings.barHeights) {
      if (settings.yprefix || settings.ysuffix) {
        updateUnitPosition()
      }
    } else {
      if (settings.prefix || settings.suffix) {
        updateUnitPosition()
      }
    }
  }

  function wrapNew (text, width) {
    let separators = {'-': 1, ' ': 1}
    let lineNumbers = []
    text.each(function () {
      let text = d3.select(this)
      let chars = text.text().split('').reverse()
      let c
      let c1
      let isnum = /[0-9]/
      let nextchar
      let sep
      let newline = []   // the chars from the current line that should be breaked and wrapped
      let lineTemp = []  // the current, temporary line (tspan) that needs to be filled
      let lineNumber = 0
      let lineHeight = 1.1 // ems
      let x = text.attr('x')
      let y = text.attr('y')
      let dy = parseFloat(text.attr('dy'))
      let tspan = text.text(null).append('tspan').attr('x', x).attr('y', y).attr('dy', dy + 'em')

      while (c = chars.pop()) { // eslint-disable-line no-cond-assign
        // remove leading space
        if (lineTemp.length === 0 && c === ' ') {
          continue
        }
        lineTemp.push(c)
        tspan.text(lineTemp.join(''))
        if (tspan.node().getComputedTextLength() > width) {
                    // if no separator detected before c, wait until there is one
                    // otherwise, wrap texts
                    // The or case handles situations when the negative sign is the first char
          if (sep === undefined || lineTemp[0] === '-') {
            if (c in separators) {
              if (c === ' ') {
                lineTemp.pop()
              } else if (c === '-') {
                                // check negation or hyphen
                c1 = chars.pop()
                if (c1) {
                  if (isnum.test(c1)) {
                    chars.push(c1)
                    chars.push(lineTemp.pop())
                  } else {
                    chars.push(c1)
                  }
                }
              }
              // make new line
              sep = undefined
              tspan.text(lineTemp.join(''))
              tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text('')
              lineTemp = []
              newline = []
            }
          } else {
                        // handles the case when the last char is a separator and c === sep
            if (c in separators) {
              newline.push(lineTemp.pop())
            }
                        // pop chars until it reaches the previous separator recorded
            nextchar = lineTemp.pop()
            while (nextchar !== sep && lineTemp.length > 0) {
              newline.push(nextchar)
              nextchar = lineTemp.pop()
            }
                        // handles negative sign and space
            if (sep === '-') {
              c1 = newline.pop()
              if (c1) {
                if (isnum.test(c1)) {
                  newline.push(c1)
                  newline.push(sep)
                } else {
                  lineTemp.push(sep)
                  newline.push(c1)
                }
              } else {
                lineTemp.push(sep)
                newline.push(c1)
              }
            } else if (sep !== ' ') {
              lineTemp.push(sep)
            }
                        // put chars back into the string that needs to be wrapped
            newline.reverse()
            while (nextchar = newline.pop()) { // eslint-disable-line no-cond-assign
              chars.push(nextchar)
            }
                        // make new line
            sep = undefined
            tspan.text(lineTemp.join(''))
            tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text('')
            lineTemp = []
            newline = []
          }
        } else {
          if (c in separators) {
            sep = c
          }
        }
      }
      lineNumbers.push(lineNumber + 1)
    })
    maxXaxisLines = d3.max(lineNumbers)
  }

  function chart (chartWindowSelection) {
    let baseSvg = chartWindowSelection.select('svg')

    line = d3.svg.line()
                    .interpolate('cardinal-closed')
                    .x(function (d) { return d.x })
                    .y(function (d) { return d.y })

        /* create the side bar */
        /* this part goes first to set plot width */

    initSidebarParam()

    let plotArea = baseSvg.append('g').attr('id', 'g_plotArea')

    let sideBar = baseSvg.append('g').attr('id', 'g_sideBar')
    sideBar.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('class', 'sideBar')

    let sdBarCtrl = sideBar.append('g').attr('id', 'g_sdBarControl').style('display', 'none')
    let sdBarDisp = sideBar.append('g').attr('id', 'g_sideBarDisp')

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
                .style('font-family', settings.colFontFamily)

    sdBarCtrl.append('text')
                .attr('class', 'sdBarAllOff')
                .attr('dy', '0.35em')
                .text('All Off')
                .style('text-anchor', 'middle')
                .style('font-family', settings.colFontFamily)

    sdBarCtrl.append('text')
                .attr('class', 'sdBarSortHeading')
                .attr('dy', '0.35em')
                .text('Order')
                .style('font-family', settings.colFontFamily)

    let sortText = ['Original', 'Alphabetical', 'Ascending', 'Descending']
    let sdBarCtrlEnter = sdBarCtrl.selectAll('g.span')
                .data(sortText)
                .enter()
                .append('g')

    sdBarCtrlEnter.append('rect')
                .attr('class', 'sideBarElemSortRect')
                .attr('id', function (d, i) { return 's' + i })

    sdBarCtrlEnter.append('circle')
                .attr('class', 'sdBarSortBox')
                .attr('id', function (d, i) { return 'sortC' + i })

    sdBarCtrlEnter.append('text')
                .attr('class', 'sdBarSortText')
                .attr('id', function (d, i) { return 'sortT' + i })
                .attr('dy', '0.35em')
                .text(function (d) { return d })
                .style('font-family', settings.colFontFamily)

    sdBarDisp.append('text')
                .attr('class', 'sdBarHeading')
                .attr('dy', '0.35em')
                .text(settings.colHeading)
                .style('font-family', settings.colHeadingFontFamily)

    for (let i = 0; i < colNames.length; i++) {
      let sdBarLeafDatum = {}
      let sdBarLeaf = []
      for (let j = 0; j < colNames.length; j++) {
        sdBarLeaf.push([{x: 0, y: 0, color: colors[i], index: i},
                                {x: param.sdBarLeafR * 0.25, y: -param.sdBarLeafR * 0.07},
                                {x: param.sdBarLeafR * 0.75, y: -param.sdBarLeafR * 0.13},
                                {x: param.sdBarLeafR, y: 0},
                                {x: param.sdBarLeafR * 0.75, y: param.sdBarLeafR * 0.13},
                                {x: param.sdBarLeafR * 0.25, y: param.sdBarLeafR * 0.07}])
      }
      sdBarLeafDatum = {leaves: sdBarLeaf, colName: colNames[i], color: colors[i], index: i}
      sdBarLeafData.push(sdBarLeafDatum)
    }

    sdBarPalms = sdBarDisp.selectAll('sdBar.g')
                        .data(sdBarLeafData)
    let sdBarElemEnter = sdBarPalms.enter()
                            .append('g')
                            .attr('class', 'sdBarElem')

    sdBarElemEnter.append('rect')
                    .attr('class', 'sideBarElemRect')
                    .attr('id', function (d, i) { return 'sbRect' + i })

    sdBarLeaves = sdBarElemEnter.append('g')
                    .attr('class', 'sideBarFrond')
                    .attr('id', function (d, i) { return 'sbFrond' + i })
                    .selectAll('.le')
                    .data(function (d) { return d.leaves })

    sdBarLeaves.enter()
                    .append('path')
                    .attr('d', line)
                    .attr('transform', function (d, i) {
                      return 'rotate(' + (i * 360 / ncol - 90) + ')'
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
                .style('font-family', settings.colFontFamily)

    updateSidebar(baseSvg)

    function toggleColumn () {
      if (d3.event.defaultPrevented) return // click suppressed

      let index = Number(this.id.substring(6))
      if (selectedCol[index] === 0) {
        selectedCol[index] = 1
      } else {
        selectedCol[index] = 0
      }
      saveStates()
      updatePlot(duration, false)
      d3.event.stopPropagation()
    }

    function toggleLeaf (d, sel) {
      if (d3.event.defaultPrevented) return // click suppressed

      if (selectedCol[d[0].j] === 0) {
        selectedCol[d[0].j] = 1
      } else {
        selectedCol[d[0].j] = 0
      }
      saveStates()
      updatePlot(duration, false)
      d3.event.stopPropagation()
    }

    baseSvg.selectAll('.sideBarElemRect')
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
        selectedCol.forEach(function (d, i) {
          selectedCol[i] = 1
        })
      } else {
        selectedCol.forEach(function (d, i) {
          selectedCol[i] = 0
        })
      }
      saveStates()
      updatePlot(duration, false)
      d3.event.stopPropagation()
    }

    baseSvg.selectAll('.sdBarAllRect')
                .on('mouseover', function () {
                  d3.select(this).style('fill', '#eee')
                  d3.event.stopPropagation()
                })
                .on('mouseout', function () {
                  d3.select(this).style('fill', 'white')
                  d3.event.stopPropagation()
                })
                .on('click', clickAllToggle)

    // sort rows
    function clickSort () {
      if (d3.event.defaultPrevented) return // click suppressed
      let thisid = this.id.substring(1)

      if (thisid !== colSort) {
        colSort = thisid
        saveStates()
        sdBarCtrl.selectAll('.sdBarSortBox').style('fill', '#fff').style('stroke', '#999')
        sdBarCtrl.selectAll('.sdBarSortText').style('fill', '#999')

        sdBarCtrl.select('#sortC' + thisid).style('fill', 'steelblue').style('stroke', 'steelblue')
        sdBarCtrl.select('#sortT' + thisid).style('fill', '#000')

        sortBars(false)
      }
    }

    baseSvg.selectAll('.sideBarElemSortRect')
                .on('mouseover', function () {
                  d3.select(this).style('fill', '#eee')
                  d3.event.stopPropagation()
                })
                .on('mouseout', function () {
                  d3.select(this).style('fill', 'white')
                  d3.event.stopPropagation()
                })

    if (!colSortRestore) {
      switch (settings.order) {
        case 'original':
          colSort = '0'
          break
        case 'alphabetical':
          colSort = '1'
          break
        case 'ascending':
          colSort = '2'
          break
        case 'descending':
          colSort = '3'
          break
      }
    }

    sdBarCtrl.select('#sortC' + colSort).style('fill', 'steelblue').style('stroke', 'steelblue')
    sdBarCtrl.select('#sortT' + colSort).style('fill', '#000')
    sdBarCtrl.selectAll('.sideBarElemSortRect').on('click', clickSort)

        /* main plot area */

    param.ymax = d3.max(weightedSums)
    param.ymin = 0

        // set left margin based on numbers, prefix and if there is ylabel
    if (settings.showYAxis) {
      if (param.ymax >= 10000) {
        yaxisFormat = 1
        leftMargin = 55
      } else {
        yaxisFormat = 0
        leftMargin = ((Math.floor(param.ymax)).toString().length + settings.ydigits) * 7 + 25
      }
    } else {
      leftMargin = 10
    }

    if (settings.barHeights) {
      if (settings.yprefix && settings.ysuffix && settings.showYAxis) {
        yPrefixText = settings.yprefix
        let prefixLength = 0
        plotArea.append('text')
                        .style('font-size', '11px')
                        .style('font-family', 'sans-serif')
                        .text(settings.yprefix)
                        .each(function () {
                          prefixLength = this.getComputedTextLength()
                        })
                        .remove()
        leftMargin = leftMargin + prefixLength
      }
    } else {
      if (settings.prefix && settings.suffix && settings.showYAxis) {
        yPrefixText = settings.prefix
        let prefixLength = 0
        plotArea.append('text')
                        .style('font-size', '11px')
                        .style('font-family', 'sans-serif')
                        .text(settings.prefix)
                        .each(function () {
                          prefixLength = this.getComputedTextLength()
                        })
                        .remove()
        leftMargin = leftMargin + prefixLength
      }
    }

    plotMargin = {top: viewerHeight * 0.1,
      right: 10 + param.sdBarWidth,
      bottom: bottomMargin,
      left: leftMargin}
    plotWidth = viewerWidth - plotMargin.left - plotMargin.right
    plotHeight = viewerHeight - plotMargin.top - plotMargin.bottom

        // left
    if (settings.ylab) {
      leftMargin = leftMargin + 30
      plotMargin.left = leftMargin
      plotWidth = viewerWidth - plotMargin.left - plotMargin.right
    }

        // bottom
    if (settings.rowHeading) {
      bottomMargin = bottomMargin + 20
      plotMargin.bottom = bottomMargin
      plotHeight = viewerHeight - plotMargin.top - plotMargin.bottom
    }

        // x axis
    xscale = d3.scale.ordinal()
                    .domain(rowNames)
                    .rangeRoundBands([0, plotWidth], 0.1, 0.3)

    param.maxLeafWidth = Math.min(plotMargin.top, Math.floor((xscale.range()[1] - xscale.range()[0]) / 1.4), 60)
    linearRadialScale = d3.scale.linear()
                        .domain([minVal, maxVal])
                        .range([param.maxLeafWidth * minVal / maxVal, param.maxLeafWidth])

    for (let i = 0; i < rowNames.length; i++) {
      let frondDatum = {}
      let leafData = []
      for (let j = 0; j < colNames.length; j++) {
        let leafValue = linearRadialScale(normData[i][j])
        if (!settings.rawData[i][j]) {
          leafValue = 0
        }
        if (selectedCol[j] < 0.5) {
          leafData.push([{x: 0, y: 0, i: i, j: j},
                                    {x: leafValue * 0.25, y: -leafValue * 0.03},
                                    {x: leafValue * 0.75, y: -leafValue * 0.05},
                                    {x: leafValue, y: 0},
                                    {x: leafValue * 0.75, y: leafValue * 0.05},
                                    {x: leafValue * 0.25, y: leafValue * 0.03}])
        } else {
          leafData.push([{x: 0, y: 0, i: i, j: j},
                                    {x: leafValue * 0.25, y: -leafValue * 0.07},
                                    {x: leafValue * 0.75, y: -leafValue * 0.13},
                                    {x: leafValue, y: 0},
                                    {x: leafValue * 0.75, y: leafValue * 0.13},
                                    {x: leafValue * 0.25, y: leafValue * 0.07}])
        }
      }
      frondDatum = {leaves: leafData,
        name: rowNames[i],
        value: weightedSums[i],
        index: i,
        tip: 's',
        tipR: d3.mean(normData[i]),
        tipMaxR: d3.max(normData[i])}
      frondData.push(frondDatum)
    }

    for (let i = 0; i < rowNames.length; i++) {
      barData.push({name: rowNames[i], value: weightedSums[i], index: i})
    }

    bars = plotArea.selectAll('.vbar')
                        .data(barData)
    let barsEnter = bars.enter()
    let barRect = barsEnter.append('rect')

    palms = plotArea.selectAll('.palm')
                    .data(frondData)

    let palmEnter = palms.enter().append('g')

        // let xtickRect = barsEnter.append("rect")
        //                        .attr("class", "xtickBg");

    xAxis = d3.svg.axis()
                    .scale(xscale)
                    .orient('bottom')

    plotArea.append('g')
                .attr('class', 'xaxis')
                .call(xAxis)
                .selectAll('.tick text')
                .attr('id', function (d, i) { return 'tickTxt' + i })
                .style('font-size', settings.rowFontSize + 'px')
                .style('font-family', settings.rowFontFamily)
                .call(wrapNew, xscale.rangeBand())

        // update bottom margin based on x axis
    plotMargin.bottom = bottomMargin + maxXaxisLines * xFontSize * 1.1
    plotHeight = viewerHeight - plotMargin.top - plotMargin.bottom
    log.info(`plotHeight(${plotHeight}) = viewerHeight(${viewerHeight}) - plotMargin.top(${plotMargin.top}) - plotMargin.bottom(${plotMargin.bottom})`)
    plotArea.select('.xaxis')
                .attr('transform', 'translate(0,' + plotHeight + ')')

    if (settings.rowHeading) {
      plotArea.append('text')
                    .attr('class', 'plotAreaHeading')
                    .attr('x', plotWidth / 2)
                    .attr('y', plotHeight + plotMargin.bottom - 10)
                    .text(settings.rowHeading)
                    .style('text-anchor', 'middle')
                    .style('font-size', settings.rowHeadingFontSize + 'px')
                    .style('font-family', settings.rowHeadingFontFamily)
    }

        // y axis

    if (settings.ylab) {
      plotArea.append('text')
                    .attr('class', 'plotAreaYLab')
                    .text(settings.ylab)
                    .attr('transform', 'rotate(-90,' + (-plotMargin.left + 20) + ',' + (plotHeight / 2) + ')')
                    .attr('x', -plotMargin.left + 20)
                    .attr('y', plotHeight / 2)
                    .style('text-anchor', 'middle')
                    .style('font-size', settings.yLabFontSize + 'px')
                    .style('font-family', settings.yLabFontFamily)
    }

    yscale = d3.scale.linear()
                    .domain([param.ymin, param.ymax])
                    .nice(nticks)
                    .range([plotHeight, 0])

    yAxis = d3.svg.axis()
                    .scale(yscale)
                    .orient('left')
                    .ticks(nticks)
                    .tickFormat(function (d) {
                      if (yaxisFormat === 0) {
                        return yPrefixText + commasFormatter(d)
                      } else if (yaxisFormat === 1) {
                        return yPrefixText + commasFormatterE(d)
                      }
                    })

    plotArea.attr('transform', 'translate(' + plotMargin.left + ',' + plotMargin.top + ')')

    if (settings.showYAxis) {
      plotArea.append('g')
                    .attr('class', 'yaxis')
                    .call(yAxis)
                    .selectAll('.tick text')
                    .style('font-size', settings.yFontSize + 'px')
                    .style('font-family', settings.yFontFamily)
    }

        // vertical bars

    barRect.attr('class', 'bar')
                .attr('x', function (d) { return xscale(d.name) + Math.round(xscale.rangeBand() / 2) })
                .attr('width', 1)
                .attr('y', function (d) { return yscale(d.value) })
                .attr('height', function (d) { return plotHeight - yscale(d.value) })

        // leaves
    if (settings.tooltips) {
      palmEnter.append('rect')
                    .attr('class', 'ghostCircle')
    }

    leaves = palmEnter.attr('class', 'leaf')
                    .attr('id', function (d) { return 'frond' + d.index })
                    .selectAll('path')
                    .data(function (d) { return d.leaves })

    leaves.enter().append('path')
            .style('cursor', 'pointer')
            .attr('d', line)

    plotArea.selectAll('.leaf')
                .attr('transform', function (d) {
                  return 'translate(' + (xscale(d.name) + xscale.rangeBand() / 2) + ',' + yscale(d.value) + ')'
                })

    leaves.attr('transform', function (d, i) {
      return 'rotate(' + (i * 360 / ncol - 90) + ')'
    })

    leaves.style('fill', function (d, i) {
      return selectedCol[i] === 0 ? '#ccc' : colors[i]
    })

        // update html tip content on ghost rectangle
    function makeTipData () {
      let val
      for (let i = 0; i < rowNames.length; i++) {
        let atip = ''

        atip = atip + "<div class='tipHeading' style='font-family:" + settings.tooltipsHeadingFontFamily + ';font-size:' + settings.tooltipsHeadingFontSize + 'px' + "'>" + rowNames[i]
        if (settings.ylab) {
          if (settings.barHeights) {
            atip = atip + ' - ' + settings.ylab + ' '
            if (settings.yprefix) {
              atip = atip + settings.yprefix + weightedSums[i].toFixed(settings.digits)
            } else {
              atip = atip + weightedSums[i].toFixed(settings.digits)
            }
            if (settings.ysuffix) {
              atip = atip + settings.ysuffix
            }
          } else {
            atip = atip + ' -'
            if (settings.ylab) {
              atip = atip + ' ' + settings.ylab
            }
            atip = atip + ' '
            if (settings.prefix) {
              atip = atip + settings.prefix + weightedSums[i].toFixed(settings.digits)
            } else {
              atip = atip + weightedSums[i].toFixed(settings.digits)
            }
            if (settings.suffix) {
              atip = atip + settings.suffix
            }
          }
        }

        atip = atip + '</div>'
        atip = atip + "<div class='tipTableContainer'>" + "<table class='tipTable'>"
        for (let j = 0; j < colNames.length; j++) {
          atip = atip + '<tr>'
                    // val = round(data[i][j],2) >= 0.01? data[i][j].toFixed(settings.digits) : 0;
          val = data[i][j].toFixed(settings.digits)
          if (selectedCol[j] === 1) {
            if (settings.rawData[i][j]) {
              if (settings.prefix) {
                if (settings.suffix) {
                  atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + settings.prefix + val + settings.suffix + '</td>'
                } else {
                  atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + settings.prefix + val + '</td>'
                }
              } else {
                if (settings.suffix) {
                  atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + val + settings.suffix + '</td>'
                } else {
                  atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + val + '</td>'
                }
              }
            } else {
              atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + 'No data' + '</td>'
            }

            atip = atip + "<td style='text-align:left;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + colNames[j] + '</td>'
            atip = atip + "<td style='text-align:center'>"
            atip = atip + "<div style='width:" + tipBarScale(data[i][j]) + 'px;height:8px;background-color:' + colors[j] + "'></div>" + '</td>'
          } else {
            if (settings.rawData[i][j]) {
              if (settings.prefix) {
                if (settings.suffix) {
                  atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + settings.prefix + val + settings.suffix + '</font></td>'
                } else {
                  atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + settings.prefix + val + '</font></td>'
                }
              } else {
                if (settings.suffix) {
                  atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + val + settings.suffix + '</font></td>'
                } else {
                  atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + val + '</font></td>'
                }
              }
            } else {
              atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + 'No data' + '</font></td>'
            }

            atip = atip + "<td style='text-align:left;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + colNames[j] + '</font></td>'
            atip = atip + "<td style='text-align:center'>"
            atip = atip + "<div style='width:" + tipBarScale(data[i][j]) + "px;height:8px;background-color:#ccc'></div>" + '</td>'
          }

          atip = atip + '</tr>'
        }
        atip = atip + '</table>'
        atip = atip + '</div>'

        frondData[i].tip = atip
      }
    }

        // update html on leaf tips
    function makeLeafTipData () {
      let val
      leafTips = []
            // if (settings.suffix) {tb_len = 4;} else {tb_len = 3;}
      for (let i = 0; i < rowNames.length; i++) {
        let tempTips = []
        for (let jj = 0; jj < colNames.length; jj++) {
          let atip = ''

          atip = atip + "<div class='tipHeading' style='font-family:" + settings.tooltipsHeadingFontFamily + ';font-size:' + settings.tooltipsHeadingFontSize + 'px' + "'>" + rowNames[i]
          if (settings.ylab) {
            if (settings.barHeights) {
              atip = atip + ' - ' + settings.ylab + ' '
              if (settings.yprefix) {
                atip = atip + settings.yprefix + weightedSums[i].toFixed(settings.digits)
              } else {
                atip = atip + weightedSums[i].toFixed(settings.digits)
              }
              if (settings.ysuffix) {
                atip = atip + settings.ysuffix
              }
            } else {
              atip = atip + ' -'
              if (settings.ylab) {
                atip = atip + ' ' + settings.ylab
              }
              atip = atip + ' '
              if (settings.prefix) {
                atip = atip + settings.prefix + weightedSums[i].toFixed(settings.digits)
              } else {
                atip = atip + weightedSums[i].toFixed(settings.digits)
              }
              if (settings.suffix) {
                atip = atip + settings.suffix
              }
            }
          }

          atip = atip + '</div>'
          atip = atip + "<div class='tipTableContainer'>" + "<table class='tipTable'>"
          for (let j = 0; j < colNames.length; j++) {
            if (j === jj) {
              atip = atip + "<tr style ='background-color:#eee'>"
            } else {
              atip = atip + '<tr>'
            }
                        // val = round(data[i][j],2) >= 0.01? data[i][j].toFixed(settings.digits) : 0;
            val = data[i][j].toFixed(settings.digits)
            if (selectedCol[j] === 1) {
              if (settings.rawData[i][j]) {
                if (settings.prefix) {
                  if (settings.suffix) {
                    atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + settings.prefix + val + settings.suffix + '</td>'
                  } else {
                    atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + settings.prefix + val + '</td>'
                  }
                } else {
                  if (settings.suffix) {
                    atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + val + settings.suffix + '</td>'
                  } else {
                    atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + val + '</td>'
                  }
                }
              } else {
                atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + 'No data' + '</td>'
              }
              atip = atip + "<td style='text-align:left;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'>" + colNames[j] + '</td>'
              atip = atip + "<td style='text-align:center'>"
              atip = atip + "<div style='width:" + tipBarScale(data[i][j]) + 'px;height:8px;background-color:' + colors[j] + "'></div>" + '</td>'
            } else {
              if (settings.rawData[i][j]) {
                if (settings.prefix) {
                  if (settings.suffix) {
                    atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + settings.prefix + val + settings.suffix + '</font></td>'
                  } else {
                    atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + settings.prefix + val + '</font></td>'
                  }
                } else {
                  if (settings.suffix) {
                    atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + val + settings.suffix + '</font></td>'
                  } else {
                    atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + val + '</font></td>'
                  }
                }
              } else {
                atip = atip + "<td style='text-align:right;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + 'No data' + '</font></td>'
              }
              atip = atip + "<td style='text-align:left;font-family:" + settings.tooltipsFontFamily + ';font-size:' + settings.tooltipsFontSize + 'px' + "'><font color=#999>" + colNames[j] + '</font></td>'
              atip = atip + "<td style='text-align:center'>"
              atip = atip + "<div style='width:" + tipBarScale(data[i][j]) + "px;height:8px;background-color:#ccc'></div>" + '</td>'
            }

            atip = atip + '</tr>'
          }
          atip = atip + '</table>'
          atip = atip + '</div>'
          tempTips.push(atip)
        }
        leafTips.push(tempTips)
      }
    }

        // work on tooltip

    if (settings.tooltips) {
      makeTipData()
      makeLeafTipData()
      tip = d3Tip()
                    .attr('class', 'd3-tip')
                    .html(function (d) { return d.tip })

      leafTip = d3Tip()
                    .attr('class', 'd3-tip1')
                    .html(function (d, i) { return leafTips[d[0].i][d[0].j] })

      baseSvg.call(tip).call(leafTip)

      d3.select('body')
        .append('div')
        .attr('id', 'littleTriangle')
        .style('visibility', 'hidden')

      baseSvg.selectAll('.ghostCircle')
                    .attr('id', function (d, i) { return 'ghost' + i })
                    .attr('x', function (d) {
                      return this.parentNode.getBoundingClientRect().left - 5 - 1 -
                        (xscale(d.name) + xscale.rangeBand() / 2 + plotMargin.left)
                    })
                    .attr('y', function (d) {
                      return this.parentNode.getBoundingClientRect().top - 5 - 1 -
                        (yscale(d.value) + plotMargin.top)
                    })
                    .attr('width', function (d) { return this.parentNode.getBoundingClientRect().width + 2 })
                    .attr('height', function (d) { return this.parentNode.getBoundingClientRect().height + 2 })
                    .each(function (d) { initR.push(linearRadialScale(d.tipMaxR)) })

      baseSvg.selectAll('.leaf')
                    .on('mouseover', function (d) {
                      mouseOverFrond(d, this, baseSvg)
                    })
                    .on('mouseout', function (d) {
                      mouseOutFrond(d)
                    })

      leaves.on('mouseover', function (d) {
        mouseOverLeaf(d, this, baseSvg)
      })
                    .on('mouseout', function (d) {
                      mouseOutLeaf(d)
                    })
                    .on('click', function (d) {
                      toggleLeaf(d, baseSvg)
                    })
    }

        // sort and return sort indices
    function sortWithIndices (toSort, mode) {
      for (let i = 0; i < toSort.length; i++) {
        toSort[i] = [toSort[i], i]
      }
      if (mode === 0) {
        toSort.sort(function (left, right) {
          return left[0] < right[0] ? -1 : 1
        })
      } else {
        toSort.sort(function (left, right) {
          return left[0] < right[0] ? 1 : -1
        })
      }
      toSort.sortIndices = []
      for (let j = 0; j < toSort.length; j++) {
        toSort.sortIndices.push(toSort[j][1])
        toSort[j] = toSort[j][0]
      }
      return toSort.sortIndices
    }

        // sort using supplied indices
    function sortFromIndices (toSort, indices) {
      let output = []
      for (let i = 0; i < toSort.length; i++) {
        output.push(toSort[indices[i]])
      }
      return output
    }

        // sort bars
    function sortBars (initialization) {
      let rowNamesTemp = []
      let sortfun
      let sumsTemp = []
      if (colSort === '0') {
                // as is
        xscale.domain(rowNames)
        sortfun = function (a, b) { return a.index - b.index }
      } else if (colSort === '1') {
                // alphabetical
        for (let i = 0; i < rowNames.length; i++) {
          rowNamesTemp.push(rowNames[i])
        }
        rindices = sortWithIndices(rowNamesTemp, 0)
        xscale.domain(rowNames1)
        sortfun = function (a, b) { return xscale(a.name) - xscale(b.name) }
      } else if (colSort === '2') {
                // low to high

        for (let i = 0; i < rowNames.length; i++) {
          sumsTemp.push(weightedSums[i])
        }
        rindices = sortWithIndices(sumsTemp, 0)
        rowNames2 = sortFromIndices(rowNames, rindices)
        xscale.domain(rowNames2)
        sortfun = function (a, b) { return a.value - b.value }
      } else if (colSort === '3') {
                // high to low

        for (let i = 0; i < rowNames.length; i++) {
          sumsTemp.push(weightedSums[i])
        }
        rindices = sortWithIndices(sumsTemp, 1)
        rowNames2 = sortFromIndices(rowNames, rindices)
        xscale.domain(rowNames2)
        sortfun = function (a, b) { return -(a.value - b.value) }
      }

      if (initialization) {
        plotArea.selectAll('.bar')
                        .sort(sortfun)
                        .attr('x', function (d) { return xscale(d.name) + Math.round(xscale.rangeBand() / 2) })
                        .attr('y', function (d) { return yscale(d.value) })
                        .attr('height', function (d) { return plotHeight - yscale(d.value) })

        plotArea.select('.xaxis')
                        .call(xAxis)
                        .selectAll('.tick text')
                        .style('font-size', settings.rowFontSize + 'px')
                        .style('font-family', settings.rowFontFamily)
                        .call(wrapNew, xscale.rangeBand())

        plotArea.selectAll('.leaf')
                        .sort(sortfun)
                        .attr('transform', function (d) {
                          return 'translate(' + (xscale(d.name) + xscale.rangeBand() / 2) + ',' + yscale(d.value) + ')'
                        })
      } else {
        plotArea.selectAll('.bar')
                        .sort(sortfun)
                        .transition('barHeight')
                        .duration(duration)
                        .attr('x', function (d) { return xscale(d.name) + Math.round(xscale.rangeBand() / 2) })
                        .attr('y', function (d) { return yscale(d.value) })
                        .attr('height', function (d) { return plotHeight - yscale(d.value) })

        plotArea.select('.xaxis')
                        .transition('xtickLocation')
                        .duration(duration)
                        .call(xAxis)
                        .selectAll('.tick text')
                        .style('font-size', settings.rowFontSize + 'px')
                        .style('font-family', settings.rowFontFamily)
                        .call(wrapNew, xscale.rangeBand())

        plotArea.selectAll('.leaf')
                        .sort(sortfun)
                        .transition('leafHeight')
                        .duration(duration)
                        .attr('transform', function (d) {
                          return 'translate(' + (xscale(d.name) + xscale.rangeBand() / 2) + ',' + yscale(d.value) + ')'
                        })
      }
    }

        // update plot when something is clicked
    function updatePlot (duration, initialization) {
      for (let i = 0; i < rowNames.length; i++) {
        unweightedSums[i] = 0
        weightedSums[i] = 0
        for (let j = 0; j < colNames.length; j++) {
          unweightedSums[i] += selectedCol[j] * data[i][j]
          weightedSums[i] += selectedCol[j] * weights[j] * data[i][j]
        }
        if (settings.barHeights) {
          weightedSums[i] = settings.barHeights[i]
        }
      }

      makeTipData()
      makeLeafTipData()
      updateData()

      param.ymax = d3.max(weightedSums)
      param.ymin = 0

      yscale.domain([param.ymin, param.ymax])
                    .nice(nticks)
                    .range([plotHeight, 0])

      yAxis.scale(yscale)

      if (initialization) {
        plotArea.select('.yaxis')
                        .call(yAxis)
                        .selectAll('.tick text')
                        .style('font-size', settings.yFontSize + 'px')
                        .style('font-family', settings.yFontFamily)
      } else {
        plotArea.select('.yaxis')
                        .transition()
                        .duration(duration)
                        .call(yAxis)
                        .selectAll('.tick text')
                        .style('font-size', settings.yFontSize + 'px')
                        .style('font-family', settings.yFontFamily)
      }

      bars.data(barData)
      palms.data(frondData)
      leaves.data(function (d) { return d.leaves })

      leaves.transition('leafColor')
                .duration(duration)
                .attr('d', line)
                .style('fill', function (d, i) {
                  return selectedCol[i] === 0 ? '#ccc' : colors[i]
                })

      baseSvg.selectAll('.sideBarColorBox').transition('boxColor')
                .duration(duration)
                .style('fill', function (d, i) {
                  return selectedCol[i] === 0 ? '#ccc' : colors[i]
                })

      baseSvg.selectAll('.sideBarText').transition('textColor')
                .duration(duration)
                .style('fill', function (d, i) {
                  return selectedCol[i] === 0 ? '#aaa' : '#000'
                })

      if (d3.sum(selectedCol) === 0) {
        plotArea.selectAll('.bar')
                    .transition('barHeight')
                    .duration(duration)
                    .attr('x', function (d) { return xscale(d.name) + Math.round(xscale.rangeBand() / 2) })
                    .attr('y', function (d) { return yscale(d.value) })
                    .attr('height', function (d) { return plotHeight - yscale(d.value) })

        plotArea.selectAll('.leaf')
                    .transition('leafHeight')
                    .duration(duration)
                    .attr('transform', function (d) {
                      return 'translate(' + (xscale(d.name) + xscale.rangeBand() / 2) + ',' + yscale(d.value) + ')'
                    })
      } else {
        sortBars(initialization)
      }
    }

        // additional stuff
    let rowNames1 = []
    let rowNames2 = []
    for (let i = 0; i < rowNames.length; i++) {
      rowNames1.push(rowNames[i])
    }
    rowNames1.sort()

    if (settings.barHeights) {
      if (settings.showYAxis) {
        if (settings.yprefix || settings.ysuffix) {
          if (!settings.ysuffix) {
            plotArea.append('text')
                            .attr('class', 'suffixText')
                            .text(settings.yprefix)
                            .style('font-size', settings.yFontSize + 'px')
                            .style('font-family', settings.yFontFamily)
          } else {
            plotArea.append('text')
                            .attr('class', 'suffixText')
                            .text(settings.ysuffix)
                            .style('font-size', settings.yFontSize + 'px')
                            .style('font-family', settings.yFontFamily)
          }
          updateUnitPosition()
        }
      }
    } else {
      if (settings.showYAxis) {
        if (settings.prefix || settings.suffix) {
          if (!settings.suffix) {
            plotArea.append('text')
                            .attr('class', 'suffixText')
                            .text(settings.prefix)
                            .style('font-size', settings.yFontSize + 'px')
                            .style('font-family', settings.yFontFamily)
          } else {
            plotArea.append('text')
                            .attr('class', 'suffixText')
                            .text(settings.suffix)
                            .style('font-size', settings.yFontSize + 'px')
                            .style('font-family', settings.yFontFamily)
          }
          updateUnitPosition()
        }
      }
    }

    updatePlot(duration, true)
  }

  function saveStates () {
    if (_.isFunction(saveStatesFn)) {
      // save selectedCol and colSort
      saveStatesFn({selectedCol: selectedCol, colSort: colSort, data: data})
    }
  }

  function restoreStates (state) {
    colSort = state.colSort
    colSortRestore = true
    selectedCol = []
    for (let i = 0; i < settings.colNames.length; i++) {
      selectedCol.push(state.selectedCol[i])
    }
  }

  function checkState (state) {
    let savedData = state.data
    if (data && savedData && data[0] && savedData[0]) {
      if (savedData.length !== data.length || savedData[0].length !== data[0].length) {
        return false
      }
    } else {
      return false
    }

    for (let i = 0; i < rowNames.length; i++) {
      for (let j = 0; j < colNames.length; j++) {
        if (data[i][j] !== savedData[i][j]) {
          return false
        }
      }
    }

    return true
  }

  function initData (value) {
    if (!settings.rawData) {
      settings.rawData = _.cloneDeep(value)
    }

    for (let i = 0; i < colNames.length; i++) {
      selectedCol.push(1)
    }

    let wtSum, unwtSum
        // compute weighted sum
    for (let i = 0; i < rowNames.length; i++) {
      wtSum = 0
      unwtSum = 0
      for (let j = 0; j < colNames.length; j++) {
        wtSum += selectedCol[j] * weights[j] * value[i][j]
        unwtSum += selectedCol[j] * value[i][j]
      }
      weightedSums.push(wtSum)
      unweightedSums.push(unwtSum)
      if (settings.barHeights) {
        weightedSums[i] = settings.barHeights[i]
      }
    }

    let maxSum = d3.max(unweightedSums)
    rindices = d3.range(rowNames.length)

        // normalize leaf data
    maxVal = 0
    minVal = 1
    for (let i = 0; i < rowNames.length; i++) {
      tempNorm = []
      for (let j = 0; j < colNames.length; j++) {
        tempNorm.push(Math.sqrt(value[i][j] / maxSum))
      }
      normData.push(tempNorm)
      maxVal = Math.max(d3.max(normData[i]), maxVal)
      minVal = Math.min(d3.min(normData[i]), minVal)
    }

        // now set the original data values for tips
    for (let i = 0; i < rowNames.length; i++) {
      let tempData = []
      for (let j = 0; j < colNames.length; j++) {
        tempData.push(value[i][j])
      }
      data.push(tempData)
      dataMax = Math.max(dataMax, d3.max(tempData))
      dataMin = Math.min(dataMin, d3.min(tempData))
    }

    tipBarScale = d3.scale.linear().domain([dataMin, dataMax]).range([2, 30])
  }

  function initSettings (value) {
    settings = _.defaultsDeep(value, defaultSettings)
    initLogger(settings.logger || settings.log)
    colNames = settings.colNames
    rowNames = settings.rowNames
    weights = settings.weights
    ncol = settings.colNames.length
    colors = settings.colors

    commasFormatter = d3.format(',.' + settings.ydigits + 'f')
    commasFormatterE = d3.format(',.' + settings.ydigits + 'e')
    if (!colors) {
      colors = setupColors()
    }

    param.sdBarMaxTxtL = 0
    for (let i = 0; i < colNames.length; i++) {
      param.sdBarMaxTxtL = Math.max(param.sdBarMaxTxtL, colNames[i].length)
    }
  }

  function initLogger (loggerSettings) {
    if (_.isNull(loggerSettings)) {
      return
    }
    if (_.isString(loggerSettings)) {
      log.setLevel(loggerSettings)
      return
    }
    _(loggerSettings).each((loggerLevel, loggerName) => {
      if (loggerName === 'default') {
        log.setLevel(loggerLevel)
      } else {
        log.getLogger(loggerName).setLevel(loggerLevel)
      }
    })
  }

  chart.reset = function () {
    plotWidth = 400
    plotHeight = 400
    leftMargin = 35
    bottomMargin = 20
    yaxisFormat = 0
    data = []
    settings = {}
    plotMargin = {}
    param = {}
    tempNorm = []
    normData = []
    selectedCol = []
    unweightedSums = []
    weightedSums = []
    barData = []
    frondData = []
    sdBarLeafData = []
    maxVal = null
    minVal = null
    rindices = null
    colSort = '3'
    colSortRestore = false
    duration = 600
    nticks = 10
    colNames = null
    rowNames = null
    weights = null
    colors = null
    ncol = null
    xscale = null
    yscale = null
    linearRadialScale = null
    tipBarScale = null
    dataMax = 0
    dataMin = 100000000
    xAxis = null
    yAxis = null
    line = null
    bars = null
    palms = null
    tip = null
    leafTip = null
    maxXaxisLines = 1
    xFontSize = 11
    initR = []
    yPrefixText = ''
    leaves = null
    sdBarPalms = null
    sdBarLeaves = null
    commasFormatter = null
    commasFormatterE = null
    leafTips = []

    return chart
  }

    // settings getter/setter
  chart.data = function (value) {
    if (!arguments.length) return data
    initData(value)
    return chart
  }

    // settings getter/setter
  chart.settings = function (value) {
    if (!arguments.length) return settings
    initSettings(value)
    return chart
  }

  chart.checkState = function (v) {
    return checkState(v)
  }

  chart.resetState = function () {
    saveStatesFn(null)
    return chart
  }

    // loads the state of the widget if it is saved
  chart.restoreState = function (state) {
    restoreStates(state)
    return chart
  }

    // set the state saver function
  chart.stateSaver = function (stateChanged) {
    if (!arguments.length) return saveStatesFn
    saveStatesFn = stateChanged
    return chart
  }

    // resize
  chart.resize = function (el) {
    resizeChart(el)
    return chart
  }

  chart.width = function (value) {
        // width getter/setter
    if (!arguments.length) return viewerWidth
    viewerWidth = value
    return chart
  }

    // height getter/setter
  chart.height = function (value) {
    if (!arguments.length) return viewerHeight
    viewerHeight = value
    return chart
  }

  return chart
}

module.exports = PalmTrees
