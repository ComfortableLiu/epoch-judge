## ADDED Requirements

### Requirement: Sandboxed execution

All user programs SHALL execute inside an isolated sandbox with enforced CPU time, memory, output size, and process limits without granting network access by default.

#### Scenario: Time limit exceeded

- **WHEN** a program exceeds the problem time limit in the sandbox
- **THEN** the testcase result is reported as time limit exceeded

#### Scenario: Memory limit exceeded

- **WHEN** a program exceeds the memory limit
- **THEN** the testcase result is reported as memory limit exceeded

### Requirement: Command and syntax protection

The judge SHALL NOT execute user code via shell interpretation and SHALL reject or flag submissions containing forbidden dangerous APIs or patterns defined in security policy before or during run.

#### Scenario: No shell execution

- **WHEN** user source contains shell metacharacters
- **THEN** the judge invokes only fixed compiler or interpreter argv and does not pass code to `/bin/sh -c`

#### Scenario: Forbidden API pattern

- **WHEN** user source matches a blocked pattern such as process spawning in JavaScript
- **THEN** the submission fails with a security or compile error without running untrusted binaries outside sandbox policy

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

### Requirement: Judge job interface

The judge service SHALL accept judge jobs containing source code, language, resource limits, judge mode, and testcase input/output payloads and SHALL report status updates suitable for aggregation by the API layer, including jobs triggered by administrative rejudge.

#### Scenario: Worker processes queued job

- **WHEN** a judge worker receives a job from the queue
- **THEN** it runs all testcases in sandbox and persists results linked to the submission id

#### Scenario: Worker processes rejudge job

- **WHEN** a judge worker receives a rejudge job for a terminal submission
- **THEN** it publishes progress events and persists the same result shape as an initial judge run

### Requirement: Single-machine default topology

The default production deployment SHALL colocate one judge worker with the API stack on a single host; multi-worker distributed judging SHALL be an optional scale-out configuration.

#### Scenario: Default deploy judge count

- **WHEN** the platform is deployed with default settings from the one-click script
- **THEN** exactly one judge worker instance consumes the queue for that deployment

### Requirement: gRPC judge API

Judge workers SHALL expose a gRPC service for submitting jobs and watching status for service-to-service integration as documented.

#### Scenario: Internal watch via gRPC

- **WHEN** the API calls the documented WatchStatus RPC for a submission
- **THEN** status transitions are streamed until completion

### Requirement: Configurable concurrency

Operators SHALL be able to configure maximum concurrent sandbox runs per worker and global inflight limits via environment or admin configuration stored in the system.

#### Scenario: Concurrency cap enforced

- **WHEN** inflight jobs equal the configured worker concurrency
- **THEN** additional jobs wait in queue until a slot is free

### Requirement: OI scoring mode

In OI mode the judge SHALL compute total score from per-testcase scores and partial outcomes according to problem testcase weights.

#### Scenario: Partial points in OI

- **WHEN** a submission passes some but not all testcases in OI mode
- **THEN** the submission score reflects the sum of passed testcase scores

### Requirement: ACM verdict mode

In ACM mode the judge SHALL report overall acceptance only if all testcases pass; otherwise the first failing verdict category applies without partial score.

#### Scenario: Single WA in ACM

- **WHEN** any testcase fails in ACM mode
- **THEN** the overall status is not accepted and no partial score is shown
