import PalmTrees from './lib/PalmTrees'
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
  palm.stateSaver(stateChangedFn)

  return {
    resize: function (width, height) {
      palm.width(width)
      palm.height(height)
      return palm.resize(el)
    },

    renderValue: function (x, state) {
      palm.reset()
      palm.setConfig(x.settings)
      palm.setData(x.data)
      if (state) {
        if (palm.checkState(state)) {
          palm.restoreState(state)
        } else {
          palm.resetState()
        }
      }
      d3.select(el).selectAll('g').remove()
      d3.select(el).call(this.palm.draw.bind(palm))
    },

    palm: palm
  }
}
