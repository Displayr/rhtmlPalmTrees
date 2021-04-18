import _ from 'lodash'

class PalmMath {
  constructor ({ data, plotState, rowNames, weights }) {
    this.data = _.cloneDeep(data)
    _.assign(this, { plotState, rowNames, weights })

    this.doOnceComputations()
  }

  doOnceComputations () {
    const dataMax = _.max(_.flatten(this.data))
    const dataMin = _.min(_.flatten(this.data))

    const normalize = (x) => (dataMax === 0) ? 0 : Math.sqrt(x / dataMax)
    const normalizedDataMax = normalize(dataMax)
    const normalizedDataMin = normalize(dataMin)
    const normalizedDataMap = {}
    this.data.map((frondValues, frondIndex) => {
      normalizedDataMap[this.rowNames[frondIndex]] = frondValues.map(normalize)
    })

    this.staticStats = { dataMax, dataMin, normalizedDataMax, normalizedDataMin, normalizedDataMap }
  }

  /* returns: {
     weightedSums: ARRAY:  one entry per row: weight * value * isOn
     unweightedSums: ARRAY:  one entry per row: value * isOn
     weightedSumMax: NUMBER: max of weightedSums,
     weightedSumMin: NUMBER: min of weightedSums,
     sortedWeightedSums: ARRAY OF OBJECTS
       * Object: { value, name, treeId}
       * sorted based on plotState.sortBy
       * built from weightedSums
     dataMax: NUMBER : max data value
     dataMin: NUMBER : min data value
     normalizedDataMap: OBJECT of ARRAYS
       * keys are the row names, values are the column values for the row, normalized by Math.sqrt(x / dataMax)
     normalizedDataMax: max single value of normalizedDataMap
     normalizedDataMin: min single value of normalizedDataMap
  } */

  getData () {
    const response = {
      weightedSums: new Array(this.data.length),
      unweightedSums: new Array(this.data.length),
    }

    _.range(this.data.length).map(treeId => {
      response.weightedSums[treeId] = _(this.data[treeId])
        .filter((val, frondIndex) => this.plotState.isColumnOn(frondIndex))
        .map((val, frondIndex) => val * this.weights[frondIndex])
        .sum()
      response.unweightedSums[treeId] = _(this.data[treeId])
        .filter((val, frondIndex) => this.plotState.isColumnOn(frondIndex))
        .sum()
    })
    response.weightedSumMax = _.max(response.weightedSums)
    response.weightedSumMin = _.min(response.weightedSums)
    response.sortedWeightedSums = this.getSortedWeightedSums(response.weightedSums)

    return _.assign(response, this.staticStats)
  }

  getSortedWeightedSums (weightedSums) {
    const sortStrategy = this.plotState.getState().sortBy || 'descending'

    const sorts = {
      original: () => 1,
      alphabetical: (a) => a.name,
      ascending: (a) => a.value,
      descending: (a) => -1 * a.value,
    }

    if (!_.has(sorts, sortStrategy)) {
      throw new Error(`Invalid sort strategy: ${sortStrategy}`)
    }

    return _(weightedSums)
      .map((weightedSum, i) => ({
        value: weightedSum,
        name: this.rowNames[i],
        treeId: i,
      }))
      .sortBy(sorts[sortStrategy])
      .value()
  }
}

module.exports = PalmMath
