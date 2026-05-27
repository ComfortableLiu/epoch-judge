## MODIFIED Requirements

### Requirement: Admin dashboard

Users with admin role SHALL access an administration area to manage users, problems, contests, and system settings through the web application. The default tab when opening the admin section SHALL be the problems tab. Tab order SHALL be problems, contests, rejudge, users, judge nodes, and configuration.

#### Scenario: Admin opens dashboard

- **WHEN** an admin navigates to the admin section without a tab query parameter
- **THEN** the problems management panel is shown first

#### Scenario: Tab order

- **WHEN** an admin views admin navigation tabs
- **THEN** tabs appear in order: problems, contests, rejudge, users, judge, config

### Requirement: Admin user CRUD

Administrators SHALL create, update, and delete users from the admin web UI without CSV import. The user management UI SHALL provide password reset with a double-confirmation modal explaining that the user must set a new password via register using the same username.

#### Scenario: Create user

- **WHEN** an admin submits a valid new user form
- **THEN** the user is persisted with hashed password and appears in the user list

#### Scenario: Delete user

- **WHEN** an admin deletes another user account
- **THEN** the user is removed and no longer listed

#### Scenario: Reset password confirmation

- **WHEN** an admin clicks reset password and cancels the confirmation dialog
- **THEN** the user password and reset flag remain unchanged

### Requirement: Admin problem edit

Administrators and problem editors SHALL edit problem title, statement, visibility, limits, tags, and judge mode from the admin web UI. The problems tab SHALL provide a control to create a new problem without uploading a ZIP.

#### Scenario: Update problem

- **WHEN** an admin saves edits to an existing problem including tags
- **THEN** the problem detail reflects the updated fields for subsequent views and submissions

#### Scenario: New problem button

- **WHEN** an administrator clicks create problem on the problems tab
- **THEN** a create form is shown and saving creates a problem available for further edit
