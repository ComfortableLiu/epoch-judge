## ADDED Requirements

### Requirement: Rejudge job processing

Judge workers SHALL process rejudge jobs using the submission's stored source code and the problem's current testcases and resource limits.

#### Scenario: Reset testcase rows before run

- **WHEN** a worker starts a rejudge job
- **THEN** per-testcase results are evaluated fresh and persisted over previous terminal outcomes

#### Scenario: Rejudge job identity

- **WHEN** a rejudge job is enqueued for a submission that was judged before
- **THEN** the queue uses a unique job id that does not collide with the completed first-run job for the same submission

### Requirement: Rejudge status transitions

Workers SHALL transition submission status from `REJUDGE_QUEUED` to `REJUDGING` at job start and to an appropriate terminal status when finished.

#### Scenario: Start rejudge

- **WHEN** a worker picks up a submission in `REJUDGE_QUEUED`
- **THEN** status becomes `REJUDGING` before testcase execution begins

#### Scenario: Finish rejudge

- **WHEN** all testcases are evaluated for a rejudge job
- **THEN** the submission receives a terminal status and score consistent with OI or ACM rules

## MODIFIED Requirements

### Requirement: Judge job interface

The judge service SHALL accept judge jobs containing source code, language, resource limits, judge mode, and testcase input/output payloads and SHALL report status updates suitable for aggregation by the API layer, including jobs triggered by administrative rejudge.

#### Scenario: Worker processes queued job

- **WHEN** a judge worker receives a job from the queue
- **THEN** it runs all testcases in sandbox and persists results linked to the submission id

#### Scenario: Worker processes rejudge job

- **WHEN** a judge worker receives a rejudge job for a terminal submission
- **THEN** it publishes progress events and persists the same result shape as an initial judge run
