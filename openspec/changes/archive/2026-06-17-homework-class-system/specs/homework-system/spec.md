## ADDED Requirements

### Requirement: Teacher can create homework
The system SHALL allow teachers to create homework assignments for their classes.

#### Scenario: Create homework with problems
- **WHEN** teacher selects a class, chooses problems, and sets a deadline
- **THEN** system creates the homework and makes it visible to class members

### Requirement: Student can view homework
The system SHALL allow class members to view their homework assignments.

#### Scenario: View homework list
- **WHEN** student opens the homework page
- **THEN** system displays all homework for the student's classes with deadlines and completion status

### Requirement: System tracks homework completion
The system SHALL automatically track homework completion based on submissions.

#### Scenario: Student solves a homework problem
- **WHEN** student gets an accepted submission for a problem in a homework
- **THEN** system marks that problem as completed in the homework progress

### Requirement: Teacher can view homework statistics
The system SHALL allow teachers to view homework completion statistics.

#### Scenario: View class homework statistics
- **WHEN** teacher opens homework statistics page
- **THEN** system displays completion rate, average score, and per-student progress
