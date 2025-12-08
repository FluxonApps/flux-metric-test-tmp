# Final Schema Changes - AI Detection Focus

## Overview

The system has been redesigned to focus exclusively on AI detection in PR text content with immutable event tracking, deduplication, and user/repository management.

## Key Changes

### ✅ Added Fields to `pull_requests`

1. **PR Metrics**:
   - `first_review_at` (TIMESTAMP) - When first review was submitted
   - `merged_at` (TIMESTAMP) - When PR was merged
   - `closed_at` (TIMESTAMP) - When PR was closed
   - `commits_count` (INTEGER) - Number of commits
   - `files_changed` (INTEGER) - Number of files changed
   - `lines_added` (INTEGER) - Lines added
   - `lines_deleted` (INTEGER) - Lines deleted
   - `merge_commit_sha` (STRING) - SHA of merge commit
   - `lead_time` (FLOAT) - Lead time in hours: (merged_at - created_at)

2. **Author Fields** (renamed from user):
   - `author_id` (INTEGER) - PR author ID
   - `author_login` (STRING) - PR author login

3. **AI Detection Fields**:
   - `is_ai_used` (BOOLEAN) - Whether AI was detected anywhere in PR
   - `ai_event_ids` (STRING[], REPEATED) - Array of event IDs where AI was detected

### ✅ Removed Tables

The following tables are **no longer stored separately**:
- `commits` - Commit data not stored separately (only in events)
- `issue_comments` - Comment data not stored separately (only in events)
- `review_comments` - Review comment data not stored separately (only in events)
- `reviews` - Review data not stored separately (only in events)
- `commit_files` - File data not needed
- `ai_tag_dependencies` - Dependency tracking removed

### ✅ New Tables Added

1. **`users`** - GitHub user information
   - Fields: user_id, login, node_id, avatar_url, html_url, type, name, email, created_at, updated_at
   - Clustered by: user_id
   - Upsert: Automatically adds new users

2. **`repos`** - Repository information
   - Fields: repository_id, name, full_name, visibility (public/private), owner info, timestamps
   - Clustered by: repository_id, full_name
   - Upsert: Automatically adds new repos

3. **`repo_members`** - Repository membership tracking
   - Fields: repository_id, user_id, status (active/inactive), role, permissions, timestamps
   - Clustered by: repository_id, user_id, status
   - Status Management: Tracks active/inactive members automatically

### ✅ Updated `pr_events` Table

**Immutable Events** - All events are stored and never updated:
- `event_id` (STRING, REQUIRED) - Uses `x-github-delivery` header for deduplication
- Events are created for every text content change
- Events are never modified once created

**AI Detection Fields**:
- `ai_used` (BOOLEAN, REQUIRED) - Whether AI was detected in this event
- `ai_source` (STRING[], REPEATED) - Array of sources: `commits`, `issue_comments`, `review_comments`, `reviews`, `pr_title`, `pr_body`
- `ai_tag` (STRING[], REPEATED) - Array of AI tags detected (e.g., 'copilot', 'chatgpt-4', 'claude')
- `ai_detection_timestamp` (TIMESTAMP) - When AI was detected

**Note**: `ai_confidence` field was removed. `ai_source` and `ai_tag` are arrays to support multiple detections.

### ✅ Deduplication

- Uses `x-github-delivery` header from GitHub webhook
- Checks for existing events before processing
- Prevents duplicate event processing
- Events are immutable once created

### ✅ AI Tags Configuration

Created `config/ai-tags.js` with:
- **AI_TAGS**: Constants for all supported AI tags
  - Copilot: `copilot`, `copilot-chat`, `copilot-pr-description`
  - ChatGPT: `chatgpt`, `chatgpt-3.5`, `chatgpt-4`, `chatgpt-4-turbo`
  - Claude: `claude`, `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`
  - Others: `bard`, `gemini`, `perplexity`, `cursor`, `ai-assisted`, `ai-generated`, `unknown-ai`

- **AI_TAG_PATTERNS**: Keyword patterns for detection
- **AI_SOURCES**: Source types
  - `commits`, `issue_comments`, `review_comments`, `reviews`, `pr_title`, `pr_body`

## Data Flow

1. **Webhook Received**:
   - Extract `x-github-delivery` header
   - Check for duplicate event using delivery ID

2. **Data Extraction**:
   - Extract PR data with metrics and lead time calculation
   - Fetch commits, comments, reviews (for event creation only)
   - Fetch repository collaborators
   - Extract user and repository information

