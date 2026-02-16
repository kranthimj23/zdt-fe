# Project Registration & Configuration - Test Automation Implementation Guide

## Iteration 00 | Automating All 65 Test Cases

---

## 1. Test Automation Architecture

### 1.1 Framework Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Test Runner** | Jest 29+ | Execute all unit, integration, API, and edge-case tests |
| **TypeScript Support** | ts-jest | Run TypeScript tests without pre-compilation |
| **HTTP Testing** | Supertest | API endpoint testing against NestJS app |
| **Container Management** | Testcontainers | Spin up PostgreSQL for integration tests |
| **Mocking** | jest.mock + jest.fn | Mock Prisma, simple-git, crypto |
| **Schema Validation** | Zod | Validate API response contracts |
| **E2E Testing** | Playwright | Full onboarding flow from UI to database |
| **Security Scanning** | eslint-plugin-security + custom | Static analysis for injection patterns |
| **Coverage Reporting** | Jest built-in (istanbul) | Line, branch, function coverage |
| **CI Integration** | GitHub Actions | Automated test runs on push/PR |

### 1.2 Test Execution Tiers

```
Tier 1: Fast (< 30 seconds) - Run on every save / pre-commit
  └── Unit tests (TC-UNIT-*, TC-EDGE-*)

Tier 2: Medium (< 2 minutes) - Run on every push / PR
  └── Integration tests with mocks (TC-INT-*, TC-API-*)
  └── Security tests (TC-SEC-*)

Tier 3: Slow (< 10 minutes) - Run on PR merge / nightly
  └── Integration tests with real containers (TC-INT-* with Testcontainers)
  └── Migration tests (TC-MIG-*)
  └── E2E tests with Playwright

Tier 4: Extended (< 15 minutes) - Run nightly / on-demand
  └── Full E2E suite with real database
  └── Credential rotation tests
  └── Concurrent request tests
```

---

## 2. Project Structure for Tests

```
test/
├── jest.config.ts                             # Root Jest configuration
├── jest.unit.config.ts                        # Unit test config (Tier 1)
├── jest.integration.config.ts                 # Integration test config (Tier 2-3)
├── jest.e2e.config.ts                         # E2E/API test config (Tier 2)
├── setup/
│   ├── global-setup.ts                        # Global test setup (Testcontainers start)
│   ├── global-teardown.ts                     # Global teardown (Testcontainers stop)
│   ├── jest.setup.ts                          # Per-test-file setup (mocks, env vars)
│   └── test-app.factory.ts                    # Create NestJS test application instance
├── fixtures/
│   ├── projects/
│   │   ├── complete-project.json              # Full project with all sub-entities
│   │   ├── minimal-project.json               # Only name and team
│   │   ├── invalid-inputs.json                # Collection of invalid inputs
│   │   └── multiple-projects.json             # 25 projects for pagination testing
│   ├── repos/
│   │   ├── valid-promotion-repo.json          # Valid promotion repo config
│   │   ├── valid-source-repos.json            # 5 source repos (mixed types)
│   │   └── invalid-repo-urls.json             # SSH URLs, embedded creds, non-git URLs
│   ├── environments/
│   │   ├── default-template.json              # Expected 5-env template output
│   │   ├── custom-environments.json           # Custom env configurations
│   │   └── invalid-environments.json          # Duplicate orders, bad folder names
│   ├── credentials/
│   │   ├── valid-credentials.json             # Git token, JIRA key, GCP SA
│   │   └── encryption-test-vectors.json       # Known plaintext/ciphertext pairs for validation
│   ├── branches/
│   │   ├── branch-tracker-data.json           # Branch tracking entries with env statuses
│   │   └── promotion-scenarios.json           # Various promotion state combinations
│   ├── migration/
│   │   ├── meta-sheet-sample.xlsx             # Real meta-sheet.xlsx for import testing
│   │   ├── repo-lists.json                    # Newline-separated repo URL lists
│   │   └── helm-folders.json                  # Folder names from helm-charts/ directory
│   └── security/
│       ├── sql-injection-payloads.json        # SQL injection test data
│       ├── xss-payloads.json                  # XSS test data
│       └── invalid-uuids.json                 # Malformed UUID strings
├── mocks/
│   ├── prisma.service.mock.ts                 # Mock Prisma database client
│   ├── simple-git.mock.ts                     # Mock simple-git (ls-remote)
│   ├── crypto.mock.ts                         # Mock crypto for deterministic encryption tests
│   └── redis.mock.ts                          # Mock Redis (ioredis-mock)
├── helpers/
│   ├── project.factory.ts                     # Factory functions to create test projects
│   ├── assertion.helpers.ts                   # Custom Jest matchers
│   ├── response-schema.validator.ts           # Zod schemas for API responses
│   ├── db-seeder.ts                           # Seed database with test data
│   └── encryption.helpers.ts                  # Helpers for credential encryption tests
├── unit/
│   ├── project-validation.spec.ts             # TC-UNIT-001 to TC-UNIT-007
│   ├── repo-url-validation.spec.ts            # TC-UNIT-010 to TC-UNIT-014
│   ├── environment-validation.spec.ts         # TC-UNIT-020 to TC-UNIT-024
│   ├── credential-encryption.spec.ts          # TC-UNIT-030 to TC-UNIT-033
│   ├── branch-tracker-logic.spec.ts           # TC-UNIT-040 to TC-UNIT-043
│   └── config-export.spec.ts                  # TC-UNIT-050 to TC-UNIT-051
├── integration/
│   ├── database-operations.spec.ts            # TC-INT-001 to TC-INT-006
│   ├── git-connectivity.spec.ts               # TC-INT-010 to TC-INT-013
│   └── full-project-lifecycle.spec.ts         # End-to-end service integration
├── api/
│   ├── project-crud.e2e.spec.ts               # TC-API-001 to TC-API-008
│   ├── promotion-repo.e2e.spec.ts             # TC-API-010 to TC-API-012
│   ├── source-repos.e2e.spec.ts               # TC-API-020 to TC-API-023
│   ├── environments.e2e.spec.ts               # TC-API-030 to TC-API-032
│   ├── credentials.e2e.spec.ts                # TC-API-040 to TC-API-042
│   ├── branch-tracking.e2e.spec.ts            # TC-API-050 to TC-API-051
│   └── config-export.e2e.spec.ts              # TC-API-060 to TC-API-061
├── security/
│   ├── credential-security.spec.ts            # TC-SEC-001 to TC-SEC-002
│   ├── injection-prevention.spec.ts           # TC-SEC-003 to TC-SEC-005
│   ├── auth-enforcement.spec.ts               # TC-SEC-006
│   ├── encryption-integrity.spec.ts           # TC-SEC-007 to TC-SEC-008
│   └── credential-leakage-scanner.spec.ts     # Scans all API responses for leaked secrets
├── edge-cases/
│   ├── empty-project.spec.ts                  # TC-EDGE-001 to TC-EDGE-002
│   ├── large-data.spec.ts                     # TC-EDGE-003 to TC-EDGE-004
│   ├── unicode.spec.ts                        # TC-EDGE-005
│   ├── concurrency.spec.ts                    # TC-EDGE-006
│   └── archived-project.spec.ts               # TC-EDGE-007
├── migration/
│   ├── meta-sheet-import.spec.ts              # TC-MIG-001
│   ├── jenkins-repo-import.spec.ts            # TC-MIG-002
│   └── helm-folder-import.spec.ts             # TC-MIG-003
└── reports/
    └── .gitkeep                               # Generated reports go here
```

