import PalmTrees from './PalmTrees'
import d3 from 'd3'

module.exports = function (el, width, height, stateChangedFn) {
  const stateChangedFnPresent = (typeof stateChangedFn === 'function') ? 'present' : 'absent'
  console.log(`rhtmlPalmtrees.factory called width=${width}, height=${height}, stateChangedFn=${stateChangedFnPresent}`)
  const w = width < 200 ? 200 : width
  const h = height < 100 ? 100 : height

  d3.select(el).append('svg')
    .attr('class', 'svgContent')
    .attr('width', w)
    .attr('height', h)

  // an empty instance of the PalmPlot object with width and height initialized
  let palm = new PalmTrees()
  palm.width(w)
  palm.height(h)

  return {
    resize: function (width, height) {
      console.log('rhtmlPalmTree.resize()')
      palm.width(width)
      palm.height(height)
      return palm.resize(el)
    },

    renderValue: function (x, state) {
      console.log('rhtmlPalmTree.renderValue()')
      palm.reset()
      palm.setConfig(x.settings)
      palm.setData(x.data)
      if (stateChangedFnPresent) {
        palm.stateSaver(stateChangedFn)
      }
      if (state && palm.checkState(state)) {
        palm.restoreState(state)
      } else {
        palm.resetState()
      }

      palm.registerInternalListeners()
      d3.select(el).selectAll('g').remove()
      d3.select(el).call(this.palm.draw.bind(palm))
    },

    palm: palm
  }
}
