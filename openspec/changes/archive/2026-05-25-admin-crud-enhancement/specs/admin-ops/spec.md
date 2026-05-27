## ADDED Requirements

### Requirement: Admin user CRUD

Administrators SHALL create, update, and delete users from the admin web UI without CSV import.

#### Scenario: Create user

- **WHEN** an admin submits a valid new user form
- **THEN** the user is persisted with hashed password and appears in the user list

#### Scenario: Delete user

- **WHEN** an admin deletes another user account
- **THEN** the user is removed and no longer listed

### Requirement: Admin problem edit

Administrators SHALL edit problem title, statement, visibility, limits, and judge mode from the admin web UI.

#### Scenario: Update problem

- **WHEN** an admin saves edits to an existing problem
- **THEN** the problem detail reflects the updated fields for subsequent views and submissions
