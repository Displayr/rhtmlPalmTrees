@applitools @state
Feature: State Interactions
	A saved user state can be restored.

  Scenario: User can load a palmtree plot with saved state and see the saved selected columns and sort restored
    Given I am viewing "data.bdd_minimal_example" with state "state.minimal_example_3x4_column_1_off_sort_ascending" and dimensions 600x400
    And I wait for animations to complete
    When I hover over the sidebar
    Then the "minimal_example_3x4_column_1_off_sort_ascending" snapshot matches the baseline

  Scenario: When Palmtree widget is given old version of user state it rejects it and resets state
    Given I am viewing "data.bdd_minimal_example" with state "state.minimal_example_3x4_old_state" and dimensions 600x400
    And I wait for animations to complete
    When I hover over the sidebar
    Then the "minimal_example_3x4_old_state_is_reset" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_sort_descending"

  Scenario: When Palmtree widget is given state where data does not match it rejects it and resets state
    Given I am viewing "data.bdd_minimal_example" with state "state.minimal_example_4x4_sort_ascending" and dimensions 600x400
    And I wait for animations to complete
    When I hover over the sidebar
    Then the "minimal_example_3x4_mismatch_state_is_reset" snapshot matches the baseline
    And the final state callback should match "state.minimal_example_3x4_sort_descending"
