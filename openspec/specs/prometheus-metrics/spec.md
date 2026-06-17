# Prometheus Metrics

## Requirements

### Requirement: System exposes metrics endpoint
The system SHALL expose a Prometheus-compatible metrics endpoint.

#### Scenario: Scrape metrics
- **WHEN** Prometheus server requests GET /metrics
- **THEN** system returns metrics in Prometheus exposition format

### Requirement: System tracks HTTP metrics
The system SHALL collect HTTP request metrics.

#### Scenario: Record HTTP request
- **WHEN** an HTTP request completes
- **THEN** system records request count, duration histogram, and status code

### Requirement: System tracks judge metrics
The system SHALL collect judge-related metrics.

#### Scenario: Record judge metrics
- **WHEN** a judge task completes
- **THEN** system records queue depth, judge latency, success rate, and worker count
