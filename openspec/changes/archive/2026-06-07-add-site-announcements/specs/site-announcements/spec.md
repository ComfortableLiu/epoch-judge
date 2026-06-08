## ADDED Requirements

### Requirement: Announcement data model

The system SHALL persist announcements with title, content, pinned status, optional start/end times, and creator reference.

#### Scenario: Create announcement with all fields

- **WHEN** an admin creates an announcement with title, content, isPinned=true, startsAt, endsAt
- **THEN** the announcement is persisted with all provided fields and creator reference

#### Scenario: Create announcement with minimal fields

- **WHEN** an admin creates an announcement with only title and content
- **THEN** the announcement is persisted with isPinned=false, startsAt=null, endsAt=null

### Requirement: Admin can manage announcements

Admins SHALL be able to create, read, update, and delete announcements via the admin API.

#### Scenario: Create announcement

- **WHEN** an authenticated admin sends POST /api/admin/announcements with valid data
- **THEN** the announcement is created and returned with 201 status

#### Scenario: Update announcement

- **WHEN** an authenticated admin sends PATCH /api/admin/announcements/:id with partial data
- **THEN** the announcement is updated and returned

#### Scenario: Delete announcement

- **WHEN** an authenticated admin sends DELETE /api/admin/announcements/:id
- **THEN** the announcement is removed and 204 status is returned

#### Scenario: List announcements with pagination

- **WHEN** an authenticated admin sends GET /api/admin/announcements with page/limit params
- **THEN** a paginated list of announcements is returned sorted by createdAt DESC

### Requirement: Users can view active announcements

Users SHALL be able to retrieve currently active announcements without authentication.

#### Scenario: Get active announcements

- **WHEN** a client sends GET /api/announcements/active
- **THEN** announcements matching (startsAt IS NULL OR startsAt <= NOW) AND (endsAt IS NULL OR endsAt >= NOW) are returned sorted by isPinned DESC, createdAt DESC

#### Scenario: No active announcements

- **WHEN** a client requests active announcements and none match the time criteria
- **THEN** an empty array is returned

### Requirement: Announcement Banner display

The user-facing homepage SHALL display a banner showing active announcements at the top of the page.

#### Scenario: Banner shows pinned announcements first

- **WHEN** the homepage loads and there are active announcements
- **THEN** pinned announcements appear before non-pinned ones in the banner

#### Scenario: Banner supports dismissal

- **WHEN** a user closes a specific announcement in the banner
- **THEN** that announcement is hidden for the user (stored in localStorage)

#### Scenario: Banner supports expand/collapse

- **WHEN** a user clicks to expand the banner
- **THEN** all active announcements are shown; when collapsed, only the first is visible

### Requirement: Announcement time-based visibility

Announcements SHALL only be visible to users when within their configured time window.

#### Scenario: Announcement not yet started

- **WHEN** an announcement has startsAt set to a future time
- **THEN** it is not included in the active announcements response

#### Scenario: Announcement expired

- **WHEN** an announcement has endsAt set to a past time
- **THEN** it is not included in the active announcements response

#### Scenario: Announcement with no time restrictions

- **WHEN** an announcement has startsAt=null and endsAt=null
- **THEN** it is always included in the active announcements response
