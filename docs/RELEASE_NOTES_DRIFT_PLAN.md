# Release Notes Generation from Drift Detection

## Overview

This document outlines the plan for automatically generating release notes by detecting drifts (changes/differences) between environments, versions, and configurations.

---

## 1. What is Drift?

**Drift** refers to any difference between:
- Two versions of the same codebase
- Two environments (e.g., DEV vs SIT)
- Expected state vs actual state

### Types of Drift

| Drift Type | Source | Description |
|------------|--------|-------------|
| **Code Drift** | Git commits | Changes in application source code |
| **Config Drift** | Helm values, env vars | Changes in configuration values |
| **DB Drift** | Migration scripts | Schema and data changes |
| **Infra Drift** | Terraform state | Infrastructure changes |
| **Image Drift** | Docker registry | Container image version changes |
| **Dependency Drift** | package.json, pom.xml | Library/package version changes |

---

## 2. Drift Detection Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DRIFT DETECTION ENGINE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   Source    │    │   Target    │    │   Drift     │                 │
│  │   State     │ vs │   State     │ =  │   Report    │                 │
│  │  (v2.0.6)   │    │  (v2.0.7)   │    │             │                 │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                 │
│                                               │                         │
│                                               ↓                         │
│                                    ┌─────────────────┐                  │
│                                    │  Release Notes  │                  │
│                                    │   Generator     │                  │
│                                    └─────────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detection Sources

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│   │    Git    │  │   Helm    │  │ Terraform │  │  Docker   │           │
│   │  Commits  │  │  Values   │  │   State   │  │ Registry  │           │
│   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘           │
│         │              │              │              │                  │
│         ↓              ↓              ↓              ↓                  │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │              UNIFIED DRIFT COLLECTOR                     │          │
│   └─────────────────────────────────────────────────────────┘          │
│                              │                                          │
│                              ↓                                          │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │              DRIFT ANALYSIS ENGINE                       │          │
│   │  • Categorize changes (add/modify/delete)               │          │
│   │  • Extract ticket IDs (JIRA, etc.)                      │          │
│   │  • Identify breaking changes                            │          │
│   │  • Flag security-sensitive changes                      │          │
│   └─────────────────────────────────────────────────────────┘          │
│                              │                                          │
│                              ↓                                          │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │              RELEASE NOTES GENERATOR                     │          │
│   └─────────────────────────────────────────────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Drift Detection by Category

### 3.1 Code Drift (Git)

**Input:** Git repository, source branch/tag, target branch/tag

**Detection Method:**
```bash
git diff <source_version> <target_version> --stat
git log <source_version>..<target_version> --oneline
```

**Output Data:**
```json
{
  "type": "code",
  "source_version": "v2.0.6",
  "target_version": "v2.0.7",
  "commits": [
    {
      "hash": "abc123",
      "author": "developer@company.com",
      "date": "2025-01-20T10:30:00Z",
      "message": "[MB-234] Add biometric authentication",
      "ticket_id": "MB-234",
      "files_changed": 12,
      "insertions": 450,
      "deletions": 23
    }
  ],
  "files": {
    "added": ["src/auth/biometric.ts", "src/auth/biometric.test.ts"],
    "modified": ["src/auth/login.ts", "src/config/auth.config.ts"],
    "deleted": ["src/auth/legacy-login.ts"]
  }
}
```

### 3.2 Configuration Drift (Helm/Env)

**Input:** Helm values.yaml files from two versions/environments

**Detection Method:** Deep JSON/YAML comparison

**Example - DEV vs SIT Comparison:**

```yaml
# DEV values.yaml (current)
env:
  service_auth:
    - name: "SESSION_TIMEOUT"
      value: "30"
    - name: "UPI_ENABLED"
      value: "true"
    - name: "NEW_FEATURE_FLAG"
      value: "true"

image:
  repository: "asia-south1-docker.pkg.dev/nice-virtue"
  tag: "v2.0.7"
```

