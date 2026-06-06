## Purpose

API 核心模块的单元测试与集成测试套件，基于 Jest + @nestjs/testing + supertest。

## Requirements

### Requirement: Jest test environment configured for API

The system SHALL have a working Jest test environment configured for the `apps/api` package, with `ts-jest` handling TypeScript compilation and decorator metadata.

#### Scenario: Jest runs TypeScript unit tests

- **WHEN** a developer runs `yarn test` in `apps/api`
- **THEN** Jest discovers and executes all `*.spec.ts` files under `src/` using `ts-jest`, with decorator metadata preserved

#### Scenario: Jest configuration isolates test compilation

- **WHEN** tests are compiled
- **THEN** a dedicated `tsconfig.spec.json` is used that enables `emitDecoratorMetadata` and `experimentalDecorators` without affecting the production build

### Requirement: Mock PrismaService factory

The system SHALL provide a shared mock factory that creates a mock `PrismaService` with jest mock functions for all Prisma model operations used by the core services.

#### Scenario: Mock PrismaService available in tests

- **WHEN** a test file imports the mock factory and creates a testing module
- **THEN** the mock `PrismaService` is injected into the service under test, and Prisma client methods (e.g., `user.findUnique`, `contest.create`) are jest mock functions that can be configured per test

#### Scenario: Mock returns are configurable per test

- **WHEN** a test sets up `mockPrisma.client.user.findUnique.mockResolvedValue(mockUser)`
- **THEN** the service under test receives that mock user when it calls `this.prisma.client.user.findUnique()`

### Requirement: Auth module unit tests

The system SHALL have unit tests for `AuthService` covering registration, login, token refresh, and error paths.

#### Scenario: Successful registration

- **WHEN** `register()` is called with a unique username and valid password
- **THEN** the service hashes the password, creates the user via Prisma, and returns an access token and user object

#### Scenario: Duplicate username rejected

- **WHEN** `register()` is called with a username that already exists and does not require password reset
- **THEN** the service throws a `ConflictException`

#### Scenario: Password reset takeover via register

- **WHEN** `register()` is called with a username that has `mustResetPassword` set
- **THEN** the service updates the password, clears the reset flag, and returns tokens

#### Scenario: Successful login

- **WHEN** `login()` is called with correct credentials
- **THEN** the service returns an access token and user object

#### Scenario: Login with wrong password

- **WHEN** `login()` is called with an incorrect password
- **THEN** the service throws an `UnauthorizedException`

#### Scenario: Login with non-existent username

- **WHEN** `login()` is called with a username that does not exist
- **THEN** the service throws an `UnauthorizedException`

#### Scenario: Login blocked while reset pending

- **WHEN** `login()` is called for a user with `mustResetPassword` set
- **THEN** the service throws an `UnauthorizedException`

#### Scenario: Token refresh with valid token

- **WHEN** `refresh()` is called with a valid (possibly expired but within grace period) Bearer token
- **THEN** the service returns a new access token

#### Scenario: Token refresh with expired token beyond grace period

- **WHEN** `refresh()` is called with a token expired beyond the 30-day grace period
- **THEN** the service throws an `UnauthorizedException`

#### Scenario: Token refresh with missing authorization header

- **WHEN** `refresh()` is called with `undefined` authorization
- **THEN** the service throws an `UnauthorizedException`

### Requirement: Problems module unit tests

The system SHALL have unit tests for `ProblemsService` covering CRUD operations and access control.

#### Scenario: List public problems

- **WHEN** `list()` is called without a user
- **THEN** the service returns only public problems

#### Scenario: Create problem

- **WHEN** `create()` is called with valid problem data
- **THEN** the service creates the problem via Prisma and returns the created problem

#### Scenario: Get problem by number

- **WHEN** `getByNumber()` is called with a valid problem number
- **THEN** the service returns the problem details with testcases

#### Scenario: Get problem by non-existent number

- **WHEN** `getByNumber()` is called with a number that does not exist
- **THEN** the service throws a `NotFoundException`

#### Scenario: Update problem

- **WHEN** `update()` is called with valid update data
- **THEN** the service updates the problem via Prisma

### Requirement: Submissions module unit tests

The system SHALL have unit tests for `SubmissionsService` covering submission creation and retrieval.

#### Scenario: Create submission with valid data

- **WHEN** `create()` is called with a valid submission DTO, authenticated user, and the problem exists
- **THEN** the service creates the submission and enqueues it for judging

#### Scenario: Create submission for non-existent problem

- **WHEN** `create()` is called with a problem ID that does not exist
- **THEN** the service throws a `NotFoundException`

#### Scenario: List submissions for user

- **WHEN** `listForUser()` is called with a user ID
- **THEN** the service returns submissions belonging to that user

#### Scenario: Get submission detail by number

- **WHEN** `getDetailByNumber()` is called with a valid submission number
- **THEN** the service returns the submission details

### Requirement: Contests module unit tests

The system SHALL have unit tests for `ContestsService` covering CRUD, registration, password verification, and access control.

#### Scenario: Create contest with password

- **WHEN** `createAdmin()` is called with contest data including an access password
- **THEN** the service stores the contest (with password) and returns the created contest

#### Scenario: Create contest with invalid time range

- **WHEN** `createAdmin()` is called with `endAt` before `startAt`
- **THEN** the service throws a `BadRequestException`

#### Scenario: Verify contest password with correct password

- **WHEN** `verifyPassword()` is called with the correct password for a contest
- **THEN** the service marks the registration as password-verified and returns `{ ok: true }`

#### Scenario: Verify contest password with incorrect password

- **WHEN** `verifyPassword()` is called with an incorrect password
- **THEN** the service throws a `ForbiddenException`

#### Scenario: Verify password for contest without password

- **WHEN** `verifyPassword()` is called for a contest that has no password
- **THEN** the service returns `{ ok: true }` without comparison

#### Scenario: Delete contest with existing submissions

- **WHEN** `deleteAdmin()` is called for a contest that has submissions
- **THEN** the service throws a `BadRequestException`

#### Scenario: Contest access check with password-required contest

- **WHEN** `hasContestEntryAccess()` is called for a contest with a password and the user has no verified registration
- **THEN** the service returns `false`

### Requirement: Test script integration

The system SHALL provide test scripts that can be run from the monorepo root and from the API package.

#### Scenario: Run API unit tests from API package

- **WHEN** a developer runs `yarn test` in `apps/api`
- **THEN** all unit tests are discovered and executed

#### Scenario: Run all tests from monorepo root

- **WHEN** a developer runs `yarn test` from the monorepo root
- **THEN** the storage tests and API unit tests are both executed
