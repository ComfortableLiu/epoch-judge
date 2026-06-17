## ADDED Requirements

### Requirement: All API endpoints have documentation
The system SHALL have Swagger documentation for all API endpoints.

#### Scenario: View API docs
- **WHEN** developer visits /api/docs
- **THEN** system displays Swagger UI with all endpoints grouped by module

### Requirement: Endpoints have descriptions and examples
All API endpoints SHALL have operation descriptions and request/response examples.

#### Scenario: View endpoint details
- **WHEN** developer expands an endpoint in Swagger UI
- **THEN** system shows description, parameters, request body schema, and response examples

### Requirement: Auth endpoints document token flow
Authentication endpoints SHALL document the JWT token flow.

#### Scenario: View auth documentation
- **WHEN** developer views the Auth section in Swagger
- **THEN** system shows login, register, and refresh token endpoints with token format
