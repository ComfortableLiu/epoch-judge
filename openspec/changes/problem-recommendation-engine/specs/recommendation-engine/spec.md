## ADDED Requirements

### Requirement: System generates user ability profile
The system SHALL maintain a user ability profile based on submission history.

#### Scenario: Calculate ability profile
- **WHEN** user has at least 10 accepted submissions
- **THEN** system calculates mastered tags, average difficulty, and weak areas

### Requirement: System recommends problems
The system SHALL recommend problems based on user ability profile.

#### Scenario: Recommend next problems
- **WHEN** user visits the recommendation section
- **THEN** system displays 5-10 problems slightly above user's current difficulty level

#### Scenario: Recommend by weak tags
- **WHEN** user has identified weak tags
- **THEN** system prioritizes problems from weak tags in recommendations

### Requirement: Recommendations are cached
The system SHALL cache recommendation results in Redis.

#### Scenario: Cache hit
- **WHEN** user requests recommendations within 1 hour of last request
- **THEN** system returns cached recommendations without recalculation
