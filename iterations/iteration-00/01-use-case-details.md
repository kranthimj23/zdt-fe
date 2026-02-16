# Project Registration & Configuration - Detailed Use Case Document

## Iteration 00 | Foundation | Priority: P0 (Prerequisite for all use cases)

---

## 1. Overview

Project Registration is the foundational feature of the Garuda.One platform. It provides a centralized, database-backed registry where teams onboard their projects by defining:
- What the project is (name, team, description)
- Where the code lives (Git repositories for app, DB, infra)
- Which promotion repo holds the Helm charts
- What environments exist and their promotion order
- How branches are named and tracked
- What credentials are needed to access repos and external systems

Every downstream feature (drift analysis, release notes, AI explainer, deployment) depends on this registry to know **which project**, **which repos**, and **which environments** to operate on.

### Problem Statement

Today, the existing scripts (`create-release-note.py`, `deploy.py`, `values-promotion.py`, `merger.py`, `drift_lower_env.py`) require all configuration at runtime:

- **Repo URLs** are passed as `sys.argv` arguments or hardcoded in Jenkinsfiles
- **Environment names** are passed as command-line arguments every invocation
- **Repository lists** are stored as newline-separated Jenkins environment variables (`app-repo-list`, `aql-db-repo-list`, `sql-db-repo-list`, `infra-repo-list`)
- **Branch tracking** relies on `meta-sheet.xlsx` — an Excel file committed in the promotion-repo's master branch
- **Git credentials** are injected via `GIT_TOKEN` environment variable each time
- **Helm chart paths** follow a convention (`helm-charts/<env>-values/app-values/`) but are hardcoded in each script

This means:
1. There is no single place to see all projects and their configurations
2. Onboarding a new project requires creating new Jenkins jobs and manually configuring parameters
3. Scripts cannot discover projects — they must be told everything each time
4. No audit trail of configuration changes
5. No validation that environments or repos are correctly configured

### Solution

A centralized Project Registration API and database that:
1. Stores all project metadata, repos, environments, and credentials in PostgreSQL
2. Provides CRUD APIs for managing projects
3. Validates repository accessibility on registration
4. Replaces `meta-sheet.xlsx` with a database-backed branch tracker
5. Supplies configuration to all downstream services (drift analysis, release notes, deployment)
6. Provides a Next.js UI for onboarding and managing projects

---

## 2. Actors and Stakeholders

| Actor | Role | How They Use This Feature |
|-------|------|---------------------------|
| **Platform Admin** | Superuser | Onboards new projects, manages credentials, configures environments |
| **DevOps Engineer** | Project owner | Registers their project's repos and environments, manages branch config |
| **Release Manager** | Consumer | Selects a registered project to run drift analysis or release notes |
| **CI/CD Pipeline (Jenkins)** | Automated consumer | Queries the registry to get repo URLs, branch names, environment config |
| **AI Services** | Automated consumer | Reads project config to know which repos/envs to analyze |

---

## 3. Data Model

### 3.1 Core Entities

#### Project

The top-level entity representing a product/application managed by the platform.

```
Project
├── id: UUID (primary key)
├── name: string (unique, e.g., "payment-gateway")
├── displayName: string (e.g., "Payment Gateway Service")
├── description: string
├── team: string (owning team name)
├── teamEmail: string
├── status: enum (active | inactive | archived)
├── createdAt: timestamp
├── updatedAt: timestamp
│
├── promotionRepo: PromotionRepo (one-to-one)
├── sourceRepos: SourceRepo[] (one-to-many)
├── environments: Environment[] (one-to-many)
├── credentials: Credential[] (one-to-many)
└── branchTracker: BranchTracker[] (one-to-many)
```

#### PromotionRepo

The Helm chart promotion repository that holds all environment-specific values.

```
PromotionRepo
├── id: UUID
├── projectId: UUID (FK -> Project)
├── repoUrl: string (e.g., "https://github.com/org/promo-helm-charts.git")
├── defaultBranch: string (e.g., "master" or "main")
├── helmChartsPath: string (e.g., "helm-charts")
├── metaSheetPath: string (e.g., "meta-sheet.xlsx", nullable for new projects)
├── isAccessible: boolean (set after connectivity check)
├── lastVerifiedAt: timestamp
├── createdAt: timestamp
└── updatedAt: timestamp
```

#### SourceRepo

Individual microservice repositories that contain application code, DB scripts, or infrastructure code.

```
SourceRepo
├── id: UUID
├── projectId: UUID (FK -> Project)
├── name: string (e.g., "service-auth", "service-admin")
├── repoUrl: string (e.g., "https://github.com/org/service-auth.git")
├── repoType: enum (app | aql-db | sql-db | infra)
├── defaultBranch: string (e.g., "main")
├── helmValuesPath: string (relative path within repo, e.g., "helm-charts/dev-values/app-values")
├── isAccessible: boolean
├── lastVerifiedAt: timestamp
├── createdAt: timestamp
└── updatedAt: timestamp
```

