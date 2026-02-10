# UC-AI-001: AI Drift Explainer - Implementation Guide

## Iteration 01 | Step-by-Step Implementation Plan

---

## 1. Prerequisites

### 1.1 Development Environment Setup

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Runtime for NestJS backend |
| npm/yarn/pnpm | Latest | Package manager |
| PostgreSQL | 15+ | Database for drift reports and analysis |
| Redis | 7+ | Caching LLM responses |
| Python | 3.11+ | Running existing scripts (create-release-note.py) |
| Git | 2.40+ | Version control |

### 1.2 API Keys Required

| Service | Key | Environment Variable |
|---------|-----|---------------------|
| Google Gemini 3 Pro | API key from Google AI Studio | `GEMINI_API_KEY` |
| Anthropic Claude (fallback) | API key from Anthropic Console | `ANTHROPIC_API_KEY` |

### 1.3 Project Dependencies (npm packages)

```
# NestJS core
@nestjs/common @nestjs/core @nestjs/platform-express

# LLM SDKs
@google/generative-ai    # Google Gemini SDK
@anthropic-ai/sdk        # Anthropic Claude SDK

# Database
@prisma/client prisma    # ORM for PostgreSQL
pg                       # PostgreSQL driver

# Cache
ioredis                  # Redis client
@nestjs/cache-manager    # NestJS cache integration
cache-manager-ioredis-yet

# Validation
class-validator class-transformer zod

# Excel parsing
exceljs                  # Read Excel files from create-release-note.py

# Utilities
uuid crypto-js           # UUID generation, hashing for cache keys

# Testing
jest ts-jest @nestjs/testing supertest
```

---

## 2. Project Structure

Create the following folder structure under the NestJS backend:

```
src/
├── ai/
│   ├── ai.module.ts                      # AI feature module
│   ├── drift-explainer/
│   │   ├── drift-explainer.controller.ts # API endpoint
│   │   ├── drift-explainer.service.ts    # Core business logic
│   │   ├── drift-explainer.module.ts     # Module definition
│   │   ├── dto/
│   │   │   ├── explain-drift.dto.ts      # Request validation DTO
│   │   │   └── drift-explanation.dto.ts  # Response DTO
│   │   ├── interfaces/
│   │   │   ├── drift-item.interface.ts   # DriftItem type
│   │   │   └── explanation.interface.ts  # Explanation result type
│   │   └── __tests__/
│   │       ├── drift-explainer.service.spec.ts
│   │       ├── drift-explainer.controller.spec.ts
│   │       └── fixtures/
│   │           ├── basic-drift-report.json
│   │           ├── critical-security-drift.json
│   │           └── benign-drift-report.json
│   ├── llm/
│   │   ├── llm.module.ts                # LLM service module
│   │   ├── llm.service.ts               # LLM abstraction (Gemini + Claude)
│   │   ├── llm-cache.service.ts         # Redis caching for LLM responses
│   │   ├── prompt-builder.service.ts    # Prompt template construction
│   │   ├── interfaces/
│   │   │   ├── llm-params.interface.ts
│   │   │   └── llm-response.interface.ts
│   │   └── __tests__/
│   │       ├── llm.service.spec.ts
│   │       ├── prompt-builder.service.spec.ts
│   │       └── llm-cache.service.spec.ts
│   └── shared/
│       ├── data-redaction.service.ts     # Redact sensitive values
│       ├── excel-parser.service.ts       # Parse release note Excel files
│       └── __tests__/
│           ├── data-redaction.service.spec.ts
│           └── excel-parser.service.spec.ts
├── prisma/
│   └── schema.prisma                     # Database schema
└── config/
    └── ai.config.ts                      # AI-related configuration
```

---

## 3. Implementation Steps

### Step 1: Database Schema (Day 1 - Morning)

Define the Prisma schema for storing drift reports and AI analyses.

**File: `prisma/schema.prisma`**

Add the following models:

```prisma
model DriftReport {
  id                String    @id @default(uuid()) @db.Uuid
  sourceEnvironment String    @map("source_environment")
  targetEnvironment String    @map("target_environment")
  totalItems        Int       @map("total_items")
  excelFilePath     String?   @map("excel_file_path")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  items    DriftItem[]
  analyses DriftAnalysis[]

  @@map("drift_reports")
}

model DriftItem {
  id                      String  @id @default(uuid()) @db.Uuid
  driftReportId           String  @map("drift_report_id") @db.Uuid
  serviceName             String  @map("service_name")
  changeType              String  @map("change_type")
  keyPath                 String  @map("key_path")
  lowerEnvCurrentValue    String? @map("lower_env_current_value")
  lowerEnvPreviousValue   String? @map("lower_env_previous_value")
  higherEnvCurrentValue   String? @map("higher_env_current_value")
  higherEnvPreviousValue  String? @map("higher_env_previous_value")
  comment                 String?

  driftReport DriftReport @relation(fields: [driftReportId], references: [id])

  @@map("drift_items")
}

model DriftAnalysis {
  id              String   @id @default(uuid()) @db.Uuid
  driftReportId   String   @map("drift_report_id") @db.Uuid
  audience        String
  summary         String
  riskScore       Float    @map("risk_score")
  riskLevel       String   @map("risk_level")
  impact          String
  explanation     Json
  recommendations Json
  categorization  Json
  driftDetails    Json     @map("drift_details")
  model           String
  cached          Boolean  @default(false)
  processingTimeMs Int     @map("processing_time_ms")
  tokenUsage      Json?    @map("token_usage")
  cost            Float?
  createdAt       DateTime @default(now()) @map("created_at")

  driftReport DriftReport @relation(fields: [driftReportId], references: [id])

  @@map("drift_analyses")
}

model DriftFeedback {
  id          String   @id @default(uuid()) @db.Uuid
  analysisId  String   @map("analysis_id") @db.Uuid
  rating      String
  reason      String?
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("drift_feedback")
}
```

**Actions:**
1. Add these models to the existing Prisma schema
2. Run `npx prisma migrate dev --name add-drift-explainer-tables`
3. Run `npx prisma generate` to update the client

---

### Step 2: Interfaces and DTOs (Day 1 - Morning)

**File: `src/ai/drift-explainer/interfaces/drift-item.interface.ts`**

Define the core `DriftItem` interface that normalizes data from both app and infra drift reports:

```typescript
export interface DriftItem {
  id?: string;
  serviceName: string;
  changeType: 'modify' | 'add' | 'delete';
  keyPath: string;
  lowerEnvCurrentValue: string;
  lowerEnvPreviousValue: string;
  higherEnvCurrentValue: string;
  higherEnvPreviousValue: string;
  comment: string;
}
```

**File: `src/ai/drift-explainer/interfaces/explanation.interface.ts`**

```typescript
export interface DriftExplanation {
  id: string;
  driftReportId: string;
  timestamp: string;
  audience: 'technical' | 'business' | 'executive';
  summary: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact: string;
  explanation: {
    technical: string;
    business: string;
    executive: string;
  };
  recommendations: Recommendation[];
  categorization: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  driftDetails: DriftDetail[];
  metadata: AnalysisMetadata;
}

export interface Recommendation {
  priority: 'CRITICAL' | 'HIGH' | 'WARNING' | 'OK';
  action: string;
  justification: string;
  effort: string;
}

export interface DriftDetail {
  serviceName: string;
  keyPath: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  oldValue: string;
  newValue: string;
  explanation: string;
}

export interface AnalysisMetadata {
  model: string;
  cached: boolean;
  processingTimeMs: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
}
```

**File: `src/ai/drift-explainer/dto/explain-drift.dto.ts`**

Define the request DTO with validation decorators using `class-validator`:

```typescript
import { IsEnum, IsOptional, IsUUID, IsArray, ValidateNested, IsString, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class DriftItemDto {
  @IsString()
  serviceName: string;

  @IsEnum(['modify', 'add', 'delete'])
  changeType: 'modify' | 'add' | 'delete';

  @IsString()
  keyPath: string;

  @IsString()
  lowerEnvCurrentValue: string;

  @IsString()
  @IsOptional()
  lowerEnvPreviousValue?: string;

  @IsString()
  @IsOptional()
  higherEnvCurrentValue?: string;

  @IsString()
  @IsOptional()
  higherEnvPreviousValue?: string;

  @IsString()
  comment: string;
}

export class ExplainDriftDto {
  @IsUUID()
  @IsOptional()
  driftReportId?: string;

  @IsString()
  sourceEnvironment: string;

  @IsString()
  targetEnvironment: string;

  @IsEnum(['technical', 'business', 'executive'])
  audience: 'technical' | 'business' | 'executive';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriftItemDto)
  @IsOptional()
  @ArrayMinSize(1)
  driftItems?: DriftItemDto[];
}
```

---

### Step 3: Data Redaction Service (Day 1 - Afternoon)

**File: `src/ai/shared/data-redaction.service.ts`**

Build a service that identifies and redacts sensitive values before they reach the LLM.

**Implementation approach:**
1. Define regex patterns for sensitive field names: `password`, `secret`, `token`, `api_key`, `jwt`, `credential`, `private_key`, `connection_string`
2. For each drift item, check if the key path matches any sensitive pattern
3. If it matches, replace the old and new values with `[REDACTED]`
4. Keep metadata about what was redacted (for the response to still flag them as security-sensitive)
5. Return the redacted drift items and a list of redacted fields

**Key patterns to match:**
```
/password|passwd|secret|token|api[_-]?key|jwt|oauth|credential|private[_-]?key|connection[_-]?string|auth[_-]?token/i
```

**Test:** TC-SEC-001 validates this service

---

### Step 4: Excel Parser Service (Day 1 - Afternoon)

**File: `src/ai/shared/excel-parser.service.ts`**

Build a service that reads the Excel output from `create-release-note.py` and converts it to `DriftItem[]`.

**Implementation approach:**
1. Use `exceljs` library to read the `.xlsx` file
2. Read the first (active) sheet which has columns:
   - Column A: Service name
   - Column B: Change Request (change type)
   - Column C: Key
   - Column D: `<lower-env>`-current value
   - Column E: `<lower-env>`-previous value
   - Column F: `<higher-env>`-current value
   - Column G: `<higher-env>`-previous value
   - Column H: Comment
3. Parse the header row to dynamically detect environment names (column headers contain env names like "dev-current value")
4. For each data row (row 2 onwards), create a `DriftItem` object
5. Handle special cases:
   - Hyperlink cells (large values stored in external .txt files)
   - JSON values in cells (root object added/deleted)
   - Empty cells (normalize to empty string)

**Also support infra drift Excel** (`infra_difference.xlsx`) with columns:
- Sheet Name, Object Id, Field, `<lower-env> Previous Value`, `<lower-env> Current Value`, `<higher-env> Current Value`, `<higher-env> Value`, Change

**Method signature:**
```typescript
async parseReleaseNoteExcel(filePath: string): Promise<{ items: DriftItem[], sourceEnv: string, targetEnv: string }>
async parseInfraDriftExcel(filePath: string): Promise<{ items: DriftItem[], sourceEnv: string, targetEnv: string }>
```

---

### Step 5: LLM Service (Day 2 - Full Day)

This is the core service that handles LLM communication.

#### 5a: LLM Cache Service

**File: `src/ai/llm/llm-cache.service.ts`**

**Implementation approach:**
1. Inject `ioredis` client
2. Generate cache key: SHA-256 hash of sorted drift items JSON + audience + model name
3. `get(key)` method: returns cached response or null
4. `set(key, value, ttl)` method: stores response with 3600-second TTL
5. Graceful degradation: if Redis is unavailable, log warning and return null (cache miss)