---

## 3. Jest Configuration

### 3.1 Root Configuration

**File: `test/jest.config.ts`**

```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/project/**/*.ts',
    '!src/project/**/*.module.ts',
    '!src/project/**/*.dto.ts',
    '!src/project/**/*.interface.ts',
    '!src/project/**/__tests__/**',
  ],
  coverageDirectory: './test/reports/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThresholds: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/project/services/credential.service.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/project/project.service.ts': {
      branches: 90,
      lines: 90,
    },
  },
  testEnvironment: 'node',
  setupFilesAfterSetup: ['./test/setup/jest.setup.ts'],
  testTimeout: 30000,
  verbose: true,
};

export default config;
```

### 3.2 Tier-Specific Configurations

**File: `test/jest.unit.config.ts`** (Tier 1 - Fast)

```typescript
import baseConfig from './jest.config';

export default {
  ...baseConfig,
  testRegex: 'test/unit/.*\\.spec\\.ts$',
  testTimeout: 10000,
};
```

**File: `test/jest.integration.config.ts`** (Tier 2-3)

```typescript
import baseConfig from './jest.config';

export default {
  ...baseConfig,
  testRegex: 'test/integration/.*\\.spec\\.ts$',
  globalSetup: './test/setup/global-setup.ts',
  globalTeardown: './test/setup/global-teardown.ts',
  testTimeout: 60000,
};
```

**File: `test/jest.e2e.config.ts`** (Tier 2 - API)

```typescript
import baseConfig from './jest.config';

export default {
  ...baseConfig,
  testRegex: 'test/(api|security|edge-cases|migration)/.*\\.spec\\.ts$',
  globalSetup: './test/setup/global-setup.ts',
  globalTeardown: './test/setup/global-teardown.ts',
  testTimeout: 60000,
};
```

