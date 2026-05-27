## Purpose

Administration area for platform operators to manage users, problems, contests, judging infrastructure, and system configuration.
## Requirements
### Requirement: Admin dashboard

Users with admin role SHALL access an administration area to manage users, problems, contests, and system settings through the web application. The default tab when opening the admin section SHALL be the problems tab. Tab order SHALL be problems, contests, rejudge, users, judge nodes, and configuration.

#### Scenario: Admin opens dashboard

- **WHEN** an admin navigates to the admin section without a tab query parameter
- **THEN** the problems management panel is shown first

#### Scenario: Tab order

- **WHEN** an admin views admin navigation tabs
- **THEN** tabs appear in order: problems, contests, rejudge, users, judge, config

### Requirement: Judge worker visibility

The system SHALL record judge worker heartbeats or queue depth metrics and display worker status to administrators when workers register.

#### Scenario: Worker heartbeat

- **WHEN** a judge worker starts and sends periodic heartbeat
- **THEN** the admin view lists the worker as online with last seen time

### Requirement: System configuration

Administrators SHALL be able to view and update judge-related configuration including concurrency limits where exposed by the product.

#### Scenario: Update global concurrency

- **WHEN** an admin updates the global max inflight judge setting
- **THEN** new submissions respect the updated limit after persistence

### Requirement: MySQL persistence with Prisma

All durable business entities SHALL be stored in MySQL using Prisma schema and migrations versioned in `packages/db`, applied via the documented migrate command in deploy and CI.

#### Scenario: Fresh database migrate

- **WHEN** an operator runs `prisma migrate deploy` on an empty MySQL instance
- **THEN** required tables for users, problems, submissions, and contests exist per the Prisma schema

#### Scenario: Type-safe data access in API

- **WHEN** the API reads or writes business entities
- **THEN** it uses the shared Prisma client types generated from the schema

### Requirement: Redis usage

The system SHALL use Redis for judge job queueing and MAY use Redis for caching, rate limiting, or SSE pub/sub bridging as documented.

#### Scenario: Job queued in Redis

- **WHEN** a submission is accepted for judging
- **THEN** a job entry is enqueued in Redis for workers to consume

### Requirement: Admin user CRUD

Administrators SHALL create, update, and delete users from the admin web UI without CSV import. The user management UI SHALL provide password reset with a double-confirmation modal explaining that the user must set a new password via register using the same username.

#### Scenario: Create user

- **WHEN** an admin submits a valid new user form
- **THEN** the user is persisted with hashed password and appears in the user list

#### Scenario: Delete user

- **WHEN** an admin deletes another user account
- **THEN** the user is removed and no longer listed

#### Scenario: Reset password confirmation

- **WHEN** an admin clicks reset password and cancels the confirmation dialog
- **THEN** the user password and reset flag remain unchanged

### Requirement: Admin problem edit

Administrators and problem editors SHALL edit problem title, statement, visibility, limits, tags, and judge mode from the admin web UI. The problems tab SHALL provide a control to create a new problem without uploading a ZIP.

#### Scenario: Update problem

- **WHEN** an admin saves edits to an existing problem including tags
- **THEN** the problem detail reflects the updated fields for subsequent views and submissions

#### Scenario: New problem button

- **WHEN** an administrator clicks create problem on the problems tab
- **THEN** a create form is shown and saving creates a problem available for further edit

### Requirement: Admin rejudge entry

The administration area SHALL include a dedicated rejudge section reachable from the admin navigation with URL persistence consistent with other admin tabs.

#### Scenario: Open rejudge tab

- **WHEN** an admin navigates to the rejudge tab
- **THEN** scope selection, target picker, preview, and confirm actions are available

### Requirement: Admin-only rejudge

Only users with the administrator role SHALL execute rejudge preview and batch rejudge API calls.

#### Scenario: Non-admin denied

- **WHEN** a non-admin user calls the rejudge API
- **THEN** the request is rejected with forbidden status

### Requirement: Admin contest form without slug

The admin contest create and edit dialog SHALL NOT require a slug field and SHALL display the contest numeric id as read-only when editing.

#### Scenario: Create contest form

- **WHEN** an administrator opens new contest dialog
- **THEN** the first fields are title and metadata without slug input

### Requirement: Admin contest time controls

The admin contest form SHALL provide start time picker with minute precision, end time as linked relative duration and absolute end picker defaulting to three hours after start, and freeze as offset before end in minutes or hours.

#### Scenario: Adjust duration updates absolute end

- **WHEN** an administrator changes end duration to two hours after start
- **THEN** the absolute end datetime control updates to match

#### Scenario: Adjust absolute end updates duration

- **WHEN** an administrator changes absolute end datetime
- **THEN** the duration control updates to reflect the difference from start

### Requirement: Admin contest problem list editor

The admin contest form SHALL maintain contest problems as an ordered list with drag reorder, add, and remove actions before save.

#### Scenario: Reorder problems

- **WHEN** an administrator drags a problem row to a new position and saves
- **THEN** contest problem labels follow A/B/C order for the new sequence

#### Scenario: Remove problem from contest

- **WHEN** an administrator removes a problem from the list and saves
- **THEN** that problem is no longer attached to the contest

### Requirement: Admin contest password field

The admin contest form SHALL include an optional plaintext password field for contest access control.

#### Scenario: Set contest password in admin

- **WHEN** an administrator enters a password and saves the contest
- **THEN** users must verify that password before entering the contest

