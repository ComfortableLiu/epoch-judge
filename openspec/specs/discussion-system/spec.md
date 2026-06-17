## ADDED Requirements

### Requirement: User can create discussion post
The system SHALL allow authenticated users to create discussion posts on problem detail pages.

#### Scenario: Create a question post
- **WHEN** user submits a post with type "question", title, and Markdown content
- **THEN** system creates the post, associates it with the problem, and displays it in the discussion tab

#### Scenario: Create a solution post
- **WHEN** user submits a post with type "solution" and Markdown content containing code blocks
- **THEN** system creates the post with syntax-highlighted code rendering

### Requirement: User can reply to discussion post
The system SHALL allow authenticated users to reply to any discussion post.

#### Scenario: Reply to a post
- **WHEN** user submits a reply with Markdown content on an existing post
- **THEN** system creates the reply and displays it under the parent post

### Requirement: User can vote on posts and replies
The system SHALL allow users to upvote posts and replies.

#### Scenario: Upvote a post
- **WHEN** user clicks the upvote button on a post
- **THEN** system increments the vote count and records the user's vote

#### Scenario: Remove upvote
- **WHEN** user clicks the upvote button again on a previously upvoted post
- **THEN** system decrements the vote count and removes the vote record

### Requirement: Discussion posts support sorting
The system SHALL support sorting discussion posts by time and popularity.

#### Scenario: Sort by latest
- **WHEN** user selects "Latest" sort option
- **THEN** system displays posts ordered by creation time descending

#### Scenario: Sort by votes
- **WHEN** user selects "Popular" sort option
- **THEN** system displays posts ordered by vote count descending

### Requirement: Admin can moderate discussions
The system SHALL allow administrators to pin and delete discussion posts.

#### Scenario: Pin a post
- **WHEN** admin clicks "Pin" on a post
- **THEN** the post appears at the top of the discussion list regardless of sort order

#### Scenario: Delete a post
- **WHEN** admin clicks "Delete" on a post
- **THEN** the post and all its replies are removed from the discussion
