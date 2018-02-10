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
