import _ from 'lodash'
import * as rootLog from 'loglevel'
const layoutLogger = rootLog.getLogger('layout')
layoutLogger.setLevel('error')

const cells = {
  PLOT: 'PLOT',
  SIDEBAR: 'SIDEBAR',
  YAXIS: 'YAXIS',
  XAXIS: 'XAXIS',
  XAXIS_TITLE: 'XAXIS_TITLE'
}

const HeatmapColumns = [
  { name: 'YAXIS', cells: [cells.YAXIS] },
  { name: 'PLOT', cells: [cells.PLOT, cells.XAXIS, cells.XAXIS_TITLE] },
  { name: 'SIDEBAR', cells: [cells.SIDEBAR] }
]

const HeatmapRows = [
  { name: 'PLOT', cells: [cells.YAXIS, cells.PLOT, cells.SIDEBAR] },
  { name: 'XAXIS', cells: [cells.XAXIS] },
  { name: 'XAXIS_TITLE', cells: [cells.XAXIS_TITLE] }
]

class Layout {
  constructor (canvasWidth, canvasHeight, padding = 0) {
    this.cellInfo = _.transform(_.keys(cells), (result, key) => {
      result[key] = {
        name: key,
        enabled: false,
        fill: false,
        width: 0,
        height: 0,
        meta: {}
      }
    }, {})

    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.padding = padding
    this.outerPadding = 2

    // non-standard / cant be modelled exceptions, that are run once all components are registered
    //   contains things where one cell depends on presence or absence of other cells
    this.specialRules = [

    ]
  }

  enable (cell) {
    this._throwIfNotValidCell(cell)
    this.cellInfo[cell].enabled = true
  }

  disable (cell) {
    this._throwIfNotValidCell(cell)
    this.cellInfo[cell].enabled = false
  }

  enabled (cell) {
    this._throwIfNotValidCell(cell)
    return this.cellInfo[cell].enabled
  }

  isRightmost (cell) {
    const columnName = this._findColumnFromCell(cell)
    const enabledColumnsToRight = this._getEnabledColumnsAfterColumn(columnName, {includeMargins: false})
    return enabledColumnsToRight.length === 0
  }

  getSpaceToTheRightOf (cell) {
    const columnName = this._findColumnFromCell(cell)
    const enabledColumnsToRight = this._getEnabledColumnsAfterColumn(columnName, {includeMargins: false})
    return _(enabledColumnsToRight).map(this._getColumnWidth.bind(this)).sum()
  }

  setFillCell (cell) {
    this._throwIfNotValidCell(cell)
    const existingFillCell = _.find(this.cellInfo, {fill: true}, null)
    if (existingFillCell) { throw new Error('Can only have one fill cell') }
    this.cellInfo[cell].fill = true
  }

  setPreferredDimensions (cell, dimensions) {
    this._throwIfNotValidCell(cell)
    this.cellInfo[cell].width = dimensions.width
    this.cellInfo[cell].height = dimensions.height
    this.cellInfo[cell].conditional = (_.has(dimensions, 'conditional')) ? dimensions.conditional : null
  }

  getCellBounds (cellName) {
    this._throwIfNotEnabled(cellName)
    return this._getCellBounds(cellName)
  }

  getEstimatedCellBounds (cellName) {
    return this._getCellBounds(cellName)
  }

  _getCellBounds (cellName) {
    layoutLogger.debug(`enter layout.getCellBounds(${cellName})`)
    const rowName = this._findRowFromCell(cellName)
    const columnName = this._findColumnFromCell(cellName)
    const rowsAbove = this._getEnabledRowsBeforeRow(rowName)
    const columnsBefore = this._getEnabledColumnsBeforeColumn(columnName)

    let left = this.outerPadding + _(columnsBefore)
      .map(columnName => this._getColumnWidth(columnName) + this.padding)
      .sum()

    let top = this.outerPadding + _(rowsAbove)
      .map(rowName => this._getRowHeight(rowName) + this.padding)
      .sum()

    const width = this._getColumnWidth(columnName)
    const height = this._getRowHeight(rowName)

    if (width === 0) { console.warn(`returning zero width for getCellBounds(${cellName})`) }
    if (height === 0) { console.warn(`returning zero height for getCellBounds(${cellName})`) }

    layoutLogger.info(`layout.getCellBounds(${cellName}) ->`, {width, height, top, left})
    return {width, height, top, left, canvasWidth: this.canvasWidth, canvasHeight: this.canvasHeight}
  }

  _getRow (rowName) {
    const match = _.find(HeatmapRows, {name: rowName})
    if (!match) { throw new Error(`Invalid row: ${rowName}`) }
    return match
  }

  _getColumn (columnName) {
    const match = _.find(HeatmapColumns, {name: columnName})
    if (!match) { throw new Error(`Invalid column: ${columnName}`) }
    return match
  }

