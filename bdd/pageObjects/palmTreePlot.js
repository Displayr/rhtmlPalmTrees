class PalmTreePlot {
  get sidebar () {
    return element(by.id('g_sideBar'))
  }

  clickLeaf (treeIndex, leafIndex) {
    return this.getLeaf(treeIndex, leafIndex).click()
  }

  getLeaf (treeIndex, leafIndex) {
    // TODO the css needs to be fixed. Currently .leaf returns an array of "fronds" rects (collections of leafs)
    const leaf = element(by.css(`#frond${treeIndex} .actual-leaf-${leafIndex}`))
    return leaf
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
