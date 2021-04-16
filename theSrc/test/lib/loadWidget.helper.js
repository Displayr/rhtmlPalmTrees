const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')

const {
  getExampleUrl,
  waitForWidgetToLoad,
} = renderExamplePageTestHelper

const PalmtreePlotPage = require('./palmtreePlotPage')

const loadWidget = async ({
  browser,
  configName = '',
  stateName,
  width = 1000,
  rerenderControls,
  height = 600,
}) => {
  const page = await browser.newPage()
  const url = getExampleUrl({ configName, stateName, rerenderControls, width, height })
  const palmtreePlot = new PalmtreePlotPage(page)

  await page.goto(url)
  await waitForWidgetToLoad({ page })

  return { page, palmtreePlot }
}

module.exports = loadWidget
