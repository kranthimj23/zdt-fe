# Project Registration & Configuration - Test Cases

## Iteration 00 | Test Strategy & Detailed Test Cases

---

## 1. Test Strategy Overview

| Level | Scope | Tools |
|-------|-------|-------|
| **Unit Tests** | Service logic (validation, encryption, mapping) | Jest, ts-jest |
| **Integration Tests** | Database operations, Git connectivity | Jest, Testcontainers (PostgreSQL) |
| **API Tests** | Full endpoint testing (CRUD, validation, auth) | Jest, Supertest |
| **Security Tests** | Credential encryption, access control, injection | Jest, custom assertions |
| **E2E Tests** | Full onboarding flow from UI to database | Playwright |

---

## 2. Unit Test Cases

### 2.1 Project Validation

#### TC-UNIT-001: Valid project name accepted
- **Input:** `{ name: "payment-gateway", displayName: "Payment Gateway", team: "payments" }`
- **Expected:** Validation passes
- **Assertions:** No errors thrown

#### TC-UNIT-002: Project name with uppercase rejected
- **Input:** `{ name: "Payment-Gateway" }`
- **Expected:** Validation error
- **Assertions:** Error message contains "lowercase"

#### TC-UNIT-003: Project name with spaces rejected
- **Input:** `{ name: "payment gateway" }`
- **Expected:** Validation error
- **Assertions:** Error message contains "alphanumeric"

#### TC-UNIT-004: Project name exceeding 63 characters rejected
- **Input:** `{ name: "a".repeat(64) }`
- **Expected:** Validation error
- **Assertions:** Error message contains "63 characters"

#### TC-UNIT-005: Project name with special characters rejected
- **Input:** `{ name: "payment_gateway!" }`
- **Expected:** Validation error
- **Assertions:** Only lowercase letters, numbers, and hyphens allowed

#### TC-UNIT-006: Missing team field rejected
- **Input:** `{ name: "payment-gateway", team: "" }`
- **Expected:** Validation error
- **Assertions:** Error message contains "team"

#### TC-UNIT-007: Invalid team email rejected
- **Input:** `{ teamEmail: "not-an-email" }`
- **Expected:** Validation error
- **Assertions:** Error message contains "email"

### 2.2 Repository URL Validation

#### TC-UNIT-010: Valid HTTPS Git URL accepted
- **Input:** `"https://github.com/org/repo.git"`
- **Expected:** Validation passes

#### TC-UNIT-011: SSH Git URL rejected
- **Input:** `"git@github.com:org/repo.git"`
- **Expected:** Validation error
- **Assertions:** Error message indicates HTTPS required

#### TC-UNIT-012: Non-Git URL rejected
- **Input:** `"https://example.com/not-a-repo"`
- **Expected:** Validation error (or deferred to connectivity check)

#### TC-UNIT-013: Empty repo URL rejected
- **Input:** `""`
- **Expected:** Validation error

#### TC-UNIT-014: URL with embedded credentials rejected
- **Input:** `"https://user:pass@github.com/org/repo.git"`
- **Expected:** Validation error
- **Assertions:** Error message indicates credentials should be stored separately

### 2.3 Environment Validation

#### TC-UNIT-020: Valid environment configuration accepted
- **Input:** `{ name: "sit", displayName: "SIT", promotionOrder: 2, valuesFolder: "sit-values" }`
- **Expected:** Validation passes

#### TC-UNIT-021: Duplicate promotion order rejected
- **Setup:** Project already has env with promotionOrder = 2
- **Input:** New env with promotionOrder = 2
- **Expected:** Validation error
- **Assertions:** Error message contains "promotion order" and "unique"