**Key design decisions:**
- Sort drift items by serviceName + keyPath before hashing to ensure order-independent cache keys
- Store the entire response JSON as a string
- Use `SETEX` for atomic set-with-TTL

#### 5b: Prompt Builder Service

**File: `src/ai/llm/prompt-builder.service.ts`**

**Implementation approach:**
1. System prompt: static DevOps expert persona with Garuda.One context
2. User prompt: dynamically built from drift items and audience
3. Few-shot examples: 3 hardcoded examples covering low-risk, medium-risk, and critical-risk scenarios
4. Output format: JSON schema definition included in prompt
5. Batching: if drift items > 20, split into batches

**Method signature:**
```typescript
buildExplainerPrompt(params: {
  sourceEnv: string;
  targetEnv: string;
  audience: 'technical' | 'business' | 'executive';
  driftItems: DriftItem[];
}): { systemPrompt: string; userPrompt: string }
```

**Prompt construction order:**
1. System prompt (persona + guidelines)
2. Few-shot examples
3. Environment context
4. Drift items (formatted as a list)
5. Task instructions (specific to audience)
6. Output format specification

#### 5c: LLM Service

**File: `src/ai/llm/llm.service.ts`**

**Implementation approach:**
1. Initialize both Gemini and Anthropic clients in constructor
2. `complete()` method:
   a. Check cache (via LLMCacheService)
   b. If cache miss, call primary provider (Gemini)
   c. If Gemini fails, retry once
   d. If retry fails, call fallback provider (Claude)
   e. If both fail, throw `LLMUnavailableException`
   f. Parse and validate response JSON
   g. Cache successful response
   h. Log call details (model, tokens, latency, cost)
3. Provider selection: always use Gemini as primary, Claude as fallback
4. Temperature: 0.3 for deterministic, factual analysis
5. Max tokens: 4000 (sufficient for detailed analysis)

**Gemini API call:**
```typescript
const model = this.gemini.getGenerativeModel({ model: 'gemini-3-pro' });
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
  systemInstruction: { parts: [{ text: systemPrompt }] },
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 4000,
    responseMimeType: 'application/json',
  },
});
```

**Claude API call (fallback):**
```typescript
const response = await this.anthropic.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 4000,
  temperature: 0.3,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
});
```

**Response parsing:**
1. Extract content string from provider response
2. Strip markdown code fences if present (```json ... ```)
3. Parse JSON
4. Validate against Zod schema
5. Clamp risk score to 1-10 range
6. Verify categorization sum matches drift item count
7. Return validated result

---

### Step 6: Drift Explainer Service (Day 3 - Morning)

**File: `src/ai/drift-explainer/drift-explainer.service.ts`**

This is the main orchestration service.

**Implementation approach:**

```typescript
@Injectable()
export class DriftExplainerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly redactionService: DataRedactionService,
    private readonly excelParser: ExcelParserService,
  ) {}

  async explainDrift(dto: ExplainDriftDto): Promise<DriftExplanation> {
    const startTime = Date.now();

    // 1. Get drift items (from request or database)
    let driftItems: DriftItem[];
    if (dto.driftItems) {
      driftItems = dto.driftItems;
    } else {
      driftItems = await this.loadDriftItems(dto.driftReportId);
    }

    // 2. Redact sensitive values
    const { redactedItems, redactedFields } = this.redactionService.redact(driftItems);

    // 3. Build prompt
    const { systemPrompt, userPrompt } = this.promptBuilder.buildExplainerPrompt({
      sourceEnv: dto.sourceEnvironment,
      targetEnv: dto.targetEnvironment,
      audience: dto.audience,
      driftItems: redactedItems,
    });

    // 4. Call LLM (with caching, retry, fallback)
    const llmResponse = await this.llmService.complete({
      systemPrompt,
      userPrompt,
      task: 'drift_explanation',
      cacheKey: { items: redactedItems, audience: dto.audience },
    });

    // 5. Build response
    const processingTimeMs = Date.now() - startTime;
    const explanation = this.buildResponse(llmResponse, dto, processingTimeMs);

    // 6. Store in database
    await this.storeAnalysis(explanation);

    return explanation;
  }
}
```