#### Environment

An environment in the promotion pipeline (dev, sit, uat, prod, etc.).

```
Environment
├── id: UUID
├── projectId: UUID (FK -> Project)
├── name: string (e.g., "dev", "sit", "uat", "pre-prod", "prod")
├── displayName: string (e.g., "Development", "System Integration Testing")
├── promotionOrder: integer (1=dev, 2=sit, 3=uat, 4=pre-prod, 5=prod)
├── kubernetesNamespace: string (e.g., "dev-ns", "sit-ns")
├── clusterName: string (e.g., "gke-dev-cluster")
├── valuesFolder: string (e.g., "dev-values" — folder name under helm-charts/)
├── isProduction: boolean
├── createdAt: timestamp
└── updatedAt: timestamp
```

#### Credential

Securely stored credentials for accessing repos and external systems.

```
Credential
├── id: UUID
├── projectId: UUID (FK -> Project)
├── name: string (e.g., "github-token", "jira-api-key")
├── type: enum (git-token | jira-api-key | gcp-service-account | generic)
├── value: string (encrypted at rest)
├── expiresAt: timestamp (nullable)
├── createdAt: timestamp
└── updatedAt: timestamp
```

#### BranchTracker

Replaces `meta-sheet.xlsx` — tracks which branch is active in each environment.

```
BranchTracker
├── id: UUID
├── projectId: UUID (FK -> Project)
├── branchName: string (e.g., "release/1.0.0", "release/2.0.0")
├── environmentStatuses: JSON
│   {
│     "dev": "release/2.0.0",
│     "sit": "release/1.0.0",
│     "uat": "X",
│     "prod": "X"
│   }
├── version: string (e.g., "2.0.0")
├── isActive: boolean
├── createdAt: timestamp
└── updatedAt: timestamp
```

---

## 4. Functional Requirements

### FR-001: Create Project

Register a new project with its basic metadata.

**Validation rules:**
- `name` must be unique, lowercase, alphanumeric with hyphens (matching Kubernetes naming convention)
- `name` max length: 63 characters
- `team` is required
- `teamEmail` must be a valid email
- Duplicate project names are rejected

### FR-002: Configure Promotion Repository

Attach the Helm chart promotion repo to a project.

**Validation rules:**
- `repoUrl` must be a valid Git HTTPS URL
- On save, the system attempts to `git ls-remote` to verify the repo is accessible
- `helmChartsPath` defaults to `"helm-charts"` if not specified
- Only one promotion repo per project

### FR-003: Register Source Repositories

Add microservice repos (app, database, infra) to a project.

**Validation rules:**
- `repoUrl` must be a valid Git HTTPS URL
- `repoType` must be one of: `app`, `aql-db`, `sql-db`, `infra`
- Duplicate repo URLs within the same project are rejected
- On save, the system verifies repo accessibility via `git ls-remote`
- A project can have 0-N source repos of each type

### FR-004: Define Environments

Configure the environment pipeline with promotion order.

**Validation rules:**
- Environment `name` must be unique within a project
- `promotionOrder` must be unique within a project (no two envs at same order)
- `valuesFolder` must match the pattern `<name>-values`
- At least one environment is required
- System provides default templates: `[dev, sit, uat, pre-prod, prod]`

### FR-005: Store Credentials

Securely store Git tokens, JIRA API keys, and other credentials.

**Security requirements:**
- Values are encrypted at rest using AES-256
- Values are never returned in API responses (only `name`, `type`, `expiresAt`)
- Only authorized users can create/update/delete credentials
- Credentials can be referenced by name in downstream operations

### FR-006: Branch Tracking

Replace `meta-sheet.xlsx` with database-backed branch tracking.

**Behavior:**
- When a new release branch is created, a BranchTracker entry is added
- Each environment column tracks which branch is currently active (or "X" for not yet promoted)
- Supports the same workflow as `merger.py`: find last updated branch per environment, create new branches, update tracking
- Provides history of all branch progressions

### FR-007: Repository Connectivity Verification

On-demand and periodic verification that all registered repos are accessible.

**Behavior:**
- Runs `git ls-remote <repoUrl>` using stored credentials
- Updates `isAccessible` and `lastVerifiedAt` fields
- Can be triggered manually per-repo or as a scheduled job for all repos
- Alerts if a previously accessible repo becomes unreachable

### FR-008: Project Configuration Export

Provide the full project configuration as a single JSON payload for downstream consumers.

**Purpose:** Any service (drift analysis, release notes, deployment) can call `GET /api/projects/:id/config` and receive everything it needs — repo URLs, environment order, credentials references, Helm paths — without needing separate lookups.