```yaml
# SIT values.yaml (previous)
env:
  service_auth:
    - name: "SESSION_TIMEOUT"
      value: "30"
    - name: "UPI_ENABLED"
      value: "false"

image:
  repository: "asia-south1-docker.pkg.dev/nice-virtue"
  tag: "v2.0.6"
```

**Output Data:**
```json
{
  "type": "config",
  "source_env": "SIT",
  "target_env": "DEV",
  "changes": [
    {
      "category": "env",
      "service": "service_auth",
      "change_type": "modified",
      "key": "UPI_ENABLED",
      "previous_value": "false",
      "current_value": "true",
      "comment": "Modified"
    },
    {
      "category": "env",
      "service": "service_auth",
      "change_type": "added",
      "key": "NEW_FEATURE_FLAG",
      "previous_value": null,
      "current_value": "true",
      "comment": "Added"
    },
    {
      "category": "image",
      "service": "service_auth",
      "change_type": "modified",
      "key": "tag",
      "previous_value": "v2.0.6",
      "current_value": "v2.0.7",
      "comment": "Image updated"
    }
  ]
}
```

### 3.3 Database Drift

**Input:** SQL migration files, schema snapshots

**Detection Method:**
- Parse migration file names (timestamp-based)
- Compare schema snapshots
- Analyze migration SQL content

**Output Data:**
```json
{
  "type": "database",
  "db_type": "postgresql",
  "migrations": [
    {
      "file": "20250120_001_add_upi_transactions.sql",
      "operation": "CREATE TABLE",
      "object": "upi_transactions",
      "columns": ["id", "user_id", "amount", "upi_id", "status", "created_at"]
    },
    {
      "file": "20250120_002_alter_users_biometric.sql",
      "operation": "ALTER TABLE",
      "object": "users",
      "changes": [
        {"action": "ADD COLUMN", "column": "biometric_hash", "type": "VARCHAR(256)"}
      ]
    }
  ],
  "rollback_available": true
}
```

### 3.4 Infrastructure Drift (Terraform)

**Input:** Terraform state files, tfvars

**Detection Method:**
```bash
terraform plan -detailed-exitcode
terraform show -json
```

**Output Data:**
```json
{
  "type": "infrastructure",
  "provider": "google",
  "changes": [
    {
      "resource": "google_container_cluster.primary",
      "action": "update",
      "attribute": "node_config.machine_type",
      "previous": "e2-medium",
      "planned": "e2-standard-2"
    },
    {
      "resource": "google_compute_firewall.allow_health_check",
      "action": "create",
      "attributes": {
        "name": "allow-health-check",
        "network": "default",
        "allow": [{"protocol": "tcp", "ports": ["80", "443"]}]
      }
    }
  ]
}
```

### 3.5 Image Drift (Docker)

**Input:** Docker registry, image tags

**Detection Method:** Registry API queries

**Output Data:**
```json
{
  "type": "image",
  "registry": "asia-south1-docker.pkg.dev",
  "images": [
    {
      "name": "mb-auth-service",
      "previous_tag": "v2.0.6",
      "current_tag": "v2.0.7",
      "previous_digest": "sha256:abc123...",
      "current_digest": "sha256:def456...",
      "size_diff": "+2.3MB",
      "layers_changed": 3
    },
    {
      "name": "mb-payment-service",
      "previous_tag": "v2.0.6",
      "current_tag": "v2.0.7",
      "previous_digest": "sha256:ghi789...",
      "current_digest": "sha256:jkl012...",
      "size_diff": "+1.1MB",
      "layers_changed": 2
    }
  ]
}
```

---

## 4. Release Notes Generation

