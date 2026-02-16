# Project Registration & Configuration - Implementation Guide

## Iteration 00 | Step-by-Step Implementation Plan

---

## 1. Prerequisites

### 1.1 Development Environment Setup

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Runtime for NestJS backend |
| npm/yarn/pnpm | Latest | Package manager |
| PostgreSQL | 15+ | Database for project registry |
| Redis | 7+ | Caching configuration exports |
| Git | 2.40+ | Version control and repo verification |
| OpenSSL | 3.x | Credential encryption (AES-256-GCM) |

### 1.2 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/garuda_one` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `ENCRYPTION_KEY` | 32-byte key for AES-256-GCM credential encryption | `base64-encoded-32-byte-key` |
| `GIT_TIMEOUT_MS` | Timeout for git ls-remote verification | `10000` |

### 1.3 Project Dependencies (npm packages)

```
# NestJS core
@nestjs/common @nestjs/core @nestjs/platform-express

# Database
@prisma/client prisma    # ORM for PostgreSQL
pg                       # PostgreSQL driver

# Cache
ioredis                  # Redis client
@nestjs/cache-manager    # NestJS cache integration
cache-manager-ioredis-yet

# Validation
class-validator class-transformer zod

# Encryption
crypto                   # Node.js built-in (AES-256-GCM)

# Git operations
simple-git               # Git ls-remote for repo verification

# Excel parsing (migration)
exceljs                  # Read meta-sheet.xlsx for branch tracker import

# Utilities
uuid                     # UUID generation

# Testing
jest ts-jest @nestjs/testing supertest
```

---

## 2. Project Structure

Create the following folder structure under the NestJS backend:

```
src/
├── project/
│   ├── project.module.ts                      # Project feature module
│   ├── project.controller.ts                  # Project CRUD endpoints
│   ├── project.service.ts                     # Core project business logic
│   ├── dto/
│   │   ├── create-project.dto.ts              # Create project validation
│   │   ├── update-project.dto.ts              # Update project validation
│   │   ├── create-promotion-repo.dto.ts       # Promotion repo validation
│   │   ├── create-source-repo.dto.ts          # Source repo validation
│   │   ├── create-environment.dto.ts          # Environment validation
│   │   ├── create-credential.dto.ts           # Credential validation
│   │   ├── create-branch-tracker.dto.ts       # Branch tracker validation
│   │   └── pagination.dto.ts                  # Pagination query params
│   ├── interfaces/
│   │   ├── project-config.interface.ts        # Full config export type
│   │   └── repo-verification.interface.ts     # Verification result type
│   ├── services/
│   │   ├── credential.service.ts              # Encryption/decryption logic
│   │   ├── repo-verification.service.ts       # Git ls-remote connectivity check
│   │   ├── branch-tracker.service.ts          # Branch tracking logic (replaces merger.py)
│   │   ├── environment.service.ts             # Environment CRUD and template
│   │   ├── config-export.service.ts           # Full configuration export builder
│   │   └── migration.service.ts               # Import from meta-sheet.xlsx / Jenkins vars
│   ├── controllers/
│   │   ├── promotion-repo.controller.ts       # Promotion repo endpoints
│   │   ├── source-repo.controller.ts          # Source repo endpoints
│   │   ├── environment.controller.ts          # Environment endpoints
│   │   ├── credential.controller.ts           # Credential endpoints
│   │   └── branch-tracker.controller.ts       # Branch tracking endpoints
│   └── __tests__/
│       ├── project.service.spec.ts
│       ├── credential.service.spec.ts
│       ├── repo-verification.service.spec.ts
│       ├── branch-tracker.service.spec.ts
│       ├── config-export.service.spec.ts
│       └── fixtures/
│           ├── complete-project.json
│           ├── minimal-project.json
│           └── invalid-inputs.json
├── prisma/
│   └── schema.prisma                          # Database schema
└── config/
    └── project.config.ts                      # Project-related configuration
```

---

## 3. Implementation Steps

### Step 1: Database Schema

Define the Prisma schema for the project registry.

**File: `prisma/schema.prisma`**

Add the following models:

