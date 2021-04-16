const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  testSnapshots,
  jestTimeout,
} = renderExamplePageTestHelper

jest.setTimeout(jestTimeout)
configureImageSnapshotMatcher({ collectionIdentifier: 'resize' })

describe('resize', () => {
  let browser

  beforeEach(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterEach(async () => {
    await browser.close()
  })

  test('basic resize', async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.bdd_cramped_example',
      width: 300,
      height: 200,
    })

    await testSnapshots({ page, testName: '1A_basic_initial' })

    const sizesToSnapshot = [
      { width: 275, height: 200 },
      { width: 250, height: 200 },
      { width: 225, height: 200 },
      { width: 225, height: 200 },
      { width: 400, height: 300 },
      { width: 500, height: 400 },
    ]

    for (const size of sizesToSnapshot) {
      const { width, height } = size
      await page.evaluate((width, height) => {
        window.resizeHook(width, height)
      }, width, height)

      await page.waitFor(1000)

      await testSnapshots({ page, testName: `1B_basic_after_resize_${width}x${height}` })
    }
    await page.close()
  })
})
