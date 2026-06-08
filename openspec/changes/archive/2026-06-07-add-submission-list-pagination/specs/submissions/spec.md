## MODIFIED Requirements

### Requirement: Submission history

Users SHALL be able to list and view their past submissions including status, time, memory, score, and per-testcase results when available. The submission list SHALL support server-side pagination to allow browsing of complete submission history.

#### Scenario: View submission detail

- **WHEN** a user opens their submission detail page
- **THEN** overall verdict and per-testcase breakdown are shown for completed runs

#### Scenario: Paginated submission list

- **WHEN** a user requests their submission list
- **THEN** the API returns paginated results with metadata (total, page, limit, totalPages)

#### Scenario: Browse submission history

- **WHEN** a user navigates to different pages of their submission history
- **THEN** submissions from that page are displayed, ordered by creation time descending
