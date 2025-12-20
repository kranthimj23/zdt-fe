# PiLabStudio - Iteration 1 Implementation Plan

## Overview

This document provides a detailed, step-by-step implementation plan for PiLabStudio Iteration 1. The plan is organized into phases, with each phase containing specific tasks, technical specifications, and acceptance criteria.

---

## Table of Contents

1. [Phase 1: Project Setup & Infrastructure](#phase-1-project-setup--infrastructure)
2. [Phase 2: Authentication & Multi-Tenancy](#phase-2-authentication--multi-tenancy)
3. [Phase 3: Project Management](#phase-3-project-management)
4. [Phase 4: Repository Management](#phase-4-repository-management)
5. [Phase 5: Environment Management](#phase-5-environment-management)
6. [Phase 6: Master Manifest](#phase-6-master-manifest)
7. [Phase 7: Drift Detection Engine](#phase-7-drift-detection-engine)
8. [Phase 8: Release Notes Generation](#phase-8-release-notes-generation)
9. [Phase 9: Dashboard & UI](#phase-9-dashboard--ui)
10. [Phase 10: Integrations](#phase-10-integrations)
11. [Phase 11: Testing & QA](#phase-11-testing--qa)
12. [Phase 12: Deployment & DevOps](#phase-12-deployment--devops)

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Repository Structure Setup

**Task:** Initialize monorepo structure with proper tooling

```
pilabstudio/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   ├── common/         # Shared utilities
│   │   │   ├── config/         # Configuration
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── web/                    # Next.js Frontend
│       ├── src/
│       │   ├── app/            # App router pages
│       │   ├── components/     # UI components
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # Utilities
│       │   ├── stores/         # Zustand stores
│       │   └── types/          # TypeScript types
│       ├── public/
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types & utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── ui/                     # Shared UI components
│       ├── src/
│       │   └── components/
│       └── package.json
│
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── docker-compose.yml
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

**Steps:**
1. Initialize pnpm workspace
2. Setup Turborepo for monorepo management
3. Configure ESLint, Prettier, Husky
4. Setup TypeScript with project references
5. Create shared package for common types
6. Setup Docker development environment

**Commands:**
```bash
# Initialize monorepo
pnpm init
pnpm add -Dw turbo typescript eslint prettier husky lint-staged

# Create workspace structure
mkdir -p apps/api apps/web packages/shared packages/ui docker .github/workflows

# Initialize NestJS API
cd apps/api
npx @nestjs/cli new . --package-manager pnpm --skip-git

# Initialize Next.js Web
cd ../web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
```

---

### 1.2 Database Setup

**Task:** Design and implement PostgreSQL database schema

**Schema Design:**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ MULTI-TENANCY ============

model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  plan        String   @default("free")
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  projects    Project[]
  auditLogs   AuditLog[]
}

// ============ AUTHENTICATION ============

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String
  lastName      String
  avatar        String?
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id])

  sessions      Session[]
  auditLogs     AuditLog[]
  projectAccess ProjectAccess[]

  @@index([tenantId])
  @@index([email])
}

enum UserRole {
  SUPER_ADMIN
  ADMIN
  USER
}

model Session {
  id           String   @id @default(cuid())
  token        String   @unique
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

// ============ PROJECT MANAGEMENT ============

model Project {
  id          String        @id @default(cuid())
  name        String
  slug        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  settings    Json          @default("{}")
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  tenantId    String
  tenant      Tenant        @relation(fields: [tenantId], references: [id])

  subModules    SubModule[]
  environments  Environment[]
  manifests     Manifest[]
  driftReports  DriftReport[]
  releaseNotes  ReleaseNote[]
  auditLogs     AuditLog[]
  projectAccess ProjectAccess[]

  @@unique([tenantId, slug])
  @@index([tenantId])
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

model ProjectAccess {
  id        String          @id @default(cuid())
  role      ProjectRole     @default(VIEWER)
  createdAt DateTime        @default(now())

  projectId String
  project   Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)

  userId    String
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
}

enum ProjectRole {
  OWNER
  ADMIN
  CONTRIBUTOR
  VIEWER
}

model SubModule {
  id          String   @id @default(cuid())
  name        String
  type        SubModuleType
  description String?
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  repositories Repository[]
  manifestEntries ManifestEntry[]

  @@index([projectId])
}

enum SubModuleType {
  BACKEND
  FRONTEND
  DATABASE
  INFRASTRUCTURE
  LIBRARY
  OTHER
}

// ============ REPOSITORY MANAGEMENT ============

model Repository {
  id            String         @id @default(cuid())
  name          String
  url           String
  provider      GitProvider
  defaultBranch String         @default("main")
  isPrivate     Boolean        @default(false)
  lastSyncAt    DateTime?
  webhookId     String?
  webhookSecret String?
  settings      Json           @default("{}")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  subModuleId   String
  subModule     SubModule      @relation(fields: [subModuleId], references: [id], onDelete: Cascade)

  integrationId String?
  integration   Integration?   @relation(fields: [integrationId], references: [id])

  commits       Commit[]
  driftSources  DriftSource[]

  @@index([subModuleId])
}

enum GitProvider {
  GITHUB
  GITLAB
  BITBUCKET
}

model Commit {
  id          String   @id @default(cuid())
  sha         String
  message     String
  author      String
  authorEmail String
  timestamp   DateTime
  branch      String
  files       Json     @default("[]")  // Array of changed files
  stats       Json     @default("{}")  // additions, deletions
  createdAt   DateTime @default(now())

  repositoryId String
  repository   Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@unique([repositoryId, sha])
  @@index([repositoryId])
  @@index([timestamp])
}

// ============ ENVIRONMENT MANAGEMENT ============

model Environment {
  id            String          @id @default(cuid())
  name          String
  slug          String
  stage         EnvironmentStage
  order         Int
  description   String?
  clusterUrl    String?
  namespace     String?
  isProduction  Boolean         @default(false)
  settings      Json            @default("{}")
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  projectId     String
  project       Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)

  variables     EnvironmentVariable[]
  manifestEntries ManifestEntry[]
  driftTargets  DriftTarget[]

  @@unique([projectId, slug])
  @@index([projectId])
}

enum EnvironmentStage {
  DEV
  SIT
  UAT
  PERF
  SEC
  PRE_PROD
  PROD
  DR
}

model EnvironmentVariable {
  id            String   @id @default(cuid())
  key           String
  value         String
  isSecret      Boolean  @default(false)
  description   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  environmentId String
  environment   Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@unique([environmentId, key])
  @@index([environmentId])
}

// ============ MASTER MANIFEST ============

model Manifest {
  id          String   @id @default(cuid())
  version     String
  description String?
  isBaseline  Boolean  @default(false)
  snapshot    Json     @default("{}")
  createdAt   DateTime @default(now())

  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  entries     ManifestEntry[]

  @@index([projectId])
  @@index([createdAt])
}

model ManifestEntry {
  id              String   @id @default(cuid())
  version         String
  commitSha       String?
  imageTag        String?
  deployedAt      DateTime?
  deployedBy      String?
  status          DeploymentStatus @default(UNKNOWN)
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  manifestId      String
  manifest        Manifest    @relation(fields: [manifestId], references: [id], onDelete: Cascade)

  subModuleId     String
  subModule       SubModule   @relation(fields: [subModuleId], references: [id], onDelete: Cascade)

  environmentId   String
  environment     Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@unique([manifestId, subModuleId, environmentId])
  @@index([manifestId])
  @@index([subModuleId])
  @@index([environmentId])
}

enum DeploymentStatus {
  UNKNOWN
  PENDING
  DEPLOYING
  DEPLOYED
  FAILED
  ROLLED_BACK
}

// ============ DRIFT DETECTION ============

model DriftReport {
  id            String       @id @default(cuid())
  title         String
  status        DriftStatus  @default(DETECTED)
  severity      DriftSeverity @default(MEDIUM)
  summary       String?
  analysis      Json         @default("{}")
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  resolvedAt    DateTime?

  projectId     String
  project       Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  sourceEnvId   String
  sourceEnv     DriftTarget  @relation("SourceDrift", fields: [sourceEnvId], references: [id])

  targetEnvId   String
  targetEnv     DriftTarget  @relation("TargetDrift", fields: [targetEnvId], references: [id])

  driftItems    DriftItem[]
  releaseNotes  ReleaseNote[]

  @@index([projectId])
  @@index([status])
  @@index([createdAt])
}

model DriftTarget {
  id            String      @id @default(cuid())

  environmentId String
  environment   Environment @relation(fields: [environmentId], references: [id])

  sourceDrifts  DriftReport[] @relation("SourceDrift")
  targetDrifts  DriftReport[] @relation("TargetDrift")
}

model DriftSource {
  id            String     @id @default(cuid())

  repositoryId  String
  repository    Repository @relation(fields: [repositoryId], references: [id])
}

enum DriftStatus {
  DETECTED
  ANALYZING
  REVIEWED
  APPROVED
  RESOLVED
  IGNORED
}

enum DriftSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}

model DriftItem {
  id            String        @id @default(cuid())
  type          DriftType
  category      String
  path          String?
  oldValue      Json?
  newValue      Json?
  severity      DriftSeverity @default(MEDIUM)
  description   String?
  ticketId      String?       // JIRA ticket ID
  ticketUrl     String?
  metadata      Json          @default("{}")
  createdAt     DateTime      @default(now())

  driftReportId String
  driftReport   DriftReport   @relation(fields: [driftReportId], references: [id], onDelete: Cascade)

  @@index([driftReportId])
  @@index([type])
}

enum DriftType {
  CODE
  CONFIG
  DATABASE
  INFRASTRUCTURE
  IMAGE
  DEPENDENCY
}

// ============ RELEASE NOTES ============

model ReleaseNote {
  id            String           @id @default(cuid())
  version       String
  title         String
  status        ReleaseNoteStatus @default(DRAFT)
  content       Json             @default("{}")  // Structured content
  markdown      String?          // Generated markdown
  generatedAt   DateTime?
  publishedAt   DateTime?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  projectId     String
  project       Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)

  driftReportId String?
  driftReport   DriftReport?     @relation(fields: [driftReportId], references: [id])

  @@index([projectId])
  @@index([status])
  @@index([createdAt])
}

enum ReleaseNoteStatus {
  DRAFT
  GENERATED
  REVIEWED
  APPROVED
  PUBLISHED
}

// ============ INTEGRATIONS ============

model Integration {
  id            String          @id @default(cuid())
  name          String
  type          IntegrationType
  provider      String
  config        Json            @default("{}")  // Encrypted sensitive data
  status        IntegrationStatus @default(PENDING)
  lastSyncAt    DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  tenantId      String

  repositories  Repository[]

  @@index([tenantId])
  @@index([type])
}

enum IntegrationType {
  GIT
  CI_CD
  TICKETING
  NOTIFICATION
  MONITORING
  CLOUD
}

enum IntegrationStatus {
  PENDING
  CONNECTED
  DISCONNECTED
  ERROR
}

// ============ AUDIT LOGS ============

model AuditLog {
  id          String   @id @default(cuid())
  action      String
  entity      String
  entityId    String
  oldValue    Json?
  newValue    Json?
  metadata    Json     @default("{}")
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  userId      String?
  user        User?    @relation(fields: [userId], references: [id])

  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])

  @@index([tenantId])
  @@index([userId])
  @@index([projectId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

**Steps:**
1. Setup PostgreSQL database (Docker or cloud)
2. Configure Prisma schema
3. Create initial migrations
4. Setup pgvector extension for AI features
5. Create database seeding scripts

---

### 1.3 Backend Foundation (NestJS)

**Task:** Setup NestJS application with core modules

**Module Structure:**
```
apps/api/src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   │
│   ├── users/
│   ├── tenants/
│   ├── projects/
│   ├── repositories/
│   ├── environments/
│   ├── manifests/
│   ├── drift/
│   ├── release-notes/
│   ├── integrations/
│   └── audit/
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── current-tenant.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── guards/
│       └── tenant.guard.ts
│
├── config/
│   ├── configuration.ts
│   ├── database.config.ts
│   └── jwt.config.ts
│
├── prisma/
│   └── prisma.service.ts
│
├── app.module.ts
└── main.ts
```

**Core Dependencies:**
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/throttler": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "passport-local": "^1.0.0",
    "bcrypt": "^5.1.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0"
  }
}
```

---

### 1.4 Frontend Foundation (Next.js)

**Task:** Setup Next.js application with shadcn/ui

**Directory Structure:**
```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── manifest/
│   │   │       ├── drift/
│   │   │       ├── releases/
│   │   │       └── settings/
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── api/
│   │   └── [...]/
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/              # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── toast.tsx
│   │
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── nav-menu.tsx
│   │   └── breadcrumbs.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── manifest/
│   │   ├── drift/
│   │   └── releases/
│   │
│   └── shared/
│       ├── loading.tsx
│       ├── error-boundary.tsx
│       └── empty-state.tsx
│
├── hooks/
│   ├── use-auth.ts
│   ├── use-projects.ts
│   ├── use-manifest.ts
│   └── use-drift.ts
│
├── lib/
│   ├── api-client.ts
│   ├── utils.ts
│   └── validators.ts
│
├── stores/
│   ├── auth-store.ts
│   ├── project-store.ts
│   └── ui-store.ts
│
└── types/
    ├── api.ts
    ├── project.ts
    ├── manifest.ts
    └── drift.ts
```

**Steps:**
1. Install and configure shadcn/ui
2. Setup Tailwind CSS with custom theme
3. Configure TanStack Query
4. Setup Zustand stores
5. Create base layout components
6. Implement API client with interceptors

---

## Phase 2: Authentication & Multi-Tenancy

### 2.1 Authentication Module

**Implementation Steps:**

1. **User Registration**
```typescript
// apps/api/src/modules/auth/dto/register.dto.ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  tenantName?: string;
}

// apps/api/src/modules/auth/auth.service.ts
@Injectable()
export class AuthService {
  async register(dto: RegisterDto) {
    // 1. Check if user exists
    // 2. Create tenant if new
    // 3. Hash password
    // 4. Create user
    // 5. Generate tokens
    // 6. Send verification email
  }
}
```

2. **JWT Authentication**
```typescript
// apps/api/src/modules/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
```

3. **Role-Based Access Control**
```typescript
// apps/api/src/common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### 2.2 Multi-Tenant Architecture

**Implementation Steps:**

1. **Tenant Middleware**
```typescript
// apps/api/src/common/middleware/tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant from:
    // 1. Subdomain (tenant.pilabstudio.com)
    // 2. Header (X-Tenant-ID)
    // 3. JWT token (tenantId claim)

    const tenantId = this.extractTenantId(req);
    req['tenantId'] = tenantId;
    next();
  }
}
```

2. **Tenant-Scoped Queries**
```typescript
// apps/api/src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    // Add tenant filtering middleware
    this.$use(async (params, next) => {
      const tenantScoped = ['Project', 'User', 'AuditLog'];

      if (tenantScoped.includes(params.model)) {
        // Automatically filter by tenant
        if (params.action === 'findMany' || params.action === 'findFirst') {
          params.args.where = {
            ...params.args.where,
            tenantId: this.currentTenantId,
          };
        }
      }

      return next(params);
    });
  }
}
```

### 2.3 Frontend Authentication

**Implementation Steps:**

1. **Auth Store**
```typescript
// apps/web/src/stores/auth-store.ts
interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user, tenant, accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    set({ user, tenant, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, tenant: null, isAuthenticated: false });
  },
}));
```

2. **Protected Routes**
```typescript
// apps/web/src/components/auth/auth-guard.tsx
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? <>{children}</> : null;
}
```

---

## Phase 3: Project Management

### 3.1 Project CRUD Operations

**API Endpoints:**
```
POST   /api/projects              - Create project
GET    /api/projects              - List projects
GET    /api/projects/:id          - Get project details
PATCH  /api/projects/:id          - Update project
DELETE /api/projects/:id          - Archive/delete project
```

**Implementation:**
```typescript
// apps/api/src/modules/projects/projects.service.ts
@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        slug: this.generateSlug(dto.name),
        description: dto.description,
        tenantId,
        projectAccess: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    await this.auditService.log({
      action: 'project.created',
      entity: 'Project',
      entityId: project.id,
      tenantId,
      userId,
      newValue: project,
    });

    return project;
  }

  async findAll(tenantId: string, query: ProjectQueryDto) {
    return this.prisma.project.findMany({
      where: {
        tenantId,
        status: query.status || 'ACTIVE',
        name: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
      },
      include: {
        subModules: { select: { id: true, name: true, type: true } },
        environments: { select: { id: true, name: true, stage: true } },
        _count: { select: { driftReports: true, releaseNotes: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: query.skip,
      take: query.take,
    });
  }
}
```

### 3.2 Project Creation Wizard

**5-Step Wizard Flow:**

```typescript
// Frontend wizard state
interface ProjectWizardState {
  step: number;
  data: {
    // Step 1: Basic Info
    name: string;
    description: string;

    // Step 2: Sub-modules
    subModules: Array<{
      name: string;
      type: SubModuleType;
    }>;

    // Step 3: Repositories
    repositories: Array<{
      subModuleId: string;
      url: string;
      provider: GitProvider;
    }>;

    // Step 4: Environments
    environments: Array<{
      name: string;
      stage: EnvironmentStage;
      order: number;
    }>;

    // Step 5: Review & Create
  };
}

// Wizard component structure
const ProjectWizard = () => {
  const steps = [
    { title: 'Basic Info', component: BasicInfoStep },
    { title: 'Sub-modules', component: SubModulesStep },
    { title: 'Repositories', component: RepositoriesStep },
    { title: 'Environments', component: EnvironmentsStep },
    { title: 'Review', component: ReviewStep },
  ];

  return (
    <WizardContainer>
      <WizardProgress steps={steps} currentStep={currentStep} />
      <WizardContent>
        {steps[currentStep].component}
      </WizardContent>
      <WizardActions>
        <Button onClick={handleBack}>Back</Button>
        <Button onClick={handleNext}>
          {currentStep === steps.length - 1 ? 'Create Project' : 'Next'}
        </Button>
      </WizardActions>
    </WizardContainer>
  );
};
```

### 3.3 Sub-Module Management

**Implementation:**
```typescript
// apps/api/src/modules/projects/sub-modules/sub-modules.service.ts
@Injectable()
export class SubModulesService {
  async create(projectId: string, dto: CreateSubModuleDto) {
    return this.prisma.subModule.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        description: dto.description,
      },
    });
  }

  async linkRepository(subModuleId: string, dto: LinkRepositoryDto) {
    // Validate repository URL
    // Test connection to repository
    // Create repository record
    // Setup webhook if enabled
  }
}
```

---

## Phase 4: Repository Management

### 4.1 Git Provider Integration

**Provider Adapter Pattern:**
```typescript
// apps/api/src/modules/repositories/providers/git-provider.interface.ts
export interface GitProvider {
  name: string;

  // Authentication
  validateCredentials(config: ProviderConfig): Promise<boolean>;
  exchangeCodeForToken(code: string): Promise<TokenResponse>;

  // Repository operations
  listRepositories(token: string): Promise<Repository[]>;
  getRepository(token: string, owner: string, repo: string): Promise<Repository>;
  getBranches(token: string, owner: string, repo: string): Promise<Branch[]>;
  getTags(token: string, owner: string, repo: string): Promise<Tag[]>;

  // Commits
  getCommits(token: string, owner: string, repo: string, options: CommitOptions): Promise<Commit[]>;
  getCommit(token: string, owner: string, repo: string, sha: string): Promise<CommitDetail>;
  compareCommits(token: string, owner: string, repo: string, base: string, head: string): Promise<Comparison>;

  // Webhooks
  createWebhook(token: string, owner: string, repo: string, config: WebhookConfig): Promise<Webhook>;
  deleteWebhook(token: string, owner: string, repo: string, webhookId: string): Promise<void>;
}

// apps/api/src/modules/repositories/providers/github.provider.ts
@Injectable()
export class GitHubProvider implements GitProvider {
  name = 'github';
  private octokit: Octokit;

  async getCommits(token: string, owner: string, repo: string, options: CommitOptions) {
    this.octokit = new Octokit({ auth: token });

    const { data } = await this.octokit.repos.listCommits({
      owner,
      repo,
      sha: options.branch,
      since: options.since?.toISOString(),
      until: options.until?.toISOString(),
      per_page: options.perPage || 100,
    });

    return data.map(this.mapCommit);
  }

  async compareCommits(token: string, owner: string, repo: string, base: string, head: string) {
    const { data } = await this.octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });

    return {
      commits: data.commits.map(this.mapCommit),
      files: data.files?.map(this.mapFile) || [],
      stats: {
        additions: data.total_commits,
        deletions: 0,
        changes: data.files?.length || 0,
      },
    };
  }
}
```

### 4.2 Repository Sync Service

**Implementation:**
```typescript
// apps/api/src/modules/repositories/repository-sync.service.ts
@Injectable()
export class RepositorySyncService {
  constructor(
    private prisma: PrismaService,
    private providerFactory: GitProviderFactory,
    private queue: Queue,
  ) {}

