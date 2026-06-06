## MODIFIED Requirements

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
