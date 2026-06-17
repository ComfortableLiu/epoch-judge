## ADDED Requirements

### Requirement: Helm Chart deploys all components
The Helm Chart SHALL deploy API, Web, Judge Worker, and optionally MySQL and Redis.

#### Scenario: Install with default values
- **WHEN** user runs `helm install epoch-judge`
- **THEN** system deploys API, Web, and Judge Worker with default configuration

### Requirement: Helm Chart supports external database
The Helm Chart SHALL support connecting to external MySQL and Redis instances.

#### Scenario: Install with external database
- **WHEN** user sets external MySQL and Redis connection strings in values.yaml
- **THEN** system deploys without internal MySQL and Redis StatefulSets

### Requirement: Helm Chart supports Judge Worker scaling
The Helm Chart SHALL support horizontal scaling of Judge Workers.

#### Scenario: Scale Judge Workers
- **WHEN** user sets judge replica count in values.yaml
- **THEN** system deploys the specified number of Judge Worker replicas