  async syncRepository(repositoryId: string) {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { integration: true },
    });

    const provider = this.providerFactory.create(repository.provider);
    const [owner, repo] = this.parseRepoUrl(repository.url);

    // Get latest commits since last sync
    const commits = await provider.getCommits(
      repository.integration.config.accessToken,
      owner,
      repo,
      {
        since: repository.lastSyncAt,
        branch: repository.defaultBranch,
      },
    );

    // Store commits
    await this.prisma.commit.createMany({
      data: commits.map(c => ({
        repositoryId,
        sha: c.sha,
        message: c.message,
        author: c.author,
        authorEmail: c.authorEmail,
        timestamp: c.timestamp,
        branch: repository.defaultBranch,
        files: c.files,
        stats: c.stats,
      })),
      skipDuplicates: true,
    });

    // Update last sync time
    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: { lastSyncAt: new Date() },
    });
  }

  // Queue periodic sync
  @Cron('*/15 * * * *') // Every 15 minutes
  async scheduledSync() {
    const repositories = await this.prisma.repository.findMany({
      where: {
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
        ],
      },
    });

    for (const repo of repositories) {
      await this.queue.add('sync-repository', { repositoryId: repo.id });
    }
  }
}
```

### 4.3 Webhook Handler

**Implementation:**
```typescript
// apps/api/src/modules/repositories/webhooks/webhook.controller.ts
@Controller('webhooks')
export class WebhookController {
  @Post('github')
  async handleGitHubWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Body() payload: any,
  ) {
    // Verify webhook signature
    await this.verifySignature(signature, payload);

    switch (event) {
      case 'push':
        await this.handlePushEvent(payload);
        break;
      case 'pull_request':
        await this.handlePullRequestEvent(payload);
        break;
    }

    return { received: true };
  }

  private async handlePushEvent(payload: GitHubPushPayload) {
    const repository = await this.findRepository(payload.repository.html_url);

    // Store new commits
    const commits = payload.commits.map(c => ({
      sha: c.id,
      message: c.message,
      author: c.author.name,
      authorEmail: c.author.email,
      timestamp: new Date(c.timestamp),
      files: [...c.added, ...c.modified, ...c.removed],
    }));

    await this.prisma.commit.createMany({
      data: commits.map(c => ({ ...c, repositoryId: repository.id })),
      skipDuplicates: true,
    });

    // Trigger drift detection if needed
    await this.driftService.checkForNewDrift(repository.id);
  }
}
```

---

## Phase 5: Environment Management

### 5.1 Environment Configuration

**API Endpoints:**
```
POST   /api/projects/:projectId/environments           - Create environment
GET    /api/projects/:projectId/environments           - List environments
PATCH  /api/projects/:projectId/environments/:id       - Update environment
DELETE /api/projects/:projectId/environments/:id       - Delete environment
POST   /api/projects/:projectId/environments/reorder   - Reorder environments
```

**Implementation:**
```typescript
// apps/api/src/modules/environments/environments.service.ts
@Injectable()
export class EnvironmentsService {
  async create(projectId: string, dto: CreateEnvironmentDto) {
    // Get max order
    const maxOrder = await this.prisma.environment.aggregate({
      where: { projectId },
      _max: { order: true },
    });

    return this.prisma.environment.create({
      data: {
        projectId,
        name: dto.name,
        slug: this.generateSlug(dto.name),
        stage: dto.stage,
        order: (maxOrder._max.order || 0) + 1,
        description: dto.description,
        clusterUrl: dto.clusterUrl,
        namespace: dto.namespace,
        isProduction: dto.stage === 'PROD',
      },
    });
  }