```prisma
model Project {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique
  displayName String   @map("display_name")
  description String?
  team        String
  teamEmail   String   @map("team_email")
  status      ProjectStatus @default(active)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  promotionRepo  PromotionRepo?
  sourceRepos    SourceRepo[]
  environments   Environment[]
  credentials    Credential[]
  branchTrackers BranchTracker[]

  @@map("projects")
}

enum ProjectStatus {
  active
  inactive
  archived
}

model PromotionRepo {
  id              String   @id @default(uuid()) @db.Uuid
  projectId       String   @unique @map("project_id") @db.Uuid
  repoUrl         String   @map("repo_url")
  defaultBranch   String   @default("master") @map("default_branch")
  helmChartsPath  String   @default("helm-charts") @map("helm_charts_path")
  metaSheetPath   String?  @map("meta_sheet_path")
  isAccessible    Boolean  @default(false) @map("is_accessible")
  lastVerifiedAt  DateTime? @map("last_verified_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id])

  @@map("promotion_repos")
}

model SourceRepo {
  id              String   @id @default(uuid()) @db.Uuid
  projectId       String   @map("project_id") @db.Uuid
  name            String
  repoUrl         String   @map("repo_url")
  repoType        RepoType @map("repo_type")
  defaultBranch   String   @default("main") @map("default_branch")
  helmValuesPath  String?  @map("helm_values_path")
  isAccessible    Boolean  @default(false) @map("is_accessible")
  lastVerifiedAt  DateTime? @map("last_verified_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id])

  @@unique([projectId, repoUrl])
  @@map("source_repos")
}

enum RepoType {
  app
  aql_db  @map("aql-db")
  sql_db  @map("sql-db")
  infra
}

model Environment {
  id                  String   @id @default(uuid()) @db.Uuid
  projectId           String   @map("project_id") @db.Uuid
  name                String
  displayName         String   @map("display_name")
  promotionOrder      Int      @map("promotion_order")
  kubernetesNamespace String?  @map("kubernetes_namespace")
  clusterName         String?  @map("cluster_name")
  valuesFolder        String   @map("values_folder")
  isProduction        Boolean  @default(false) @map("is_production")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id])

  @@unique([projectId, name])
  @@unique([projectId, promotionOrder])
  @@map("environments")
}

model Credential {
  id          String          @id @default(uuid()) @db.Uuid
  projectId   String          @map("project_id") @db.Uuid
  name        String
  type        CredentialType
  value       String          // Encrypted at rest (AES-256-GCM)
  expiresAt   DateTime?       @map("expires_at")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id])

  @@unique([projectId, name])
  @@map("credentials")
}

enum CredentialType {
  git_token       @map("git-token")
  jira_api_key    @map("jira-api-key")
  gcp_service_account @map("gcp-service-account")
  generic
}

model BranchTracker {
  id                  String   @id @default(uuid()) @db.Uuid
  projectId           String   @map("project_id") @db.Uuid
  branchName          String   @map("branch_name")
  environmentStatuses Json     @map("environment_statuses")
  version             String
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id])

  @@map("branch_trackers")
}
```

**Actions:**
1. Add these models to the Prisma schema
2. Run `npx prisma migrate dev --name add-project-registry-tables`
3. Run `npx prisma generate` to update the client

---

### Step 2: DTOs and Validation

**File: `src/project/dto/create-project.dto.ts`**

```typescript
import { IsString, IsEmail, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'name must be lowercase alphanumeric with hyphens, cannot start/end with hyphen',
  })
  @MaxLength(63, { message: 'name must not exceed 63 characters' })
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  team: string;

  @IsEmail({}, { message: 'teamEmail must be a valid email address' })
  teamEmail: string;
}
```

**File: `src/project/dto/create-promotion-repo.dto.ts`**

```typescript
import { IsString, IsOptional, Matches } from 'class-validator';

export class CreatePromotionRepoDto {
  @IsString()
  @Matches(/^https:\/\/.+\.git$/, {
    message: 'repoUrl must be a valid HTTPS Git URL ending in .git',
  })
  repoUrl: string;

  @IsString()
  @IsOptional()
  defaultBranch?: string;

  @IsString()
  @IsOptional()
  helmChartsPath?: string;

  @IsString()
  @IsOptional()
  metaSheetPath?: string;
}
```

**File: `src/project/dto/create-source-repo.dto.ts`**

```typescript
import { IsString, IsEnum, IsOptional, Matches } from 'class-validator';

export class CreateSourceRepoDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^https:\/\/.+\.git$/, {
    message: 'repoUrl must be a valid HTTPS Git URL ending in .git',
  })
  repoUrl: string;

  @IsEnum(['app', 'aql-db', 'sql-db', 'infra'], {
    message: 'repoType must be one of: app, aql-db, sql-db, infra',
  })
  repoType: 'app' | 'aql-db' | 'sql-db' | 'infra';

  @IsString()
  @IsOptional()
  defaultBranch?: string;

  @IsString()
  @IsOptional()
  helmValuesPath?: string;
}
```

**File: `src/project/dto/create-environment.dto.ts`**

```typescript
import { IsString, IsInt, IsBoolean, IsOptional, Matches, Min } from 'class-validator';

export class CreateEnvironmentDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsInt()
  @Min(1)
  promotionOrder: number;

  @IsString()
  @IsOptional()
  kubernetesNamespace?: string;

  @IsString()
  @IsOptional()
  clusterName?: string;

  @IsString()
  @Matches(/^.+-values$/, {
    message: 'valuesFolder must end with "-values" (e.g., "dev-values")',
  })
  valuesFolder: string;

  @IsBoolean()
  @IsOptional()
  isProduction?: boolean;
}
```