### 4.1 Aggregation Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     RELEASE NOTES AGGREGATOR                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Input Drifts:                                                         │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│   │  Code   │ │ Config  │ │   DB    │ │  Infra  │ │  Image  │          │
│   │  Drift  │ │  Drift  │ │  Drift  │ │  Drift  │ │  Drift  │          │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│        │           │           │           │           │                │
│        └───────────┴───────────┴───────────┴───────────┘                │
│                              │                                          │
│                              ↓                                          │
│                    ┌─────────────────┐                                  │
│                    │    Merge &      │                                  │
│                    │   Categorize    │                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
│                             ↓                                           │
│                    ┌─────────────────┐                                  │
│                    │  Extract Ticket │                                  │
│                    │      IDs        │                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
│                             ↓                                           │
│                    ┌─────────────────┐                                  │
│                    │    Generate     │                                  │
│                    │    Document     │                                  │
│                    └─────────────────┘                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Release Notes Data Structure

```json
{
  "release": {
    "version": "v2.0.7",
    "previous_version": "v2.0.6",
    "project": "Mobile Banking",
    "project_code": "MB",
    "generated_at": "2025-01-22T14:30:00Z",
    "generated_by": "PiLabStudio",
    "promotion": {
      "from_env": "SIT",
      "to_env": "UAT"
    }
  },

  "summary": {
    "total_changes": 24,
    "by_type": {
      "added": 8,
      "modified": 14,
      "deleted": 2
    },
    "services_affected": ["mb-auth-service", "mb-payment-service", "mb-notify-service"],
    "breaking_changes": false,
    "security_changes": true
  },

  "changes": {
    "features": [
      {
        "ticket_id": "MB-234",
        "title": "Add biometric authentication",
        "description": "New biometric login feature for enhanced security",
        "type": "added",
        "commits": ["abc123", "def456"],
        "services": ["mb-auth-service"],
        "author": "developer@company.com"
      },
      {
        "ticket_id": "MB-256",
        "title": "Push notification for transactions",
        "description": "Real-time push notifications for all transactions",
        "type": "added",
        "commits": ["ghi789"],
        "services": ["mb-notify-service"],
        "author": "developer2@company.com"
      }
    ],

    "improvements": [
      {
        "ticket_id": "MB-245",
        "title": "Updated login flow for better security",
        "type": "modified",
        "commits": ["jkl012"],
        "services": ["mb-auth-service"]
      }
    ],

    "bug_fixes": [
      {
        "ticket_id": "MB-250",
        "title": "Fixed transaction history pagination",
        "type": "modified",
        "commits": ["mno345"],
        "services": ["mb-payment-service"]
      }
    ],

    "deprecated": [
      {
        "ticket_id": "MB-255",
        "title": "Legacy login endpoint",
        "type": "deleted",
        "migration_guide": "Use /api/v2/auth/login instead"
      }
    ]
  },

  "configuration_changes": [
    {
      "service": "mb-auth-service",
      "key": "SESSION_TIMEOUT",
      "previous": "30",
      "current": "15",
      "reason": "Security enhancement"
    },
    {
      "service": "mb-payment-service",
      "key": "UPI_ENABLED",
      "previous": "false",
      "current": "true",
      "reason": "Feature enablement"
    }
  ],

  "database_changes": [
    {
      "type": "CREATE TABLE",
      "object": "upi_transactions",
      "migration_file": "20250120_001_add_upi_transactions.sql"
    },
    {
      "type": "ALTER TABLE",
      "object": "users",
      "change": "ADD COLUMN biometric_hash VARCHAR(256)",
      "migration_file": "20250120_002_alter_users_biometric.sql"
    }
  ],

  "infrastructure_changes": [
    {
      "resource": "GKE Node Pool",
      "change": "Machine type upgraded from e2-medium to e2-standard-2",
      "reason": "Performance improvement for high-traffic services"
    }
  ],

  "docker_images": [
    {
      "image": "mb-auth-service",
      "tag": "v2.0.7",
      "digest": "sha256:def456...",
      "registry": "asia-south1-docker.pkg.dev/nice-virtue"
    },
    {
      "image": "mb-payment-service",
      "tag": "v2.0.7",
      "digest": "sha256:jkl012...",
      "registry": "asia-south1-docker.pkg.dev/nice-virtue"
    }
  ],

  "validation": {
    "tests_passed": true,
    "security_scan": "passed",
    "code_coverage": "87%",
    "performance_baseline": "within_threshold"
  },

  "approvals": [
    {
      "stage": "Code Review",
      "approver": "lead@company.com",
      "date": "2025-01-21T10:00:00Z"
    },
    {
      "stage": "Security Review",
      "approver": "security@company.com",
      "date": "2025-01-21T14:00:00Z"
    }
  ]
}
```

