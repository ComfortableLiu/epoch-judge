# user-profile-stats Specification

## Purpose
TBD - created by archiving change profile-stats-dashboard. Update Purpose after archive.
## Requirements
### Requirement: Personal statistics API

The system SHALL expose authenticated read-only endpoints for the current user to retrieve aggregated practice and contest statistics derived from submissions and contest registrations.

#### Scenario: Fetch statistics summary

- **WHEN** an authenticated user requests personal statistics summary
- **THEN** the response includes total submission count, count of distinct accepted problems, count of distinct attempted problems, practice pass rate, verdict breakdown for terminal statuses, and a list of contests the user participated in

#### Scenario: Unauthenticated access denied

- **WHEN** a request to personal statistics endpoints is made without valid authentication
- **THEN** the system responds with unauthorized status

#### Scenario: User cannot read another user's statistics

- **WHEN** an authenticated user requests statistics
- **THEN** the data returned SHALL only reflect the authenticated user's own submissions and registrations

### Requirement: Pass rate calculation

The system SHALL compute practice pass rate as the percentage of distinct attempted problems that have at least one accepted submission, using distinct problem identifiers.

#### Scenario: Pass rate with attempts

- **WHEN** a user has attempted 10 distinct problems and accepted 4 distinct problems
- **THEN** the reported pass rate is 40 percent

#### Scenario: Pass rate with no attempts

- **WHEN** a user has no terminal submissions on any problem
- **THEN** the pass rate is reported as zero or an explicit empty indicator documented by the API

### Requirement: Solved problems list

The system SHALL provide a paginated list of problems the user has accepted at least once, including problem numeric id, title, first acceptance time, and whether the acceptance occurred in a contest context.

#### Scenario: Paginated solved list

- **WHEN** an authenticated user requests solved problems with page and page size parameters
- **THEN** the response includes items for that page and total count for pagination

#### Scenario: Solved list ordering

- **WHEN** the solved problems list is returned
- **THEN** items are ordered by first acceptance time descending unless otherwise documented

### Requirement: Contest participation list

The system SHALL include contests where the user has a registration record or at least one submission tied to the contest.

#### Scenario: Contest entry from registration

- **WHEN** a user is registered for a contest but has not submitted
- **THEN** the contest still appears in the participation list with zero submissions if applicable

#### Scenario: Contest entry from submissions

- **WHEN** a user has submissions for a contest without an explicit registration row
- **THEN** the contest still appears in the participation list

#### Scenario: Contest summary fields

- **WHEN** a contest appears in the participation list
- **THEN** each entry includes contest numeric id, title, schedule bounds, lifecycle status, submission count, and distinct accepted problem count within that contest

### Requirement: Profile statistics dashboard UI

The web application SHALL present a data dashboard on the profile area showing summary metrics, verdict distribution, solved problems table, and contest participation table with navigation links to existing problem, contest, and submission views.

#### Scenario: Dashboard visible to signed-in user

- **WHEN** an authenticated user opens the profile page and selects the statistics dashboard section
- **THEN** summary statistics and tables are loaded from the personal statistics API

#### Scenario: Navigate from solved problem row

- **WHEN** a user activates a solved problem row link
- **THEN** the application navigates to that problem's detail page

#### Scenario: Navigate from contest row

- **WHEN** a user activates a contest row link
- **THEN** the application navigates to that contest's detail page