**File: `src/project/dto/create-credential.dto.ts`**

```typescript
import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateCredentialDto {
  @IsString()
  name: string;

  @IsEnum(['git-token', 'jira-api-key', 'gcp-service-account', 'generic'], {
    message: 'type must be one of: git-token, jira-api-key, gcp-service-account, generic',
  })
  type: 'git-token' | 'jira-api-key' | 'gcp-service-account' | 'generic';

  @IsString()
  value: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
```

**File: `src/project/dto/create-branch-tracker.dto.ts`**

```typescript
import { IsString } from 'class-validator';

export class CreateBranchTrackerDto {
  @IsString()
  branchName: string;

  @IsString()
  version: string;
}
```

**File: `src/project/dto/update-project.dto.ts`**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
```

**File: `src/project/dto/pagination.dto.ts`**

```typescript
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
```

**Validation for URL with embedded credentials (FR-002, TC-UNIT-014):**

Add a custom validator that rejects URLs containing `user:pass@`:

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'noEmbeddedCredentials', async: false })
export class NoEmbeddedCredentials implements ValidatorConstraintInterface {
  validate(url: string) {
    const parsed = new URL(url);
    return !parsed.username && !parsed.password;
  }

  defaultMessage() {
    return 'URL must not contain embedded credentials. Store credentials separately.';
  }
}
```

---

### Step 3: Credential Encryption Service

**File: `src/project/services/credential.service.ts`**

This service handles AES-256-GCM encryption/decryption for stored credentials.

**Implementation approach:**

1. Read encryption key from `ENCRYPTION_KEY` environment variable (32-byte base64-encoded)
2. `encrypt(plaintext)` method:
   - Generate random 12-byte IV using `crypto.randomBytes(12)`
   - Create AES-256-GCM cipher with key + IV
   - Encrypt plaintext
   - Get auth tag (16 bytes)
   - Return base64 of `IV + authTag + ciphertext`
3. `decrypt(encryptedBase64)` method:
   - Decode base64
   - Extract IV (first 12 bytes), authTag (next 16 bytes), ciphertext (rest)
   - Create decipher with key + IV
   - Set auth tag
   - Decrypt and return plaintext
4. Key properties:
   - Same plaintext produces different ciphertext each time (random IV)
   - Tampered ciphertext throws authentication error
   - Key rotation: support decrypting with old key, re-encrypting with new key

```typescript
@Injectable()
export class CredentialService {
  private readonly key: Buffer;

  constructor(private readonly prisma: PrismaService) {
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (256 bits)');
    }
  }

  encrypt(plaintext: string): string { /* ... */ }
  decrypt(encrypted: string): string { /* ... */ }

  async createCredential(projectId: string, dto: CreateCredentialDto) {
    const encrypted = this.encrypt(dto.value);
    return this.prisma.credential.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        value: encrypted,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      select: { id: true, name: true, type: true, expiresAt: true, createdAt: true },
      // Never select 'value' in responses
    });
  }

  async getCredentials(projectId: string) {
    return this.prisma.credential.findMany({
      where: { projectId },
      select: { id: true, name: true, type: true, expiresAt: true, createdAt: true },
      // Never return value
    });
  }

  async getDecryptedValue(credentialId: string): string {
    // Used internally by other services (e.g., repo verification)
    const cred = await this.prisma.credential.findUniqueOrThrow({ where: { id: credentialId } });
    return this.decrypt(cred.value);
  }
}
```

---

### Step 4: Repository Verification Service

**File: `src/project/services/repo-verification.service.ts`**

Verifies that registered Git repos are accessible using `git ls-remote`.

**Implementation approach:**

1. Use `simple-git` library to run `git ls-remote <url>`
2. For private repos, inject the credential token into the URL: `https://<token>@github.com/org/repo.git`
3. Set a timeout (default 10 seconds) to prevent hanging
4. Update `isAccessible` and `lastVerifiedAt` fields in the database
5. Return structured result with success/failure and error message

```typescript
@Injectable()
export class RepoVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialService: CredentialService,
  ) {}

  async verifyRepo(repoUrl: string, credentialId?: string): Promise<VerificationResult> {
    let urlWithAuth = repoUrl;

    // Inject credential if provided
    if (credentialId) {
      const token = await this.credentialService.getDecryptedValue(credentialId);
      const url = new URL(repoUrl);
      url.username = token;
      urlWithAuth = url.toString();
    }

    try {
      const git = simpleGit();
      await git.listRemote(['--refs', urlWithAuth]);
      return { accessible: true, message: 'Repository is accessible' };
    } catch (error) {
      return { accessible: false, message: error.message };
    }
  }

  async verifyPromotionRepo(projectId: string): Promise<VerificationResult> {
    const repo = await this.prisma.promotionRepo.findUnique({ where: { projectId } });
    const result = await this.verifyRepo(repo.repoUrl);

    await this.prisma.promotionRepo.update({
      where: { id: repo.id },
      data: { isAccessible: result.accessible, lastVerifiedAt: new Date() },
    });

    return result;
  }

  async verifySourceRepo(repoId: string): Promise<VerificationResult> {
    const repo = await this.prisma.sourceRepo.findUniqueOrThrow({ where: { id: repoId } });
    const result = await this.verifyRepo(repo.repoUrl);

    await this.prisma.sourceRepo.update({
      where: { id: repo.id },
      data: { isAccessible: result.accessible, lastVerifiedAt: new Date() },
    });

    return result;
  }
}
```

