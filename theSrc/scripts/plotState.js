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
    if (_.find(newState.selectedColumns, (val) => val === 0 || val === 1)) {
      newState.selectedColumns = _(newState.selectedColumns).map(val => val === 1).value()
    }

    this.state = newState
  }

  // NB does not call listeners
  initialiseField (field, value) {
    this.state[field] = value
  }

  callListeners () {
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
    if (this.state.selectedColumns[columnIndex]) {
      this.state.selectedColumns[columnIndex] = false
    } else {
      this.state.selectedColumns[columnIndex] = true
    }
    this.callListeners()
  }

  areAllColumnOff () {
    return _.isUndefined(_.find(this.state.selectedColumns, x => x))
  }

  turnOnAllColumns () {
    this.state.selectedColumns = _(this.state.selectedColumns).map(() => true).value()
    this.callListeners()
  }

  turnOffAllColumns () {
    this.state.selectedColumns = _(this.state.selectedColumns).map(() => false).value()
    this.callListeners()
  }

  isColumnOn (columnIndex) {
    return this.state.selectedColumns[columnIndex]
  }

  isColumnOff (columnIndex) {
    return !this.state.selectedColumns[columnIndex]
  }

  sortBy (sortParam) {
    this.state.sortBy = sortParam.toLowerCase()
    this.callListeners()
  }
}

module.exports = PlotState