### 4.3 Output Formats

#### Markdown Format
```markdown
# Release Notes - v2.0.7

**Project:** Mobile Banking (MB)
**Date:** January 22, 2025
**Promotion:** SIT → UAT

---

## Summary
- **Total Changes:** 24
- **Services Affected:** mb-auth-service, mb-payment-service, mb-notify-service
- **Breaking Changes:** No
- **Security Changes:** Yes

---

## New Features

### [MB-234] Biometric Authentication
New biometric login feature for enhanced security.
- Services: mb-auth-service
- Author: developer@company.com

### [MB-256] Push Notifications
Real-time push notifications for all transactions.
- Services: mb-notify-service

---

## Improvements

### [MB-245] Login Flow Enhancement
Updated login flow for better security.

---

## Bug Fixes

### [MB-250] Transaction History Fix
Fixed transaction history pagination issue.

---

## Configuration Changes

| Service | Key | Previous | New |
|---------|-----|----------|-----|
| mb-auth-service | SESSION_TIMEOUT | 30 | 15 |
| mb-payment-service | UPI_ENABLED | false | true |

---

## Database Changes

- **CREATE TABLE:** upi_transactions
- **ALTER TABLE:** users (ADD COLUMN biometric_hash)

---

## Docker Images

| Image | Tag | Registry |
|-------|-----|----------|
| mb-auth-service | v2.0.7 | asia-south1-docker.pkg.dev |
| mb-payment-service | v2.0.7 | asia-south1-docker.pkg.dev |

---

*Generated by PiLabStudio*
```

#### Excel Format (for Master Manifest)

| Change Request | Service | Key | DEV Current | DEV Previous | SIT Current | SIT Previous | Comment |
|----------------|---------|-----|-------------|--------------|-------------|--------------|---------|
| add | data | dataKey1 | {"name":"dataKey1","value":"value1"} | | {"name":"dataKey1","value":"value1"} | | Added |
| modify | env | UPI_ENABLED | true | false | true | false | Modified |
| delete | env | LEGACY_FLAG | | {"name":"LEGACY_FLAG","value":"true"} | | | Deleted |
| modify | image | tag | v2.0.7 | v2.0.6 | v2.0.7 | v2.0.6 | Image updated |

---

## 5. Algorithm Flow

### 5.1 Drift Detection Algorithm

```
FUNCTION detectDrift(sourceVersion, targetVersion, project):

    driftReport = new DriftReport()

    // 1. Code Drift
    codeDiff = git.diff(sourceVersion, targetVersion)
    commits = git.log(sourceVersion, targetVersion)
    driftReport.code = parseCodeChanges(codeDiff, commits)

    // 2. Config Drift
    sourceConfig = fetchConfig(sourceVersion, project)
    targetConfig = fetchConfig(targetVersion, project)
    driftReport.config = deepCompare(sourceConfig, targetConfig)

    // 3. Database Drift
    migrations = findNewMigrations(sourceVersion, targetVersion)
    driftReport.database = parseMigrations(migrations)

    // 4. Infrastructure Drift
    sourceTfState = fetchTerraformState(sourceVersion)
    targetTfState = fetchTerraformState(targetVersion)
    driftReport.infra = compareTerraformState(sourceTfState, targetTfState)

    // 5. Image Drift
    sourceImages = listImages(sourceVersion)
    targetImages = listImages(targetVersion)
    driftReport.images = compareImages(sourceImages, targetImages)

    RETURN driftReport

END FUNCTION
```

### 5.2 Release Notes Generation Algorithm