**Important:** The original credential URL must never be stored with the token embedded. The token is injected only at verification time and discarded.

---

### Step 5: Branch Tracker Service

**File: `src/project/services/branch-tracker.service.ts`**

Replaces `merger.py`'s branch tracking logic with a database-backed service.

**Implementation approach:**

1. **Create branch entry:** When a new release branch is created, add a BranchTracker record with all environments set to "X" (not promoted) except the first environment
2. **Get active branches:** For each environment, find the most recent branch where that environment is not "X"
3. **Update environment status:** When promoting to an environment, update the branchName for that env
4. **Determine promotion branches:** Given source env (x-1) and target env (x), return which branches to compare — equivalent to `merger.py`'s `find_last_updated_branch()`

```typescript
@Injectable()
export class BranchTrackerService {
  constructor(private readonly prisma: PrismaService) {}

  async createBranch(projectId: string, dto: CreateBranchTrackerDto) {
    // Get all environments for this project (ordered)
    const envs = await this.prisma.environment.findMany({
      where: { projectId },
      orderBy: { promotionOrder: 'asc' },
    });

    // Initialize environment statuses: first env gets the branch name, rest get "X"
    const environmentStatuses: Record<string, string> = {};
    envs.forEach((env, index) => {
      environmentStatuses[env.name] = index === 0 ? dto.branchName : 'X';
    });

    return this.prisma.branchTracker.create({
      data: {
        projectId,
        branchName: dto.branchName,
        version: dto.version,
        environmentStatuses,
        isActive: true,
      },
    });
  }

  async getActiveBranches(projectId: string): Promise<Record<string, string>> {
    const trackers = await this.prisma.branchTracker.findMany({
      where: { projectId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const envs = await this.prisma.environment.findMany({
      where: { projectId },
      orderBy: { promotionOrder: 'asc' },
    });

    // For each environment, find the latest branch that is not "X"
    const activeBranches: Record<string, string> = {};
    for (const env of envs) {
      for (const tracker of trackers) {
        const statuses = tracker.environmentStatuses as Record<string, string>;
        if (statuses[env.name] && statuses[env.name] !== 'X') {
          activeBranches[env.name] = statuses[env.name];
          break;
        }
      }
    }

    return activeBranches;
  }

  async getPromotionBranches(projectId: string, sourceEnv: string, targetEnv: string) {
    const activeBranches = await this.getActiveBranches(projectId);
    return {
      sourceBranch: activeBranches[sourceEnv] || null,
      targetBranch: activeBranches[targetEnv] || null,
    };
  }

  async updateEnvironmentStatus(trackerId: string, envName: string, branchName: string) {
    const tracker = await this.prisma.branchTracker.findUniqueOrThrow({
      where: { id: trackerId },
    });
    const statuses = tracker.environmentStatuses as Record<string, string>;
    statuses[envName] = branchName;

    return this.prisma.branchTracker.update({
      where: { id: trackerId },
      data: { environmentStatuses: statuses },
    });
  }
}
```

---

### Step 6: Environment Service

**File: `src/project/services/environment.service.ts`**

Handles environment CRUD and the default template feature.

**Implementation approach:**

```typescript
@Injectable()
export class EnvironmentService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultTemplate = [
    { name: 'dev', displayName: 'Development', promotionOrder: 1, valuesFolder: 'dev-values', isProduction: false },
    { name: 'sit', displayName: 'System Integration Testing', promotionOrder: 2, valuesFolder: 'sit-values', isProduction: false },
    { name: 'uat', displayName: 'User Acceptance Testing', promotionOrder: 3, valuesFolder: 'uat-values', isProduction: false },
    { name: 'pre-prod', displayName: 'Pre-Production', promotionOrder: 4, valuesFolder: 'pre-prod-values', isProduction: false },
    { name: 'prod', displayName: 'Production', promotionOrder: 5, valuesFolder: 'prod-values', isProduction: true },
  ];

  async applyTemplate(projectId: string) {
    // Check no environments exist yet
    const existing = await this.prisma.environment.count({ where: { projectId } });
    if (existing > 0) {
      throw new ConflictException('Project already has environments. Remove them first or add individually.');
    }

    return this.prisma.environment.createMany({
      data: this.defaultTemplate.map(env => ({ ...env, projectId })),
    });
  }

  async listEnvironments(projectId: string) {
    return this.prisma.environment.findMany({
      where: { projectId },
      orderBy: { promotionOrder: 'asc' },
    });
  }

  async addEnvironment(projectId: string, dto: CreateEnvironmentDto) {
    // Validate unique name and promotionOrder within project
    const existing = await this.prisma.environment.findFirst({
      where: {
        projectId,
        OR: [
          { name: dto.name },
          { promotionOrder: dto.promotionOrder },
        ],
      },
    });

    if (existing) {
      if (existing.name === dto.name) {
        throw new ConflictException(`Environment "${dto.name}" already exists in this project`);
      }
      throw new ConflictException(`Promotion order ${dto.promotionOrder} is already used by "${existing.name}"`);
    }

    return this.prisma.environment.create({
      data: { ...dto, projectId },
    });
  }
}
```