3. **User & Repo Management**:
   - Check if users exist → add new ones
   - Check if repo exists → add if new
   - Update repo_members status (active/inactive) based on current collaborators

4. **Event Creation**:
   - Create immutable events for all text content
   - Each event uses delivery ID for deduplication

5. **AI Detection**:
   - Run AI detection on all events using configured patterns from `ai-tags.js`
   - Populate `ai_used`, `ai_source` (array), `ai_tag` (array) in events
   - Update `is_ai_used` and `ai_event_ids` in PR data

6. **Storage**:
   - Store `pull_requests` record
   - Store all `pr_events` (immutable)
   - Users, repos, and repo_members are handled separately with upsert logic

## Event Creation

Events are created for:
- PR title changes
- PR body changes
- Commit messages (one event per commit)
- Issue comments (one event per comment)
- Review comments (one event per comment)
- Review bodies (one event per review with body)

Each event includes:
- `event_id`: Based on delivery ID + content identifier
- `content_text`: The actual text content
- `content_text_previous`: Previous text (for edits)
- `ai_used`: AI detection result (boolean)
- `ai_source`: Array of sources where AI was detected
- `ai_tag`: Array of AI tags detected

## Example Event Structure

```javascript
{
  event_id: "abc123-def456-title",
  pr_id: 123,
  pr_number: 5,
  repository_full_name: "owner/repo",
  event_type: "edited",
  event_subtype: "title_changed",
  content_type: "pr_title",
  content_id: "pr-123",
  content_text: "Fix bug using AI",
  content_text_previous: "Fix bug",
  actor_id: 456,
  actor_login: "user",
  created_at: "2025-01-20T10:00:00Z",
  ai_used: true,
  ai_source: ["pr_title"],
  ai_tag: ["copilot", "chatgpt-4"],
  ai_detection_timestamp: "2025-01-20T10:00:01Z"
}
```

## PR Data Structure

```javascript
{
  pr_id: 123,
  number: 5,
  repository_full_name: "owner/repo",
  title: "Fix bug using AI",
  body: "This PR uses AI assistance",
  author_id: 456,
  author_login: "user",
  commits_count: 3,
  files_changed: 5,
  lines_added: 100,
  lines_deleted: 20,
  lead_time: 52.5, // hours (merged_at - created_at)
  is_ai_used: true,
  ai_event_ids: ["abc123-def456-title", "abc123-def456-body"]
}
```

## User & Repository Management

### Users Table
- Automatically adds users when first seen in PRs
- Fields: user_id, login, node_id, avatar_url, html_url, type, name, email, timestamps
- Upsert logic: Only adds if user doesn't exist

### Repos Table
- Automatically adds repos when first seen
- Fields: repository_id, name, full_name, visibility (public/private), owner info, timestamps
- Upsert logic: Only adds if repo doesn't exist

### Repo Members Table
- Tracks users who are part of repositories
- Status: `active` (current collaborator) or `inactive` (no longer collaborator)
- Automatically updates status based on current collaborators list
- Uses append-only approach (BigQuery best practice)
- Latest status determined by `last_seen_at` timestamp

## Benefits

1. **Immutable Events**: Complete audit trail, no data loss
2. **Deduplication**: Prevents duplicate processing using GitHub delivery ID
3. **Focused Storage**: Only stores what's needed for AI detection and metrics
4. **Event Tracking**: Every text change is tracked with AI detection
5. **Flexible AI Tags**: Easy to add new AI tools via config
6. **Efficient Queries**: Can query events by AI tag, source, or PR
7. **User/Repo Management**: Automatic tracking of users and repositories
8. **Status Tracking**: Repository membership status management
9. **Metrics**: PR metrics including lead time automatically calculated

## Next Steps

1. **Implement Real AI Detection**:
   - Replace keyword-based detection with actual AI detection service
   - Use ML models or API services for accurate detection

2. **Add More Event Types**:
   - Handle comment edited events
   - Handle comment deleted events
   - Handle commit amended events

3. **Analytics**:
   - Query events to analyze AI usage patterns
   - Track AI usage over time
   - Generate reports on AI-assisted PRs
   - Analyze lead time and other metrics trends

## Table Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `pull_requests` | PR information with metrics | pr_id, author_id, author_login, metrics, lead_time, is_ai_used, ai_event_ids |
| `pr_events` | Immutable events with AI detection | event_id, content_text, ai_used, ai_source[], ai_tag[] |
| `users` | GitHub user information | user_id, login, name, email |
| `repos` | Repository information | repository_id, full_name, visibility |
| `repo_members` | Repository membership | repository_id, user_id, status (active/inactive) |
