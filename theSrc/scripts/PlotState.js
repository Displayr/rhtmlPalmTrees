import _ from 'lodash'

class PlotState {
  constructor () {
    this.init()
  }

  init () {
    this.state = {}
    this.listeners = {}
    this.listenerId = 0
  }

  reset () {
    this.init()
  }

  setState (newState) {
    this.state = newState
    this.callListeners()
  }

  setField (field, value) {
    this.state[field] = value
    this.callListeners()
  }

  // does not call listeners
  initialiseState (newState) {
    this.state = newState
  }

  // does not call listeners
  initialiseField (field, value) {
    this.state[field] = value
  }

  callListeners () {
    console.log(`PlotState.callListeners(). Calling ${_.keys(this.listeners).length} listeners`)
    _.each(this.listeners, (listenerFn) => { listenerFn(_.cloneDeep(this.state)) })
  }

  getState () {
    return this.state
  }

  addListener (listenerFn) {
    const newId = this.listenerId++
    this.listeners[newId] = listenerFn

    const deregisterListener = () => {
      delete this.listeners[newId]
    }
    return deregisterListener
  }

  toggleColumnState (columnIndex) {
    if (this.state.selectedColumns[columnIndex] === 0) {
      this.state.selectedColumns[columnIndex] = 1
    } else {
      this.state.selectedColumns[columnIndex] = 0
    }
    this.callListeners()
  }

  areAllColumnOff () {
    return _.isUndefined(_.find(this.state.selectedColumns, x => x === 1))
  }

  turnOnAllColumns () {
    this.state.selectedColumns = _(this.state.selectedColumns).map(() => 1).value()
    this.callListeners()
  }

  turnOffAllColumns () {
    this.state.selectedColumns = _(this.state.selectedColumns).map(() => 0).value()
    this.callListeners()
  }

  isColumnOn (columnIndex) {
    return this.state.selectedColumns[columnIndex]
  }

  sortBy (sortParam) {
    this.state.sortBy = sortParam.toLowerCase()
    this.callListeners()
  }
}

module.exports = PlotState
