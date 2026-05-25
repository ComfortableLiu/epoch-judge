## ADDED Requirements

### Requirement: Admin dashboard

Users with admin role SHALL access an administration area to manage users, problems, contests, and system settings through the web application.

#### Scenario: Admin opens dashboard

- **WHEN** an admin navigates to the admin section
- **THEN** management entry points for core entities are available

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
