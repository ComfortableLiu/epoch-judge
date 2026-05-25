## ADDED Requirements

### Requirement: Contest lifecycle

Administrators SHALL be able to create contests with start and end time, title, description, access policy, and bound judge mode for submissions during the contest.

#### Scenario: Create scheduled contest

- **WHEN** an admin defines a future start and end time and adds problems
- **THEN** the contest is listed and becomes submittable only within the active window

### Requirement: Contest registration

Users SHALL register or be granted access to private contests according to contest visibility rules before submitting.

#### Scenario: Submit during active contest

- **WHEN** a registered user submits during an active contest window for an attached problem
- **THEN** the submission is linked to the contest and counted on the scoreboard

#### Scenario: Submit before start rejected

- **WHEN** a user submits before contest start time
- **THEN** the submission is rejected

### Requirement: Scoreboard

The system SHALL provide a contest scoreboard ordered by contest rules showing participant standings and problem solve status.

#### Scenario: Scoreboard after solve

- **WHEN** a participant receives an accepted submission on a contest problem under ACM rules
- **THEN** the scoreboard reflects solved status and penalty time per ACM conventions

#### Scenario: OI contest ranking

- **WHEN** a contest uses OI judge mode
- **THEN** the scoreboard ranks by total score with documented tie-breaking

### Requirement: Scoreboard freeze

Administrators SHALL be able to enable a scoreboard freeze time after which public scoreboard hides live updates until unfreeze.

#### Scenario: Frozen scoreboard

- **WHEN** contest time passes the freeze timestamp
- **THEN** public viewers see standings as of freeze while admins may view full data
