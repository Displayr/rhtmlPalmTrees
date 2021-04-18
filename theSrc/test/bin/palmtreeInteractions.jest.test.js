const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

// Test Summary: Interactions with the sidebar and palmtrees cause the plot to update. The state is saved and can be restored.

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  testSnapshots,
  jestTimeout,
} = renderExamplePageTestHelper

configureImageSnapshotMatcher({ collectionIdentifier: 'palmtree_interaction' })
jest.setTimeout(jestTimeout)

describe('palmtree interations', () => {
  let browser

  beforeEach(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterEach(async () => {
    await browser.close()
  })

  test('User can hover over the top of the palm trees to get a tooltip with extra info', async function () {
    const { page, palmtreePlot } = await loadWidget({
      browser,
      configName: 'data.bdd_minimal_example',
      width: 600,
      height: 400,
    })

    await testSnapshots({ page, testName: 'minimal_example_600x400_baseline' })

    await palmtreePlot.hoverOverFrond({ frondIndex: 0, treeIndex: 0 })
    await testSnapshots({ page, testName: 'minimal_example_600x400_hover_tree_0_frond_0_south_tip' })

    await palmtreePlot.hoverOverFrond({ frondIndex: 1, treeIndex: 0 })
    await testSnapshots({ page, testName: 'minimal_example_600x400_hover_tree_0_frond_1_south_tip' })

    await palmtreePlot.hoverOverFrond({ frondIndex: 2, treeIndex: 0 })
    await testSnapshots({ page, testName: 'minimal_example_600x400_hover_tree_0_frond_2_south_tip' })

    await page.close()
  })

  test('User can hover from one tree to the next and the tooltip will update', async function () {
    const { page, palmtreePlot } = await loadWidget({
      browser,
      configName: 'data.bdd_cramped_example',
      width: 300,
      height: 200,
    })

    await palmtreePlot.hoverOverFrond({ frondIndex: 0, treeIndex: 0 })
    await testSnapshots({ page, testName: 'cramped_example_300x200_hover_tree_0_frond_0_south_tip' })

    await palmtreePlot.hoverOverFrond({ frondIndex: 0, treeIndex: 1 })
    await testSnapshots({ page, testName: 'cramped_example_300x200_hover_tree_1_frond_0_south_tip' })

    await palmtreePlot.hoverOverFrond({ frondIndex: 0, treeIndex: 2 })
    await testSnapshots({ page, testName: 'cramped_example_300x200_hover_tree_2_frond_0_south_tip' })

    await page.close()
  })

  // TODO test issue where last step does not hilight tooltip row. works, just not under test
  test('User can see disabled columns in the tooltips', async function () {
    const { page, palmtreePlot } = await loadWidget({
      browser,
      configName: 'data.bdd_cramped_example',
      width: 300,
      height: 200,
    })

    await testSnapshots({ page, testName: 'cramped_example_300x200_baseline' })

    await palmtreePlot.clickFrond({ frondIndex: 0, treeIndex: 0 })
    await palmtreePlot.moveMouseOffFrond()
    await palmtreePlot.hoverOverFrond({ frondIndex: 0, treeIndex: 0 })
    await testSnapshots({ page, testName: 'cramped_example_300x200_tree_0_frond_0_column_0_disabled' })
  })

  test('User can see prefix and suffix in tooltip', async function () {
    const { page, palmtreePlot } = await loadWidget({
      browser,
      configName: 'data.bdd_minimal_example|config.x_prefix_and_suffix_enabled',
      width: 300,
      height: 200,
    })

    await palmtreePlot.hoverOverFrond({ frondIndex: 0, treeIndex: 0 })
    await testSnapshots({ page, testName: 'cramped_example_300x200_tooltip_includes_prefix_and_suffix' })
  })

  test('User can click leaves to toggle them on and off', async function () {
    const { page, palmtreePlot } = await loadWidget({
      browser,
      configName: 'data.bdd_minimal_example',
      width: 600,
      height: 400,
    })

    await palmtreePlot.clickFrond({ frondIndex: 0, treeIndex: 0 })
    await palmtreePlot.moveMouseOffFrond()
    await testSnapshots({ page, testName: 'minimal_example_600x400_disabled_tree_0_frond_0' })

    await palmtreePlot.clickFrond({ frondIndex: 1, treeIndex: 0 })
    await palmtreePlot.moveMouseOffFrond()
    await testSnapshots({ page, testName: 'minimal_example_600x400_disabled_tree_0_frond_0_and_1' })
  })
})

// TODO snapshots for north , east, and west tips. This didn't work in old test runner.
//  Can we get it working using puppeteer ?
// @palmtree @hover
// NB south tips are covered above
//  Scenario: Scenario: Tooltips can display below, above, to left, and to right of palmtree
//    Given I am viewing "data.bdd_cramped_example" with dimensions 400x100
//    Then the "cramped_example_interaction_hover_east_tip" snapshot matches the baseline
//    Then the "cramped_example_interaction_hover_north_tip" snapshot matches the baseline
//    Then the "cramped_example_interaction_hover_west_tip" snapshot matches the baseline
