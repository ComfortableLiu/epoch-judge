## Purpose

Problem lifecycle including CRUD, test cases, import/export archives, tags, and access-controlled browsing.
## Requirements
### Requirement: Problem CRUD

Authorized editors SHALL be able to create, read, update, and delete problems with metadata including title, statement, time limit, memory limit, visibility, and tags. New problems SHALL default to `PRIVATE` and SHALL record the creating user. Editors SHALL create empty or minimal problems through the admin API and web UI without requiring a ZIP import first. Read access SHALL follow problem access guard rules including contest linkage.

#### Scenario: Create problem

- **WHEN** an authorized editor submits valid problem data without specifying visibility
- **THEN** the problem is stored with `PRIVATE` visibility and creator id set to the editor

#### Scenario: Create problem from admin UI

- **WHEN** an administrator or problem editor submits the admin create-problem form with a title
- **THEN** a new problem record is created and the editor can open it for statement and testcase editing

#### Scenario: View problem under access guard

- **WHEN** a user requests problem detail
- **THEN** access is granted or denied according to problem access guard requirements

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

Editors SHALL be able to import a problem from a structured archive or documented format using an official import template. Imported `problem.yaml` MAY include a `tags` array subject to problem tag rules.

#### Scenario: Successful ZIP import

- **WHEN** an editor uploads a ZIP matching the documented problem import layout
- **THEN** the problem statement, limits, tags if present, and test data are created or updated atomically per import rules

#### Scenario: Malformed import

- **WHEN** an import file fails validation
- **THEN** no partial problem is published and errors describe missing or invalid parts

### Requirement: Problem import template

The system SHALL provide a downloadable example archive and documentation for problem import.

#### Scenario: Download problem template

- **WHEN** an editor requests the problem import template
- **THEN** the system provides the example ZIP and format description

### Requirement: Problem listing for users

Authenticated or public users SHALL browse and open problem statements only when problem access guard rules allow global visibility. Problems locked by active contest linkage SHALL NOT appear in the global list for non-creator non-administrator users.

#### Scenario: View public problem

- **WHEN** a user opens a `PUBLIC` problem page that is not locked by an active contest linkage
- **THEN** the statement and limits are displayed without exposing hidden test data content

#### Scenario: Hidden contest problem omitted from bank

- **WHEN** a problem is attached to a not-ended contest
- **THEN** regular users do not see it in the global problem list

### Requirement: Problem creator field

Each problem SHALL store the creating user identifier for access control and auditing.

#### Scenario: Persist creator on create

- **WHEN** a user creates a problem through admin UI or API
- **THEN** the creator user id is stored on the problem record

### Requirement: Problem ZIP export

Authorized editors SHALL export a single problem as a ZIP archive using the same layout as the official problem import template. Export SHALL support an option to include or omit test data files under `testdata/`.

#### Scenario: Export with test data

- **WHEN** an editor requests export with test data included for a problem that has test cases
- **THEN** the downloaded ZIP contains `problem.yaml`, `statement.md`, `testdata/*.in` and matching `.out` files, and any assets consistent with import rules

#### Scenario: Export without test data

- **WHEN** an editor requests export without test data
- **THEN** the downloaded ZIP contains `problem.yaml` and `statement.md` and assets if any, and does not include `testdata/` entries

#### Scenario: Round-trip compatible manifest

- **WHEN** an editor exports a problem with test data and re-imports the ZIP
- **THEN** the problem metadata and test cases match the exported problem subject to documented upsert-by-number rules

#### Scenario: Export includes tags

- **WHEN** a problem has stored tags and is exported
- **THEN** `problem.yaml` includes the tags array per problem tag requirements

### Requirement: Admin problem create API

The API SHALL expose an authenticated create endpoint for administrators and problem editors that accepts title, optional statement, limits, visibility, and tags without requiring a ZIP upload.

#### Scenario: API create minimal problem

- **WHEN** an editor POSTs valid create payload with title only
- **THEN** the API returns the new problem identifier and numeric id for subsequent editing

