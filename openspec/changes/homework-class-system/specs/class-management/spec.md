## ADDED Requirements

### Requirement: Teacher can create class
The system SHALL allow users with teacher role to create classes.

#### Scenario: Create a new class
- **WHEN** teacher submits class name and description
- **THEN** system creates the class with a unique invitation code and assigns the teacher as owner

### Requirement: Student can join class via invitation code
The system SHALL allow students to join classes using invitation codes.

#### Scenario: Join class with valid code
- **WHEN** student enters a valid invitation code
- **THEN** system adds the student to the class member list

#### Scenario: Join class with invalid code
- **WHEN** student enters an invalid invitation code
- **THEN** system displays an error message and does not add the student

### Requirement: Teacher can manage class members
The system SHALL allow teachers to view and remove class members.

#### Scenario: View class member list
- **WHEN** teacher opens class management page
- **THEN** system displays all class members with their join dates

#### Scenario: Remove a student
- **WHEN** teacher removes a student from the class
- **THEN** system removes the student from the class member list