  async getPromotionPath(projectId: string) {
    const environments = await this.prisma.environment.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    return environments.map((env, index) => ({
      ...env,
      canPromoteTo: environments[index + 1] || null,
      canPromoteFrom: environments[index - 1] || null,
    }));
  }
}
```

### 5.2 Environment Variables Management

**Secure Variable Storage:**
```typescript
// apps/api/src/modules/environments/variables/variables.service.ts
@Injectable()
export class VariablesService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async create(environmentId: string, dto: CreateVariableDto) {
    let value = dto.value;

    // Encrypt sensitive values
    if (dto.isSecret) {
      value = await this.encryptionService.encrypt(dto.value);
    }

    return this.prisma.environmentVariable.create({
      data: {
        environmentId,
        key: dto.key,
        value,
        isSecret: dto.isSecret,
        description: dto.description,
      },
    });
  }

  async getVariables(environmentId: string, includeSecrets: boolean = false) {
    const variables = await this.prisma.environmentVariable.findMany({
      where: { environmentId },
    });

    return variables.map(v => ({
      ...v,
      value: v.isSecret && !includeSecrets ? '********' : v.value,
    }));
  }

  async compareEnvironments(sourceId: string, targetId: string) {
    const [sourceVars, targetVars] = await Promise.all([
      this.getVariables(sourceId),
      this.getVariables(targetId),
    ]);

    const sourceMap = new Map(sourceVars.map(v => [v.key, v]));
    const targetMap = new Map(targetVars.map(v => [v.key, v]));

    const differences = [];

    // Check for missing and different values
    for (const [key, sourceVar] of sourceMap) {
      const targetVar = targetMap.get(key);
      if (!targetVar) {
        differences.push({ key, type: 'missing_in_target', sourceValue: sourceVar.value });
      } else if (sourceVar.value !== targetVar.value && !sourceVar.isSecret) {
        differences.push({ key, type: 'different', sourceValue: sourceVar.value, targetValue: targetVar.value });
      }
    }

    // Check for extra keys in target
    for (const [key] of targetMap) {
      if (!sourceMap.has(key)) {
        differences.push({ key, type: 'missing_in_source' });
      }
    }

    return differences;
  }
}
```

---

## Phase 6: Master Manifest

### 6.1 Version Tracking Matrix

**Data Model:**
```typescript
// Manifest matrix structure
interface ManifestMatrix {
  subModules: Array<{
    id: string;
    name: string;
    type: SubModuleType;
  }>;
  environments: Array<{
    id: string;
    name: string;
    stage: EnvironmentStage;
    order: number;
  }>;
  entries: Array<{
    subModuleId: string;
    environmentId: string;
    version: string;
    commitSha: string;
    imageTag: string;
    deployedAt: Date;
    status: DeploymentStatus;
  }>;
}
```

**Implementation:**
```typescript
// apps/api/src/modules/manifests/manifests.service.ts
@Injectable()
export class ManifestsService {
  async getMatrix(projectId: string): Promise<ManifestMatrix> {
    const [subModules, environments, manifest] = await Promise.all([
      this.prisma.subModule.findMany({
        where: { projectId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.environment.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      }),
      this.prisma.manifest.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: { entries: true },
      }),
    ]);

