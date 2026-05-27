## MODIFIED Requirements

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

### Requirement: Problem file import

Editors SHALL be able to import a problem from a structured archive or documented format using an official import template. Imported `problem.yaml` MAY include a `tags` array subject to problem tag rules.

#### Scenario: Successful ZIP import

- **WHEN** an editor uploads a ZIP matching the documented problem import layout
- **THEN** the problem statement, limits, tags if present, and test data are created or updated atomically per import rules

#### Scenario: Malformed import

- **WHEN** an import file fails validation
- **THEN** no partial problem is published and errors describe missing or invalid parts

## ADDED Requirements

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