```
FUNCTION generateReleaseNotes(driftReport, project):

    releaseNotes = new ReleaseNotes()
    releaseNotes.version = driftReport.targetVersion
    releaseNotes.previousVersion = driftReport.sourceVersion
    releaseNotes.project = project

    // Extract ticket IDs from commit messages
    tickets = extractTicketIds(driftReport.code.commits)

    // Fetch ticket details from JIRA/issue tracker
    FOR EACH ticketId IN tickets:
        ticketInfo = jira.getTicket(ticketId)

        change = new Change()
        change.ticketId = ticketId
        change.title = ticketInfo.summary
        change.type = categorizeChange(ticketInfo.type)
        change.commits = findCommitsForTicket(ticketId, driftReport.code.commits)
        change.services = identifyAffectedServices(change.commits)

        releaseNotes.changes.add(change)
    END FOR

    // Add config changes
    releaseNotes.configChanges = formatConfigChanges(driftReport.config)

    // Add database changes
    releaseNotes.dbChanges = formatDbChanges(driftReport.database)

    // Add infra changes
    releaseNotes.infraChanges = formatInfraChanges(driftReport.infra)

    // Add image list
    releaseNotes.images = formatImageList(driftReport.images)

    // Generate summary
    releaseNotes.summary = generateSummary(releaseNotes)

    RETURN releaseNotes

END FUNCTION
```

### 5.3 Configuration Comparison Algorithm

```
FUNCTION deepCompare(source, target, path = ""):

    changes = []

    // Get all keys from both objects
    allKeys = union(keys(source), keys(target))

    FOR EACH key IN allKeys:
        currentPath = path + "." + key

        IF key NOT IN source:
            // Added in target
            changes.add({
                path: currentPath,
                type: "added",
                previousValue: null,
                currentValue: target[key]
            })

        ELSE IF key NOT IN target:
            // Deleted from target
            changes.add({
                path: currentPath,
                type: "deleted",
                previousValue: source[key],
                currentValue: null
            })

        ELSE IF isObject(source[key]) AND isObject(target[key]):
            // Recurse for nested objects
            nestedChanges = deepCompare(source[key], target[key], currentPath)
            changes.addAll(nestedChanges)

        ELSE IF source[key] != target[key]:
            // Value modified
            changes.add({
                path: currentPath,
                type: "modified",
                previousValue: source[key],
                currentValue: target[key]
            })
        END IF
    END FOR

    RETURN changes

END FUNCTION
```

---

## 6. Integration Points

### 6.1 Trigger Points

| Trigger | Action |
|---------|--------|
| Manual request | User clicks "Generate Release Notes" |
| Pre-promotion | Auto-generate before promoting to next environment |
| Scheduled | Daily/weekly drift reports |
| Git webhook | On tag creation or branch merge |

### 6.2 API Endpoints

```
POST /api/v1/drift/detect
{
  "project_id": "mb",
  "source_version": "v2.0.6",
  "target_version": "v2.0.7"
}

GET /api/v1/drift/report/{report_id}

POST /api/v1/release-notes/generate
{
  "drift_report_id": "dr_123",
  "format": "markdown" | "json" | "excel"
}

GET /api/v1/release-notes/{release_id}
GET /api/v1/release-notes/{release_id}/download?format=pdf
```

### 6.3 Webhook Integrations

- **JIRA** - Fetch ticket details, link releases
- **Slack/Teams** - Notify on release notes generation
- **Confluence** - Auto-publish release notes
- **Email** - Send to stakeholders

---

## 7. UI Integration

