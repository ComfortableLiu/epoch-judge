## ADDED Requirements

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
