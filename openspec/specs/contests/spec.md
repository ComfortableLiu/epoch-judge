## ADDED Requirements

### Requirement: Contest lifecycle

Administrators SHALL be able to create and update contests with minute-precision start and end times, optional freeze time defined relative to end, title, description, access policy, optional plaintext access password, bound judge mode, and an ordered problem list. Contests SHALL be identified by a monotonic numeric id exposed in URLs and APIs. Submissions during the contest remain allowed only within the active window.

#### Scenario: Create scheduled contest

- **WHEN** an admin defines start time, end time defaulting to three hours after start, and adds ordered problems
- **THEN** the contest is listed by numeric id and becomes submittable only within the active window

#### Scenario: Contest URL uses numeric id

- **WHEN** a user navigates to a contest page
- **THEN** the route uses the contest numeric id not a slug string

### Requirement: Contest registration

Users SHALL register or satisfy access rules for contests before submitting. Contests with an access password SHALL require successful password verification before registration or entry flows proceed for non-administrator users.

#### Scenario: Submit during active contest

- **WHEN** a registered user who satisfied password rules if any submits during an active contest window for an attached problem
- **THEN** the submission is linked to the contest and counted on the scoreboard

#### Scenario: Submit before start rejected

- **WHEN** a user submits before contest start time
- **THEN** the submission is rejected

#### Scenario: Password required contest

- **WHEN** a contest has a non-empty access password and a user has not verified the password
- **THEN** contest detail and submit entry require password verification first

#### Scenario: Wrong password rejected

- **WHEN** a user submits an incorrect password for a password-protected contest
- **THEN** access is not granted and an error is returned

### Requirement: Contest numeric identifier

The system SHALL assign each contest a unique auto-incrementing positive integer used in user-facing routes and admin lists. The slug field SHALL NOT be used.

#### Scenario: New contest receives number

- **WHEN** an administrator creates a contest
- **THEN** the system assigns the next numeric id without requiring manual slug input

### Requirement: Contest access password storage

The system SHALL store contest access passwords as plaintext in the database when set by an administrator and compare submitted passwords by exact match.

#### Scenario: Admin sets password

- **WHEN** an administrator saves a contest with access password `secret`
- **THEN** the stored value equals `secret` and future verification uses exact match

### Requirement: Scoreboard

The system SHALL provide a contest scoreboard ordered by contest rules showing participant standings and problem solve status.

For ACM judge mode, the system SHALL calculate penalty time using the standard ACM-ICPC formula: each problem's penalty equals the time from contest start to first accepted submission in minutes plus 20 minutes multiplied by the number of failed submissions for that problem before the first acceptance. The system SHALL query all submission statuses (including WRONG_ANSWER, TIME_LIMIT_EXCEEDED, etc.) to count failed submissions, not only ACCEPTED submissions.

For OI judge mode, the system SHALL rank by total score with documented tie-breaking.

#### Scenario: Scoreboard after solve with failed attempts

- **WHEN** a participant receives an accepted submission on a contest problem under ACM rules after previous failed attempts on the same problem
- **THEN** the scoreboard reflects solved status and penalty time calculated as: first AC time + 20 minutes × number of failed attempts before AC

#### Scenario: Scoreboard ignores submissions after AC

- **WHEN** a participant makes submissions on a problem after already achieving an accepted submission
- **THEN** those subsequent submissions SHALL NOT affect the penalty calculation for that problem

#### Scenario: OI contest ranking

- **WHEN** a contest uses OI judge mode
- **THEN** the scoreboard ranks by total score with documented tie-breaking

### Requirement: Scoreboard freeze

Administrators SHALL configure freeze as an offset before contest end time such that freeze timestamp equals end time minus the configured offset. When offset is cleared, freeze is disabled.

#### Scenario: Frozen scoreboard

- **WHEN** contest time passes the freeze timestamp
- **THEN** public viewers see standings as of freeze while admins may view full data
