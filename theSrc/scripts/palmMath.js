import _ from 'lodash'

class PalmMath {
  constructor ({ data, plotState, rowNames, weights }) {
    this.data = _.cloneDeep(data)
    _.assign(this, {plotState, rowNames, weights})

    this.doOnceComputations()
  }

  doOnceComputations () {}

  getData () {
    // TODO clean all of this up and document expected response structure
    // determine what can go in doOnceComputations
    const response = {
      dataMax: 0,
      dataMin: 1000000000,
      normalizedDataMax: 0,
      normalizedDataMin: 1000000000,
      weightedSums: new Array(this.data.length),
      unweightedSums: new Array(this.data.length),
      normalizedDataMap: {}
    }
    const normalize = (x) => (response.dataMax === 0) ? 0 : Math.sqrt(x / response.dataMax)

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
    response.dataMax = _.max(_.flatten(this.data))
    response.dataMin = _.min(_.flatten(this.data))
    response.normalizedDataMax = normalize(response.dataMax)
    response.normalizedDataMin = normalize(response.dataMin)

    this.data.map((frondValues, frondIndex) => {
      response.normalizedDataMap[this.rowNames[frondIndex]] = frondValues.map(normalize)
    })
    response.sortedWeightedSums = this.getSortedWeightedSums(response.weightedSums)

    return response
  }

  getSortedWeightedSums (weightedSums) {
    const sortStrategy = this.plotState.getState().sortBy || 'descending'

    const sorts = {
      original: () => 1,
      alphabetical: (a) => a.name,
      ascending: (a) => a.value,
      descending: (a) => -1 * a.value
    }

    if (!_.has(sorts, sortStrategy)) {
      throw new Error(`Invalid sort strategy: ${sortStrategy}`)
    }

    return _(weightedSums)
      .map((weightedSum, i) => ({
        value: weightedSum,
        name: this.rowNames[i],
        treeId: i
      }))
      .sortBy(sorts[sortStrategy])
      .value()
  }
}

module.exports = PalmMath
