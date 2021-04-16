const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

// Test Summary : A saved user state can be restored.

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  testSnapshots,
  jestTimeout,
  testState,
} = renderExamplePageTestHelper

jest.setTimeout(jestTimeout)
configureImageSnapshotMatcher({ collectionIdentifier: 'load_state_interactions' })

describe('load from state interactions', () => {
  let browser

  beforeEach(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterEach(async () => {
    await browser.close()
  })

  test('User can load a palmtree plot with saved state and see the saved selected columns and sort restored', async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.bdd_minimal_example',
      stateName: 'state.minimal_example_3x4_column_1_off_sort_ascending',
      width: 600,
      height: 400,
    })

    await testSnapshots({ page, testName: 'minimal_example_3x4_column_1_off_sort_ascending' })
    await page.close()
  })

  test('When Palmtree widget is given old version of user state it rejects it and resets state', async function () {
    const { page, palmtreePlot } = await loadWidget({
      browser,
      configName: 'data.bdd_minimal_example',
      stateName: 'state.minimal_example_3x4_old_state',
      width: 600,
      height: 400,
    })

    await palmtreePlot.hoverOverSidebar()
    await testSnapshots({ page, testName: 'minimal_example_3x4_old_state_is_reset' })
    await testState({ page, stateName: 'state.minimal_example_3x4_sort_descending' })
    await page.close()
  })

  test('When Palmtree widget is given state where data does not match it rejects it and resets state', async function () {
    const { page, palmtreePlot } = await loadWidget({
      browser,
      configName: 'data.bdd_minimal_example',
      stateName: 'state.minimal_example_4x4_sort_ascending',
      width: 600,
      height: 400,
    })

    await palmtreePlot.hoverOverSidebar()
    await testSnapshots({ page, testName: 'minimal_example_3x4_mismatch_state_is_reset' })
    await testState({ page, stateName: 'state.minimal_example_3x4_sort_descending' })
    await page.close()
  })
})
