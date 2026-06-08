## MODIFIED Requirements

### Requirement: Problem listing for users

Authenticated or public users SHALL browse and open problem statements only when problem access guard rules allow global visibility. Problems locked by active contest linkage SHALL NOT appear in the global list for non-creator non-administrator users.

The system SHALL support searching and filtering problems by keyword, tags, and difficulty range. The keyword parameter SHALL match against problem title and numeric id. The tags parameter SHALL accept comma-separated tag names and return problems matching any of the specified tags. The difficulty parameters SHALL accept minimum and maximum values to filter problems within a difficulty range.

#### Scenario: View public problem

- **WHEN** a user opens a `PUBLIC` problem page that is not locked by an active contest linkage
- **THEN** the statement and limits are displayed without exposing hidden test data content

#### Scenario: Hidden contest problem omitted from bank

- **WHEN** a problem is attached to a not-ended contest
- **THEN** regular users do not see it in the global problem list

#### Scenario: Search by keyword

- **WHEN** a user provides a `keyword` query parameter in the problem list request
- **THEN** the system returns problems whose title or numeric id matches the keyword
- **AND** the results are paginated according to existing pagination parameters

#### Scenario: Filter by tags

- **WHEN** a user provides a `tags` query parameter with comma-separated tag names
- **THEN** the system returns problems that have any of the specified tags
- **AND** the results are paginated according to existing pagination parameters

#### Scenario: Filter by difficulty range

- **WHEN** a user provides `difficultyMin` and/or `difficultyMax` query parameters
- **THEN** the system returns problems whose difficulty value falls within the specified range
- **AND** the results are paginated according to existing pagination parameters

#### Scenario: Combined filters

- **WHEN** a user provides multiple filter parameters (keyword, tags, difficulty)
- **THEN** the system returns problems that match all specified filter criteria
- **AND** the results are paginated according to existing pagination parameters
