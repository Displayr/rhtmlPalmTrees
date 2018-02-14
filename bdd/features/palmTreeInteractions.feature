@applitools
Feature: State Interactions
	Interactions with the sidebar and palmtrees cause the plot to update. The state is saved and can be restored.

  @palmtree @hover
  Scenario: Scenario: User can hover over the top of the palm trees to get a tooltip with extra info
    Given I am viewing "data.bdd_minimal_example" with dimensions 600x400
    Then the "interaction_baseline" snapshot matches the baseline

    When I hover over frond 0 of tree 0
    And I wait for animations to complete
    Then the "interaction_hover_tree_0_frond_0_south_tip" snapshot matches the baseline

    When I hover over frond 1 of tree 0
    And I wait for animations to complete
    Then the "interaction_hover_tree_0_frond_1_south_tip" snapshot matches the baseline

    When I hover over frond 2 of tree 0
    And I wait for animations to complete
    Then the "interaction_hover_tree_0_frond_2_south_tip" snapshot matches the baseline

  @palmtree @hover
  Scenario: Scenario: User can hover from one tree to the next and the tooltip will update
    Given I am viewing "data.bdd_cramped_example" with dimensions 300x200
    Then the "cramped_example_interaction_baseline" snapshot matches the baseline

    When I hover over frond 0 of tree 0
    And I wait for animations to complete
    Then the "cramped_example_interaction_hover_tree_0_frond_0_south_tip" snapshot matches the baseline

    When I hover over frond 0 of tree 1
    And I wait for animations to complete
    Then the "cramped_example_interaction_hover_tree_1_frond_0_south_tip" snapshot matches the baseline

    When I hover over frond 0 of tree 2
    And I wait for animations to complete
    Then the "cramped_example_interaction_hover_tree_2_frond_0_south_tip" snapshot matches the baseline

  @palmtree @hover
  Scenario: Scenario: User can see disabled columns in the tooltips
    Given I am viewing "data.bdd_cramped_example" with dimensions 300x200
    Then the "cramped_example_interaction_baseline" snapshot matches the baseline

    When I click frond 0 of tree 0
    And I move the mouse off the tree
    When I hover over frond 0 of tree 0
    And I wait for animations to complete
    Then the "cramped_example_interaction_hover_tree_0_frond_0_column_0_disabled" snapshot matches the baseline


    # @palmtree @hover
    # TODO snapshots for north , east, and west tips
    # NB south tips are covered above
    #  Scenario: Scenario: Tooltips can display below, above, to left, and to right of palmtree
    #    Given I am viewing "data.bdd_cramped_example" with dimensions 400x100
    #    Then the "cramped_example_interaction_hover_east_tip" snapshot matches the baseline
    #    Then the "cramped_example_interaction_hover_north_tip" snapshot matches the baseline
    #    Then the "cramped_example_interaction_hover_west_tip" snapshot matches the baseline


  @palmtree @click
  Scenario: Scenario: User can click leaves to toggle them on and off
    Given I am viewing "data.bdd_minimal_example" with dimensions 600x400
    Then the "interaction_baseline" snapshot matches the baseline

    When I click frond 0 of tree 0
    And I move the mouse off the tree
    And I wait for animations to complete
    Then the "interaction_click_tree_0_frond_0" snapshot matches the baseline

    When I click frond 1 of tree 0
    And I move the mouse off the tree
    And I wait for animations to complete
    Then the "interaction_click_tree_0_frond_1" snapshot matches the baseline
