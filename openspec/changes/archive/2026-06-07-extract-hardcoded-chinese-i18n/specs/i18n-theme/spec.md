## MODIFIED Requirements

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