### 3.3 npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest --config test/jest.config.ts",
    "test:unit": "jest --config test/jest.unit.config.ts",
    "test:int": "jest --config test/jest.integration.config.ts",
    "test:e2e": "jest --config test/jest.e2e.config.ts",
    "test:security": "jest --config test/jest.e2e.config.ts --testPathPattern=security",
    "test:migration": "jest --config test/jest.e2e.config.ts --testPathPattern=migration",
    "test:edge": "jest --config test/jest.e2e.config.ts --testPathPattern=edge-cases",
    "test:all": "npm run test:unit && npm run test:int && npm run test:e2e",
    "test:ci": "npm run test:unit -- --ci --coverage && npm run test:int -- --ci && npm run test:e2e -- --ci",
    "test:coverage": "jest --config test/jest.config.ts --coverage",
    "test:watch": "jest --config test/jest.unit.config.ts --watch"
  }
}
```

---

## 4. Test Fixture Definitions

### 4.1 Project Fixtures

**File: `test/fixtures/projects/complete-project.json`**

```json
{
  "project": {
    "name": "payment-gateway",
    "displayName": "Payment Gateway Service",
    "description": "Handles all payment processing for the platform",
    "team": "payments-team",
    "teamEmail": "payments@example.com"
  },
  "promotionRepo": {
    "repoUrl": "https://github.com/org/promo-helm-charts.git",
    "defaultBranch": "master",
    "helmChartsPath": "helm-charts",
    "metaSheetPath": "meta-sheet.xlsx"
  },
  "sourceRepos": [
    { "name": "service-auth", "repoUrl": "https://github.com/org/service-auth.git", "repoType": "app", "defaultBranch": "main" },
    { "name": "service-admin", "repoUrl": "https://github.com/org/service-admin.git", "repoType": "app", "defaultBranch": "main" },
    { "name": "service-payment", "repoUrl": "https://github.com/org/service-payment.git", "repoType": "app", "defaultBranch": "main" },
    { "name": "db-auth", "repoUrl": "https://github.com/org/db-auth.git", "repoType": "aql-db", "defaultBranch": "main" },
    { "name": "infra-core", "repoUrl": "https://github.com/org/infra-core.git", "repoType": "infra", "defaultBranch": "main" }
  ],
  "environments": [
    { "name": "dev", "displayName": "Development", "promotionOrder": 1, "valuesFolder": "dev-values", "isProduction": false },
    { "name": "sit", "displayName": "SIT", "promotionOrder": 2, "valuesFolder": "sit-values", "isProduction": false },
    { "name": "uat", "displayName": "UAT", "promotionOrder": 3, "valuesFolder": "uat-values", "isProduction": false },
    { "name": "pre-prod", "displayName": "Pre-Production", "promotionOrder": 4, "valuesFolder": "pre-prod-values", "isProduction": false },
    { "name": "prod", "displayName": "Production", "promotionOrder": 5, "valuesFolder": "prod-values", "isProduction": true }
  ],
  "credentials": [
    { "name": "github-token", "type": "git-token", "value": "ghp_test_token_abc123def456" },
    { "name": "jira-api-key", "type": "jira-api-key", "value": "jira_test_key_xyz789" }
  ],
  "branches": [
    {
      "branchName": "release/2.0.0",
      "version": "2.0.0",
      "environmentStatuses": { "dev": "release/2.0.0", "sit": "release/1.0.0", "uat": "X", "pre-prod": "X", "prod": "X" }
    }
  ]
}
```

**File: `test/fixtures/projects/minimal-project.json`**

```json
{
  "name": "minimal-service",
  "displayName": "Minimal Service",
  "team": "core-team",
  "teamEmail": "core@example.com"
}
```

**File: `test/fixtures/projects/invalid-inputs.json`**

```json
{
  "invalidNames": [
    { "input": "Payment-Gateway", "reason": "uppercase letters" },
    { "input": "payment gateway", "reason": "contains space" },
    { "input": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "reason": "exceeds 63 characters" },
    { "input": "payment_gateway!", "reason": "special characters" },
    { "input": "-payment", "reason": "starts with hyphen" },
    { "input": "payment-", "reason": "ends with hyphen" }
  ],
  "invalidEmails": [
    { "input": "not-an-email", "reason": "missing @ and domain" },
    { "input": "@example.com", "reason": "missing local part" },
    { "input": "user@", "reason": "missing domain" }
  ],
  "invalidRepoUrls": [
    { "input": "git@github.com:org/repo.git", "reason": "SSH URL, not HTTPS" },
    { "input": "https://example.com/not-a-repo", "reason": "does not end in .git" },
    { "input": "", "reason": "empty string" },
    { "input": "https://user:pass@github.com/org/repo.git", "reason": "embedded credentials" }
  ]
}
```

### 4.2 Repository Fixtures

**File: `test/fixtures/repos/invalid-repo-urls.json`**

```json
[
  { "url": "git@github.com:org/repo.git", "error": "HTTPS required" },
  { "url": "https://user:pass@github.com/org/repo.git", "error": "embedded credentials" },
  { "url": "ftp://files.example.com/repo.git", "error": "not HTTPS" },
  { "url": "", "error": "empty URL" },
  { "url": "https://github.com/org/repo", "error": "missing .git suffix" }
]
```

### 4.3 Security Payloads

**File: `test/fixtures/security/sql-injection-payloads.json`**

```json
[
  "test'; DROP TABLE projects; --",
  "1' OR '1'='1",
  "'; DELETE FROM source_repos WHERE ''='",
  "test\" OR 1=1 --",
  "Robert'); DROP TABLE environments;--",
  "test' UNION SELECT * FROM credentials --"
]
```

**File: `test/fixtures/security/xss-payloads.json`**

```json
[
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert('xss')>",
  "javascript:alert('xss')",
  "<svg onload=alert('xss')>",
  "'\"><script>alert(1)</script>"
]
```

---

## 5. Mock Implementations

### 5.1 Prisma Mock

**File: `test/mocks/prisma.service.mock.ts`**

Implementation approach:

```
MockPrismaService
├── project
│   ├── create(data) -> Stores in-memory, returns with UUID
│   ├── findUnique(where) -> Looks up by id or name
│   ├── findUniqueOrThrow(where) -> Throws if not found
│   ├── findMany(where) -> Filters, pagination
│   ├── update(where, data) -> Updates in-memory
│   ├── count(where) -> Returns count
│   └── delete(where) -> Removes from store
├── promotionRepo
│   ├── create(data) -> Stores in-memory
│   ├── findUnique(where) -> Looks up by projectId
│   └── update(where, data) -> Updates in-memory
├── sourceRepo
│   ├── create(data) -> Stores in-memory
│   ├── findFirst(where) -> Finds matching
│   ├── findMany(where) -> Filters by projectId, repoType
│   ├── findUniqueOrThrow(where) -> Throws if not found
│   ├── update(where, data) -> Updates in-memory
│   └── delete(where) -> Removes from store
├── environment
│   ├── create(data) -> Stores in-memory
│   ├── createMany(data) -> Bulk insert
│   ├── findFirst(where) -> Finds matching
│   ├── findMany(where) -> Filters, ordered by promotionOrder
│   ├── count(where) -> Returns count
│   ├── update(where, data) -> Updates in-memory
│   └── delete(where) -> Removes from store
├── credential
│   ├── create(data) -> Stores in-memory
│   ├── findMany(where, select) -> Returns without value field
│   ├── findUniqueOrThrow(where) -> Returns with value field (internal use)
│   ├── update(where, data) -> Updates in-memory
│   └── delete(where) -> Removes from store
├── branchTracker
│   ├── create(data) -> Stores in-memory
│   ├── findMany(where) -> Filters by projectId
│   ├── findUniqueOrThrow(where) -> Throws if not found
│   └── update(where, data) -> Updates in-memory
├── $queryRaw -> Returns [{ '?column?': 1 }] (for health checks)
└── reset() -> Clears all in-memory stores
```

Uses an in-memory Map for each model, keyed by `id`. Supports `where` clause filtering for `findUnique` and `findMany`. Auto-generates UUIDs for `create` if not provided.

### 5.2 Simple-Git Mock

**File: `test/mocks/simple-git.mock.ts`**

```
MockSimpleGit
├── listRemote(args) -> Configurable success/failure
│   ├── Default: resolves with ref list string
│   ├── simulateInaccessible() -> rejects with "repository not found"
│   ├── simulateTimeout() -> rejects after delay
│   └── simulateAuthRequired() -> rejects with "authentication failed"
├── getCallHistory() -> Returns array of all calls
├── getLastUrl() -> Returns the URL from the last listRemote call
└── reset() -> Clears state
```

Key behaviors:
1. **Default**: Return a mock ref list (simulating successful `git ls-remote`)
2. **Per-test override**: `mockGit.simulateInaccessible()` causes next call to reject
3. **URL capture**: `mockGit.getLastUrl()` returns the URL for asserting credential injection
4. **Auth verification**: Assert that token was injected into URL correctly

### 5.3 Crypto Mock (Deterministic)

**File: `test/mocks/crypto.mock.ts`**

For most tests, use real `crypto` module. For deterministic tests only:

```
MockCrypto
├── randomBytes(size) -> Returns predictable bytes (for deterministic IV)
├── createCipheriv(algo, key, iv) -> Returns real cipher (uses real crypto)
└── reset() -> Restores real crypto.randomBytes
```

Only mock `randomBytes` when testing that different IVs produce different ciphertexts (TC-UNIT-032).

---

## 6. Test Helper Utilities

### 6.1 Project Factory

**File: `test/helpers/project.factory.ts`**

Provides factory functions for quickly creating test data:

```
createProject(overrides?) -> CreateProjectDto
  Default: name="test-project", displayName="Test Project", team="test-team", teamEmail="test@example.com"
  Override any field via partial object

createPromotionRepo(overrides?) -> CreatePromotionRepoDto
createSourceRepo(overrides?) -> CreateSourceRepoDto
createEnvironment(overrides?) -> CreateEnvironmentDto
createCredential(overrides?) -> CreateCredentialDto
createBranchTracker(overrides?) -> CreateBranchTrackerDto

createFullProject() -> All DTOs for a complete project setup
  Returns: { project, promotionRepo, sourceRepos[5], environments[5], credentials[2], branchTracker }

seedCompleteProject(prisma) -> Creates full project in database, returns all IDs
```

### 6.2 Response Schema Validator

**File: `test/helpers/response-schema.validator.ts`**

Zod schemas that validate the API responses:

```
ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  displayName: z.string().min(1),
  team: z.string().min(1),
  teamEmail: z.string().email(),
  status: z.enum(['active', 'inactive', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

PaginatedProjectsSchema = z.object({
  items: z.array(ProjectSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
})

PromotionRepoSchema = z.object({
  id: z.string().uuid(),
  repoUrl: z.string().url(),
  defaultBranch: z.string(),
  helmChartsPath: z.string(),
  isAccessible: z.boolean(),
})

CredentialResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['git-token', 'jira-api-key', 'gcp-service-account', 'generic']),
  expiresAt: z.string().datetime().nullable(),
  // NOTE: 'value' field must NOT be present
}).strict() // strict mode rejects extra fields like 'value'

