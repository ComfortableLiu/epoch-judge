## ADDED Requirements

### Requirement: TypeScript codebase

All application and shared package source code SHALL be written in TypeScript with strict type checking enabled in the workspace.

#### Scenario: Build TypeScript workspace

- **WHEN** a developer runs the workspace build command
- **THEN** api, web, judge, and shared packages compile without type errors

### Requirement: Yarn 4 workspace monorepo

The project SHALL use Yarn 4 or newer as the package manager and organize code as a workspace monorepo with at least `apps/api`, `apps/web`, `apps/judge`, and shared packages.

#### Scenario: Install from repository root

- **WHEN** a developer runs `yarn install` at the repository root
- **THEN** all workspace packages resolve dependencies from a single lockfile

### Requirement: Node.js runtime version

The project SHALL require Node.js version 18 or newer and SHALL declare the constraint in root `package.json` engines.

#### Scenario: Unsupported Node version

- **WHEN** a user runs tooling with Node.js 16
- **THEN** install or deploy scripts exit with a clear version requirement message

### Requirement: IconPark icons

The web application SHALL use the official IconPark React icon library (`@icon-park/react`) as the primary icon set for navigation and actions.

#### Scenario: Render navigation icon

- **WHEN** the main navigation renders an icon
- **THEN** the icon component is imported from the IconPark official React package

### Requirement: Health and configuration

Each deployable service SHALL expose a health endpoint and load configuration from environment variables with documented defaults for local development.

#### Scenario: API health check

- **WHEN** an operator requests the API health endpoint
- **THEN** the response indicates database and Redis connectivity status

### Requirement: API versioning

Public HTTP APIs SHALL be served under `/api/v1` with OpenAPI documentation generated from the NestJS application.

#### Scenario: API discovery

- **WHEN** a client opens the documented OpenAPI URL
- **THEN** available endpoints and schemas are listed for integration

### Requirement: No Tailwind CSS

The frontend build SHALL NOT include Tailwind CSS or utility-first CSS frameworks equivalent to Tailwind.

#### Scenario: Dependency audit

- **WHEN** the web package dependencies are installed
- **THEN** `tailwindcss` and `@tailwindcss/*` are absent from the dependency tree

### Requirement: One-click deployment

The project SHALL provide a single deployment entrypoint script that installs dependencies, builds artifacts, applies database migrations, and starts all required services without manual packaging steps by the operator.

#### Scenario: Fresh machine deploy

- **WHEN** an operator runs the documented one-click deploy command on a machine with Docker available
- **THEN** MySQL, Redis, API, web, and judge services start and the script prints the site URL when healthy

#### Scenario: No manual frontend build step

- **WHEN** an operator completes one-click deploy successfully
- **THEN** the operator was not required to run separate manual build commands beyond the deploy entrypoint

### Requirement: Default single-machine judge deployment

The default deployment configuration SHALL run exactly one judge worker on the same deployment host as the API unless the operator explicitly enables multi-worker scaling.

#### Scenario: Default compose profile

- **WHEN** an operator deploys using default environment from the deploy script
- **THEN** the running stack includes one judge worker service replica co-located with the API stack

### Requirement: Homepage announcement banner area

The user-facing homepage SHALL include a dedicated area at the top for displaying the announcement banner component.

#### Scenario: Banner area renders on homepage

- **WHEN** a user visits the homepage
- **THEN** the announcement banner area is rendered above the main content area
