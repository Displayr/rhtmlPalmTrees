const wrapInPromiseAndLogErrors = function (fn) {
  return new Promise((resolve, reject) => {
    fn().then(resolve)
      .catch((err) => {
        console.log(err)
        reject(err)
      })
  }).catch((err) => {
    console.log(err)
    throw err
  })
}

module.exports = function () {
  this.When(/^I hover over the sidebar$/, function () {
    return wrapInPromiseAndLogErrors(() => {
      return browser.actions()
        .mouseMove(this.context.palmTreePlot.sidebar)
        .perform()
    })
  })

  this.When(/^I click sidebar element all on$/, function () {
    return wrapInPromiseAndLogErrors(() => {
      return this.context.palmTreePlot.sidebarToggle('allOn')
    })
  })

  this.When(/^I click sidebar element all off$/, function () {
    return wrapInPromiseAndLogErrors(() => {
      return this.context.palmTreePlot.sidebarToggle('allOff')
    })
  })

  this.When(/^I click sidebar element (\d+)$/, function (toggleIndex) {
    return wrapInPromiseAndLogErrors(() => {
      return this.context.palmTreePlot.sidebarToggle(toggleIndex)
    })
  })

  this.When(/^I click sidebar sort by (.+)$/, function (sortType) {
    return wrapInPromiseAndLogErrors(() => {
      return this.context.palmTreePlot.sortBy(sortType)
    })
  })

  this.When(/^I click frond (.+) of tree (.+)$/, function (frondNumber, treeNumber) {
    return wrapInPromiseAndLogErrors(() => {
      return this.context.palmTreePlot.clickFrond(parseInt(treeNumber), parseInt(frondNumber))
    })
  })

  this.When(/^I hover over frond (.+) of tree (.+)$/, function (frondNumber, treeNumber) {
    return wrapInPromiseAndLogErrors(() => {
      return browser.actions()
        .mouseMove(this.context.palmTreePlot.getFrond(parseInt(treeNumber), parseInt(frondNumber)))
        .perform()
    })
  })

  this.When(/^I move the mouse off the tree$/, function () {
    return wrapInPromiseAndLogErrors(() => {
      return browser.actions()
        .mouseMove({ x: 10, y: 10 })
        .mouseMove({ x: 10, y: 10 })
        .mouseMove({ x: 10, y: 10 })
        .mouseMove({ x: 10, y: 10 })
        .mouseMove({ x: 10, y: 10 })
        .mouseMove({ x: 10, y: 10 })
        .perform()
    })
  })

  this.When(/^I wait for animations to complete$/, function () {
    return browser.sleep(2200)
  })
}