---

### Step 7: Configuration Export Service

**File: `src/project/services/config-export.service.ts`**

Assembles the complete project configuration as a single JSON payload.

**Implementation approach:**

```typescript
@Injectable()
export class ConfigExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchTrackerService: BranchTrackerService,
  ) {}

  async getFullConfig(projectId: string): Promise<ProjectConfig> {
    // Fetch all entities in parallel
    const [project, promotionRepo, sourceRepos, environments, credentials] = await Promise.all([
      this.prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
      this.prisma.promotionRepo.findUnique({ where: { projectId } }),
      this.prisma.sourceRepo.findMany({ where: { projectId } }),
      this.prisma.environment.findMany({ where: { projectId }, orderBy: { promotionOrder: 'asc' } }),
      this.prisma.credential.findMany({
        where: { projectId },
        select: { id: true, name: true, type: true, expiresAt: true },
        // Never include value
      }),
    ]);

    // Get active branches
    const activeBranches = await this.branchTrackerService.getActiveBranches(projectId);

    return {
      project: {
        id: project.id,
        name: project.name,
        displayName: project.displayName,
        team: project.team,
        status: project.status,
      },
      promotionRepo: promotionRepo ? {
        repoUrl: promotionRepo.repoUrl,
        helmChartsPath: promotionRepo.helmChartsPath,
        defaultBranch: promotionRepo.defaultBranch,
      } : null,
      sourceRepos: sourceRepos.map(r => ({
        name: r.name,
        repoUrl: r.repoUrl,
        repoType: r.repoType,
        defaultBranch: r.defaultBranch,
      })),
      environments: environments.map(e => ({
        name: e.name,
        promotionOrder: e.promotionOrder,
        valuesFolder: e.valuesFolder,
        namespace: e.kubernetesNamespace,
        isProduction: e.isProduction,
      })),
      activeBranches,
      credentials: credentials.map(c => ({
        name: c.name,
        type: c.type,
      })),
    };
  }
}
```

**Key design decisions:**
- Credential values are **never** included in the export
- Environments are always sorted by `promotionOrder` ascending
- `activeBranches` maps environment name to branch name (or absent if not promoted)
- `promotionRepo` is null if not configured yet

---

### Step 8: Project Service (Core Business Logic)

**File: `src/project/project.service.ts`**

The main service orchestrating project CRUD operations.