  _getRowHeight (rowName) {
    const row = this._getRow(rowName)
    const rowHeight = _(row.cells)
      .map(cellName => this.cellInfo[cellName])
      .filter({ enabled: true })
      .map(cellInfo => (cellInfo.fill) ? this._getHeightOfFillCell(cellInfo.name, rowName) : cellInfo.height)
      .max()
    layoutLogger.debug(`layout._getRowHeight(${rowName}) ->`, rowHeight || 0)
    return rowHeight || 0
  }

  _getColumnWidth (columnName) {
    const column = this._getColumn(columnName)
    const columnWidth = _(column.cells)
      .map(cellName => this.cellInfo[cellName])
      .filter({ enabled: true })
      .map(cellInfo => (cellInfo.fill) ? this._getWidthOfFillCell(cellInfo.name, columnName) : this._getWidthOfFixedCell(cellInfo.name))
      .max()
    layoutLogger.debug(`layout._getColumnWidth(${columnName}) ->`, columnWidth || 0)
    return columnWidth || 0
  }

  _getWidthOfFillCell (cellName, columnName) {
    const otherColumns = _.filter(HeatmapColumns, (column) => column.name !== columnName && this._columnEnabled(column.name))
    const allocatedWidth = _(otherColumns)
      .map(otherColumn => this._getColumnWidth(otherColumn.name))
      .sum() + otherColumns.length * this.padding + 2 * this.outerPadding
    layoutLogger.debug(`layout._getWidthOfFillCell(${cellName}, ${columnName}) ->`, this.canvasWidth - allocatedWidth)
    return this.canvasWidth - allocatedWidth
  }

  _getHeightOfFillCell (cellName, rowName) {
    const otherRows = _.filter(HeatmapRows, (row) => row.name !== rowName && this._rowEnabled(row.name))
    const allocatedHeight = _(otherRows)
      .map(otherRow => this._getRowHeight(otherRow.name))
      .sum() + otherRows.length * this.padding + 2 * this.outerPadding
    layoutLogger.debug(`layout._getHeightOfFillCell(${cellName}, ${rowName}) ->`, this.canvasHeight - allocatedHeight)
    return this.canvasHeight - allocatedHeight
  }

  _getWidthOfFixedCell (cellName) {
    return this.cellInfo[cellName].width
  }

  // TODO for symmetry add _getHeightOfFixedCell

  _rowEnabled (rowName) {
    const row = this._getRow(rowName)
    return _.some(row.cells, (cellName) => this.cellInfo[cellName].enabled)
  }

  _columnEnabled (columnName) {
    const column = this._getColumn(columnName)
    return _.some(column.cells, (cellName) => this.cellInfo[cellName].enabled)
  }

  _findRowFromCell (cellName) {
    const match = _.find(HeatmapRows, ({ cells }) => cells.includes(cellName))
    if (match) { return match.name }
    throw new Error(`Invalid cell name ${cellName} : not in any rows`)
  }

  _findColumnFromCell (cellName) {
    const match = _.find(HeatmapColumns, ({ cells }) => cells.includes(cellName))
    if (match) { return match.name }
    throw new Error(`Invalid cell name ${cellName} : not in any columns`)
  }

  _getEnabledRowsBeforeRow (rowName, {includeMargins = true} = {}) {
    let foundRowName = false
    return _(HeatmapRows)
      .filter(({name}) => {
        if (name === rowName) { foundRowName = true }
        return !foundRowName
      })
      .filter(({type}) => includeMargins || type !== 'margin')
      .map('name')
      .filter(rowName => this._rowEnabled(rowName))
      .value()
  }

  _getEnabledColumnsBeforeColumn (columnName, {includeMargins = true} = {}) {
    let foundColumnName = false
    return _(HeatmapColumns)
      .filter(({name}) => {
        if (name === columnName) { foundColumnName = true }
        return !foundColumnName
      })
      .filter(({type}) => includeMargins || type !== 'margin')
      .map('name')
      .filter(columnName => this._columnEnabled(columnName))
      .value()
  }

  _getEnabledColumnsAfterColumn (columnName, {includeMargins = true} = {}) {
    let foundColumnName = false
    return _(HeatmapColumns)
      .filter(({name}) => {
        if (name === columnName) { foundColumnName = true }
        return foundColumnName && name !== columnName
      })
      .filter(({type}) => includeMargins || type !== 'margin')
      .map('name')
      .filter(columnName => this._columnEnabled(columnName))
      .value()
  }

  allComponentsRegistered () {
    this.applySpecialRules()
  }

  applySpecialRules () {
    this.specialRules.forEach(rule => rule())
  }

  _throwIfNotValidCell (cell) {
    if (!_.has(cells, cell)) { throw new Error(`Invalid cell: ${cell}`) }
  }

  _throwIfNotEnabled (cell) {
    this._throwIfNotValidCell(cell)
    if (!this.cellInfo[cell].enabled) { throw new Error(`Cannot getCellBounds(${cell}): not enabled`) }
  }
}

module.exports = { Layout, CellNames: cells }
