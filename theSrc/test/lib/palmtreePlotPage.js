// This isnt really needed, but for consistency with other widgets, we have a test object page
const _ = require('lodash')

class PalmtreePlotPage {
  constructor (page) {
    this.page = page
  }

  frondSelector ({ frondIndex, treeIndex }) { return `#treeTop${treeIndex} .frond${frondIndex}` }

  sidebarSelector () { return '#g_sideBar' }

  async hoverOverFrond ({ frondIndex, treeIndex }) { return this.page.hover(this.frondSelector({ frondIndex, treeIndex })) }

  async clickFrond ({ frondIndex, treeIndex }) { return this.page.click(this.frondSelector({ frondIndex, treeIndex })) }

  async hoverOverSidebar () { return this.page.hover(this.sidebarSelector()) }

  async moveMouseOffFrond () { return this.hoverOverSidebar() }

  async sidebarToggle (toggleIndex) {
    if (toggleIndex === 'allOn') {
      return this.page.click('.sdBarAllRect.on')
    } else if (toggleIndex === 'allOff') {
      return this.page.click('.sdBarAllRect.off')
    } else {
      return this.page.click(`#sideBarElemRect${toggleIndex}`)
    }
  }

  async sortBy (sortType) {
    const validSort = ['original', 'alphabetical', 'ascending', 'descending']
    if (!_.includes(validSort, sortType.toLowerCase())) {
      throw new Error(`Invalid sort type '${sortType}'`)
    }

    return this.page.click(`.sdBarElemSortRect.${sortType.toLowerCase()}`)
  }
}

module.exports = PalmtreePlotPage