### 7.1 Drift Detection Screen

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Drift Detection                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Project: [Mobile Banking ▼]                                            │
│                                                                          │
│  Compare:                                                                │
│  ┌─────────────────┐         ┌─────────────────┐                        │
│  │ Source          │   vs    │ Target          │                        │
│  │ [v2.0.6    ▼]  │   →     │ [v2.0.7    ▼]  │                        │
│  │ Environment:    │         │ Environment:    │                        │
│  │ [SIT       ▼]  │         │ [UAT       ▼]  │                        │
│  └─────────────────┘         └─────────────────┘                        │
│                                                                          │
│                    [Detect Drift]                                        │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Drift Report                                              [Export JSON] │
│                                                                          │
│  ┌─ Summary ─────────────────────────────────────────────────────────┐  │
│  │ Total Changes: 24  │  Added: 8  │  Modified: 14  │  Deleted: 2    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  [Code (15)] [Config (6)] [Database (2)] [Infra (1)] [Images (3)]       │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Code Changes:                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ + src/auth/biometric.ts                              [MB-234]     │  │
│  │ + src/auth/biometric.test.ts                         [MB-234]     │  │
│  │ ~ src/auth/login.ts                                  [MB-245]     │  │
│  │ ~ src/config/auth.config.ts                          [MB-234]     │  │
│  │ - src/auth/legacy-login.ts                           [MB-255]     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│                              [Generate Release Notes]                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Release Notes Preview Screen

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Release Notes Preview                         [Edit] [Approve] [Publish] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Header ──────────────────────────────────────────────────────────┐  │
│  │ Release: v2.0.7                                                   │  │
│  │ Project: Mobile Banking                                           │  │
│  │ Promotion: SIT → UAT                                              │  │
│  │ Generated: January 22, 2025 14:30                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  [Preview] [JSON] [Markdown] [Excel]                                    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ ## New Features                                                   │  │
│  │                                                                   │  │
│  │ ### [MB-234] Biometric Authentication                             │  │
│  │ New biometric login feature for enhanced security.                │  │
│  │ - Services: mb-auth-service                                       │  │
│  │                                                                   │  │
│  │ ### [MB-256] Push Notifications                                   │  │
│  │ Real-time push notifications for all transactions.                │  │
│  │ - Services: mb-notify-service                                     │  │
│  │                                                                   │  │
│  │ ---                                                               │  │
│  │                                                                   │  │
│  │ ## Configuration Changes                                          │  │
│  │                                                                   │  │
│  │ | Service | Key | Previous | New |                                │  │
│  │ |---------|-----|----------|-----|                                │  │
│  │ | mb-auth | SESSION_TIMEOUT | 30 | 15 |                           │  │
│  │ | mb-payment | UPI_ENABLED | false | true |                       │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Download: [PDF] [Word] [Excel] [JSON]                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema

### drift_reports
```sql
CREATE TABLE drift_reports (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    source_version VARCHAR(50),
    target_version VARCHAR(50),
    source_environment VARCHAR(20),
    target_environment VARCHAR(20),
    status VARCHAR(20), -- pending, completed, failed
    report_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

### release_notes
```sql
CREATE TABLE release_notes (
    id UUID PRIMARY KEY,
    drift_report_id UUID REFERENCES drift_reports(id),
    project_id UUID REFERENCES projects(id),
    version VARCHAR(50),
    previous_version VARCHAR(50),
    content JSONB,
    markdown_content TEXT,
    status VARCHAR(20), -- draft, approved, published
    generated_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    published_at TIMESTAMP
);
```

### config_snapshots
```sql
CREATE TABLE config_snapshots (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    environment VARCHAR(20),
    version VARCHAR(50),
    config_type VARCHAR(20), -- helm, env, terraform
    config_data JSONB,
    captured_at TIMESTAMP DEFAULT NOW()
);
```

---

## 9. Implementation Phases

### Phase 1: Core Drift Detection
- Git diff integration
- Basic config comparison (JSON/YAML)
- Simple release notes generation (Markdown)

### Phase 2: Enhanced Detection
- Database migration parsing
- Terraform state comparison
- Docker image tracking
- JIRA integration for ticket details

### Phase 3: Automation
- Webhook triggers
- Scheduled drift reports
- Auto-generation on promotion
- Multi-format export (PDF, Excel, Word)

### Phase 4: Intelligence
- ML-based change categorization
- Breaking change detection
- Security-sensitive change flagging
- Impact analysis

---

*Document Version: 1.0*
*Last Updated: 16-Dec-2025*
