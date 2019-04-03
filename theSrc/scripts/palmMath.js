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
      unweightedSums: new Array(this.data.length)
    }

    _.range(this.data.length).map(palmTreeIndex => {
      response.weightedSums[palmTreeIndex] = _(this.data[palmTreeIndex])
        .filter((val, frondIndex) => this.plotState.isColumnOn(frondIndex))
        .map((val, frondIndex) => val * this.weights[frondIndex])
        .sum()
      response.unweightedSums[palmTreeIndex] = _(this.data[palmTreeIndex])
        .filter((val, frondIndex) => this.plotState.isColumnOn(frondIndex))
        .sum()
    })
    response.weightedSumMax = _.max(response.weightedSums)
    response.weightedSumMin = _.min(response.weightedSums)

    let maxSum = _.max(response.unweightedSums)
    response.normalizedData = this.data.map(frondValues => {
      return frondValues.map(frondValue => {
        const normalizedValue = Math.sqrt(frondValue / maxSum)
        response.dataMax = Math.max(response.dataMax, frondValue)
        response.dataMin = Math.min(response.dataMin, frondValue)
        response.normalizedDataMax = Math.max(normalizedValue, response.normalizedDataMax)
        response.normalizedDataMin = Math.min(normalizedValue, response.normalizedDataMin)
        return normalizedValue
      })
    })

    return response
  }
}

module.exports = PalmMath
