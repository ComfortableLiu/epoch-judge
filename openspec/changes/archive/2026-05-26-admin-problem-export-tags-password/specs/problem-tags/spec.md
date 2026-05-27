## ADDED Requirements

### Requirement: Problem tag cardinality

Each problem SHALL store at most five tags.

#### Scenario: Within limit accepted

- **WHEN** an editor saves a problem with five distinct valid tags
- **THEN** all five tags are persisted

#### Scenario: Sixth tag rejected

- **WHEN** an editor submits six tags for a problem
- **THEN** the request is rejected with a validation error before persistence

### Requirement: Problem tag length

Each tag string SHALL be between one and ten characters after trimming whitespace.

#### Scenario: Valid short tag

- **WHEN** an editor saves tag `dp`
- **THEN** the tag is stored as `dp`

#### Scenario: Empty tag rejected

- **WHEN** an editor submits a tag that is empty or only whitespace
- **THEN** the tag is discarded or the request is rejected per API validation rules

#### Scenario: Overlong tag rejected

- **WHEN** an editor submits a tag longer than ten characters
- **THEN** the request is rejected with a validation error

### Requirement: Tag normalization

The system SHALL trim leading and trailing whitespace on each tag, remove duplicate tags while preserving first-seen order, and reject the save if any tag fails length rules after normalization.

#### Scenario: Duplicate tags collapsed

- **WHEN** an editor submits tags `[" math ", "math", "graph"]`
- **THEN** the stored tags are `["math", "graph"]`

### Requirement: Tags in problem import and export manifest

Problem ZIP import and export SHALL read and write tags in `problem.yaml` under a `tags` array of strings using the same normalization rules.

#### Scenario: Import YAML tags

- **WHEN** a ZIP `problem.yaml` contains `tags: ["oi", "贪心"]`
- **THEN** the imported problem stores the normalized tag list

#### Scenario: Export YAML tags

- **WHEN** a problem with tags is exported to ZIP
- **THEN** `problem.yaml` includes a `tags` field matching the stored tags
