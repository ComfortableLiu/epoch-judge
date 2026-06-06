## Purpose

比赛密码 bcrypt 哈希存储与验证能力，防止数据库泄露导致密码暴露。

## Requirements

### Requirement: Contest password hashed on creation

The system SHALL hash the `accessPassword` using bcrypt before storing it when a contest is created with a password.

#### Scenario: Create contest with password

- **WHEN** an admin creates a contest with `accessPassword` set to a non-empty string
- **THEN** the system stores the bcrypt hash of the password in the database, not the plaintext value

#### Scenario: Create contest without password

- **WHEN** an admin creates a contest with `accessPassword` omitted or set to null/empty
- **THEN** the system stores null in the database (no password required)

### Requirement: Contest password hashed on update

The system SHALL hash the `accessPassword` using bcrypt before storing it when a contest's password is updated.

#### Scenario: Update contest password

- **WHEN** an admin updates a contest's `accessPassword` to a new non-empty string
- **THEN** the system stores the bcrypt hash of the new password, replacing the previous value

#### Scenario: Clear contest password

- **WHEN** an admin updates a contest's `accessPassword` to null or empty string
- **THEN** the system stores null in the database, removing the password requirement

### Requirement: Contest password verified using bcrypt compare

The system SHALL use `bcrypt.compare()` to verify a user-provided password against the stored hash when a user attempts to verify a contest password.

#### Scenario: Correct password verification

- **WHEN** a user submits the correct password for a contest that has a hashed password
- **THEN** the system marks the user's registration as password-verified and returns success

#### Scenario: Incorrect password verification

- **WHEN** a user submits an incorrect password for a contest that has a hashed password
- **THEN** the system returns a forbidden error and does not mark the registration as verified

#### Scenario: No password required

- **WHEN** a user attempts to verify a password for a contest that has no password
- **THEN** the system returns success without performing any comparison

### Requirement: API responses do not expose password hashes

The system SHALL NOT include the `accessPassword` field (neither plaintext nor hash) in any API response.

#### Scenario: Admin list contests

- **WHEN** an admin requests the contest list
- **THEN** the response does not include the `accessPassword` field for any contest

#### Scenario: Admin get contest detail

- **WHEN** an admin requests a specific contest's details
- **THEN** the response does not include the `accessPassword` field

#### Scenario: Public contest list

- **WHEN** a user requests the public contest list
- **THEN** the response includes only a `requiresPassword` boolean, not the password value

### Requirement: Migration script for existing passwords

The system SHALL provide a migration script that hashes all existing plaintext passwords in the database.

#### Scenario: Run migration script

- **WHEN** the migration script is executed
- **THEN** all existing plaintext passwords are replaced with their bcrypt hashes, and already-hashed passwords are left unchanged

#### Scenario: Migration is idempotent

- **WHEN** the migration script is run multiple times
- **THEN** passwords that are already hashed are not re-hashed, and no data is corrupted

### Requirement: Configurable bcrypt rounds

The system SHALL allow the bcrypt cost factor to be configured via the `BCRYPT_ROUNDS` environment variable.

#### Scenario: Custom bcrypt rounds

- **WHEN** the `BCRYPT_ROUNDS` environment variable is set to a custom value
- **THEN** the system uses that value as the cost factor for all contest password hashing
