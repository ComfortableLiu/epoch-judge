## ADDED Requirements

### Requirement: Bilingual UI

The web application SHALL support Simplified Chinese and English and SHALL allow the user to switch language with persistence across sessions. All user-facing text in the web application MUST be externalized to i18n translation files and accessed via the t() function. Hardcoded strings in component code are PROHIBITED.

#### Scenario: Switch to English

- **WHEN** a user selects English in language settings
- **THEN** UI strings render in English on subsequent pages until changed

#### Scenario: Switch to Chinese

- **WHEN** a user selects Simplified Chinese in language settings
- **THEN** UI strings render in Chinese on subsequent pages until changed

#### Scenario: No hardcoded strings

- **WHEN** a developer reviews component source code
- **THEN** all user-facing text strings are wrapped in t() function calls with translation keys
- **AND** no hardcoded Chinese or English text appears in JSX markup

#### Scenario: Translation completeness

- **WHEN** a new translation key is added to zh-CN.json
- **THEN** a corresponding key MUST be added to en-US.json with English translation
- **AND** missing translations SHALL be flagged during build or lint process

### Requirement: Theme modes

The web application SHALL support light theme, dark theme, and follow-system theme modes with persistence across sessions.

#### Scenario: Dark theme selected

- **WHEN** a user selects dark theme
- **THEN** the application applies dark styling immediately and on future visits

#### Scenario: Follow system theme

- **WHEN** a user selects follow-system and the OS prefers dark color scheme
- **THEN** the application applies dark styling without manual dark selection

### Requirement: Backend locale for user-facing messages

API error and validation messages exposed to the web client SHALL be localizable based on a locale header or query parameter agreed in API documentation.

#### Scenario: Localized API error

- **WHEN** a client requests an endpoint with locale `en-US` and a validation error occurs
- **THEN** the error message body is returned in English where translations exist