#### TC-UNIT-022: Values folder must match pattern
- **Input:** `{ valuesFolder: "sit_configs" }` (doesn't end with "-values")
- **Expected:** Validation error
- **Assertions:** Error message indicates expected format

#### TC-UNIT-023: Duplicate environment name rejected
- **Setup:** Project already has env named "sit"
- **Input:** New env named "sit"
- **Expected:** Validation error

#### TC-UNIT-024: Default template generates correct environments
- **Input:** Apply default template
- **Expected:** Creates dev (order 1), sit (order 2), uat (order 3), pre-prod (order 4), prod (order 5)
- **Assertions:**
  - 5 environments created
  - Each has correct valuesFolder (`<name>-values`)
  - prod has `isProduction = true`

### 2.4 Credential Encryption

#### TC-UNIT-030: Credential value is encrypted before storage
- **Input:** `{ name: "github-token", value: "ghp_abc123def456" }`
- **Expected:** Stored value is not the plain text
- **Assertions:**
  - Stored string differs from input
  - Stored string is base64-encoded ciphertext
  - Decrypting stored string returns original value

#### TC-UNIT-031: Credential value is decryptable
- **Input:** Previously encrypted credential
- **Expected:** Decrypt returns original plain text
- **Assertions:** Decrypted value matches what was originally provided

#### TC-UNIT-032: Different credentials produce different ciphertexts
- **Input:** Encrypt same value twice
- **Expected:** Different ciphertext each time (due to random IV)
- **Assertions:** ciphertext1 !== ciphertext2, but both decrypt to same value

#### TC-UNIT-033: Tampered ciphertext fails decryption
- **Input:** Modify a few bytes of an encrypted credential
- **Expected:** Decryption throws authentication error
- **Assertions:** Error indicates integrity check failed

### 2.5 Branch Tracker Logic

#### TC-UNIT-040: Find active branch for environment
- **Setup:** BranchTracker entries with dev="release/2.0.0", sit="release/1.0.0", uat="X"
- **Input:** Get active branch for "sit"
- **Expected:** Returns "release/1.0.0"

#### TC-UNIT-041: "X" means not yet promoted
- **Setup:** Environment "uat" has value "X"
- **Input:** Get active branch for "uat"
- **Expected:** Returns null/undefined (not yet promoted)

#### TC-UNIT-042: Detect when new branch is needed
- **Setup:** dev and sit both have same branch "release/1.0.0"
- **Input:** Determine branches for promotion from dev to sit
- **Expected:** System indicates new branch needed (same logic as `merger.py`)

#### TC-UNIT-043: Determine promotion branches correctly
- **Setup:** dev="release/2.0.0", sit="release/1.0.0" (different branches)
- **Input:** Get promotion branches for dev→sit
- **Expected:** x-1 branch = "release/1.0.0", x branch = "release/2.0.0"

### 2.6 Configuration Export

#### TC-UNIT-050: Export includes all sections
- **Setup:** Project with 2 source repos, 4 environments, 1 promotion repo, 2 credentials
- **Input:** Get full config
- **Expected:** JSON contains project, promotionRepo, sourceRepos, environments, activeBranches, credentials
- **Assertions:**
  - sourceRepos has 2 items
  - environments has 4 items, ordered by promotionOrder
  - credentials list does NOT contain values (only name, type)
  - activeBranches maps each env to its current branch

#### TC-UNIT-051: Credentials are excluded from export
- **Input:** Get full config
- **Expected:** Each credential in response has name and type but NOT value
- **Assertions:** No credential in response has a "value" field

---

## 3. Integration Test Cases

### 3.1 Database Operations

#### TC-INT-001: Create and retrieve project
- **Act:** Create project via service, then retrieve by ID
- **Assert:** Retrieved project matches all created fields

#### TC-INT-002: Unique constraint on project name
- **Act:** Create two projects with the same name
- **Assert:** Second creation throws unique constraint error

#### TC-INT-003: Cascade delete — archiving project does not delete related data
- **Act:** Set project status to "archived"
- **Assert:** Source repos, environments still exist in DB but project status is "archived"

#### TC-INT-004: Add multiple source repos to project
- **Act:** Add 5 source repos with different types
- **Assert:** All 5 retrievable, filtered by repoType correctly

#### TC-INT-005: Environment ordering is maintained
- **Act:** Create envs with promotionOrder 3, 1, 5, 2, 4 (out of order)
- **Assert:** Listing returns them ordered: 1, 2, 3, 4, 5

#### TC-INT-006: Branch tracker CRUD operations
- **Act:** Create entry, update environment status, query active branches
- **Assert:** All operations succeed, data is consistent

### 3.2 Git Connectivity

#### TC-INT-010: Verify accessible public repo
- **Input:** A known accessible public GitHub repo URL
- **Expected:** `isAccessible = true`, `lastVerifiedAt` is updated
- **Note:** Requires network access; skip in offline CI

#### TC-INT-011: Verify inaccessible repo
- **Input:** A non-existent repo URL (`https://github.com/nonexistent/repo.git`)
- **Expected:** `isAccessible = false`, error message captured

#### TC-INT-012: Verify repo with credentials
- **Input:** Private repo URL + valid Git token
- **Expected:** `isAccessible = true`
- **Note:** Requires a test token; use mock in CI

#### TC-INT-013: Credential injection into repo URL
- **Input:** Repo URL + stored credential
- **Expected:** Token is injected correctly (`https://<token>@github.com/...`)
- **Assert:** Original stored URL is not modified

---

## 4. API Test Cases

### 4.1 Project CRUD

#### TC-API-001: POST /api/projects — create valid project
- **Input:** Complete valid project body
- **Expected:** HTTP 201, response contains created project with ID

#### TC-API-002: POST /api/projects — duplicate name
- **Input:** Project name that already exists
- **Expected:** HTTP 409 Conflict

#### TC-API-003: GET /api/projects — list projects (paginated)
- **Setup:** 25 projects in database
- **Input:** `?page=1&limit=10`
- **Expected:** HTTP 200, 10 items returned, total = 25

#### TC-API-004: GET /api/projects/:id — get by ID
- **Input:** Valid project ID
- **Expected:** HTTP 200, full project data

#### TC-API-005: GET /api/projects/:id — non-existent ID
- **Input:** Random UUID
- **Expected:** HTTP 404

#### TC-API-006: GET /api/projects/by-name/:name — get by name
- **Input:** Valid project name
- **Expected:** HTTP 200, project data

#### TC-API-007: PATCH /api/projects/:id — update fields
- **Input:** `{ displayName: "Updated Name", description: "New description" }`
- **Expected:** HTTP 200, fields updated

#### TC-API-008: DELETE /api/projects/:id — soft delete
- **Input:** Valid project ID
- **Expected:** HTTP 200, project status set to "archived"
- **Assert:** GET still returns project but with status "archived"

### 4.2 Promotion Repository

#### TC-API-010: POST /api/projects/:id/promotion-repo — set promotion repo
- **Input:** `{ repoUrl: "https://github.com/org/promo.git", helmChartsPath: "helm-charts" }`
- **Expected:** HTTP 201

#### TC-API-011: POST — duplicate promotion repo
- **Input:** Set promotion repo when one already exists
- **Expected:** HTTP 409 (one promotion repo per project)

#### TC-API-012: POST /api/projects/:id/promotion-repo/verify — verify connectivity
- **Input:** Project with promotion repo configured
- **Expected:** HTTP 200 with `{ accessible: true/false, message: "..." }`

### 4.3 Source Repositories

#### TC-API-020: POST /api/projects/:id/source-repos — add source repo
- **Input:** `{ name: "service-auth", repoUrl: "...", repoType: "app" }`
- **Expected:** HTTP 201

#### TC-API-021: POST — duplicate repo URL in same project
- **Input:** Same repoUrl as existing source repo
- **Expected:** HTTP 409

#### TC-API-022: GET /api/projects/:id/source-repos — list with type filter
- **Input:** `?repoType=app`
- **Expected:** Returns only app repos

#### TC-API-023: DELETE /api/projects/:id/source-repos/:repoId — remove repo
- **Input:** Valid repo ID
- **Expected:** HTTP 200, repo no longer in list

### 4.4 Environments

#### TC-API-030: POST /api/projects/:id/environments — add environment
- **Input:** `{ name: "staging", promotionOrder: 3, valuesFolder: "staging-values" }`
- **Expected:** HTTP 201

#### TC-API-031: POST /api/projects/:id/environments/apply-template — apply default
- **Input:** Empty project (no environments)
- **Expected:** HTTP 201, 5 environments created (dev, sit, uat, pre-prod, prod)

#### TC-API-032: GET /api/projects/:id/environments — list ordered
- **Expected:** Environments returned in promotionOrder ascending

### 4.5 Credentials

#### TC-API-040: POST /api/projects/:id/credentials — add credential
- **Input:** `{ name: "github-token", type: "git-token", value: "ghp_abc123" }`
- **Expected:** HTTP 201, response does NOT contain value field

#### TC-API-041: GET /api/projects/:id/credentials — list without values
- **Expected:** Each credential has name, type, expiresAt but NOT value

#### TC-API-042: PATCH — update credential value
- **Input:** `{ value: "ghp_new_token_456" }`
- **Expected:** HTTP 200, new value is encrypted and stored

### 4.6 Branch Tracking

#### TC-API-050: GET /api/projects/:id/branches/active — get active branches
- **Setup:** Branch tracker populated
- **Expected:** Returns map of environment → branch name

#### TC-API-051: POST /api/projects/:id/branches — create branch entry
- **Input:** `{ branchName: "release/3.0.0", version: "3.0.0" }`
- **Expected:** HTTP 201, new entry with all envs as "X" except dev

### 4.7 Full Configuration

#### TC-API-060: GET /api/projects/:id/config — full configuration export
- **Setup:** Fully configured project
- **Expected:** HTTP 200, response contains all sections (project, promotionRepo, sourceRepos, environments, activeBranches, credentials without values)

#### TC-API-061: GET /api/projects/:id/config — project with no repos
- **Setup:** Project with only metadata, no repos configured
- **Expected:** HTTP 200, empty arrays for sourceRepos, null for promotionRepo

---

## 5. Security Test Cases

#### TC-SEC-001: Credential values never in API responses
- **Act:** Create credential, then GET credentials list
- **Assert:** No response body in any API contains the plain-text credential value
- **Check:** Inspect all API responses for the test token string

#### TC-SEC-002: Credential values never in logs
- **Act:** Create credential, trigger operations that use it
- **Assert:** Capture all log output; plain-text value does not appear

#### TC-SEC-003: SQL injection in project name
- **Input:** `{ name: "test'; DROP TABLE projects; --" }`
- **Expected:** Validation rejects (name format check), or Prisma parameterizes safely
- **Assert:** No SQL injection occurs

#### TC-SEC-004: SQL injection in repo URL
- **Input:** `{ repoUrl: "https://github.com/org/repo.git'; DROP TABLE source_repos; --" }`
- **Expected:** URL validation rejects, or stored safely
- **Assert:** Database intact

#### TC-SEC-005: XSS in project description
- **Input:** `{ description: "<script>alert('xss')</script>" }`
- **Expected:** Stored as-is in DB (escaped on frontend), or sanitized
- **Assert:** API response does not execute scripts when rendered

#### TC-SEC-006: Unauthenticated request rejected
- **Act:** All endpoints without auth token
- **Expected:** HTTP 401 for all

#### TC-SEC-007: Credential encryption uses unique IV per encryption
- **Act:** Encrypt same value 100 times
- **Assert:** All 100 ciphertexts are different

#### TC-SEC-008: Credential key rotation
- **Act:** Encrypt credential with key A, rotate to key B, attempt decrypt
- **Expected:** System handles key rotation (re-encrypts with new key or supports multiple keys)

---

## 6. Edge Case Test Cases

#### TC-EDGE-001: Project with zero source repos
- **Act:** Create project, add only promotion repo and environments
- **Assert:** Full config export works, sourceRepos is empty array

#### TC-EDGE-002: Project with zero environments
- **Act:** Create project with repos but no environments
- **Assert:** Config export works, environments is empty array, downstream services handle this

#### TC-EDGE-003: Very long project description (10,000 chars)
- **Input:** Description with 10,000 characters
- **Expected:** Stored and retrieved correctly without truncation

#### TC-EDGE-004: Source repo with very long URL
- **Input:** Repo URL with 500 characters
- **Expected:** Stored correctly

#### TC-EDGE-005: Unicode in project display name and description
- **Input:** Display name with Chinese/Japanese/Korean characters
- **Expected:** Stored and retrieved correctly

#### TC-EDGE-006: Concurrent project creation with same name
- **Act:** Two simultaneous POST requests with same project name
- **Expected:** One succeeds (201), one fails (409)

#### TC-EDGE-007: Re-register archived project name
- **Setup:** Archive project "old-project"
- **Act:** Create new project named "old-project"
- **Expected:** Decide behavior — either reject (name still taken) or allow (archived = freed name)

---

## 7. Migration Test Cases

#### TC-MIG-001: Import meta-sheet.xlsx into branch tracker
- **Input:** Real `meta-sheet.xlsx` from promotion-repo master branch
- **Expected:** All branch records imported with correct environment mapping

#### TC-MIG-002: Import existing Jenkins repo lists
- **Input:** Newline-separated repo URL list (mimicking `app-repo-list` env var)
- **Expected:** Each URL becomes a SourceRepo entry with correct type

#### TC-MIG-003: Import Helm chart folder structure as environments
- **Input:** Scan `helm-charts/` directory in promotion-repo
- **Expected:** Each `*-values` folder becomes an Environment record with correct name

---

## 8. Test Data Fixtures

### Fixture 1: `complete-project.json`
Full project with promotion repo, 5 source repos, 5 environments, 2 credentials, branch tracker

### Fixture 2: `minimal-project.json`
Project with only name, team — no repos or environments

### Fixture 3: `meta-sheet-sample.xlsx`
Real meta-sheet.xlsx from existing promotion-repo for migration testing

### Fixture 4: `repo-lists.json`
Newline-separated repo URL lists mimicking Jenkins env vars

### Fixture 5: `invalid-inputs.json`
Collection of invalid project names, URLs, emails for validation testing

---

## 9. Test Coverage Requirements

| Area | Minimum Coverage |
|------|-----------------|
| ProjectService | 90% line coverage |
| CredentialService (encryption) | 100% line coverage |
| RepoVerificationService | 85% line coverage |
| BranchTrackerService | 90% line coverage |
| API Controller (all endpoints) | 90% line coverage |
| Validation logic | 95% branch coverage |
| Error handling | 100% (all error branches) |

---

**Document Version:** 1.0
**Last Updated:** February 16, 2026
**Total Test Cases:** 65
