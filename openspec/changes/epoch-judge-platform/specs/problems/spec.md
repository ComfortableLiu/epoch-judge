## ADDED Requirements

### Requirement: Problem CRUD

Authorized editors SHALL be able to create, read, update, and delete problems with metadata including title, statement, time limit, memory limit, default judge mode, and visibility.

#### Scenario: Create problem

- **WHEN** an authorized editor submits valid problem data
- **THEN** the problem is stored and visible according to visibility rules

### Requirement: Test case management

Each problem SHALL have ordered test cases with input and expected output stored as files or blobs with optional per-case score for OI mode.

#### Scenario: Add test case

- **WHEN** an editor uploads input and output for a new test case
- **THEN** the test case is associated with the problem and used in future judging

### Requirement: Local test data storage by default

Test case input and output files SHALL be stored on the local filesystem under a configurable root directory when storage type is not set or set to local.

#### Scenario: Default local storage on upload

- **WHEN** an editor uploads testcase files without S3 configuration
- **THEN** files are written under the configured local data directory and referenced by storage keys in the database

#### Scenario: Judge reads local testcase

- **WHEN** a judge worker runs a submission for a problem with locally stored testcases
- **THEN** the worker reads input and expected output from the local storage path or shared volume mount

### Requirement: Optional S3 test data storage

The system SHALL support configuring S3-compatible object storage for test case files via environment variables without code changes.

#### Scenario: Store testcase on S3

- **WHEN** storage type is configured to s3 with valid credentials and bucket settings
- **THEN** uploaded testcase files are stored in the configured bucket and database records use S3 object keys

#### Scenario: Switch storage driver

- **WHEN** an operator changes storage type from local to s3 in configuration and restarts services
- **THEN** new uploads use S3 while existing local keys remain readable per documented migration guidance

### Requirement: Problem file import

Editors SHALL be able to import a problem from a structured archive or documented format using an official import template.

#### Scenario: Successful ZIP import

- **WHEN** an editor uploads a ZIP matching the documented problem import layout
- **THEN** the problem statement, limits, and test data are created or updated atomically per import rules

#### Scenario: Malformed import

- **WHEN** an import file fails validation
- **THEN** no partial problem is published and errors describe missing or invalid parts

### Requirement: Problem import template

The system SHALL provide a downloadable example archive and documentation for problem import.

#### Scenario: Download problem template

- **WHEN** an editor requests the problem import template
- **THEN** the system provides the example ZIP and format description

### Requirement: Problem listing for users

Authenticated or public users (per visibility) SHALL be able to browse and open problem statements consistent with visibility settings.

#### Scenario: View public problem

- **WHEN** a user opens a public problem page
- **THEN** the statement and limits are displayed without exposing hidden test data content
