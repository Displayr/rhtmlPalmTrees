const PalmTreePlot = require('../pageObjects/palmTreePlot')

module.exports = function () {
  this.Before(function () {
    this.context.palmTreePlot = new PalmTreePlot()
  })
}