**Key method: `buildResponse`**
- Maps LLM JSON output to the `DriftExplanation` interface
- Derives `riskLevel` from `riskScore` (1-3=LOW, 4-6=MEDIUM, 7-8=HIGH, 9-10=CRITICAL)
- Adds metadata (model used, cache hit status, processing time, token usage)
- Generates a unique analysis ID

---

### Step 7: API Controller (Day 3 - Afternoon)

**File: `src/ai/drift-explainer/drift-explainer.controller.ts`**

```typescript
@Controller('api/ai/drift')
export class DriftExplainerController {
  constructor(private readonly driftExplainerService: DriftExplainerService) {}

  @Post('explain')
  @HttpCode(200)
  async explainDrift(@Body() dto: ExplainDriftDto): Promise<DriftExplanation> {
    // Validate that either driftReportId or driftItems is provided
    if (!dto.driftReportId && !dto.driftItems) {
      throw new BadRequestException('Either driftReportId or driftItems must be provided');
    }
    return this.driftExplainerService.explainDrift(dto);
  }

  @Post('ingest')
  @HttpCode(201)
  async ingestExcel(@Body() dto: IngestExcelDto): Promise<{ driftReportId: string; itemCount: number }> {
    // Parse Excel file and store drift items in database
    return this.driftExplainerService.ingestFromExcel(dto.filePath, dto.sourceEnv, dto.targetEnv);
  }

  @Post('feedback')
  @HttpCode(200)
  async submitFeedback(@Body() dto: DriftFeedbackDto): Promise<{ success: boolean }> {
    return this.driftExplainerService.submitFeedback(dto);
  }

  @Get(':id')
  async getAnalysis(@Param('id') id: string): Promise<DriftExplanation> {
    return this.driftExplainerService.getAnalysis(id);
  }
}
```

