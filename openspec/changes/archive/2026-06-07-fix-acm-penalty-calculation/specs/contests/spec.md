## MODIFIED Requirements

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
