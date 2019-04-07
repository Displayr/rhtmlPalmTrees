class PalmTreePlot {
  get sidebar () {
    return element(by.id('g_sideBar'))
  }

  clickFrond (treeIndex, frondIndex) {
    return this.getFrond(treeIndex, frondIndex).click()
  }

  getFrond (treeIndex, frondIndex) {
    return element(by.css(`#treeTop${treeIndex} .frond${frondIndex}`))
  }

  sidebarToggle (toggleIndex) {
    if (toggleIndex === 'allOn') {
      return element(by.id('sdAC0')).click()
    } else if (toggleIndex === 'allOff') {
      return element(by.id('sdAC1')).click()
    } else {
      return element(by.id(`sbRect${toggleIndex}`)).click()
    }
  }

  sortBy (sortType) {
    const sortTypeToIdMapping = {
      'original': 's0',
      'alphabetical': 's1',
      'ascending': 's2',
      'descending': 's3'
    }

    const sortElementIdentifier = sortTypeToIdMapping[sortType.toLowerCase()]

    if (!sortElementIdentifier) {
      throw new Error(`Invalid sort type '${sortType}`)
    }

    return element(by.id(sortElementIdentifier)).click()
  }
}

module.exports = PalmTreePlot