FullConfigSchema = z.object({
  project: z.object({ id: z.string(), name: z.string(), team: z.string() }),
  promotionRepo: PromotionRepoConfigSchema.nullable(),
  sourceRepos: z.array(SourceRepoConfigSchema),
  environments: z.array(EnvironmentConfigSchema),
  activeBranches: z.record(z.string()),
  credentials: z.array(z.object({ name: z.string(), type: z.string() })),
})
```

Expose helper: `validateResponse(schema, data)` -> returns `{ valid: boolean, errors: string[] }`

### 6.3 Custom Jest Matchers

**File: `test/helpers/assertion.helpers.ts`**

```
expect.extend({
  toBeValidProjectName(received) -> passes if matches /^[a-z0-9][a-z0-9-]*[a-z0-9]$/ and <= 63 chars
  toBeValidHttpsGitUrl(received) -> passes if matches /^https:\/\/.+\.git$/
  toBeValidValuesFolder(received) -> passes if ends with "-values"
  toContainNoCredentialValues(responseBody) -> fails if body contains any known test credential values
  toHaveValidPagination(response) -> passes if items.length <= limit and page/total are consistent
  toBeEncrypted(value) -> passes if value is base64 and not plaintext
  toBeOrderedBy(array, field) -> passes if array is sorted by field ascending
})
```

### 6.4 Database Seeder

**File: `test/helpers/db-seeder.ts`**

```
seedMinimalProject(prisma) -> Creates project with only metadata, returns projectId
seedProjectWithRepos(prisma) -> Creates project + promotion repo + 5 source repos
seedProjectWithEnvironments(prisma) -> Creates project + 5 environments (default template)
seedFullProject(prisma) -> Creates complete project with all sub-entities
seedMultipleProjects(prisma, count) -> Creates N projects for pagination testing
cleanDatabase(prisma) -> Truncates all tables in correct order (respecting FKs)
```

### 6.5 Encryption Helpers

**File: `test/helpers/encryption.helpers.ts`**

```
generateTestEncryptionKey() -> Returns a valid 32-byte base64 key
encryptWithKey(plaintext, key) -> Encrypts and returns base64 ciphertext
decryptWithKey(ciphertext, key) -> Decrypts and returns plaintext
tamperCiphertext(ciphertext) -> Flips a byte in the ciphertext (for integrity tests)
extractIV(ciphertext) -> Returns the IV portion from encrypted string
```

---

## 7. Test Implementation Details by Category

### 7.1 Unit Tests: Project Validation (TC-UNIT-001 to TC-UNIT-007)

**File: `test/unit/project-validation.spec.ts`**

```
describe('Project Validation')

  TC-UNIT-001: 'should accept valid project name'
    Input: { name: "payment-gateway", displayName: "Payment Gateway", team: "payments", teamEmail: "pay@ex.com" }
    Act: validate CreateProjectDto
    Assert: No errors thrown

  TC-UNIT-002: 'should reject project name with uppercase'
    Input: { name: "Payment-Gateway" }
    Act: validate CreateProjectDto
    Assert: Error message contains "lowercase"

  TC-UNIT-003: 'should reject project name with spaces'
    Input: { name: "payment gateway" }
    Act: validate CreateProjectDto
    Assert: Error message contains "alphanumeric"

  TC-UNIT-004: 'should reject project name exceeding 63 characters'
    Input: { name: "a".repeat(64) }
    Act: validate CreateProjectDto
    Assert: Error message contains "63 characters"

  TC-UNIT-005: 'should reject project name with special characters'
    Input: { name: "payment_gateway!" }
    Act: validate CreateProjectDto
    Assert: Error about allowed characters

  TC-UNIT-006: 'should reject missing team field'
    Input: { name: "payment-gateway", team: "" }
    Act: validate CreateProjectDto
    Assert: Error message contains "team"

  TC-UNIT-007: 'should reject invalid email'
    Input: { teamEmail: "not-an-email" }
    Act: validate CreateProjectDto
    Assert: Error message contains "email"
```

### 7.2 Unit Tests: Repository URL Validation (TC-UNIT-010 to TC-UNIT-014)

**File: `test/unit/repo-url-validation.spec.ts`**

```
describe('Repository URL Validation')

  TC-UNIT-010: 'should accept valid HTTPS Git URL'
    Input: "https://github.com/org/repo.git"
    Assert: Validation passes

  TC-UNIT-011: 'should reject SSH Git URL'
    Input: "git@github.com:org/repo.git"
    Assert: Error indicates HTTPS required

  TC-UNIT-012: 'should reject non-Git URL'
    Input: "https://example.com/not-a-repo"
    Assert: Validation error or deferred to connectivity check

  TC-UNIT-013: 'should reject empty repo URL'
    Input: ""
    Assert: Validation error

  TC-UNIT-014: 'should reject URL with embedded credentials'
    Input: "https://user:pass@github.com/org/repo.git"
    Assert: Error says credentials should be stored separately
```

### 7.3 Unit Tests: Environment Validation (TC-UNIT-020 to TC-UNIT-024)

**File: `test/unit/environment-validation.spec.ts`**

```
describe('Environment Validation')

  TC-UNIT-020: 'should accept valid environment configuration'
    Input: { name: "sit", displayName: "SIT", promotionOrder: 2, valuesFolder: "sit-values" }
    Assert: Validation passes

  TC-UNIT-021: 'should reject duplicate promotion order'
    Setup: Project has env with promotionOrder = 2
    Input: New env with promotionOrder = 2
    Assert: Error contains "promotion order" and "unique"

  TC-UNIT-022: 'should reject values folder not matching pattern'
    Input: { valuesFolder: "sit_configs" }
    Assert: Error indicates expected format

  TC-UNIT-023: 'should reject duplicate environment name'
    Setup: Project has env "sit"
    Input: New env named "sit"
    Assert: Validation error

  TC-UNIT-024: 'should generate correct default template'
    Act: Apply default template
    Assert:
      - 5 environments created
      - Names: dev, sit, uat, pre-prod, prod
      - Orders: 1, 2, 3, 4, 5
      - Each has correct valuesFolder (<name>-values)
      - prod has isProduction = true, others false
```

### 7.4 Unit Tests: Credential Encryption (TC-UNIT-030 to TC-UNIT-033)

**File: `test/unit/credential-encryption.spec.ts`**

```
describe('CredentialService Encryption')

  beforeAll: generate test encryption key, initialize service

  TC-UNIT-030: 'should encrypt credential value before storage'
    Input: "ghp_abc123def456"
    Act: encrypt(input)
    Assert:
      - Output differs from input
      - Output is valid base64
      - decrypt(output) returns original input

  TC-UNIT-031: 'should decrypt to original value'
    Input: Previously encrypted credential
    Act: decrypt(encrypted)
    Assert: Result matches original plaintext

  TC-UNIT-032: 'should produce different ciphertexts for same input'
    Act: encrypt("same-value") twice
    Assert:
      - ciphertext1 !== ciphertext2
      - Both decrypt to "same-value"

  TC-UNIT-033: 'should fail on tampered ciphertext'
    Act: encrypt a value, then tamper a byte
    Assert:
      - decrypt(tampered) throws error
      - Error indicates integrity/authentication failure