```typescript
@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repoVerificationService: RepoVerificationService,
    private readonly credentialService: CredentialService,
  ) {}

  async createProject(dto: CreateProjectDto) {
    // Check for duplicate name
    const existing = await this.prisma.project.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Project "${dto.name}" already exists`);
    }

    return this.prisma.project.create({ data: dto });
  }

  async listProjects(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProjectById(id: string) {
    return this.prisma.project.findUniqueOrThrow({ where: { id } });
  }

  async getProjectByName(name: string) {
    return this.prisma.project.findUniqueOrThrow({ where: { name } });
  }

  async updateProject(id: string, dto: UpdateProjectDto) {
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async archiveProject(id: string) {
    return this.prisma.project.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  // Promotion Repo
  async setPromotionRepo(projectId: string, dto: CreatePromotionRepoDto) {
    const existing = await this.prisma.promotionRepo.findUnique({ where: { projectId } });
    if (existing) {
      throw new ConflictException('Project already has a promotion repo. Update it instead.');
    }

    const repo = await this.prisma.promotionRepo.create({
      data: { projectId, ...dto },
    });

    // Optionally verify connectivity on creation
    await this.repoVerificationService.verifyPromotionRepo(projectId);

    return repo;
  }

  // Source Repos
  async addSourceRepo(projectId: string, dto: CreateSourceRepoDto) {
    const existing = await this.prisma.sourceRepo.findFirst({
      where: { projectId, repoUrl: dto.repoUrl },
    });
    if (existing) {
      throw new ConflictException('This repository URL is already registered in this project');
    }

    return this.prisma.sourceRepo.create({
      data: { projectId, ...dto },
    });
  }

  async listSourceRepos(projectId: string, repoType?: string) {
    const where: any = { projectId };
    if (repoType) where.repoType = repoType;
    return this.prisma.sourceRepo.findMany({ where });
  }

  async removeSourceRepo(repoId: string) {
    return this.prisma.sourceRepo.delete({ where: { id: repoId } });
  }
}
```

---

### Step 9: Controllers (API Layer)

**File: `src/project/project.controller.ts`**

```typescript
@Controller('api/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @HttpCode(201)
  async createProject(@Body() dto: CreateProjectDto) {
    return this.projectService.createProject(dto);
  }

  @Get()
  async listProjects(@Query() pagination: PaginationDto) {
    return this.projectService.listProjects(pagination);
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.projectService.getProjectById(id);
  }

  @Get('by-name/:name')
  async getProjectByName(@Param('name') name: string) {
    return this.projectService.getProjectByName(name);
  }

  @Patch(':id')
  async updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectService.updateProject(id, dto);
  }

  @Delete(':id')
  async archiveProject(@Param('id') id: string) {
    return this.projectService.archiveProject(id);
  }
}
```

**File: `src/project/controllers/promotion-repo.controller.ts`**

```typescript
@Controller('api/projects/:projectId/promotion-repo')
export class PromotionRepoController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly repoVerificationService: RepoVerificationService,
  ) {}

  @Post()
  @HttpCode(201)
  async setPromotionRepo(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePromotionRepoDto,
  ) {
    return this.projectService.setPromotionRepo(projectId, dto);
  }

  @Get()
  async getPromotionRepo(@Param('projectId') projectId: string) {
    return this.projectService.getPromotionRepo(projectId);
  }

  @Post('verify')
  async verifyConnectivity(@Param('projectId') projectId: string) {
    return this.repoVerificationService.verifyPromotionRepo(projectId);
  }
}
```

**File: `src/project/controllers/source-repo.controller.ts`**

```typescript
@Controller('api/projects/:projectId/source-repos')
export class SourceRepoController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly repoVerificationService: RepoVerificationService,
  ) {}

  @Post()
  @HttpCode(201)
  async addSourceRepo(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSourceRepoDto,
  ) {
    return this.projectService.addSourceRepo(projectId, dto);
  }

  @Get()
  async listSourceRepos(
    @Param('projectId') projectId: string,
    @Query('repoType') repoType?: string,
  ) {
    return this.projectService.listSourceRepos(projectId, repoType);
  }

  @Get(':repoId')
  async getSourceRepo(@Param('repoId') repoId: string) {
    return this.projectService.getSourceRepo(repoId);
  }

  @Delete(':repoId')
  async removeSourceRepo(@Param('repoId') repoId: string) {
    return this.projectService.removeSourceRepo(repoId);
  }

  @Post(':repoId/verify')
  async verifySourceRepo(@Param('repoId') repoId: string) {
    return this.repoVerificationService.verifySourceRepo(repoId);
  }
}
```

**File: `src/project/controllers/environment.controller.ts`**

```typescript
@Controller('api/projects/:projectId/environments')
export class EnvironmentController {
  constructor(private readonly environmentService: EnvironmentService) {}

  @Post()
  @HttpCode(201)
  async addEnvironment(
    @Param('projectId') projectId: string,
    @Body() dto: CreateEnvironmentDto,
  ) {
    return this.environmentService.addEnvironment(projectId, dto);
  }

  @Get()
  async listEnvironments(@Param('projectId') projectId: string) {
    return this.environmentService.listEnvironments(projectId);
  }

  @Post('apply-template')
  @HttpCode(201)
  async applyTemplate(@Param('projectId') projectId: string) {
    return this.environmentService.applyTemplate(projectId);
  }

  @Patch(':envId')
  async updateEnvironment(
    @Param('envId') envId: string,
    @Body() dto: Partial<CreateEnvironmentDto>,
  ) {
    return this.environmentService.updateEnvironment(envId, dto);
  }

  @Delete(':envId')
  async removeEnvironment(@Param('envId') envId: string) {
    return this.environmentService.removeEnvironment(envId);
  }
}
```

**File: `src/project/controllers/credential.controller.ts`**

```typescript
@Controller('api/projects/:projectId/credentials')
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

  @Post()
  @HttpCode(201)
  async addCredential(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCredentialDto,
  ) {
    return this.credentialService.createCredential(projectId, dto);
  }

  @Get()
  async listCredentials(@Param('projectId') projectId: string) {
    return this.credentialService.getCredentials(projectId);
  }

  @Patch(':credId')
  async updateCredential(
    @Param('credId') credId: string,
    @Body() dto: Partial<CreateCredentialDto>,
  ) {
    return this.credentialService.updateCredential(credId, dto);
  }

  @Delete(':credId')
  async deleteCredential(@Param('credId') credId: string) {
    return this.credentialService.deleteCredential(credId);
  }
}
```

**File: `src/project/controllers/branch-tracker.controller.ts`**

```typescript
@Controller('api/projects/:projectId/branches')
export class BranchTrackerController {
  constructor(private readonly branchTrackerService: BranchTrackerService) {}

