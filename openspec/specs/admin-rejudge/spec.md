## ADDED Requirements

### Requirement: Rejudge scope selection

Administrators SHALL initiate rejudge operations from the admin area by selecting one scope among problem, submission, or contest, and selecting one or more target records within that scope.

#### Scenario: Select submissions by problem

- **WHEN** an admin chooses scope "problem" and selects multiple problems
- **THEN** the UI lists terminal submissions for those problems with row selection enabled

#### Scenario: Select submissions directly

- **WHEN** an admin chooses scope "submission"
- **THEN** the UI provides a submission table with multi-select on submission rows

#### Scenario: Select submissions by contest

- **WHEN** an admin chooses scope "contest" and selects multiple contests
- **THEN** the UI lists terminal submissions tied to those contests with row selection enabled

### Requirement: Rejudge preview

The system SHALL let administrators preview how many submissions will be rejudged before enqueueing work.

#### Scenario: Preview count

- **WHEN** an admin requests preview with valid scope and ids
- **THEN** the API returns the number of eligible terminal submissions and skips ineligible ones with reasons

### Requirement: Batch rejudge execution

The system SHALL enqueue rejudge jobs for all selected eligible submissions in one administrative action.

#### Scenario: Confirm rejudge

- **WHEN** an admin confirms rejudge for N eligible submissions
- **THEN** each submission is marked `REJUDGE_QUEUED`, testcase results reset to pending, and judge jobs are enqueued

#### Scenario: Skip in-flight submission

- **WHEN** a selected submission is not in a terminal status
- **THEN** it is skipped and reported in the batch result without affecting other submissions

### Requirement: Rejudge batch feedback

The admin UI SHALL display a summary after rejudge including queued count, skipped count, and per-item errors when present.

#### Scenario: Partial success summary

- **WHEN** a batch rejudge completes with some skips
- **THEN** the admin sees both successful and failed counts without losing successful enqueue operations
