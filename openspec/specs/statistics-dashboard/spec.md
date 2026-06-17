## Requirements

### Requirement: Admin can view platform statistics
The system SHALL provide a statistics dashboard for administrators.

#### Scenario: View key metrics
- **WHEN** admin opens the statistics dashboard
- **THEN** system displays DAU, total submissions, today's submissions, average judge latency, and online judge nodes

### Requirement: System displays submission trends
The system SHALL show submission volume trends over time.

#### Scenario: View 30-day trend
- **WHEN** admin views the submission trend chart
- **THEN** system displays daily submission counts for the last 30 days

### Requirement: System displays popular problems
The system SHALL show the most popular problems.

#### Scenario: View top 10 problems
- **WHEN** admin views the popular problems section
- **THEN** system displays the top 10 problems sorted by submission count

### Requirement: System displays language distribution
The system SHALL show the distribution of programming languages used.

#### Scenario: View language pie chart
- **WHEN** admin views the language distribution section
- **THEN** system displays a pie chart showing submission percentages by language
