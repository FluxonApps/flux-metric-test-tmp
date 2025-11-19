# Quick Start Guide - BigQuery PR Data Storage with AI Detection

## What Was Implemented

A complete BigQuery integration system that extracts and stores PR data with AI detection when a pull request is edited. The system tracks immutable events and manages users, repositories, and repository membership.

## Key Components

1. **BigQuery Service** (`services/bigquery-service.js`)
   - Handles table creation and data insertion
   - Automatic table initialization
   - Error handling and query support

2. **Data Extractor** (`services/data-extractor.js`)
   - Fetches PR data, commits, comments, reviews
   - Extracts user and repository information
   - Creates immutable events for all text content
   - Handles GitHub API pagination

3. **PR Data Service** (`services/pr-data-service.js`)
   - Orchestrates data extraction and storage
   - Manages table initialization
   - Handles deduplication using `x-github-delivery` header
   - Runs AI detection on text content
   - Manages users, repos, and repo_members with upsert logic

4. **Schemas** (`services/schemas.js`)
   - Complete BigQuery table schemas
   - Optimized with partitioning and clustering
   - Ready for extensibility

5. **AI Tags Config** (`config/ai-tags.js`)
   - Defines all AI tags and detection patterns
   - Centralized configuration for AI detection

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create a `.env` file with:
```bash
# Existing
APP_ID=your_app_id
WEBHOOK_SECRET=your_webhook_secret
PRIVATE_KEY_PATH=path/to/private-key.pem

# New - BigQuery
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
BIGQUERY_DATASET_ID=github_metrics  # Optional, defaults to 'github_metrics'
```

### 3. Authenticate with GCP
```bash
# Option 1: Application Default Credentials (recommended)
gcloud auth application-default login

# Option 2: Service Account Key
export GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

### 4. Run the Server
```bash
npm run server
```

## What Happens When a PR is Edited

1. **Webhook Received**: GitHub sends PR edited event with `x-github-delivery` header
2. **Deduplication**: System checks if event was already processed
3. **Data Extraction**:
   - PR metadata and metrics (commits_count, files_changed, lines_added, lines_deleted, lead_time)
   - All commits (for event creation)
   - All issue comments (for event creation)
   - All review comments (for event creation)
   - All reviews (for event creation)
   - Repository collaborators
4. **User & Repo Management**:
   - Adds new users if they don't exist
   - Adds new repos if they don't exist
   - Updates repo_members status (active/inactive)
5. **Event Creation**: Creates immutable events for all text content
6. **AI Detection**: Runs AI detection on all text content using configured patterns
7. **Storage**: Stores data in BigQuery tables

## Data Stored

### Tables Created:

1. **`pull_requests`** - Main PR information
   - PR metadata (title, body, author_id, author_login)
   - Metrics (commits_count, files_changed, lines_added, lines_deleted, lead_time)
   - Timestamps (created_at, updated_at, closed_at, merged_at, first_review_at)
   - AI detection summary (is_ai_used, ai_event_ids)

2. **`pr_events`** - Immutable event tracking
   - All text content changes (title, body, commits, comments, reviews)
   - AI detection results (ai_used, ai_source array, ai_tag array)
   - Uses `x-github-delivery` for deduplication

3. **`users`** - GitHub user information
   - Basic user data (user_id, login, name, email, etc.)
   - Automatically added when first seen

4. **`repos`** - Repository information
   - Repo metadata (name, full_name, visibility, owner info)
   - Automatically added when first seen

5. **`repo_members`** - Repository membership
   - Tracks users who are part of repositories
   - Status: active/inactive
   - Automatically updated based on current collaborators

## Testing

1. Edit a pull request in your repository
2. Check server logs for processing confirmation
3. Query BigQuery to verify data:

```sql
-- View recent PRs
SELECT * FROM `github_metrics.pull_requests` 
ORDER BY event_timestamp DESC 
LIMIT 10;

-- View events with AI detection
SELECT * FROM `github_metrics.pr_events`
WHERE ai_used = true
ORDER BY created_at DESC
LIMIT 10;

-- Check users
SELECT * FROM `github_metrics.users`
ORDER BY updated_at DESC
LIMIT 10;
```

## Key Features

### Deduplication
- Uses `x-github-delivery` header from GitHub webhook
- Prevents duplicate event processing
- Events are immutable once created

### AI Detection
- Keyword-based detection using configured patterns
- Detects multiple AI tools in same text
- Stores results as arrays (ai_tag, ai_source)
- Configurable via `config/ai-tags.js`

### User & Repo Management
- Automatic upsert for users and repos
- Tracks repository membership with status
- Updates member status based on current collaborators

### Lead Time Calculation
- Automatically calculates `lead_time` in hours
- Formula: `(merged_at - created_at)` in hours
- Null if PR is not merged

## Next Steps

1. Review `README_BIGQUERY_SETUP.md` for detailed setup
2. Review `FINAL_SCHEMA_CHANGES.md` for schema details
3. Customize AI tags in `config/ai-tags.js` if needed
4. Add additional event handlers (opened, closed, merged, etc.)

## Extending the System

To add new data sources or tables:

1. Add extraction method in `data-extractor.js`
2. Add schema in `schemas.js`
3. Update `extractAllPRData()` to include new data
4. Update `storeData()` or `processUsersAndRepos()` to insert new data

See `README_BIGQUERY_SETUP.md` for detailed extensibility guide.
