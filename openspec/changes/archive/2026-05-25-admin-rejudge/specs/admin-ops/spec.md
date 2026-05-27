## ADDED Requirements

### Requirement: Admin rejudge entry

The administration area SHALL include a dedicated rejudge section reachable from the admin navigation with URL persistence consistent with other admin tabs.

#### Scenario: Open rejudge tab

- **WHEN** an admin navigates to the rejudge tab
- **THEN** scope selection, target picker, preview, and confirm actions are available

### Requirement: Admin-only rejudge

Only users with the administrator role SHALL execute rejudge preview and batch rejudge API calls.

#### Scenario: Non-admin denied

- **WHEN** a non-admin user calls the rejudge API
- **THEN** the request is rejected with forbidden status