**Endpoints summary:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/drift/explain` | Analyze drift and get explanation |
| POST | `/api/ai/drift/ingest` | Ingest Excel file into database |
| POST | `/api/ai/drift/feedback` | Submit user feedback on analysis |
| GET | `/api/ai/drift/:id` | Retrieve stored analysis by ID |

---

### Step 8: Module Wiring (Day 3 - Afternoon)

**File: `src/ai/drift-explainer/drift-explainer.module.ts`**

```typescript
@Module({
  imports: [LLMModule, PrismaModule],
  controllers: [DriftExplainerController],
  providers: [
    DriftExplainerService,
    ExcelParserService,
    DataRedactionService,
  ],
  exports: [DriftExplainerService],
})
export class DriftExplainerModule {}
```

**File: `src/ai/llm/llm.module.ts`**

```typescript
@Module({
  providers: [LLMService, LLMCacheService, PromptBuilderService],
  exports: [LLMService, PromptBuilderService],
})
export class LLMModule {}
```

**File: `src/ai/ai.module.ts`**

```typescript
@Module({
  imports: [DriftExplainerModule, LLMModule],
})
export class AIModule {}
```

Register `AIModule` in the root `AppModule`.

---

### Step 9: Configuration (Day 3 - Afternoon)

**File: `src/config/ai.config.ts`**

```typescript
export const aiConfig = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-3-pro',
    maxTokens: 4000,
    temperature: 0.3,
    timeout: 30000, // 30 seconds
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-opus-4-6',
    maxTokens: 4000,
    temperature: 0.3,
    timeout: 30000,
  },
  cache: {
    ttl: 3600, // 1 hour in seconds
    prefix: 'drift-explainer',
  },
  limits: {
    maxDriftItemsPerBatch: 20,
    maxRequestsPerMinute: 60,
    maxCostPerDay: 100, // USD
  },
  redaction: {
    patterns: [
      /password|passwd/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /jwt/i,
      /credential/i,
      /private[_-]?key/i,
      /connection[_-]?string/i,
    ],
    replacement: '[REDACTED]',
  },
};
```

**Environment variables (.env):**

```env
# LLM API Keys
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/garuda_one

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Configuration
AI_CACHE_TTL=3600
AI_MAX_BATCH_SIZE=20
AI_MAX_REQUESTS_PER_MINUTE=60
```

---

### Step 10: Unit Tests (Day 4 - Full Day)

Write tests following the test cases from `test-cases.md`. Key test files:

#### `drift-explainer.service.spec.ts`
- Mock LLM service, Redis, Prisma
- Test all scenarios from TC-SCEN-001 through TC-SCEN-010
- Test batching logic (TC-UNIT-014)
- Test error handling paths

#### `llm.service.spec.ts`
- Mock HTTP clients for Gemini and Claude
- Test retry logic (TC-INT-002)
- Test fallback (TC-INT-003)
- Test both-fail scenario (TC-INT-004)

#### `prompt-builder.service.spec.ts`
- Test prompt construction for all audiences (TC-UNIT-010 to TC-UNIT-013)
- Test few-shot example inclusion (TC-UNIT-013)
- Test batching (TC-UNIT-014)

#### `llm-cache.service.spec.ts`
- Use in-memory Redis mock (ioredis-mock)
- Test cache key determinism (TC-UNIT-030)
- Test order independence (TC-UNIT-031)
- Test TTL (TC-UNIT-032)

#### `data-redaction.service.spec.ts`
- Test all sensitive patterns (TC-SEC-001)
- Verify redacted values are replaced with `[REDACTED]`
- Verify non-sensitive values are not redacted

#### `excel-parser.service.spec.ts`
- Use fixture Excel files
- Test standard parsing (TC-UNIT-001)
- Test large values (TC-UNIT-002)
- Test empty values (TC-UNIT-003)
- Test infra drift parsing (TC-UNIT-004)
- Test malformed file (TC-UNIT-005)

---

### Step 11: Integration Tests (Day 5 - Morning)

#### `drift-explainer.e2e-spec.ts`

Use `@nestjs/testing` with `Test.createTestingModule` and real PostgreSQL (via Docker/Testcontainers) and Redis.

**Tests:**
- Full API request/response cycle (TC-API-001 through TC-API-012)
- Database persistence (TC-INT-020, TC-INT-021)
- Cache integration (TC-INT-010, TC-INT-011, TC-INT-012)

**Setup:**
```typescript
beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
  .overrideProvider(LLMService)
  .useValue(mockLlmService) // Use mock for deterministic tests
  .compile();

  app = module.createNestApplication();
  await app.init();
});
```

---

### Step 12: Monitoring & Observability (Day 5 - Afternoon)

#### Structured Logging

Add structured logging to all service methods:

```typescript
this.logger.log({
  event: 'drift_explanation_requested',
  driftReportId: dto.driftReportId,
  audience: dto.audience,
  itemCount: driftItems.length,
});

this.logger.log({
  event: 'llm_call_completed',
  model: response.model,
  cached: response.cached,
  processingTimeMs: response.processingTimeMs,
  tokenUsage: response.tokenUsage,
  cost: response.cost,
});
```

#### Prometheus Metrics

Define custom metrics:

```typescript
// Counter: total drift explanations
const driftExplanationTotal = new Counter({
  name: 'drift_explanation_total',
  help: 'Total drift explanations generated',
  labelNames: ['audience', 'risk_level', 'model'],
});

// Histogram: processing time
const driftExplanationDuration = new Histogram({
  name: 'drift_explanation_duration_seconds',
  help: 'Time to generate drift explanation',
  labelNames: ['cached'],
  buckets: [0.05, 0.1, 0.5, 1, 2, 3, 5, 10],
});

