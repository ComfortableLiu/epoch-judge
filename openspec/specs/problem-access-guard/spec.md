## ADDED Requirements

### Requirement: Default private problem on create

The system SHALL create new problems with visibility `PRIVATE` unless an authorized editor explicitly sets another visibility.

#### Scenario: Admin creates problem without visibility

- **WHEN** an authorized editor creates a problem and does not specify visibility
- **THEN** the stored visibility is `PRIVATE` and the editor is recorded as creator

### Requirement: Creator and administrator global access

The system SHALL allow problem statement and metadata access globally to the problem creator and users with administrator role regardless of visibility and contest linkage.

#### Scenario: Creator opens private problem from problem bank

- **WHEN** the creator requests the problem detail outside any contest context
- **THEN** the problem content is returned

#### Scenario: Non-creator denied private problem globally

- **WHEN** a regular user requests a `PRIVATE` problem not linked to an accessible contest context
- **THEN** the request is rejected with not-found or forbidden per API convention

### Requirement: Contest-scoped problem visibility

The system SHALL allow users who satisfy contest access rules to view problems that are attached to that contest when the request includes that contest context, even if the problem is `PRIVATE`.

#### Scenario: Contest participant views attached private problem

- **WHEN** a registered user opens the contest problem list or problem link within contest `N` and the problem is attached to contest `N`
- **THEN** the problem title and statement are visible in that contest flow

### Requirement: Active contest linkage locks global discovery

The system SHALL hide problems from global problem bank listing and non-contest detail access for all users except creator and administrator while the problem is attached to at least one contest whose `endAt` is in the future, regardless of the problem `visibility` value.

#### Scenario: Public problem linked to running contest hidden in bank

- **WHEN** a problem has `visibility` `PUBLIC` and is attached to a contest that has not ended
- **THEN** the problem does not appear in the global problem list for regular users and direct global detail access is denied

#### Scenario: Same problem visible inside contest

- **WHEN** a contest participant accesses the problem through contest `N` where the problem is attached and contest `N` has not ended
- **THEN** the participant can view the problem in contest context

#### Scenario: After all linked contests end

- **WHEN** no attached contest has `endAt` in the future
- **THEN** global visibility follows the problem `visibility` field (`PUBLIC` listable, `PRIVATE` restricted)

### Requirement: Centralized access checks

All API paths that expose problem statements or metadata SHALL use a single shared access evaluation so list, detail, submit-context, and contest embed paths cannot diverge.

#### Scenario: List and detail consistent

- **WHEN** a problem is excluded from `GET /problems` for a user
- **THEN** `GET /problems/:number` for the same user without contest context is also denied
