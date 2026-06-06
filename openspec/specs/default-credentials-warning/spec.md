## Purpose

启动时默认凭证检测与告警能力，防止部署后使用默认弱凭证。

## Requirements

### Requirement: Detect default credentials at startup

The system SHALL check whether critical environment variables are set to known default values during application startup.

#### Scenario: Default JWT_SECRET detected

- **WHEN** the application starts and `JWT_SECRET` equals `change-me-in-production`
- **THEN** the system outputs a warning identifying `JWT_SECRET` as a default value

#### Scenario: Default DB_PASSWORD detected

- **WHEN** the application starts and `DB_PASSWORD` equals `epoch_secret`
- **THEN** the system outputs a warning identifying `DB_PASSWORD` as a default value

#### Scenario: Default REDIS_PASSWORD detected

- **WHEN** the application starts and `REDIS_PASSWORD` equals `epoch_redis_secret`
- **THEN** the system outputs a warning identifying `REDIS_PASSWORD` as a default value

#### Scenario: Default SEED_ADMIN_PASSWORD detected

- **WHEN** the application starts and `SEED_ADMIN_PASSWORD` equals `admin123`
- **THEN** the system outputs a warning identifying `SEED_ADMIN_PASSWORD` as a default value

#### Scenario: All credentials customized

- **WHEN** the application starts and none of the checked environment variables are set to their known default values
- **THEN** the system does not output any credential warnings

### Requirement: Warning mode (default behavior)

The system SHALL output prominent warning logs when default credentials are detected and continue application startup normally.

#### Scenario: Startup continues with warnings

- **WHEN** one or more default credentials are detected and `ENFORCE_SECURE_CREDENTIALS` is not set to `true`
- **THEN** the system outputs colored warning messages to the console and proceeds with normal startup

### Requirement: Enforce mode (opt-in)

The system SHALL refuse to start when default credentials are detected and `ENFORCE_SECURE_CREDENTIALS` is set to `true`.

#### Scenario: Startup blocked by default credentials

- **WHEN** one or more default credentials are detected and `ENFORCE_SECURE_CREDENTIALS` is `true`
- **THEN** the system outputs error messages and exits with a non-zero exit code

#### Scenario: Enforce mode with all credentials customized

- **WHEN** `ENFORCE_SECURE_CREDENTIALS` is `true` and no default credentials are detected
- **THEN** the system starts normally

### Requirement: Prominent visual warnings

The system SHALL format credential warnings to be visually prominent in terminal output, using color and emphasis when the output is a TTY.

#### Scenario: Warning in terminal (TTY)

- **WHEN** default credentials are detected and stdout is a TTY
- **THEN** the warning messages use red/bold ANSI formatting for visibility

#### Scenario: Warning in non-TTY environment

- **WHEN** default credentials are detected and stdout is not a TTY (e.g., piped log aggregator)
- **THEN** the warning messages are output as plain text without ANSI codes

### Requirement: Documented .env.example

The system SHALL include comments in `.env.example` next to sensitive environment variables explaining that they must be changed before deployment.

#### Scenario: Comments present in .env.example

- **WHEN** a developer reads `.env.example`
- **THEN** they find comments next to `JWT_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD`, and `SEED_ADMIN_PASSWORD` explaining that default values must be changed for production
