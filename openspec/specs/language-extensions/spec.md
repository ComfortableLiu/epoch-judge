## ADDED Requirements

### Requirement: System supports Go language
The system SHALL support compiling and running Go programs.

#### Scenario: Submit Go solution
- **WHEN** user submits a Go program
- **THEN** system compiles with `go build` and executes the binary

### Requirement: System supports Rust language
The system SHALL support compiling and running Rust programs.

#### Scenario: Submit Rust solution
- **WHEN** user submits a Rust program
- **THEN** system compiles with `rustc` and executes the binary

### Requirement: System supports Kotlin language
The system SHALL support compiling and running Kotlin programs.

#### Scenario: Submit Kotlin solution
- **WHEN** user submits a Kotlin program
- **THEN** system compiles with `kotlinc` and executes with `kotlin`

### Requirement: New languages appear in language selector
The system SHALL display new languages in the submission language selector.

#### Scenario: View language options
- **WHEN** user opens the language dropdown
- **THEN** system displays Go, Rust, and Kotlin alongside existing languages
