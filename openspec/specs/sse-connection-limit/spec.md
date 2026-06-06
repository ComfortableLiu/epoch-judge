## Purpose

SSE 长连接的用户级并发限制能力，防止恶意用户批量建立连接耗尽资源。

## Requirements

### Requirement: Per-user SSE connection limit

The system SHALL enforce a maximum number of concurrent SSE connections per user, rejecting or evicting connections when the limit is exceeded.

#### Scenario: User within connection limit

- **WHEN** a user with fewer than the maximum allowed SSE connections opens a new SSE stream
- **THEN** the connection is established successfully

#### Scenario: User exceeds connection limit

- **WHEN** a user already at the maximum SSE connection limit opens a new SSE stream
- **THEN** the system closes the user's oldest existing connection and establishes the new one

#### Scenario: Multiple users independently limited

- **WHEN** two different users each open SSE connections
- **THEN** each user's connection count is tracked independently, and one user's limit does not affect the other

### Requirement: Configurable maximum connections

The system SHALL read the maximum SSE connections per user from the `SSE_MAX_CONNECTIONS_PER_USER` environment variable, defaulting to 3.

#### Scenario: Custom limit via environment variable

- **WHEN** `SSE_MAX_CONNECTIONS_PER_USER` is set to `5`
- **THEN** each user is allowed up to 5 concurrent SSE connections

#### Scenario: Default limit when not configured

- **WHEN** `SSE_MAX_CONNECTIONS_PER_USER` is not set
- **THEN** each user is allowed up to 3 concurrent SSE connections

### Requirement: Redis-backed connection tracking

The system SHALL track SSE connection counts in Redis to support multi-instance API deployments.

#### Scenario: Connection tracked across instances

- **WHEN** a user opens an SSE connection on API instance A and another on instance B
- **THEN** both connections are counted toward the user's limit, and the limit is enforced globally

#### Scenario: Oldest connection evicted across instances

- **WHEN** a user's oldest connection is on instance A and a new connection attempt arrives on instance B exceeding the limit
- **THEN** instance A closes the oldest connection in response to a Redis signal

### Requirement: Automatic cleanup on connection close

The system SHALL remove the connection from Redis tracking when the SSE connection closes, for any reason.

#### Scenario: Normal connection close

- **WHEN** an SSE stream completes normally (e.g., submission judged, `type: 'done'` received)
- **THEN** the connection entry is removed from Redis and the local connection map

#### Scenario: Client disconnects

- **WHEN** the client closes the browser or network connection drops
- **THEN** the connection entry is eventually removed from Redis (via teardown handler or TTL expiry)

#### Scenario: Evicted connection cleanup

- **WHEN** a connection is evicted due to the user exceeding the limit
- **THEN** the connection entry is removed from Redis after the evicted connection is closed

### Requirement: Crash-safe TTL expiry

The system SHALL set a TTL on Redis connection tracking entries so that connections from crashed instances are automatically cleaned up.

#### Scenario: Instance crashes with active connections

- **WHEN** an API instance crashes without cleaning up its Redis connection entries
- **THEN** the entries expire automatically after the TTL, and the user's connection count returns to accurate

### Requirement: Connection limit applies to SSE endpoint only

The system SHALL apply connection limiting only to the SSE stream endpoint (`/submissions/:number/stream`), not to other submission endpoints.

#### Scenario: Non-SSE endpoints unaffected

- **WHEN** a user calls `GET /submissions` or `POST /submissions`
- **THEN** the request is not subject to SSE connection limiting
