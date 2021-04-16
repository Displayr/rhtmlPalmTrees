const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

// Test Summary: Interactions with the sidebar and palmtrees cause the plot to update. The state is saved and can be restored.

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  testSnapshots,
  jestTimeout,
  testState,
} = renderExamplePageTestHelper

configureImageSnapshotMatcher({ collectionIdentifier: 'sidebar_interaction' })
jest.setTimeout(jestTimeout)

describe('palmtree interations', () => {
  let browser

  beforeEach(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterEach(async () => {
    await browser.close()
  })

  test('User can interact with the palm tree plot sidebar to control the plot', async function () {
    const { page, palmtreePlot } = await loadWidget({
      browser,
      configName: 'data.bdd_minimal_example',
      width: 600,
      height: 400,
    })

    await testSnapshots({ page, testName: 'minimal_example_600x400_baseline' })

    await palmtreePlot.hoverOverSidebar()
    await testSnapshots({ page, testName: 'minimal_example_600x400_sidebar_hover' })

    await palmtreePlot.sidebarToggle('allOff')
    await testSnapshots({ page, testName: 'minimal_example_600x400_sidebar_all_off' })
    await testState({ page, stateName: 'state.minimal_example_3x4_all_columns_off' })

    await palmtreePlot.sidebarToggle('allOn')
    await testSnapshots({ page, testName: 'minimal_example_600x400_sidebar_all_on' })
    await testState({ page, stateName: 'state.minimal_example_3x4_all_columns_on' })

    await palmtreePlot.sidebarToggle(1)
    await testSnapshots({ page, testName: 'minimal_example_600x400_sidebar_col2_disabled' })
    await testState({ page, stateName: 'state.minimal_example_3x4_column_1_off' })

    await palmtreePlot.sidebarToggle(1)
    await testSnapshots({ page, testName: 'minimal_example_600x400_sidebar_all_on' })
    await testState({ page, stateName: 'state.minimal_example_3x4_all_columns_on' })

    await palmtreePlot.sortBy('Alphabetical')
    await testSnapshots({ page, testName: 'minimal_example_600x400_sort_alphabetical' })
    await testState({ page, stateName: 'state.minimal_example_3x4_sort_alphabetical' })

    await palmtreePlot.sortBy('Ascending')
    await testSnapshots({ page, testName: 'minimal_example_600x400_sort_ascending' })
    await testState({ page, stateName: 'state.minimal_example_3x4_sort_ascending' })

    await palmtreePlot.sortBy('Original')
    await testSnapshots({ page, testName: 'minimal_example_600x400_sort_original' })
    await testState({ page, stateName: 'state.minimal_example_3x4_sort_original' })

    await palmtreePlot.sortBy('Descending')
    await testSnapshots({ page, testName: 'minimal_example_600x400_sort_descending' })
    await testState({ page, stateName: 'state.minimal_example_3x4_sort_descending' })

    await page.close()
  })
})