```

### 7.5 Unit Tests: Branch Tracker Logic (TC-UNIT-040 to TC-UNIT-043)

**File: `test/unit/branch-tracker-logic.spec.ts`**

```
describe('BranchTrackerService')

  beforeEach: setup mock prisma with branch tracker data

  TC-UNIT-040: 'should find active branch for environment'
    Setup: { dev: "release/2.0.0", sit: "release/1.0.0", uat: "X" }
    Act: getActiveBranches(projectId)
    Assert: result["sit"] === "release/1.0.0"

  TC-UNIT-041: '"X" means not yet promoted'
    Setup: uat has value "X"
    Act: getActiveBranches(projectId)
    Assert: result["uat"] is undefined (not promoted)

  TC-UNIT-042: 'should detect when new branch is needed'
    Setup: dev and sit both have "release/1.0.0"
    Act: getPromotionBranches(projectId, "dev", "sit")
    Assert: sourceBranch === targetBranch (same branch = already promoted)

  TC-UNIT-043: 'should determine promotion branches correctly'
    Setup: dev="release/2.0.0", sit="release/1.0.0"
    Act: getPromotionBranches(projectId, "dev", "sit")
    Assert:
      - sourceBranch = "release/2.0.0" (dev's active)
      - targetBranch = "release/1.0.0" (sit's active)
```

### 7.6 Unit Tests: Configuration Export (TC-UNIT-050 to TC-UNIT-051)

**File: `test/unit/config-export.spec.ts`**

```
describe('ConfigExportService')

  TC-UNIT-050: 'should include all sections in export'
    Setup: Full project with 2 source repos, 4 environments, 1 promotion repo, 2 credentials
    Act: getFullConfig(projectId)
    Assert:
      - Response has keys: project, promotionRepo, sourceRepos, environments, activeBranches, credentials
      - sourceRepos.length === 2
      - environments.length === 4
      - environments are ordered by promotionOrder
      - credentials has 2 items with name and type only

  TC-UNIT-051: 'should exclude credential values from export'
    Act: getFullConfig(projectId)
    Assert:
      - Each credential has "name" and "type"
      - No credential has a "value" field
      - JSON.stringify(result) does NOT contain "ghp_test_token"
      - JSON.stringify(result) does NOT contain "jira_test_key"
```

### 7.7 Integration Tests: Database Operations (TC-INT-001 to TC-INT-006)

**File: `test/integration/database-operations.spec.ts`**

```
describe('Database Operations')

  For Tier 2: use MockPrismaService
  For Tier 3: use Testcontainers PostgreSQL

  TC-INT-001: 'should create and retrieve project'
    Act: Create project, retrieve by ID
    Assert: Retrieved project matches all fields

  TC-INT-002: 'should enforce unique constraint on project name'
    Act: Create two projects with same name
    Assert: Second throws unique constraint error

  TC-INT-003: 'should not delete related data when archiving project'
    Act: Set project status to "archived"
    Assert: Source repos and environments still exist, project status is "archived"

  TC-INT-004: 'should add multiple source repos with different types'
    Act: Add 5 source repos (3 app, 1 aql-db, 1 infra)
    Assert: All 5 retrievable, filter by repoType returns correct subsets

  TC-INT-005: 'should maintain environment ordering'
    Act: Create envs with promotionOrder 3, 1, 5, 2, 4
    Assert: Listing returns them ordered 1, 2, 3, 4, 5

  TC-INT-006: 'should support branch tracker CRUD'
    Act: Create entry, update env status, query active branches
    Assert: All operations succeed, data is consistent
```

### 7.8 Integration Tests: Git Connectivity (TC-INT-010 to TC-INT-013)

**File: `test/integration/git-connectivity.spec.ts`**

```
describe('Git Connectivity Verification')

  TC-INT-010: 'should verify accessible public repo'
    Input: Known public GitHub repo URL
    Assert: isAccessible = true, lastVerifiedAt is updated
    Note: Use mock in CI, real in local with RUN_NETWORK_TESTS=true

  TC-INT-011: 'should report inaccessible repo'
    Input: "https://github.com/nonexistent/repo.git"
    Assert: isAccessible = false, error message captured

  TC-INT-012: 'should verify repo with credentials'
    Input: Private repo URL + Git token
    Assert: isAccessible = true
    Note: Use mock in CI

  TC-INT-013: 'should inject credential into URL correctly'
    Input: "https://github.com/org/repo.git" + token "ghp_abc123"
    Act: Verify repo (using mock git)
    Assert:
      - mockGit.getLastUrl() === "https://ghp_abc123@github.com/org/repo.git"
      - Original stored repo URL is unchanged
```

### 7.9 API E2E Tests: Project CRUD (TC-API-001 to TC-API-008)

**File: `test/api/project-crud.e2e.spec.ts`**

```
describe('Project CRUD API')

  beforeAll: create NestJS test app with Supertest

  TC-API-001: 'POST /api/projects - create valid project'
    Act: POST with complete-project body
    Assert: HTTP 201, response has id (UUID), name matches

  TC-API-002: 'POST /api/projects - duplicate name'
    Setup: Project "payment-gateway" already exists
    Act: POST with same name
    Assert: HTTP 409

  TC-API-003: 'GET /api/projects - paginated list'
    Setup: 25 projects in database
    Act: GET ?page=1&limit=10
    Assert: HTTP 200, items.length === 10, total === 25, totalPages === 3

  TC-API-004: 'GET /api/projects/:id - get by ID'
    Act: GET with valid project ID
    Assert: HTTP 200, full project data

  TC-API-005: 'GET /api/projects/:id - non-existent ID'
    Act: GET with random UUID
    Assert: HTTP 404

  TC-API-006: 'GET /api/projects/by-name/:name - get by name'
    Act: GET with "payment-gateway"
    Assert: HTTP 200, project data

  TC-API-007: 'PATCH /api/projects/:id - update fields'
    Act: PATCH { displayName: "Updated Name" }
    Assert: HTTP 200, displayName changed, other fields unchanged

  TC-API-008: 'DELETE /api/projects/:id - soft delete'
    Act: DELETE valid project
    Assert: HTTP 200, GET returns project with status "archived"
```

### 7.10 API E2E Tests: Promotion Repository (TC-API-010 to TC-API-012)

**File: `test/api/promotion-repo.e2e.spec.ts`**

```
describe('Promotion Repo API')

  TC-API-010: 'POST - set promotion repo'
    Act: POST { repoUrl: "https://github.com/org/promo.git", helmChartsPath: "helm-charts" }
    Assert: HTTP 201, response has id and repoUrl

  TC-API-011: 'POST - duplicate promotion repo rejected'
    Setup: Promotion repo already set
    Act: POST again
    Assert: HTTP 409

  TC-API-012: 'POST verify - check connectivity'
    Act: POST /api/projects/:id/promotion-repo/verify
    Assert: HTTP 200, { accessible: true/false, message: "..." }
```

### 7.11 API E2E Tests: Source Repositories (TC-API-020 to TC-API-023)

**File: `test/api/source-repos.e2e.spec.ts`**

```
describe('Source Repos API')

  TC-API-020: 'POST - add source repo'
    Act: POST { name: "service-auth", repoUrl: "...", repoType: "app" }
    Assert: HTTP 201

  TC-API-021: 'POST - duplicate repo URL rejected'
    Act: POST same repoUrl again
    Assert: HTTP 409

  TC-API-022: 'GET - list with type filter'
    Setup: 3 app repos, 1 aql-db repo, 1 infra repo
    Act: GET ?repoType=app
    Assert: Returns 3 repos, all with repoType "app"

  TC-API-023: 'DELETE - remove repo'
    Act: DELETE valid repo ID
    Assert: HTTP 200, repo no longer in list
```

### 7.12 API E2E Tests: Environments (TC-API-030 to TC-API-032)

**File: `test/api/environments.e2e.spec.ts`**

```
describe('Environments API')

  TC-API-030: 'POST - add environment'
    Act: POST { name: "staging", promotionOrder: 3, valuesFolder: "staging-values" }
    Assert: HTTP 201

  TC-API-031: 'POST apply-template - create default environments'
    Setup: Empty project
    Act: POST /api/projects/:id/environments/apply-template
    Assert: HTTP 201, 5 environments created (dev, sit, uat, pre-prod, prod)

  TC-API-032: 'GET - list ordered by promotion order'
    Act: GET environments
    Assert: Returned in promotionOrder ascending order
```

### 7.13 API E2E Tests: Credentials (TC-API-040 to TC-API-042)

**File: `test/api/credentials.e2e.spec.ts`**

```
describe('Credentials API')

  TC-API-040: 'POST - add credential (value not in response)'
    Act: POST { name: "github-token", type: "git-token", value: "ghp_abc123" }
    Assert:
      - HTTP 201
      - Response has id, name, type, expiresAt
      - Response does NOT have "value" field
      - Response body string does NOT contain "ghp_abc123"

  TC-API-041: 'GET - list credentials without values'
    Act: GET credentials list
    Assert:
      - Each item has name, type
      - No item has "value" field

  TC-API-042: 'PATCH - update credential value'
    Act: PATCH { value: "ghp_new_token" }
    Assert:
      - HTTP 200
      - Response does NOT contain new value
      - Internal check: stored value is different from old encrypted value
```

### 7.14 API E2E Tests: Branch Tracking (TC-API-050 to TC-API-051)

**File: `test/api/branch-tracking.e2e.spec.ts`**

```
describe('Branch Tracking API')

  TC-API-050: 'GET active - get active branches per environment'
    Setup: Branch tracker populated
    Act: GET /api/projects/:id/branches/active
    Assert: Returns map { "dev": "release/2.0.0", "sit": "release/1.0.0" }

  TC-API-051: 'POST - create branch entry'
    Act: POST { branchName: "release/3.0.0", version: "3.0.0" }
    Assert:
      - HTTP 201
      - dev environment gets the branch name
      - All other environments get "X"
```

### 7.15 API E2E Tests: Configuration Export (TC-API-060 to TC-API-061)

**File: `test/api/config-export.e2e.spec.ts`**

```
describe('Config Export API')

  TC-API-060: 'GET config - full configuration export'
    Setup: Fully configured project
    Act: GET /api/projects/:id/config
    Assert:
      - HTTP 200
      - Response has all sections
      - Validates against FullConfigSchema
      - No credential values in response

  TC-API-061: 'GET config - project with no repos'
    Setup: Project with only metadata
    Act: GET /api/projects/:id/config
    Assert:
      - HTTP 200
      - promotionRepo is null
      - sourceRepos is empty array
      - environments is empty array
```

### 7.16 Security Tests (TC-SEC-001 to TC-SEC-008)

**File: `test/security/credential-security.spec.ts`**

```
TC-SEC-001: 'credential values never in API responses'
  Act: Create credential, then GET list, GET config, GET project
  Assert:
    - Scan every response body as string
    - None contain "ghp_test_token_abc123def456"
    - None contain "jira_test_key_xyz789"

TC-SEC-002: 'credential values never in logs'
  Setup: Spy on logger
  Act: Create credential, trigger verification
  Assert:
    - Scan all log output
    - No log contains plaintext credential value
```

**File: `test/security/injection-prevention.spec.ts`**

```
TC-SEC-003: 'SQL injection in project name'
  Input: "test'; DROP TABLE projects; --"
  Assert: Validation rejects (400) or Prisma parameterizes safely (no SQL error)

TC-SEC-004: 'SQL injection in repo URL'
  Input: "https://github.com/org/repo.git'; DROP TABLE source_repos; --"
  Assert: URL validation rejects or stored safely, database intact

TC-SEC-005: 'XSS in project description'
  Input: "<script>alert('xss')</script>"
  Assert: Stored as-is in DB (escaped on frontend), API response doesn't execute
```

**File: `test/security/auth-enforcement.spec.ts`**

```
TC-SEC-006: 'unauthenticated requests rejected'
  Act: All endpoints without auth token
  Assert: HTTP 401 for all
```

**File: `test/security/encryption-integrity.spec.ts`**

```
TC-SEC-007: 'encryption uses unique IV per operation'
  Act: Encrypt same value 100 times
  Assert: All 100 ciphertexts are different

TC-SEC-008: 'credential key rotation'
  Act: Encrypt with key A, rotate to key B
  Assert: System handles rotation (re-encrypts or supports multiple keys)
```

**File: `test/security/credential-leakage-scanner.spec.ts`**

Comprehensive scanner that hits every API endpoint and checks responses:

```
describe('Credential Leakage Scanner')

  beforeAll: seed project with known credential values

  const knownSecrets = [
    'ghp_test_token_abc123def456',
    'jira_test_key_xyz789',
    'test-encryption-key',
  ];

  for each endpoint in allEndpoints:
    it(`${endpoint.method} ${endpoint.path} - no leaked secrets`)
      Act: Call endpoint
      Assert: Response body string does NOT contain any knownSecrets entry
```

### 7.17 Edge Case Tests (TC-EDGE-001 to TC-EDGE-007)

**File: `test/edge-cases/empty-project.spec.ts`**

```
TC-EDGE-001: 'project with zero source repos'
  Act: Create project, add only promotion repo and environments
  Assert: Config export works, sourceRepos is empty array

TC-EDGE-002: 'project with zero environments'
  Act: Create project with repos but no environments
  Assert: Config export works, environments is empty array
```

**File: `test/edge-cases/large-data.spec.ts`**

```
TC-EDGE-003: 'very long project description (10,000 chars)'
  Input: 10,000-character description
  Assert: Stored and retrieved without truncation

TC-EDGE-004: 'source repo with very long URL (500 chars)'
  Input: 500-character repo URL
  Assert: Stored correctly
```

**File: `test/edge-cases/unicode.spec.ts`**

```
TC-EDGE-005: 'Unicode in project display name'
  Input: displayName with Chinese/Japanese/Korean characters
  Assert: Stored and retrieved correctly
```

**File: `test/edge-cases/concurrency.spec.ts`**

```
TC-EDGE-006: 'concurrent project creation with same name'
  Act: Two simultaneous POST requests with same project name
  Assert: One succeeds (201), one fails (409)
```

**File: `test/edge-cases/archived-project.spec.ts`**

```
TC-EDGE-007: 're-register archived project name'
  Setup: Archive project "old-project"
  Act: Create new project named "old-project"
  Assert: Behavior documented and consistent (either reject or allow)
```

### 7.18 Migration Tests (TC-MIG-001 to TC-MIG-003)

**File: `test/migration/meta-sheet-import.spec.ts`**

```
TC-MIG-001: 'import meta-sheet.xlsx into branch tracker'
  Input: test/fixtures/migration/meta-sheet-sample.xlsx
  Act: migrationService.importMetaSheet(projectId, filePath)
  Assert:
    - All branch records imported
    - Environment mapping is correct
    - "X" values preserved
    - Branch names match Excel content
```

**File: `test/migration/jenkins-repo-import.spec.ts`**

```
TC-MIG-002: 'import Jenkins repo lists'
  Input: Newline-separated repo URLs
  Act: migrationService.importRepoList(projectId, repoListText, "app")
  Assert:
    - Each URL becomes a SourceRepo
    - repoType is set correctly
    - Duplicates are skipped
```

**File: `test/migration/helm-folder-import.spec.ts`**

```
TC-MIG-003: 'import Helm chart folder structure as environments'
  Input: ["dev-values", "sit-values", "uat-values", "prod-values"]
  Act: migrationService.importHelmFolderStructure(projectId, folders)
  Assert:
    - 4 environments created
    - Names extracted: dev, sit, uat, prod
    - promotionOrder assigned in folder order
    - valuesFolder matches input
```

---

## 8. CI/CD Pipeline Integration

### 8.1 GitHub Actions Workflow

**File: `.github/workflows/test-project-registry.yml`**

```yaml
name: Project Registry Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    name: "Tier 1: Unit Tests"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:unit -- --ci --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: unit-coverage
          path: test/reports/coverage/

  integration-tests:
    name: "Tier 2: Integration Tests (Mocked)"
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:int -- --ci
      - run: npm run test:e2e -- --ci

  integration-tests-real:
    name: "Tier 3: Integration Tests (Containers)"
    runs-on: ubuntu-latest
    needs: integration-tests
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: garuda_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/garuda_test
      ENCRYPTION_KEY: dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcw==
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run test:int -- --ci
      - run: npm run test:migration -- --ci
      - run: npm run test:security -- --ci

  security-audit:
    name: "Security: Credential Leakage Scan"
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:security -- --ci --verbose
```

### 8.2 Pre-commit Hook

Add to `package.json` (using husky or lint-staged):

```json
{
  "lint-staged": {
    "src/project/**/*.ts": [
      "npm run test:unit -- --bail --findRelatedTests"
    ]
  }
}
```

---

## 9. Test Reporting

### 9.1 Jest Reports

| Report | Format | Location | Purpose |
|--------|--------|----------|---------|
| Console | Text | stdout | Developer feedback |
| Coverage summary | Text | stdout | Quick coverage check |
| Coverage detail | LCOV + HTML | `test/reports/coverage/lcov-report/` | Visual coverage browser |
| JUnit XML | XML | `test/reports/junit.xml` | CI/CD integration |
| JSON summary | JSON | `test/reports/coverage/coverage-summary.json` | Automated threshold checks |

Add to Jest config:
```typescript
reporters: [
  'default',
  ['jest-junit', { outputDirectory: 'test/reports', outputName: 'junit.xml' }],
],
```

### 9.2 Coverage Dashboard (in CI)

Use coverage badges in README or PR comments:
- Parse `coverage-summary.json` in CI
- Fail PR if coverage drops below thresholds
- Post coverage diff as PR comment

---

## 10. Test Execution Commands - Quick Reference

| Command | What It Runs | When to Use |
|---------|-------------|-------------|
| `npm run test:unit` | TC-UNIT-*, TC-EDGE-* (32 tests) | During development, on save |
| `npm run test:int` | TC-INT-* (13 tests) | Before pushing |
| `npm run test:e2e` | TC-API-*, TC-SEC-*, TC-MIG-*, TC-EDGE-* (40 tests) | Before pushing |
| `npm run test:security` | TC-SEC-* only (8 tests) | Security review |
| `npm run test:migration` | TC-MIG-* only (3 tests) | Migration testing |
| `npm run test:edge` | TC-EDGE-* only (7 tests) | Edge case validation |
| `npm run test:all` | All Jest tests (65 tests) | Full validation |
| `npm run test:ci` | All + coverage + CI flags | GitHub Actions |
| `npm run test:coverage` | All + coverage report | Coverage audit |
| `npm run test:watch` | Unit tests in watch mode | Active development |

---

## 11. Test-to-Code Traceability Matrix

| Test Case ID | Test File | Service Under Test | Fixture Used |
|-------------|-----------|-------------------|-------------|
| TC-UNIT-001 | unit/project-validation.spec.ts | CreateProjectDto | None (inline) |
| TC-UNIT-002 | unit/project-validation.spec.ts | CreateProjectDto | None (inline) |
| TC-UNIT-003 | unit/project-validation.spec.ts | CreateProjectDto | None (inline) |
| TC-UNIT-004 | unit/project-validation.spec.ts | CreateProjectDto | None (inline) |
| TC-UNIT-005 | unit/project-validation.spec.ts | CreateProjectDto | None (inline) |
| TC-UNIT-006 | unit/project-validation.spec.ts | CreateProjectDto | None (inline) |
| TC-UNIT-007 | unit/project-validation.spec.ts | CreateProjectDto | None (inline) |
| TC-UNIT-010 | unit/repo-url-validation.spec.ts | CreatePromotionRepoDto / CreateSourceRepoDto | repos/invalid-repo-urls.json |
| TC-UNIT-011 | unit/repo-url-validation.spec.ts | CreateSourceRepoDto | repos/invalid-repo-urls.json |
| TC-UNIT-012 | unit/repo-url-validation.spec.ts | CreateSourceRepoDto | repos/invalid-repo-urls.json |
| TC-UNIT-013 | unit/repo-url-validation.spec.ts | CreateSourceRepoDto | repos/invalid-repo-urls.json |
| TC-UNIT-014 | unit/repo-url-validation.spec.ts | NoEmbeddedCredentials validator | repos/invalid-repo-urls.json |
| TC-UNIT-020 | unit/environment-validation.spec.ts | CreateEnvironmentDto | environments/custom-environments.json |
| TC-UNIT-021 | unit/environment-validation.spec.ts | EnvironmentService | environments/invalid-environments.json |
| TC-UNIT-022 | unit/environment-validation.spec.ts | CreateEnvironmentDto | environments/invalid-environments.json |
| TC-UNIT-023 | unit/environment-validation.spec.ts | EnvironmentService | environments/invalid-environments.json |
| TC-UNIT-024 | unit/environment-validation.spec.ts | EnvironmentService | environments/default-template.json |
| TC-UNIT-030 | unit/credential-encryption.spec.ts | CredentialService | credentials/valid-credentials.json |
| TC-UNIT-031 | unit/credential-encryption.spec.ts | CredentialService | credentials/valid-credentials.json |
| TC-UNIT-032 | unit/credential-encryption.spec.ts | CredentialService | credentials/valid-credentials.json |
| TC-UNIT-033 | unit/credential-encryption.spec.ts | CredentialService | credentials/encryption-test-vectors.json |
| TC-UNIT-040 | unit/branch-tracker-logic.spec.ts | BranchTrackerService | branches/branch-tracker-data.json |
| TC-UNIT-041 | unit/branch-tracker-logic.spec.ts | BranchTrackerService | branches/branch-tracker-data.json |
| TC-UNIT-042 | unit/branch-tracker-logic.spec.ts | BranchTrackerService | branches/promotion-scenarios.json |
| TC-UNIT-043 | unit/branch-tracker-logic.spec.ts | BranchTrackerService | branches/promotion-scenarios.json |
| TC-UNIT-050 | unit/config-export.spec.ts | ConfigExportService | projects/complete-project.json |
| TC-UNIT-051 | unit/config-export.spec.ts | ConfigExportService | projects/complete-project.json |
| TC-INT-001 | integration/database-operations.spec.ts | ProjectService + PrismaService | projects/complete-project.json |
| TC-INT-002 | integration/database-operations.spec.ts | ProjectService + PrismaService | projects/minimal-project.json |
| TC-INT-003 | integration/database-operations.spec.ts | ProjectService + PrismaService | projects/complete-project.json |
| TC-INT-004 | integration/database-operations.spec.ts | ProjectService + PrismaService | repos/valid-source-repos.json |
| TC-INT-005 | integration/database-operations.spec.ts | EnvironmentService + PrismaService | environments/custom-environments.json |
| TC-INT-006 | integration/database-operations.spec.ts | BranchTrackerService + PrismaService | branches/branch-tracker-data.json |
| TC-INT-010 | integration/git-connectivity.spec.ts | RepoVerificationService | repos/valid-promotion-repo.json |
| TC-INT-011 | integration/git-connectivity.spec.ts | RepoVerificationService | None (non-existent URL) |
| TC-INT-012 | integration/git-connectivity.spec.ts | RepoVerificationService | credentials/valid-credentials.json |
| TC-INT-013 | integration/git-connectivity.spec.ts | RepoVerificationService | credentials/valid-credentials.json |
| TC-API-001 | api/project-crud.e2e.spec.ts | ProjectController | projects/complete-project.json |
| TC-API-002 | api/project-crud.e2e.spec.ts | ProjectController | projects/complete-project.json |
| TC-API-003 | api/project-crud.e2e.spec.ts | ProjectController | projects/multiple-projects.json |
| TC-API-004 | api/project-crud.e2e.spec.ts | ProjectController | projects/complete-project.json |
| TC-API-005 | api/project-crud.e2e.spec.ts | ProjectController | None (random UUID) |
| TC-API-006 | api/project-crud.e2e.spec.ts | ProjectController | projects/complete-project.json |
| TC-API-007 | api/project-crud.e2e.spec.ts | ProjectController | projects/complete-project.json |
| TC-API-008 | api/project-crud.e2e.spec.ts | ProjectController | projects/complete-project.json |
| TC-API-010 | api/promotion-repo.e2e.spec.ts | PromotionRepoController | repos/valid-promotion-repo.json |
| TC-API-011 | api/promotion-repo.e2e.spec.ts | PromotionRepoController | repos/valid-promotion-repo.json |
| TC-API-012 | api/promotion-repo.e2e.spec.ts | PromotionRepoController | repos/valid-promotion-repo.json |
| TC-API-020 | api/source-repos.e2e.spec.ts | SourceRepoController | repos/valid-source-repos.json |
| TC-API-021 | api/source-repos.e2e.spec.ts | SourceRepoController | repos/valid-source-repos.json |
| TC-API-022 | api/source-repos.e2e.spec.ts | SourceRepoController | repos/valid-source-repos.json |
| TC-API-023 | api/source-repos.e2e.spec.ts | SourceRepoController | repos/valid-source-repos.json |
| TC-API-030 | api/environments.e2e.spec.ts | EnvironmentController | environments/custom-environments.json |
| TC-API-031 | api/environments.e2e.spec.ts | EnvironmentController | None (template) |
| TC-API-032 | api/environments.e2e.spec.ts | EnvironmentController | environments/custom-environments.json |
| TC-API-040 | api/credentials.e2e.spec.ts | CredentialController | credentials/valid-credentials.json |
| TC-API-041 | api/credentials.e2e.spec.ts | CredentialController | credentials/valid-credentials.json |
| TC-API-042 | api/credentials.e2e.spec.ts | CredentialController | credentials/valid-credentials.json |
| TC-API-050 | api/branch-tracking.e2e.spec.ts | BranchTrackerController | branches/branch-tracker-data.json |
| TC-API-051 | api/branch-tracking.e2e.spec.ts | BranchTrackerController | None (inline) |
| TC-API-060 | api/config-export.e2e.spec.ts | ProjectController + ConfigExportService | projects/complete-project.json |
| TC-API-061 | api/config-export.e2e.spec.ts | ProjectController + ConfigExportService | projects/minimal-project.json |
| TC-SEC-001 | security/credential-security.spec.ts | All controllers | credentials/valid-credentials.json |
| TC-SEC-002 | security/credential-security.spec.ts | All services | credentials/valid-credentials.json |
| TC-SEC-003 | security/injection-prevention.spec.ts | ProjectService | security/sql-injection-payloads.json |
| TC-SEC-004 | security/injection-prevention.spec.ts | SourceRepoController | security/sql-injection-payloads.json |
| TC-SEC-005 | security/injection-prevention.spec.ts | ProjectController | security/xss-payloads.json |
| TC-SEC-006 | security/auth-enforcement.spec.ts | Auth Guard | None |
| TC-SEC-007 | security/encryption-integrity.spec.ts | CredentialService | None (generated) |
| TC-SEC-008 | security/encryption-integrity.spec.ts | CredentialService | credentials/encryption-test-vectors.json |
| TC-EDGE-001 | edge-cases/empty-project.spec.ts | ConfigExportService | projects/minimal-project.json |
| TC-EDGE-002 | edge-cases/empty-project.spec.ts | ConfigExportService | projects/minimal-project.json |
| TC-EDGE-003 | edge-cases/large-data.spec.ts | ProjectService | None (generated) |
| TC-EDGE-004 | edge-cases/large-data.spec.ts | SourceRepoService | None (generated) |
| TC-EDGE-005 | edge-cases/unicode.spec.ts | ProjectService | None (inline) |
| TC-EDGE-006 | edge-cases/concurrency.spec.ts | ProjectService | projects/minimal-project.json |
| TC-EDGE-007 | edge-cases/archived-project.spec.ts | ProjectService | projects/minimal-project.json |
| TC-MIG-001 | migration/meta-sheet-import.spec.ts | MigrationService | migration/meta-sheet-sample.xlsx |
| TC-MIG-002 | migration/jenkins-repo-import.spec.ts | MigrationService | migration/repo-lists.json |
| TC-MIG-003 | migration/helm-folder-import.spec.ts | MigrationService | migration/helm-folders.json |

---

**Document Version:** 1.0
**Last Updated:** February 16, 2026
**Total Automated Test Cases:** 65