---

## 5. API Contract

### 5.1 Project CRUD

```
POST   /api/projects                     Create a new project
GET    /api/projects                     List all projects (paginated)
GET    /api/projects/:id                 Get project by ID
GET    /api/projects/by-name/:name       Get project by name
PATCH  /api/projects/:id                 Update project metadata
DELETE /api/projects/:id                 Soft-delete (set status to archived)
```

### 5.2 Promotion Repository

```
POST   /api/projects/:id/promotion-repo           Set promotion repo
GET    /api/projects/:id/promotion-repo            Get promotion repo
PATCH  /api/projects/:id/promotion-repo            Update promotion repo
POST   /api/projects/:id/promotion-repo/verify     Verify connectivity
```

### 5.3 Source Repositories

```
POST   /api/projects/:id/source-repos              Add source repo
GET    /api/projects/:id/source-repos               List all source repos
GET    /api/projects/:id/source-repos/:repoId       Get source repo by ID
PATCH  /api/projects/:id/source-repos/:repoId       Update source repo
DELETE /api/projects/:id/source-repos/:repoId       Remove source repo
POST   /api/projects/:id/source-repos/:repoId/verify  Verify connectivity
```

### 5.4 Environments

```
POST   /api/projects/:id/environments               Add environment
GET    /api/projects/:id/environments                List environments (ordered)
PATCH  /api/projects/:id/environments/:envId         Update environment
DELETE /api/projects/:id/environments/:envId          Remove environment
POST   /api/projects/:id/environments/apply-template  Apply default template
```

### 5.5 Credentials

```
POST   /api/projects/:id/credentials                Add credential
GET    /api/projects/:id/credentials                 List credentials (values hidden)
PATCH  /api/projects/:id/credentials/:credId         Update credential
DELETE /api/projects/:id/credentials/:credId          Delete credential
```

### 5.6 Branch Tracking

```
GET    /api/projects/:id/branches                    List all branch records
GET    /api/projects/:id/branches/active              Get current active branches per env
POST   /api/projects/:id/branches                     Create new branch entry
PATCH  /api/projects/:id/branches/:branchId           Update branch status
```

### 5.7 Full Configuration Export

```
GET    /api/projects/:id/config                       Full config JSON for downstream services
```

### Example: Full Configuration Response

```json
{
  "project": {
    "id": "uuid",
    "name": "payment-gateway",
    "team": "payments-team"
  },
  "promotionRepo": {
    "repoUrl": "https://github.com/org/promo-helm-charts.git",
    "helmChartsPath": "helm-charts",
    "defaultBranch": "master"
  },
  "sourceRepos": [
    {
      "name": "service-auth",
      "repoUrl": "https://github.com/org/service-auth.git",
      "repoType": "app",
      "defaultBranch": "main"
    },
    {
      "name": "service-admin",
      "repoUrl": "https://github.com/org/service-admin.git",
      "repoType": "app",
      "defaultBranch": "main"
    }
  ],
  "environments": [
    { "name": "dev", "promotionOrder": 1, "valuesFolder": "dev-values", "namespace": "dev-ns" },
    { "name": "sit", "promotionOrder": 2, "valuesFolder": "sit-values", "namespace": "sit-ns" },
    { "name": "uat", "promotionOrder": 3, "valuesFolder": "uat-values", "namespace": "uat-ns" },
    { "name": "prod", "promotionOrder": 4, "valuesFolder": "prod-values", "namespace": "prod-ns" }
  ],
  "activeBranches": {
    "dev": "release/2.0.0",
    "sit": "release/1.0.0",
    "uat": "release/1.0.0",
    "prod": "release/0.9.0"
  },
  "credentials": [
    { "name": "github-token", "type": "git-token" },
    { "name": "jira-api-key", "type": "jira-api-key" }
  ]
}
```

---

## 6. Integration with Existing Scripts

This is how the registered configuration maps to what the existing scripts expect:

| Existing Script | Current Input Method | Maps To |
|----------------|---------------------|---------|
| `create-release-note.py` | `sys.argv[1]` (branch x-1), `sys.argv[2]` (branch x), `sys.argv[3]` (lower env), `sys.argv[4]` (higher env), `sys.argv[5]` (repo URL) | `activeBranches`, `environments`, `promotionRepo.repoUrl` |
| `generate-config.py` | `sys.argv[1]` (repo URL), `sys.argv[4]` (lower env), `sys.argv[5]` (higher env) | `promotionRepo.repoUrl`, `environments` |
| `deploy.py` | `sys.argv[1]` (env), `sys.argv[2]` (repo URL), `sys.argv[3]` (branch) | `environments[n].name`, `promotionRepo.repoUrl`, `activeBranches` |
| `values-promotion.py` | `sys.argv[1]` (repo URL), `sys.argv[2]` (branch); env var `app_repo_list` | `promotionRepo.repoUrl`, `activeBranches`, `sourceRepos` |
| `app_db_infra_pull_services.py` | Env vars: `app-repo-list`, `aql-db-repo-list`, `sql-db-repo-list`, `infra-repo-list` | `sourceRepos` (filtered by `repoType`) |
| `merger.py` | `sys.argv[1]` (lower env), `sys.argv[2]` (higher env), `sys.argv[3]` (GitHub URL), `sys.argv[4]` (version); reads `meta-sheet.xlsx` | `environments`, `promotionRepo.repoUrl`, `branchTracker` |
| `drift_lower_env.py` | Reads `infra_sheet.xlsx` from two branches | `promotionRepo.repoUrl`, `environments`, `activeBranches` |

---

## 7. Data Flow

```
┌────────────────────────────────────┐
│  Next.js Frontend                  │
│  - Project onboarding wizard       │
│  - Project list / dashboard        │
│  - Environment pipeline view       │
│  - Repository management           │
└──────────────┬─────────────────────┘
               │ REST API
┌──────────────▼─────────────────────┐
│  NestJS Backend                    │
│  ┌──────────────────────────────┐  │
│  │  ProjectModule               │  │
│  │  - ProjectController         │  │
│  │  - ProjectService            │  │
│  │  - RepoVerificationService   │  │
│  │  - CredentialService         │  │
│  │  - BranchTrackerService      │  │
│  └──────────────────────────────┘  │
└──────────────┬─────────────────────┘
               │
┌──────────────▼─────────────────────┐
│  PostgreSQL                        │
│  - projects                        │
│  - promotion_repos                 │
│  - source_repos                    │
│  - environments                    │
│  - credentials (encrypted)         │
│  - branch_trackers                 │
└────────────────────────────────────┘
               │
               ▼ Consumed by
┌────────────────────────────────────┐
│  Downstream Services               │
│  - Drift Explainer (iteration-01)  │
│  - Release Notes Generator         │
│  - Deployment Pipeline             │
│  - AI Services                     │
│                                    │
│  GET /api/projects/:id/config      │
│  → receives all repo URLs, envs,   │
│    branch names in one call        │
└────────────────────────────────────┘
```

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API response time (CRUD) | < 200ms P95 |
| API response time (repo verification) | < 10s (network-bound) |
| Concurrent projects supported | 500+ |
| Credential encryption | AES-256-GCM |
| Database backup | Daily automated |
| Audit logging | All create/update/delete operations logged |

---

## 9. Assumptions and Constraints

### Assumptions
1. All Git repositories use HTTPS URLs (not SSH)
2. Git tokens have read access to all registered repositories
3. The promotion repo follows the `helm-charts/<env>-values/` folder convention
4. Environment names match the folder prefix (e.g., env "sit" → folder "sit-values")
5. Projects typically have 2-20 source repos and 3-6 environments

### Constraints
1. Credential values must never appear in logs, API responses, or error messages
2. Repository verification requires network access to Git hosts
3. The `meta-sheet.xlsx` import is a one-time migration path for existing projects
4. Branch tracking must support the exact workflow in `merger.py` (create branch, mark X, promote)

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Projects onboarded | All existing projects migrated |
| API availability | 99.9% |
| Repo verification accuracy | 100% (no false positives) |
| Downstream service adoption | All scripts read config from registry |
| Onboarding time per project | < 10 minutes via UI |

---

## 11. Out of Scope (Deferred)

- Role-based access control (RBAC) per project — handled by platform auth layer later
- Automated repo discovery (scanning a GitHub org for repos) — future enhancement
- Webhook integration for auto-detecting new branches — future enhancement
- Multi-cluster Kubernetes config management — later iteration
- Import from Terraform state files — later iteration

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **Project** | A product/application managed by the platform, consisting of one or more microservices |
| **Promotion Repo** | The central Git repo holding Helm charts and environment-specific values files |
| **Source Repo** | An individual microservice's Git repository containing application, DB, or infra code |
| **Environment** | A deployment target (dev, sit, uat, prod) with its own Kubernetes namespace and config |
| **Promotion Order** | The sequence in which environments are promoted (dev→sit→uat→prod) |
| **Branch Tracker** | Database record replacing `meta-sheet.xlsx`, tracking which release branch is in which environment |
| **Values Folder** | Directory under `helm-charts/` containing environment-specific YAML files (e.g., `sit-values/`) |
| **meta-sheet.xlsx** | Legacy Excel file in the promotion repo's master branch that tracks branch-to-environment mapping |

---

**Document Version:** 1.0
**Last Updated:** February 16, 2026
