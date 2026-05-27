## MODIFIED Requirements

### Requirement: Problem CRUD

Authorized editors SHALL be able to create, read, update, and delete problems with metadata including title, statement, time limit, memory limit, and visibility. New problems SHALL default to `PRIVATE` and SHALL record the creating user. Read access SHALL follow problem access guard rules including contest linkage.

#### Scenario: Create problem

- **WHEN** an authorized editor submits valid problem data without specifying visibility
- **THEN** the problem is stored with `PRIVATE` visibility and creator id set to the editor

#### Scenario: View problem under access guard

- **WHEN** a user requests problem detail
- **THEN** access is granted or denied according to problem access guard requirements

### Requirement: Problem listing for users

Authenticated or public users SHALL browse and open problem statements only when problem access guard rules allow global visibility. Problems locked by active contest linkage SHALL NOT appear in the global list for non-creator non-administrator users.

#### Scenario: View public problem

- **WHEN** a user opens a `PUBLIC` problem page that is not locked by an active contest linkage
- **THEN** the statement and limits are displayed without exposing hidden test data content

#### Scenario: Hidden contest problem omitted from bank

- **WHEN** a problem is attached to a not-ended contest
- **THEN** regular users do not see it in the global problem list

## ADDED Requirements

### Requirement: Problem creator field

Each problem SHALL store the creating user identifier for access control and auditing.

#### Scenario: Persist creator on create

- **WHEN** a user creates a problem through admin UI or API
- **THEN** the creator user id is stored on the problem record
