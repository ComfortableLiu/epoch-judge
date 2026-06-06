## ADDED Requirements

### Requirement: Global default rate limit

The system SHALL enforce a default rate limit on all HTTP API endpoints, limiting each client IP to a configurable number of requests within a configurable time window.

#### Scenario: Request within default limit

- **WHEN** a client makes requests to any API endpoint within the default rate limit
- **THEN** the requests are processed normally and succeed

#### Scenario: Default rate limit exceeded

- **WHEN** a client exceeds the default rate limit (default: 60 requests per 60 seconds) for any endpoint that does not have a custom limit
- **THEN** the system responds with HTTP 429 Too Many Requests

### Requirement: Authentication endpoint rate limit

The system SHALL enforce a stricter rate limit on the `/auth/login` and `/auth/register` endpoints, limiting each client IP to a configurable number of requests within the time window.

#### Scenario: Login request within limit

- **WHEN** a client makes login requests within the auth rate limit (default: 5 per 60 seconds)
- **THEN** the requests are processed normally

#### Scenario: Login rate limit exceeded

- **WHEN** a client exceeds the auth rate limit on `/auth/login`
- **THEN** the system responds with HTTP 429 Too Many Requests

#### Scenario: Register rate limit exceeded

- **WHEN** a client exceeds the auth rate limit on `/auth/register`
- **THEN** the system responds with HTTP 429 Too Many Requests

### Requirement: Submission endpoint rate limit

The system SHALL enforce a stricter rate limit on the `POST /submissions` endpoint, limiting each client IP to a configurable number of requests within the time window.

#### Scenario: Submission request within limit

- **WHEN** a client makes submission requests within the submission rate limit (default: 10 per 60 seconds)
- **THEN** the requests are processed normally

#### Scenario: Submission rate limit exceeded

- **WHEN** a client exceeds the submission rate limit on `POST /submissions`
- **THEN** the system responds with HTTP 429 Too Many Requests

### Requirement: SSE stream endpoint exemption

The system SHALL exempt the SSE stream endpoint (`/submissions/:number/stream`) from rate limiting to avoid counting long-lived connections as repeated requests.

#### Scenario: SSE stream not rate limited

- **WHEN** a client opens an SSE stream connection to `/submissions/:number/stream`
- **THEN** the connection is not subject to rate limiting and remains open until completed or disconnected

### Requirement: Configurable rate limit parameters

The system SHALL allow rate limit parameters to be configured via environment variables, including TTL, per-tier limits, storage backend, and an on/off switch.

#### Scenario: Custom TTL via environment variable

- **WHEN** the environment variable `THROTTLE_TTL` is set to a custom value (in seconds)
- **THEN** the system uses that value as the rate limit window for all tiers

#### Scenario: Custom auth limit via environment variable

- **WHEN** the environment variable `THROTTLE_AUTH_LIMIT` is set to a custom value
- **THEN** the system uses that value as the request limit for authentication endpoints within the TTL window

#### Scenario: Custom submission limit via environment variable

- **WHEN** the environment variable `THROTTLE_SUBMISSION_LIMIT` is set to a custom value
- **THEN** the system uses that value as the request limit for submission endpoints within the TTL window

#### Scenario: Rate limiting disabled via environment variable

- **WHEN** the environment variable `THROTTLE_ENABLED` is set to `false`
- **THEN** no rate limiting is applied to any endpoint

### Requirement: Trust proxy support

The system SHALL correctly identify the real client IP when deployed behind a reverse proxy (e.g., nginx), using the `X-Forwarded-For` header.

#### Scenario: Correct IP behind reverse proxy

- **WHEN** the system is deployed behind nginx and `TRUST_PROXY` is enabled (default)
- **THEN** rate limiting is applied per the real client IP from `X-Forwarded-For`, not the proxy IP

#### Scenario: Trust proxy disabled

- **WHEN** `TRUST_PROXY` is set to `false`
- **THEN** rate limiting uses the direct connection IP
