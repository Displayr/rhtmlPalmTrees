const cliArgs = require('yargs').argv
const _ = require('lodash')

const config = {
  widgetEntryPoint: 'theSrc/scripts/rhtmlPalmTrees.js',
  widgetFactory: 'theSrc/scripts/rhtmlPalmTrees.factory.js',
  widgetName: 'rhtmlPalmTrees',
  internalWebSettings: {
    includeDimensionsOnWidgetDiv: true,
    default_border: false,
    isReadySelector: 'div[rhtmlWidget-status=ready]',
    css: [
      '/style/rhtmlPalmTrees.css',
    ],
    singleWidgetSnapshotSelector: '#widget-container',
  },
  snapshotTesting: {
    puppeteer: {
      // headless: false, // if set to false, show the browser while testing
      // slowMo: 500, // delay each step in the browser interaction by X milliseconds
    },
    snapshotDelay: 500,
    consoleLogHandler,
    // pixelmatch: {
    //   // smaller values -> more sensitive : https://github.com/mapbox/pixelmatch#pixelmatchimg1-img2-output-width-height-options
    //   customDiffConfig: {
    //     threshold: 0.0001,
    //   },
    //   failureThreshold: 0.0001,
    //   failureThresholdType: 'percent', // pixel or percent
    // },
  },
}

const commandLineOverides = _.omit(cliArgs, ['_', '$0'])
const mergedConfig = _.merge(config, commandLineOverides)

function consoleLogHandler (msg, testName) {
  const statsLineString = _(msg.args())
    .map(arg => _.result(arg, 'toString', ''))
    .filter(arg => arg.match(/will_not_match_so_exclude_everything_for_now/))
    .first()

  if (statsLineString) {
    const statsStringMatch = statsLineString.match('^JSHandle:(.+)$')
    if (statsStringMatch) {
      const stats = JSON.parse(statsStringMatch[1])
      console.log(JSON.stringify(_.assign(stats, { scenario: testName })))
    }
  }
}

module.exports = mergedConfig
