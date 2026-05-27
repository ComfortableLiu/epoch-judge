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

### Requirement: Real-time submission updates

The system SHALL push judge progress to the client in real time for an in-flight submission using Server-Sent Events or an equivalent documented streaming API.

#### Scenario: SSE progress during judging

- **WHEN** a client subscribes to the submission stream while judging is in progress
- **THEN** the client receives events as each testcase completes until a terminal status

#### Scenario: Stream ends on completion

- **WHEN** judging reaches a terminal state
- **THEN** the stream emits a final done event and closes

### Requirement: Supported languages

Submissions SHALL support languages JavaScript, C, C++, Python, and Java as documented in the product.

#### Scenario: C++ submission queued

- **WHEN** a user submits C++ source for a valid problem
- **THEN** the submission is queued for compile-and-run in the C++ toolchain
