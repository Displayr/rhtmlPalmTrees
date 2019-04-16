import PalmTrees from './palmTrees'
import _ from 'lodash'

module.exports = function (el, w, h, stateChangedFn) {
  const stateChangedFnPresent = (typeof stateChangedFn === 'function') ? 'present' : 'absent'

  // keep reference to config for resize, as we just recreate widget on resize to simplify code
  let configCopy = null
  let stateCopy = null

  let palm = new PalmTrees()

  function doRenderValue (config, state) {
    el.innerHTML = ''
    palm.reset()
    palm.setConfig(config.settings)
    palm.setData(config.data)

    if (stateChangedFnPresent) {
      palm.addStateListener(stateChangedFn)
    }
    if (state && palm.checkState(state)) {
      palm.restoreState(state)
    } else {
      palm.resetState()
    }

    palm.addStateListener(newState => { stateCopy = newState })
    palm.draw(el)
  }

  return {
    resize: function () {
      doRenderValue(configCopy, stateCopy)
    },

    renderValue: function (config, state) {
      configCopy = _.cloneDeep(config)
      doRenderValue(config, state)
    },

    palm: palm
  }
}
