## ADDED Requirements

### Requirement: CORS enabled on NestJS application

The system SHALL enable CORS middleware on the NestJS application so that cross-origin requests receive appropriate `Access-Control-Allow-*` response headers.

#### Scenario: Cross-origin request from allowed origin

- **WHEN** a browser sends a cross-origin request from an origin listed in `CORS_ORIGINS`
- **THEN** the response includes `Access-Control-Allow-Origin` set to the requesting origin, and `Access-Control-Allow-Credentials: true`

#### Scenario: Preflight OPTIONS request

- **WHEN** a browser sends a preflight OPTIONS request from an allowed origin
- **THEN** the system responds with appropriate `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, and `Access-Control-Allow-Origin` headers, with a successful status

#### Scenario: Request from disallowed origin

- **WHEN** a browser sends a cross-origin request from an origin not listed in `CORS_ORIGINS`
- **THEN** the response does not include `Access-Control-Allow-Origin` for that origin, and the browser blocks the response

### Requirement: Configurable allowed origins via environment variable

The system SHALL read the list of allowed CORS origins from the `CORS_ORIGINS` environment variable as a comma-separated list of URLs.

#### Scenario: Multiple origins configured

- **WHEN** `CORS_ORIGINS` is set to `https://app.example.com,https://admin.example.com`
- **THEN** requests from either origin are allowed, and other origins are rejected

#### Scenario: Single origin configured

- **WHEN** `CORS_ORIGINS` is set to `https://app.example.com`
- **THEN** only requests from that origin are allowed

### Requirement: Development default allows localhost

The system SHALL default to allowing `http://localhost:8080` as a CORS origin when `NODE_ENV` is `development` and `CORS_ORIGINS` is not set.

#### Scenario: Dev environment with no CORS_ORIGINS set

- **WHEN** `NODE_ENV` is `development` and `CORS_ORIGINS` is not defined
- **THEN** requests from `http://localhost:8080` are allowed

### Requirement: Production requires explicit configuration

The system SHALL default to an empty origin list (rejecting all cross-origin requests) when `NODE_ENV` is not `development` and `CORS_ORIGINS` is not set.

#### Scenario: Production with no CORS_ORIGINS set

- **WHEN** `NODE_ENV` is `production` and `CORS_ORIGINS` is not defined
- **THEN** no cross-origin requests are allowed

### Requirement: Credentials support for JWT

The system SHALL enable CORS credentials (`Access-Control-Allow-Credentials: true`) and allow the `Authorization` header so that JWT tokens can be sent cross-origin.

#### Scenario: Cross-origin request with Bearer token

- **WHEN** a cross-origin request includes an `Authorization: Bearer <token>` header from an allowed origin
- **THEN** the request is processed normally, and the response includes `Access-Control-Allow-Credentials: true`

### Requirement: Environment variable documented

The system SHALL document the `CORS_ORIGINS` environment variable in `.env.example` with format description and examples.

#### Scenario: .env.example includes CORS_ORIGINS

- **WHEN** a developer reads `.env.example`
- **THEN** they find `CORS_ORIGINS` with a comment explaining the format (comma-separated URLs) and a commented-out example
