## ADDED Requirements

### Requirement: Cache memory management

Judge Worker SHALL implement LRU (Least Recently Used) eviction strategy for all in-memory caches to prevent unbounded memory growth. The system SHALL provide a configurable maximum cache size with a default of 1000 entries. When the cache reaches the maximum size, the least recently accessed entry SHALL be evicted to make room for new entries.

#### Scenario: Cache eviction on capacity

- **WHEN** the cache reaches the configured maximum size and a new entry needs to be added
- **THEN** the least recently accessed entry is removed from the cache
- **AND** the new entry is added to the cache

#### Scenario: Cache hit updates access order

- **WHEN** a cached entry is accessed (read)
- **THEN** that entry becomes the most recently accessed
- **AND** it will be evicted last among current entries

#### Scenario: Configurable cache size

- **WHEN** the operator sets the `JUDGE_CACHE_MAX_SIZE` environment variable
- **THEN** the cache uses the specified value as the maximum number of entries
- **AND** if not set, the cache defaults to 1000 entries

#### Scenario: Memory bounded operation

- **WHEN** the Judge Worker processes many problems over time
- **THEN** the cache memory usage remains bounded and does not grow indefinitely
- **AND** the system does not experience OOM due to cache growth
