Feature: State Interactions
	Interactions with the sidebar and palmtrees cause the plot to update. The state is saved and can be restored.

  @applitools @sidebar
  Scenario: User can interact with the palm tree plot sidebar to control the plot
    Given I am viewing "data.bdd_minimal_example" with dimensions 600x400
    Then the "interaction_baseline" snapshot matches the baseline

    When I hover over the sidebar
    And I wait for animations to complete
    Then the "interaction_sidebar_hover" snapshot matches the baseline

    When I click sidebar element all off
    And I wait for animations to complete
    Then the "interaction_sidebar_all_off" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_all_columns_off"

    When I click sidebar element all on
    And I wait for animations to complete
    Then the "interaction_sidebar_all_on" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_all_columns_on"

    When I click sidebar element 1
    And I wait for animations to complete
    Then the "interaction_sidebar_col2_disabled" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_column_1_off"

    When I click sidebar element 1
    And I wait for animations to complete
    Then the "interaction_sidebar_all_on" snapshot matches the baseline

    When I click sidebar sort by Alphabetical
    And I wait for animations to complete
    Then the "interaction_sidebar_sort_alphabetical" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_sort_alphabetical"

    When I click sidebar sort by Ascending
    And I wait for animations to complete
    Then the "interaction_sidebar_sort_ascending" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_sort_ascending"

    When I click sidebar sort by Original
    And I wait for animations to complete
    Then the "interaction_sidebar_sort_original" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_sort_original"

    When I click sidebar sort by Descending
    And I wait for animations to complete
    Then the "interaction_sidebar_sort_descending" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_sort_descending"

  @applitools @palmtree
  Scenario: Scenario: User can hover over the top of the palm trees to get a tooltip with extra info
    Given I am viewing "data.bdd_minimal_example" with dimensions 600x400
    Then the "interaction_baseline" snapshot matches the baseline

    When I hover over frond 0 of tree 0
    And I wait for animations to complete
    Then the "interaction_hover_tree_0_frond_0" snapshot matches the baseline

    When I hover over frond 1 of tree 0
    And I wait for animations to complete
    Then the "interaction_hover_tree_0_frond_1" snapshot matches the baseline

    When I hover over frond 2 of tree 0
    And I wait for animations to complete
    Then the "interaction_hover_tree_0_frond_2" snapshot matches the baseline

  @applitools @palmtree
  Scenario: Scenario: User can hover from one tree to the next and the tooltip will update
    Given I am viewing "data.bdd_cramped_example" with dimensions 300x200
    Then the "cramped_example_interaction_baseline" snapshot matches the baseline

    When I hover over frond 0 of tree 0
    And I wait for animations to complete
    Then the "cramped_example_interaction_hover_tree_0_frond_0" snapshot matches the baseline

    When I hover over frond 0 of tree 1
    And I wait for animations to complete
    Then the "cramped_example_interaction_hover_tree_1_frond_0" snapshot matches the baseline

    When I hover over frond 0 of tree 2
    And I wait for animations to complete
    Then the "cramped_example_interaction_hover_tree_2_frond_0" snapshot matches the baseline

  @applitools @palmtree
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

  @applitools @state_restore
  Scenario: User can load a palmtree plot with saved state and see the saved selected columns and sort restored
    Given I am viewing "data.bdd_minimal_example" with state "state.minimal_example_3x4_column_1_off_sort_ascending" and dimensions 600x400
    And I wait for animations to complete
    When I hover over the sidebar
    Then the "minimal_example_3x4_column_1_off_sort_ascending" snapshot matches the baseline

  @applitools @state_old_state_reset @foo
  Scenario: When Palmtree widget is given old version of user state it rejects it and resets state
    Given I am viewing "data.bdd_minimal_example" with state "state.minimal_example_3x4_old_state" and dimensions 600x400
    And I wait for animations to complete
    When I hover over the sidebar
    Then the "minimal_example_3x4_old_state_is_reset" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_sort_descending"

  @applitools @state_reset @foo
  Scenario: When Palmtree widget is given state where data does not match it rejects it and resets state
    Given I am viewing "data.bdd_minimal_example" with state "state.minimal_example_4x4_sort_ascending" and dimensions 600x400
    And I wait for animations to complete
    When I hover over the sidebar
    Then the "minimal_example_3x4_mismatch_state_is_reset" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_sort_descending"
