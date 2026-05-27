## ADDED Requirements

### Requirement: Code submission

Authenticated users SHALL be able to submit source code for a problem in supported languages with a selected judge mode when permitted by problem or contest rules.

#### Scenario: Submit solution

- **WHEN** a user submits valid source code and language for an open problem
- **THEN** a submission record is created with pending judge status

#### Scenario: Unsupported language rejected

- **WHEN** a user submits code with a language not in the supported set
- **THEN** the submission is rejected before entering the judge queue

### Requirement: Submission history

Users SHALL be able to list and view their past submissions including status, time, memory, score, and per-testcase results when available.

#### Scenario: View submission detail

- **WHEN** a user opens their submission detail page
- **THEN** overall verdict and per-testcase breakdown are shown for completed runs

### Requirement: Rejudge status values

The submission status model SHALL include `REJUDGE_QUEUED` and `REJUDGING` to distinguish administrative re-evaluation from first-time judging.

#### Scenario: Status after admin rejudge

- **WHEN** an administrator successfully queues a submission for rejudge
- **THEN** the submission status becomes `REJUDGE_QUEUED` until a worker starts processing

#### Scenario: Status when worker starts rejudge

- **WHEN** a judge worker begins processing a rejudge job
- **THEN** the submission status becomes `REJUDGING` until a terminal verdict is reached

### Requirement: Rejudge eligibility

Only submissions in a terminal judge status SHALL be eligible for administrative rejudge.

#### Scenario: Terminal submission accepted

- **WHEN** a submission status is `ACCEPTED`, `WRONG_ANSWER`, or other documented terminal codes
- **THEN** it MAY be selected for rejudge

#### Scenario: In-flight submission rejected

- **WHEN** a submission status is `QUEUED`, `JUDGING`, `REJUDGE_QUEUED`, or `REJUDGING`
- **THEN** it SHALL NOT be enqueued for another rejudge until it reaches a terminal status or fails validation

### Requirement: Rejudge history visibility

Submission list and detail views SHALL display rejudge-related statuses with the same real-time update mechanisms as first-time judging where applicable.

#### Scenario: List shows rejudge queued

- **WHEN** a user views the submissions list while a record is `REJUDGE_QUEUED`
- **THEN** the status label reflects rejudge queueing distinctly from first-time `QUEUED`

#### Scenario: SSE during rejudge

- **WHEN** a client subscribes to the submission stream during `REJUDGING`
- **THEN** testcase and completion events are emitted until a new terminal status is persisted

### Requirement: Real-time submission updates

The system SHALL push judge progress to the client in real time for an in-flight submission using Server-Sent Events or an equivalent documented streaming API, including submissions in `REJUDGING` state.

#### Scenario: SSE progress during judging

- **WHEN** a client subscribes to the submission stream while judging is in progress or status is `REJUDGING`
- **THEN** the client receives events as each testcase completes until a terminal status

#### Scenario: Stream ends on completion

- **WHEN** judging reaches a terminal state
- **THEN** the stream emits a final done event and closes

### Requirement: Supported languages

Submissions SHALL support languages JavaScript, C, C++, Python, and Java as documented in the product.

#### Scenario: C++ submission queued

- **WHEN** a user submits C++ source for a valid problem
- **THEN** the submission is queued for compile-and-run in the C++ toolchain
