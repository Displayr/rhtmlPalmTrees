const _ = require('lodash')

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
      return element(by.css('.sdBarAllRect.on')).click()
    } else if (toggleIndex === 'allOff') {
      return element(by.css('.sdBarAllRect.off')).click()
    } else {
      return element(by.id(`sideBarElemRect${toggleIndex}`)).click()
    }
  }

  sortBy (sortType) {
    const validSort = ['original', 'alphabetical', 'ascending', 'descending']
    if (!_.includes(validSort, sortType.toLowerCase())) {
      throw new Error(`Invalid sort type '${sortType}'`)
    }

    return element(by.css(`.sdBarElemSortRect.${sortType.toLowerCase()}`)).click()
  }
}

module.exports = PalmTreePlot
