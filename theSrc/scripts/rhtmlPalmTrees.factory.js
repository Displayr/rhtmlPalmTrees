import PalmTrees from './PalmTrees'

module.exports = function (el, w, h, stateChangedFn) {
  const stateChangedFnPresent = (typeof stateChangedFn === 'function') ? 'present' : 'absent'
  console.log(`rhtmlPalmtrees.factory called stateChangedFn=${stateChangedFnPresent}`)

  // an empty instance of the PalmPlot object with width and height initialized
  let palm = new PalmTrees()

  return {
    resize: function () {
      console.log('rhtmlPalmTree.resize()')
      return palm.resize(el)
    },

    renderValue: function (x, state) {
      console.log('rhtmlPalmTree.renderValue()')
      el.innerHTML = ''
      palm.reset()
      palm.setConfig(x.settings)
      palm.setData(x.data)
      if (stateChangedFnPresent) {
        palm.saveStateChangedCallback(stateChangedFn)
      }
      if (state && palm.checkState(state)) {
        palm.restoreState(state)
      } else {
        palm.resetState()
      }

      palm.registerInternalListeners()
      // d3.select(el).selectAll('g').remove() <-- TODO shouldn't be needed any more
      palm.draw(el)
    },

    palm: palm
  }
}