// Counter: LLM errors
const llmErrorTotal = new Counter({
  name: 'llm_error_total',
  help: 'Total LLM API errors',
  labelNames: ['provider', 'error_type'],
});

// Gauge: LLM cost
const llmCostTotal = new Counter({
  name: 'llm_cost_usd_total',
  help: 'Total LLM API cost in USD',
  labelNames: ['model'],
});
```

#### Health Check

Add a health check endpoint for the AI service:

```typescript
@Get('health')
async healthCheck() {
  const redisOk = await this.cacheService.ping();
  const dbOk = await this.prisma.$queryRaw`SELECT 1`;

  return {
    status: redisOk && dbOk ? 'healthy' : 'degraded',
    redis: redisOk ? 'connected' : 'disconnected',
    database: dbOk ? 'connected' : 'disconnected',
    llm: {
      gemini: 'configured',
      anthropic: 'configured',
    },
  };
}
```

---

## 4. Error Handling Strategy

| Error | HTTP Status | Response | Recovery |
|-------|-------------|----------|----------|
| Invalid request body | 400 | Validation errors array | Fix request |
| Drift report not found | 404 | "Drift report not found" | Check ID |
| LLM timeout (Gemini) | - | Retry once, then fallback to Claude | Automatic |
| LLM timeout (both) | 503 | "AI analysis temporarily unavailable" | Return raw data |
| LLM rate limited | 429 | "Rate limit exceeded, try again later" | Exponential backoff |
| Redis unavailable | - | Log warning, proceed without cache | Automatic |
| Database error | 500 | "Internal server error" | Log and alert |
| Excel parse error | 400 | "Invalid Excel file: <details>" | Fix file |
| LLM invalid JSON | - | Log, retry with stricter prompt | Automatic |

---

## 5. Deployment Checklist

### Pre-deployment
- [ ] All unit tests pass (90%+ coverage)
- [ ] Integration tests pass
- [ ] API contract tests pass
- [ ] Security tests pass (no sensitive data leakage)
- [ ] Performance test: < 3 sec P95 (cache miss), < 50ms P95 (cache hit)
- [ ] Environment variables configured in deployment environment
- [ ] Database migration applied
- [ ] Redis accessible from service

### Post-deployment
- [ ] Health check endpoint returns healthy
- [ ] Send test drift report and verify response
- [ ] Verify caching works (second request is faster)
- [ ] Verify Prometheus metrics are being collected
- [ ] Verify structured logs appear in log aggregator
- [ ] Verify LLM cost tracking is accurate
- [ ] Run one real `create-release-note.py` output through the system

---

## 6. Dependencies on Existing Code

| Existing File | What We Use | How |
|---------------|-------------|-----|
| `create-release-note.py` | Excel output format | ExcelParser reads its output |
| `drift_lower_env.py` | Infra drift Excel format | ExcelParser reads its output |
| `promotion-repo/helm-charts/` | Environment structure | Understanding env names and paths |
| `generate-config.py` | JSON comparison logic | Reference for understanding change types |

No modifications to existing scripts are required. The AI Drift Explainer reads their output files.

---

## 7. Future Iteration Hooks

The following extension points are built into this iteration for future use:

1. **DriftItem interface** - Has optional fields for root cause data (iteration 02)
2. **Database schema** - `DriftAnalysis` has `driftDetails` JSON column for ML risk scores (iteration 03)
3. **LLM Service** - Abstracted provider layer supports adding new models
4. **Prompt Builder** - Template-based design allows adding new analysis types
5. **Feedback table** - Collects training data for ML models (iteration 03)
6. **Excel Parser** - Modular design supports adding new file formats

---

**Document Version:** 1.0
**Last Updated:** February 10, 2026
**Author:** AI-Assisted (Iteration Planning)