    // Build matrix
    const entryMap = new Map(
      manifest?.entries.map(e => [`${e.subModuleId}-${e.environmentId}`, e]) || []
    );

    const matrix = subModules.map(sm => ({
      subModule: sm,
      versions: environments.map(env => ({
        environment: env,
        entry: entryMap.get(`${sm.id}-${env.id}`) || null,
      })),
    }));

    return { subModules, environments, matrix };
  }

  async updateEntry(projectId: string, dto: UpdateManifestEntryDto) {
    // Get or create current manifest
    let manifest = await this.prisma.manifest.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!manifest) {
      manifest = await this.prisma.manifest.create({
        data: {
          projectId,
          version: '1.0.0',
        },
      });
    }

    // Upsert entry
    return this.prisma.manifestEntry.upsert({
      where: {
        manifestId_subModuleId_environmentId: {
          manifestId: manifest.id,
          subModuleId: dto.subModuleId,
          environmentId: dto.environmentId,
        },
      },
      update: {
        version: dto.version,
        commitSha: dto.commitSha,
        imageTag: dto.imageTag,
        deployedAt: dto.deployedAt,
        status: dto.status,
      },
      create: {
        manifestId: manifest.id,
        subModuleId: dto.subModuleId,
        environmentId: dto.environmentId,
        version: dto.version,
        commitSha: dto.commitSha,
        imageTag: dto.imageTag,
        deployedAt: dto.deployedAt,
        status: dto.status,
      },
    });
  }

  async createBaseline(projectId: string, description: string) {
    const currentManifest = await this.prisma.manifest.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { entries: true },
    });

    // Create snapshot of current state
    return this.prisma.manifest.create({
      data: {
        projectId,
        version: this.generateVersion(),
        description,
        isBaseline: true,
        snapshot: currentManifest?.entries || [],
        entries: {
          createMany: {
            data: currentManifest?.entries.map(e => ({
              subModuleId: e.subModuleId,
              environmentId: e.environmentId,
              version: e.version,
              commitSha: e.commitSha,
              imageTag: e.imageTag,
              deployedAt: e.deployedAt,
              status: e.status,
            })) || [],
          },
        },
      },
    });
  }
}
```

### 6.2 Frontend Matrix Component

**React Component:**
```typescript
// apps/web/src/components/features/manifest/manifest-matrix.tsx
export function ManifestMatrix({ projectId }: { projectId: string }) {
  const { data: matrix, isLoading } = useManifestMatrix(projectId);

  if (isLoading) return <Skeleton />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-background">Sub-module</th>
            {matrix.environments.map(env => (
              <th key={env.id} className="text-center">
                <div className="flex flex-col items-center">
                  <EnvironmentBadge stage={env.stage} />
                  <span>{env.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.matrix.map(row => (
            <tr key={row.subModule.id}>
              <td className="sticky left-0 bg-background font-medium">
                {row.subModule.name}
                <SubModuleTypeBadge type={row.subModule.type} />
              </td>
              {row.versions.map(cell => (
                <td key={cell.environment.id} className="text-center">
                  {cell.entry ? (
                    <VersionCell entry={cell.entry} />
                  ) : (
                    <EmptyCell />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VersionCell({ entry }: { entry: ManifestEntry }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2">
      <Badge variant={getStatusVariant(entry.status)}>
        {entry.version}
      </Badge>
      {entry.commitSha && (
        <span className="text-xs text-muted-foreground">
          {entry.commitSha.slice(0, 7)}
        </span>
      )}
      {entry.deployedAt && (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(entry.deployedAt, { addSuffix: true })}
        </span>
      )}
    </div>
  );
}
```

---

## Phase 7: Drift Detection Engine

### 7.1 Core Drift Analysis Service

**Architecture:**
```typescript
// apps/api/src/modules/drift/drift-engine.service.ts
@Injectable()
export class DriftEngineService {
  constructor(
    private codeAnalyzer: CodeDriftAnalyzer,
    private configAnalyzer: ConfigDriftAnalyzer,
    private dbAnalyzer: DatabaseDriftAnalyzer,
    private llmService: LLMService,
  ) {}

  async analyzeDrift(
    projectId: string,
    sourceEnvId: string,
    targetEnvId: string,
  ): Promise<DriftReport> {
    // 1. Gather data from all sources
    const [codeChanges, configChanges, dbChanges] = await Promise.all([
      this.codeAnalyzer.analyze(projectId, sourceEnvId, targetEnvId),
      this.configAnalyzer.analyze(projectId, sourceEnvId, targetEnvId),
      this.dbAnalyzer.analyze(projectId, sourceEnvId, targetEnvId),
    ]);

    // 2. Combine all drift items
    const driftItems = [
      ...codeChanges.map(c => ({ ...c, type: 'CODE' })),
      ...configChanges.map(c => ({ ...c, type: 'CONFIG' })),
      ...dbChanges.map(c => ({ ...c, type: 'DATABASE' })),
    ];

    // 3. Calculate severity
    const severity = this.calculateOverallSeverity(driftItems);

    // 4. Generate AI summary
    const summary = await this.llmService.generateDriftSummary(driftItems);

    // 5. Create report
    return this.createDriftReport({
      projectId,
      sourceEnvId,
      targetEnvId,
      driftItems,
      severity,
      summary,
    });
  }
}
```

### 7.2 Code Drift Analyzer

**Implementation:**
```typescript
// apps/api/src/modules/drift/analyzers/code-drift.analyzer.ts
@Injectable()
export class CodeDriftAnalyzer {
  constructor(
    private prisma: PrismaService,
    private gitService: GitService,
    private ticketService: TicketService,
  ) {}

  async analyze(
    projectId: string,
    sourceEnvId: string,
    targetEnvId: string,
  ): Promise<CodeDriftItem[]> {
    // 1. Get manifest entries for both environments
    const [sourceManifest, targetManifest] = await Promise.all([
      this.getManifestForEnv(projectId, sourceEnvId),
      this.getManifestForEnv(projectId, targetEnvId),
    ]);

    const driftItems: CodeDriftItem[] = [];

    // 2. Compare each sub-module
    for (const sourceEntry of sourceManifest.entries) {
      const targetEntry = targetManifest.entries.find(
        e => e.subModuleId === sourceEntry.subModuleId
      );

      if (!targetEntry) continue;
      if (sourceEntry.commitSha === targetEntry.commitSha) continue;

      // 3. Get commits between versions
      const repository = await this.getRepository(sourceEntry.subModuleId);
      const comparison = await this.gitService.compareCommits(
        repository,
        targetEntry.commitSha,
        sourceEntry.commitSha,
      );

      // 4. Analyze each commit
      for (const commit of comparison.commits) {
        // Extract JIRA tickets from commit message
        const tickets = this.extractTickets(commit.message);
        const ticketInfo = await this.ticketService.getTickets(tickets);

        driftItems.push({
          category: 'code_change',
          path: `${repository.name}`,
          description: commit.message,
          oldValue: { sha: targetEntry.commitSha },
          newValue: { sha: sourceEntry.commitSha },
          severity: this.calculateCommitSeverity(commit, ticketInfo),
          ticketId: tickets[0],
          ticketUrl: ticketInfo[0]?.url,
          metadata: {
            author: commit.author,
            timestamp: commit.timestamp,
            files: commit.files,
            stats: comparison.stats,
          },
        });
      }
    }

    return driftItems;
  }

  private extractTickets(message: string): string[] {
    // Match patterns like JIRA-123, ABC-456
    const pattern = /([A-Z]+-\d+)/g;
    return [...message.matchAll(pattern)].map(m => m[1]);
  }

  private calculateCommitSeverity(
    commit: Commit,
    ticketInfo: TicketInfo[],
  ): DriftSeverity {
    // Bug fixes are higher severity
    if (ticketInfo.some(t => t.type === 'Bug')) return 'HIGH';

    // Large changes are medium
    if (commit.stats.additions + commit.stats.deletions > 500) return 'MEDIUM';

    // Security-related keywords
    const securityKeywords = ['security', 'vulnerability', 'cve', 'auth'];
    if (securityKeywords.some(k => commit.message.toLowerCase().includes(k))) {
      return 'CRITICAL';
    }

    return 'LOW';
  }
}
```

### 7.3 Config Drift Analyzer

**Implementation:**
```typescript
// apps/api/src/modules/drift/analyzers/config-drift.analyzer.ts
@Injectable()
export class ConfigDriftAnalyzer {
  async analyze(
    projectId: string,
    sourceEnvId: string,
    targetEnvId: string,
  ): Promise<ConfigDriftItem[]> {
    const driftItems: ConfigDriftItem[] = [];

    // 1. Compare environment variables
    const varDiffs = await this.compareEnvVariables(sourceEnvId, targetEnvId);
    driftItems.push(...varDiffs);

    // 2. Compare Helm values (if applicable)
    const helmDiffs = await this.compareHelmValues(
      projectId,
      sourceEnvId,
      targetEnvId,
    );
    driftItems.push(...helmDiffs);

    return driftItems;
  }

  private async compareEnvVariables(
    sourceEnvId: string,
    targetEnvId: string,
  ): Promise<ConfigDriftItem[]> {
    const [sourceVars, targetVars] = await Promise.all([
      this.prisma.environmentVariable.findMany({ where: { environmentId: sourceEnvId } }),
      this.prisma.environmentVariable.findMany({ where: { environmentId: targetEnvId } }),
    ]);

    const sourceMap = new Map(sourceVars.map(v => [v.key, v]));
    const targetMap = new Map(targetVars.map(v => [v.key, v]));
    const driftItems: ConfigDriftItem[] = [];

    // Find differences
    for (const [key, sourceVar] of sourceMap) {
      const targetVar = targetMap.get(key);

      if (!targetVar) {
        driftItems.push({
          category: 'env_variable',
          path: key,
          description: `Environment variable "${key}" exists in source but missing in target`,
          oldValue: null,
          newValue: sourceVar.isSecret ? '[REDACTED]' : sourceVar.value,
          severity: this.getVariableSeverity(key),
        });
      } else if (!sourceVar.isSecret && sourceVar.value !== targetVar.value) {
        driftItems.push({
          category: 'env_variable',
          path: key,
          description: `Environment variable "${key}" has different values`,
          oldValue: targetVar.value,
          newValue: sourceVar.value,
          severity: this.getVariableSeverity(key),
        });
      }
    }

    // Find extra variables in target
    for (const [key] of targetMap) {
      if (!sourceMap.has(key)) {
        driftItems.push({
          category: 'env_variable',
          path: key,
          description: `Environment variable "${key}" exists in target but missing in source`,
          oldValue: targetMap.get(key)?.value,
          newValue: null,
          severity: 'LOW',
        });
      }
    }

    return driftItems;
  }

  private getVariableSeverity(key: string): DriftSeverity {
    const critical = ['DATABASE_URL', 'API_KEY', 'SECRET_KEY', 'AUTH_'];
    const high = ['REDIS_', 'CACHE_', 'SERVICE_URL', 'ENDPOINT'];

    if (critical.some(c => key.toUpperCase().includes(c))) return 'CRITICAL';
    if (high.some(h => key.toUpperCase().includes(h))) return 'HIGH';
    return 'MEDIUM';
  }
}
```

### 7.4 Database Drift Analyzer

**Implementation:**
```typescript
// apps/api/src/modules/drift/analyzers/database-drift.analyzer.ts
@Injectable()
export class DatabaseDriftAnalyzer {
  async analyze(
    projectId: string,
    sourceEnvId: string,
    targetEnvId: string,
  ): Promise<DatabaseDriftItem[]> {
    const driftItems: DatabaseDriftItem[] = [];

    // Get database repositories for the project
    const dbRepos = await this.prisma.repository.findMany({
      where: {
        subModule: {
          projectId,
          type: 'DATABASE',
        },
      },
    });

    for (const repo of dbRepos) {
      // 1. Get migration files
      const migrations = await this.getMigrations(repo, sourceEnvId, targetEnvId);

      for (const migration of migrations) {
        driftItems.push({
          category: 'migration',
          path: migration.path,
          description: migration.description,
          oldValue: null,
          newValue: migration.content,
          severity: this.getMigrationSeverity(migration),
          metadata: {
            type: migration.type, // 'schema', 'data', 'index'
            tables: migration.affectedTables,
            reversible: migration.hasRollback,
          },
        });
      }
    }

    return driftItems;
  }

  private getMigrationSeverity(migration: Migration): DriftSeverity {
    // Destructive operations are critical
    if (migration.type === 'drop_table' || migration.type === 'drop_column') {
      return 'CRITICAL';
    }

    // Schema changes are high
    if (migration.type === 'alter_table') {
      return 'HIGH';
    }

    // Data migrations are medium
    if (migration.type === 'data') {
      return 'MEDIUM';
    }

    return 'LOW';
  }
}
```

### 7.5 LLM Service for Drift Analysis

**Implementation:**
```typescript
// apps/api/src/modules/ai/llm.service.ts
@Injectable()
export class LLMService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async generateDriftSummary(driftItems: DriftItem[]): Promise<string> {
    const prompt = `
      Analyze the following configuration drift between two environments and provide a concise summary:

      Drift Items:
      ${JSON.stringify(driftItems, null, 2)}

      Provide:
      1. A brief executive summary (2-3 sentences)
      2. Key risks or concerns
      3. Recommended actions

      Format the response in markdown.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a DevOps expert analyzing configuration drift between environments.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  }

  async categorizeCommitForReleaseNotes(commit: Commit): Promise<CommitCategory> {
    const prompt = `
      Categorize this git commit for release notes:

      Message: ${commit.message}
      Files changed: ${commit.files?.join(', ') || 'N/A'}

      Categories:
      - FEATURE: New functionality
      - ENHANCEMENT: Improvements to existing features
      - BUGFIX: Bug fixes
      - SECURITY: Security-related changes
      - PERFORMANCE: Performance improvements
      - DOCUMENTATION: Documentation updates
      - REFACTOR: Code refactoring
      - CHORE: Maintenance tasks
      - DEPRECATED: Deprecations

      Respond with just the category name.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 50,
    });

    return response.choices[0].message.content.trim() as CommitCategory;
  }
}
```

---

## Phase 8: Release Notes Generation

### 8.1 Release Notes Generator

**Implementation:**
```typescript
// apps/api/src/modules/release-notes/release-notes.service.ts
@Injectable()
export class ReleaseNotesService {
  constructor(
    private prisma: PrismaService,
    private llmService: LLMService,
    private templateService: TemplateService,
  ) {}

  async generateFromDrift(driftReportId: string): Promise<ReleaseNote> {
    const driftReport = await this.prisma.driftReport.findUnique({
      where: { id: driftReportId },
      include: {
        driftItems: true,
        project: true,
        sourceEnv: { include: { environment: true } },
        targetEnv: { include: { environment: true } },
      },
    });

    // 1. Categorize drift items
    const categorized = await this.categorizeItems(driftReport.driftItems);

    // 2. Generate structured content
    const content = {
      version: this.generateVersion(driftReport),
      environments: {
        source: driftReport.sourceEnv.environment.name,
        target: driftReport.targetEnv.environment.name,
      },
      sections: {
        added: categorized.filter(i => i.category === 'FEATURE'),
        modified: categorized.filter(i => i.category === 'ENHANCEMENT'),
        fixed: categorized.filter(i => i.category === 'BUGFIX'),
        security: categorized.filter(i => i.category === 'SECURITY'),
        deprecated: categorized.filter(i => i.category === 'DEPRECATED'),
        configuration: categorized.filter(i => i.type === 'CONFIG'),
        database: categorized.filter(i => i.type === 'DATABASE'),
      },
      summary: await this.llmService.generateReleaseNotesSummary(categorized),
    };

    // 3. Generate markdown
    const markdown = await this.templateService.render('release-notes', content);

    // 4. Create release note record
    return this.prisma.releaseNote.create({
      data: {
        projectId: driftReport.projectId,
        driftReportId,
        version: content.version,
        title: `Release ${content.version}`,
        status: 'GENERATED',
        content,
        markdown,
        generatedAt: new Date(),
      },
    });
  }

  async exportToConfluence(releaseNoteId: string): Promise<string> {
    const releaseNote = await this.prisma.releaseNote.findUnique({
      where: { id: releaseNoteId },
    });

    const confluenceContent = this.convertToConfluenceFormat(releaseNote.markdown);

    // Call Confluence API
    const pageUrl = await this.confluenceService.createPage({
      title: releaseNote.title,
      content: confluenceContent,
    });

    return pageUrl;
  }
}
```

### 8.2 Release Notes Template

**Template:**
```markdown
# Release Notes - {{version}}

**Release Date:** {{date}}
**Environment:** {{source}} → {{target}}

## Summary

{{summary}}

---

## What's New

{{#if sections.added.length}}
### Added
{{#each sections.added}}
- **{{title}}** {{#if ticketId}}([{{ticketId}}]({{ticketUrl}})){{/if}}
  {{description}}
{{/each}}
{{/if}}

{{#if sections.modified.length}}
### Modified
{{#each sections.modified}}
- **{{title}}** {{#if ticketId}}([{{ticketId}}]({{ticketUrl}})){{/if}}
  {{description}}
{{/each}}
{{/if}}

{{#if sections.fixed.length}}
### Fixed
{{#each sections.fixed}}
- **{{title}}** {{#if ticketId}}([{{ticketId}}]({{ticketUrl}})){{/if}}
  {{description}}
{{/each}}
{{/if}}

{{#if sections.security.length}}
### Security
{{#each sections.security}}
- **{{title}}** {{#if ticketId}}([{{ticketId}}]({{ticketUrl}})){{/if}}
  {{description}}
{{/each}}
{{/if}}

{{#if sections.deprecated.length}}
### Deprecated
{{#each sections.deprecated}}
- **{{title}}**
  {{description}}
{{/each}}
{{/if}}

---

## Configuration Changes

{{#if sections.configuration.length}}
| Variable | Old Value | New Value |
|----------|-----------|-----------|
{{#each sections.configuration}}
| `{{path}}` | {{oldValue}} | {{newValue}} |
{{/each}}
{{else}}
No configuration changes in this release.
{{/if}}

---

## Database Migrations

{{#if sections.database.length}}
{{#each sections.database}}
### {{path}}
- **Type:** {{metadata.type}}
- **Tables:** {{metadata.tables}}
- **Reversible:** {{metadata.reversible}}

```sql
{{newValue}}
```
{{/each}}
{{else}}
No database migrations in this release.
{{/if}}

---

## Deployment Instructions

1. Verify all pre-requisites are met
2. Take database backup
3. Apply database migrations
4. Deploy application containers
5. Verify health checks
6. Run smoke tests

---

*Generated by PiLabStudio on {{generatedAt}}*
```

---

## Phase 9: Dashboard & UI

### 9.1 Dashboard Layout

**Component Structure:**
```typescript
// apps/web/src/app/(dashboard)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Projects"
          value={stats.projects}
          icon={<FolderIcon />}
          trend="+12%"
        />
        <StatsCard
          title="Drift Detected"
          value={stats.drifts}
          icon={<AlertTriangleIcon />}
          variant="warning"
        />
        <StatsCard
          title="Pending Releases"
          value={stats.releases}
          icon={<RocketIcon />}
        />
        <StatsCard
          title="Environments"
          value={stats.environments}
          icon={<ServerIcon />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={recentActivities} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drift Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DriftSummaryChart data={driftSummary} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Projects Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsList projects={projects} limit={5} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Releases</CardTitle>
          </CardHeader>
          <CardContent>
            <ReleasesList releases={recentReleases} limit={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 9.2 Drift Visualization

**Drift Comparison View:**
```typescript
// apps/web/src/components/features/drift/drift-comparison.tsx
export function DriftComparison({ driftReport }: { driftReport: DriftReport }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <EnvironmentBadge env={driftReport.sourceEnv} />
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <EnvironmentBadge env={driftReport.targetEnv} />
        </div>
        <SeverityBadge severity={driftReport.severity} />
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Markdown>{driftReport.summary}</Markdown>
        </CardContent>
      </Card>

      {/* Drift Items by Type */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({driftReport.driftItems.length})
          </TabsTrigger>
          <TabsTrigger value="code">
            Code ({driftReport.driftItems.filter(i => i.type === 'CODE').length})
          </TabsTrigger>
          <TabsTrigger value="config">
            Config ({driftReport.driftItems.filter(i => i.type === 'CONFIG').length})
          </TabsTrigger>
          <TabsTrigger value="database">
            Database ({driftReport.driftItems.filter(i => i.type === 'DATABASE').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <DriftItemsList items={driftReport.driftItems} />
        </TabsContent>
        <TabsContent value="code">
          <DriftItemsList items={driftReport.driftItems.filter(i => i.type === 'CODE')} />
        </TabsContent>
        <TabsContent value="config">
          <DriftItemsList items={driftReport.driftItems.filter(i => i.type === 'CONFIG')} />
        </TabsContent>
        <TabsContent value="database">
          <DriftItemsList items={driftReport.driftItems.filter(i => i.type === 'DATABASE')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DriftItemsList({ items }: { items: DriftItem[] }) {
  return (
    <div className="space-y-3">
      {items.map(item => (
        <DriftItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function DriftItemCard({ item }: { item: DriftItem }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <DriftTypeBadge type={item.type} />
              <SeverityBadge severity={item.severity} size="sm" />
              {item.ticketId && (
                <a
                  href={item.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {item.ticketId}
                </a>
              )}
            </div>
            <p className="mt-2 font-medium">{item.path}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>

        {(item.oldValue || item.newValue) && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-red-600">Previous</span>
              <pre className="mt-1 p-2 bg-red-50 rounded text-xs overflow-x-auto">
                {JSON.stringify(item.oldValue, null, 2) || 'N/A'}
              </pre>
            </div>
            <div>
              <span className="text-xs font-medium text-green-600">Current</span>
              <pre className="mt-1 p-2 bg-green-50 rounded text-xs overflow-x-auto">
                {JSON.stringify(item.newValue, null, 2) || 'N/A'}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Phase 10: Integrations

### 10.1 JIRA Integration

**Implementation:**
```typescript
// apps/api/src/modules/integrations/jira/jira.service.ts
@Injectable()
export class JiraService {
  private client: JiraClient;

  constructor(private configService: ConfigService) {
    this.client = new JiraClient({
      host: this.configService.get('JIRA_HOST'),
      authentication: {
        basic: {
          email: this.configService.get('JIRA_EMAIL'),
          apiToken: this.configService.get('JIRA_API_TOKEN'),
        },
      },
    });
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const issue = await this.client.issues.getIssue({
      issueIdOrKey: issueKey,
      fields: ['summary', 'description', 'status', 'issuetype', 'priority', 'assignee'],
    });

    return {
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status.name,
      type: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName,
      url: `${this.configService.get('JIRA_HOST')}/browse/${issue.key}`,
    };
  }

  async getIssuesByKeys(keys: string[]): Promise<JiraIssue[]> {
    if (keys.length === 0) return [];

    const jql = `key in (${keys.join(',')})`;
    const result = await this.client.issueSearch.searchForIssuesUsingJql({
      jql,
      fields: ['summary', 'description', 'status', 'issuetype', 'priority', 'assignee'],
    });

    return result.issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status.name,
      type: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name,
      url: `${this.configService.get('JIRA_HOST')}/browse/${issue.key}`,
    }));
  }

  async linkCommitToIssue(issueKey: string, commit: Commit): Promise<void> {
    await this.client.issueRemoteLinks.createRemoteLink({
      issueIdOrKey: issueKey,
      body: {
        object: {
          url: commit.url,
          title: `Commit ${commit.sha.slice(0, 7)}`,
          summary: commit.message,
        },
      },
    });
  }
}
```

### 10.2 Slack Integration

**Implementation:**
```typescript
// apps/api/src/modules/integrations/slack/slack.service.ts
@Injectable()
export class SlackService {
  private client: WebClient;

  constructor(private configService: ConfigService) {
    this.client = new WebClient(this.configService.get('SLACK_BOT_TOKEN'));
  }

  async sendDriftAlert(channel: string, driftReport: DriftReport): Promise<void> {
    const severityColor = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#ca8a04',
      LOW: '#16a34a',
      INFO: '#2563eb',
    };

    await this.client.chat.postMessage({
      channel,
      attachments: [
        {
          color: severityColor[driftReport.severity],
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `Drift Detected: ${driftReport.title}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Project:*\n${driftReport.project.name}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Severity:*\n${driftReport.severity}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Source:*\n${driftReport.sourceEnv.name}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Target:*\n${driftReport.targetEnv.name}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Summary:*\n${driftReport.summary?.slice(0, 200)}...`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View Details',
                  },
                  url: `${this.configService.get('APP_URL')}/drift/${driftReport.id}`,
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Generate Release Notes',
                  },
                  action_id: 'generate_release_notes',
                  value: driftReport.id,
                },
              ],
            },
          ],
        },
      ],
    });
  }

  async sendReleaseNotification(
    channel: string,
    releaseNote: ReleaseNote,
  ): Promise<void> {
    await this.client.chat.postMessage({
      channel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Release Notes Published: ${releaseNote.version}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: releaseNote.content.summary,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Published at ${releaseNote.publishedAt}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Full Release Notes',
              },
              url: `${this.configService.get('APP_URL')}/releases/${releaseNote.id}`,
            },
          ],
        },
      ],
    });
  }
}
```

---

## Phase 11: Testing & QA

### 11.1 Testing Strategy

**Test Pyramid:**
```
                    /\
                   /  \
                  / E2E \           (10%)
                 /______\
                /        \
               / Integr.  \        (20%)
              /____________\
             /              \
            /    Unit Tests  \     (70%)
           /__________________ \
```

### 11.2 Unit Tests

**Service Tests:**
```typescript
// apps/api/src/modules/drift/drift-engine.service.spec.ts
describe('DriftEngineService', () => {
  let service: DriftEngineService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DriftEngineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CodeDriftAnalyzer, useValue: mockCodeAnalyzer },
        { provide: ConfigDriftAnalyzer, useValue: mockConfigAnalyzer },
        { provide: DatabaseDriftAnalyzer, useValue: mockDbAnalyzer },
        { provide: LLMService, useValue: mockLLMService },
      ],
    }).compile();

    service = module.get<DriftEngineService>(DriftEngineService);
  });

  describe('analyzeDrift', () => {
    it('should analyze drift between two environments', async () => {
      mockCodeAnalyzer.analyze.mockResolvedValue([
        { type: 'CODE', category: 'commit', severity: 'MEDIUM' },
      ]);
      mockConfigAnalyzer.analyze.mockResolvedValue([
        { type: 'CONFIG', category: 'env_variable', severity: 'HIGH' },
      ]);
      mockDbAnalyzer.analyze.mockResolvedValue([]);
      mockLLMService.generateDriftSummary.mockResolvedValue('Summary text');

      const result = await service.analyzeDrift('project-1', 'env-1', 'env-2');

      expect(result.driftItems).toHaveLength(2);
      expect(result.summary).toBe('Summary text');
      expect(mockPrisma.driftReport.create).toHaveBeenCalled();
    });

    it('should calculate correct severity based on drift items', async () => {
      mockCodeAnalyzer.analyze.mockResolvedValue([
        { severity: 'CRITICAL' },
      ]);

      const result = await service.analyzeDrift('project-1', 'env-1', 'env-2');

      expect(result.severity).toBe('CRITICAL');
    });
  });
});
```

### 11.3 Integration Tests

**API Tests:**
```typescript
// apps/api/test/projects.e2e-spec.ts
describe('Projects (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = loginResponse.body.accessToken;
  });

  describe('POST /projects', () => {
    it('should create a new project', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          description: 'A test project',
        })
        .expect(201);

      expect(response.body.name).toBe('Test Project');
      expect(response.body.slug).toBe('test-project');
    });

    it('should reject duplicate project names', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Project' });

      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Project' })
        .expect(409);
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });
});
```

### 11.4 E2E Tests

**Playwright Tests:**
```typescript
// apps/web/e2e/project-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Project Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new project', async ({ page }) => {
    // Navigate to project creation
    await page.click('[data-testid="create-project-btn"]');
    await expect(page).toHaveURL('/projects/new');

    // Step 1: Basic Info
    await page.fill('[name="name"]', 'E2E Test Project');
    await page.fill('[name="description"]', 'Created by E2E test');
    await page.click('[data-testid="next-step"]');

    // Step 2: Sub-modules
    await page.click('[data-testid="add-submodule"]');
    await page.fill('[name="subModules.0.name"]', 'Backend API');
    await page.selectOption('[name="subModules.0.type"]', 'BACKEND');
    await page.click('[data-testid="next-step"]');

    // Step 3: Repositories (skip for now)
    await page.click('[data-testid="next-step"]');

    // Step 4: Environments
    await page.click('[data-testid="add-environment"]');
    await page.fill('[name="environments.0.name"]', 'Development');
    await page.selectOption('[name="environments.0.stage"]', 'DEV');
    await page.click('[data-testid="next-step"]');

    // Step 5: Review and Create
    await expect(page.locator('[data-testid="review-project-name"]')).toHaveText('E2E Test Project');
    await page.click('[data-testid="create-project"]');

    // Verify success
    await expect(page).toHaveURL(/\/projects\/[\w-]+$/);
    await expect(page.locator('h1')).toHaveText('E2E Test Project');
  });
});
```

---

## Phase 12: Deployment & DevOps

### 12.1 Docker Configuration

**API Dockerfile:**
```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

USER nestjs
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

**Web Dockerfile:**
```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

### 12.2 Docker Compose

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: pilabstudio
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: pilabstudio
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pilabstudio"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ../apps/api
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://pilabstudio:${DB_PASSWORD}@postgres:5432/pilabstudio
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    build:
      context: ../apps/web
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### 12.3 GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:cov
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm e2e
```

### 12.4 Kubernetes Deployment

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pilabstudio-api
  labels:
    app: pilabstudio-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pilabstudio-api
  template:
    metadata:
      labels:
        app: pilabstudio-api
    spec:
      containers:
        - name: api
          image: pilabstudio/api:latest
          ports:
            - containerPort: 3001
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: pilabstudio-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: pilabstudio-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: pilabstudio-api
spec:
  selector:
    app: pilabstudio-api
  ports:
    - port: 80
      targetPort: 3001
  type: ClusterIP
```

---

## Implementation Checklist

### Phase 1: Project Setup
- [ ] Initialize monorepo with pnpm and Turborepo
- [ ] Setup NestJS backend application
- [ ] Setup Next.js frontend application
- [ ] Configure shared packages
- [ ] Setup PostgreSQL database
- [ ] Configure Prisma ORM
- [ ] Setup Docker development environment
- [ ] Configure ESLint, Prettier, Husky

### Phase 2: Authentication
- [ ] Implement user registration
- [ ] Implement JWT authentication
- [ ] Implement role-based access control
- [ ] Implement session management
- [ ] Setup tenant middleware
- [ ] Create login/register UI pages

### Phase 3: Project Management
- [ ] Implement project CRUD APIs
- [ ] Create project creation wizard (5-step)
- [ ] Implement sub-module management
- [ ] Create project list and detail pages

### Phase 4: Repository Management
- [ ] Implement Git provider adapter pattern
- [ ] Setup GitHub OAuth integration
- [ ] Implement repository linking
- [ ] Create webhook handlers
- [ ] Implement repository sync service

### Phase 5: Environment Management
- [ ] Implement environment CRUD APIs
- [ ] Create environment configuration UI
- [ ] Implement environment variables management
- [ ] Setup promotion path configuration

### Phase 6: Master Manifest
- [ ] Implement version tracking matrix API
- [ ] Create manifest UI component
- [ ] Implement real-time updates
- [ ] Create baseline/snapshot functionality

### Phase 7: Drift Detection
- [ ] Implement code drift analyzer
- [ ] Implement config drift analyzer
- [ ] Implement database drift analyzer
- [ ] Setup LLM service for analysis
- [ ] Create drift report APIs

### Phase 8: Release Notes
- [ ] Implement release notes generator
- [ ] Create template system
- [ ] Setup export functionality
- [ ] Create release notes UI

### Phase 9: Dashboard & UI
- [ ] Create main dashboard layout
- [ ] Implement stats widgets
- [ ] Create activity feed
- [ ] Build drift visualization components

### Phase 10: Integrations
- [ ] Implement JIRA integration
- [ ] Implement Slack notifications
- [ ] Setup GitHub webhooks

### Phase 11: Testing
- [ ] Write unit tests (80% coverage)
- [ ] Write integration tests
- [ ] Setup E2E tests with Playwright
- [ ] Perform security testing

### Phase 12: Deployment
- [ ] Create Docker configurations
- [ ] Setup CI/CD pipelines
- [ ] Create Kubernetes manifests
- [ ] Setup monitoring and logging
- [ ] Write deployment documentation

---

## Appendix

### A. API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh token |
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| GET | `/projects/:id/manifest` | Get manifest matrix |
| POST | `/projects/:id/drift/analyze` | Trigger drift analysis |
| GET | `/projects/:id/drift` | List drift reports |
| POST | `/projects/:id/release-notes/generate` | Generate release notes |

### B. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d

# OpenAI
OPENAI_API_KEY=sk-...

# GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# JIRA
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=user@example.com
JIRA_API_TOKEN=...

# Slack
SLACK_BOT_TOKEN=xoxb-...

# App
APP_URL=https://pilabstudio.io
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
