## ADDED Requirements

### Requirement: CI pipeline runs on PR
The system SHALL run lint, test, and build checks on every pull request.

#### Scenario: PR triggers CI
- **WHEN** developer creates or updates a pull request
- **THEN** GitHub Actions runs lint, unit tests, and build verification

### Requirement: CD pipeline builds Docker images
The system SHALL build and publish Docker images on main branch merges.

#### Scenario: Merge to main triggers build
- **WHEN** code is merged to the main branch
- **THEN** GitHub Actions builds Docker images and pushes to Docker Hub / GHCR

### Requirement: CI uses dependency caching
The system SHALL cache Yarn dependencies to speed up CI runs.

#### Scenario: Cache hit on CI
- **WHEN** dependencies haven't changed since last run
- **THEN** CI reuses cached node_modules instead of reinstalling
