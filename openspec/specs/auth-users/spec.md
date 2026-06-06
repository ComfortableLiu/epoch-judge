## Purpose

User registration, authentication, profiles, roles, batch import, and administrator-managed account lifecycle including password reset flows.
## Requirements
### Requirement: User registration and login

The system SHALL allow users to register with a unique username and password and to authenticate to receive access credentials for subsequent API calls. When an existing account is marked as requiring password reset, registration with that username SHALL update the password and clear the reset flag instead of returning a duplicate-username error.

#### Scenario: Successful registration

- **WHEN** a visitor submits a valid unused username and password meeting policy rules
- **THEN** an account is created and the user can log in

#### Scenario: Duplicate username rejected

- **WHEN** a visitor registers with an existing username that is not awaiting password reset
- **THEN** the system returns an error and does not create a duplicate account

#### Scenario: Password reset takeover via register

- **WHEN** a user whose account has `mustResetPassword` set submits register with the same username and a new valid password
- **THEN** the password is updated, the reset flag is cleared, and access credentials are returned

#### Scenario: Login blocked while reset pending

- **WHEN** a user with `mustResetPassword` attempts login with any password
- **THEN** login is rejected with the same generic invalid-credentials response as a wrong password (without revealing that the account awaits password reset)

### Requirement: Role-based access

The system SHALL support roles including at least `user`, `admin`, and SHALL enforce authorization on protected routes based on role.

#### Scenario: Admin-only route

- **WHEN** a user without admin role calls an admin-only endpoint
- **THEN** the system responds with forbidden status

### Requirement: User profile

Authenticated users SHALL be able to view and update their profile fields defined by the product (e.g. display name, email where applicable). Authenticated users SHALL be able to change their password by providing the current password and a new password meeting policy rules. The profile area SHALL include a statistics dashboard that displays read-only personal practice and contest metrics sourced from the user profile statistics capability.

#### Scenario: Profile update

- **WHEN** an authenticated user updates allowed profile fields
- **THEN** subsequent profile reads reflect the new values

#### Scenario: Change password success

- **WHEN** an authenticated user submits correct current password and a valid new password
- **THEN** the password hash is updated and subsequent login requires the new password

#### Scenario: Change password wrong current

- **WHEN** an authenticated user submits an incorrect current password
- **THEN** the password is not changed and an error is returned

#### Scenario: View statistics dashboard on profile

- **WHEN** an authenticated user opens the profile page and navigates to the statistics dashboard section
- **THEN** personal aggregated statistics are displayed without requiring a separate application area

### Requirement: Batch user import

Administrators SHALL be able to import multiple user accounts from a CSV file using a published import template.

#### Scenario: Successful batch import

- **WHEN** an admin uploads a valid CSV matching the template format
- **THEN** accounts are created or updated according to template rules and a summary report is returned

#### Scenario: Invalid import row

- **WHEN** a row violates validation rules
- **THEN** that row is reported as failed without aborting the entire batch unless configured otherwise

### Requirement: Import template availability

The system SHALL provide a downloadable user import template file and documentation describing required columns.

#### Scenario: Download template

- **WHEN** an admin requests the user import template
- **THEN** the system provides the official CSV template for download

### Requirement: Administrator password reset

Administrators SHALL reset another user's password from the admin user management UI and API. Reset SHALL mark the account as requiring password reset and SHALL NOT expose a temporary password to the administrator.

#### Scenario: Admin reset password

- **WHEN** an administrator confirms password reset for a user
- **THEN** the user record is marked for password reset and the previous password no longer allows login

#### Scenario: Reset requires confirmation

- **WHEN** an administrator initiates reset without confirming the warning dialog
- **THEN** no reset is performed