  @Get()
  async listBranches(@Param('projectId') projectId: string) {
    return this.branchTrackerService.listBranches(projectId);
  }

  @Get('active')
  async getActiveBranches(@Param('projectId') projectId: string) {
    return this.branchTrackerService.getActiveBranches(projectId);
  }

  @Post()
  @HttpCode(201)
  async createBranch(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBranchTrackerDto,
  ) {
    return this.branchTrackerService.createBranch(projectId, dto);
  }

  @Patch(':branchId')
  async updateBranch(
    @Param('branchId') branchId: string,
    @Body() body: { envName: string; branchName: string },
  ) {
    return this.branchTrackerService.updateEnvironmentStatus(branchId, body.envName, body.branchName);
  }
}
```

---

### Step 10: Module Wiring

**File: `src/project/project.module.ts`**

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [
    ProjectController,
    PromotionRepoController,
    SourceRepoController,
    EnvironmentController,
    CredentialController,
    BranchTrackerController,
  ],
  providers: [
    ProjectService,
    CredentialService,
    RepoVerificationService,
    BranchTrackerService,
    EnvironmentService,
    ConfigExportService,
    MigrationService,
  ],
  exports: [
    ProjectService,
    CredentialService,
    ConfigExportService,
    BranchTrackerService,
  ],
})
export class ProjectModule {}
```

Register `ProjectModule` in the root `AppModule`.

---

### Step 11: Configuration Export Endpoint

**File: Add to `src/project/project.controller.ts`**

```typescript
@Get(':id/config')
async getFullConfig(@Param('id') id: string) {
  return this.configExportService.getFullConfig(id);
}
```

This single endpoint replaces the need for downstream services to make multiple queries. Any service (drift analysis, release notes, deployment) calls `GET /api/projects/:id/config` and gets everything in one response.

---

### Step 12: Migration Service (meta-sheet.xlsx Import)

**File: `src/project/services/migration.service.ts`**

One-time migration tool for importing existing project configurations.

**Implementation approach:**

```typescript
@Injectable()
export class MigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchTrackerService: BranchTrackerService,
  ) {}

  async importMetaSheet(projectId: string, filePath: string) {
    // 1. Read meta-sheet.xlsx using exceljs
    // 2. Parse rows: each row is a branch with env columns
    // 3. For each row, create a BranchTracker entry
    // 4. Return import summary (rows imported, errors)
  }

  async importRepoList(projectId: string, repoListText: string, repoType: RepoType) {
    // 1. Split by newlines
    // 2. For each URL, create a SourceRepo entry
    // 3. Skip duplicates
    // 4. Return import summary
  }

  async importHelmFolderStructure(projectId: string, folders: string[]) {
    // 1. Parse folder names (e.g., "dev-values" -> env name "dev")
    // 2. Create Environment entries with auto-detected promotion order
    // 3. Return import summary
  }
}
```

---

### Step 13: Unit Tests

Write tests following the test cases from `02-test-cases.md`. Key test files:

#### `project.service.spec.ts`
- Mock Prisma client
- Test project CRUD operations (TC-UNIT-001 to TC-UNIT-007)
- Test duplicate name handling (TC-INT-002)
- Test pagination logic (TC-API-003)

#### `credential.service.spec.ts`
- Test encryption/decryption (TC-UNIT-030 to TC-UNIT-033)
- Verify different ciphertexts for same input
- Verify tampered ciphertext fails
- Verify credentials never in API responses (TC-SEC-001)

#### `repo-verification.service.spec.ts`
- Mock `simple-git` library
- Test accessible repo (TC-INT-010)
- Test inaccessible repo (TC-INT-011)
- Test credential injection (TC-INT-013)

#### `branch-tracker.service.spec.ts`
- Test active branch detection (TC-UNIT-040 to TC-UNIT-043)
- Test "X" means not promoted
- Test promotion branch determination

#### `config-export.service.spec.ts`
- Test full config includes all sections (TC-UNIT-050)
- Test credentials are excluded (TC-UNIT-051)
- Test empty project (TC-EDGE-001, TC-EDGE-002)

---

### Step 14: Integration Tests

Use `@nestjs/testing` with `Test.createTestingModule` and real PostgreSQL (via Docker/Testcontainers).

**Tests:**
- Full API request/response cycle (TC-API-001 through TC-API-061)
- Database persistence (TC-INT-001 through TC-INT-006)
- Git connectivity (TC-INT-010 through TC-INT-013) — mock in CI, real in local
- Migration import (TC-MIG-001 through TC-MIG-003)

---

### Step 15: Monitoring & Observability

#### Structured Logging

Add structured logging to all service methods:

```typescript
this.logger.log({
  event: 'project_created',
  projectId: project.id,
  projectName: project.name,
  team: project.team,
});

this.logger.log({
  event: 'repo_verification_completed',
  repoUrl: repo.repoUrl,
  accessible: result.accessible,
  durationMs: Date.now() - start,
});

this.logger.warn({
  event: 'credential_access',
  credentialId: cred.id,
  accessedBy: 'repo-verification-service',
  // Never log the credential value itself
});
```

#### Audit Logging

All create/update/delete operations must be logged for audit:

```typescript
this.logger.log({
  event: 'audit',
  action: 'create',
  entity: 'source_repo',
  entityId: repo.id,
  projectId: repo.projectId,
  userId: request.userId, // from auth context
  timestamp: new Date().toISOString(),
});
```

#### Health Check

```typescript
@Get('health')
async healthCheck() {
  const dbOk = await this.prisma.$queryRaw`SELECT 1`;
  const repoCount = await this.prisma.project.count();

  return {
    status: dbOk ? 'healthy' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    projects: repoCount,
  };
}
```

---

## 4. Error Handling Strategy

| Error | HTTP Status | Response | Recovery |
|-------|-------------|----------|----------|
| Invalid request body | 400 | Validation errors array | Fix request |
| Project not found | 404 | "Project not found" | Check ID or name |
| Duplicate project name | 409 | "Project 'name' already exists" | Use different name |
| Duplicate promotion repo | 409 | "Project already has a promotion repo" | Update instead |
| Duplicate source repo URL | 409 | "Repository URL already registered" | Check existing repos |
| Duplicate environment | 409 | "Environment 'name' already exists" | Use different name |
| Duplicate promotion order | 409 | "Promotion order N already used" | Choose different order |
| Repo verification timeout | 200 | `{ accessible: false, message: "timeout" }` | Check network |
| Encryption key missing | 500 | "Internal server error" | Set ENCRYPTION_KEY |
| Database error | 500 | "Internal server error" | Log and alert |
| Unauthenticated | 401 | "Unauthorized" | Provide auth token |

---

## 5. Deployment Checklist

### Pre-deployment
- [ ] All unit tests pass (90%+ coverage)
- [ ] Integration tests pass
- [ ] API contract tests pass
- [ ] Security tests pass (no credential leakage)
- [ ] Environment variables configured (DATABASE_URL, ENCRYPTION_KEY, REDIS_HOST)
- [ ] Database migration applied (`npx prisma migrate deploy`)
- [ ] Encryption key generated and stored securely

### Post-deployment
- [ ] Health check endpoint returns healthy
- [ ] Create a test project via API
- [ ] Verify project CRUD (create, read, update, archive)
- [ ] Add promotion repo and verify connectivity
- [ ] Add source repos and verify connectivity
- [ ] Apply environment template
- [ ] Store a credential and verify it's encrypted
- [ ] Verify credential values are never in any API response
- [ ] Export full config and validate structure
- [ ] Verify structured logs appear in log aggregator
- [ ] Verify audit logs capture all operations

---

## 6. Dependencies on Existing Code

| Existing File | What We Use | How |
|---------------|-------------|-----|
| `merger.py` | Branch tracking logic | BranchTrackerService reimplements `find_last_updated_branch()` |
| `meta-sheet.xlsx` | Branch data (migration) | MigrationService imports rows into BranchTracker table |
| `app_db_infra_pull_services.py` | Repo list format | MigrationService imports `app-repo-list` format into SourceRepo table |
| `create-release-note.py` | Environment names, repo URL patterns | Reference for validating project configuration |
| `values-promotion.py` | Helm path conventions | Reference for `helmChartsPath` and `valuesFolder` defaults |
| `deploy.py` | Environment name and branch usage | Reference for how downstream services consume config |

No modifications to existing scripts are required in this iteration. The Project Registry provides a new data layer that future iterations will wire into existing scripts.

---

## 7. Future Iteration Hooks

The following extension points are built into this iteration for future use:

1. **ConfigExportService** — Returns the exact JSON that downstream services need. Iteration-01 (AI Drift Explainer) will call `GET /api/projects/:id/config` instead of taking `sys.argv` parameters
2. **CredentialService** — Used by all services that need Git tokens (drift analysis, release notes, deployment)
3. **BranchTrackerService** — Replaces `meta-sheet.xlsx` for all branch-related operations across iterations
4. **RepoVerificationService** — Can be scheduled as a cron job for periodic health checks
5. **MigrationService** — One-time import path; can be extended for additional sources
6. **Project entity** — Has `status` field supporting future workflow states beyond active/inactive/archived

---

**Document Version:** 1.0
**Last Updated:** February 16, 2026
