# AI Architecture for Garuda.One

## Overview

This document describes the AI/ML architecture for the Garuda.One platform, including multi-agent systems, LLM integration, ML models, and data pipelines.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                        │
│  - AI Insights Dashboard                                         │
│  - Chat Interface                                                │
│  - Real-time Anomaly Alerts                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API / WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                   Backend API (NestJS)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           AI Service Layer (TypeScript)                   │   │
│  │  - LLM Service (Gemini/Claude integration)                │   │
│  │  - Agent Orchestrator (LangChain/LangGraph)              │   │
│  │  - ML Model Client (REST API calls)                      │   │
│  │  - Vector Store Client (pgvector)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────┬───────────────────────────┬────────────────────┘
                 │                           │
        ┌────────▼────────┐         ┌───────▼──────────┐
        │  Python AI      │         │  PostgreSQL +    │
        │  Services       │         │  pgvector        │
        │                 │         │                  │
        │ - ML Models     │         │ - Embeddings     │
        │   (FastAPI)     │         │ - Vector Search  │
        │ - Training      │         │ - Metadata       │
        │   Pipelines     │         │                  │
        └────────┬────────┘         └──────────────────┘
                 │
        ┌────────▼────────┐
        │  External APIs  │
        │                 │
        │ - Gemini API    │
        │ - Claude API    │
        │ - Prometheus    │
        │ - JIRA API      │
        └─────────────────┘
```

## Multi-Agent Architecture

### Agent Orchestration Flow

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────┐
│       AI Orchestrator (LangGraph)                │
│   - Intent Recognition                           │
│   - Agent Routing                                │
│   - Context Management                           │
│   - Response Aggregation                         │
└──────────┬──────────────────────────────┬───────┘
           │                               │
    ┌──────▼──────┐              ┌────────▼────────┐
    │ Drift Agent │              │ Release Agent   │
    │             │              │                 │
    │ Analyze     │              │ Summarize       │
    │ drift ────► │ LLM Call     │ commits ──────► │ LLM Call
    │ Score risk  │              │ Enrich JIRA     │
    │ Suggest fix │              │ Predict risk    │
    └─────────────┘              └─────────────────┘
           │                               │
    ┌──────▼──────┐              ┌────────▼────────┐
    │Promotion    │              │ Anomaly Agent   │
    │Agent        │              │                 │
    │             │              │ Monitor         │
    │ Plan ─────► │ Execute      │ metrics ──────► │ ML Model
    │ Validate    │ Script       │ Detect issues   │
    │ Execute     │              │ Auto-alert      │
    └─────────────┘              └─────────────────┘
           │                               │
           └───────────┬───────────────────┘
                       │
            ┌──────────▼──────────┐
            │   Shared Services    │
            │                      │
            │ - LLM Engine         │
            │ - Vector DB          │
            │ - ML Models          │
            │ - Knowledge Base     │
            └──────────────────────┘
```

### Agent Specifications

#### 1. Drift Analysis Agent

**Responsibilities:**
- Analyze configuration drift reports
- Score risk levels (1-10)
- Explain impact in plain English
- Categorize drift types
- Suggest remediation strategies

**Tools:**
- LLM for natural language generation
- Rule-based risk scoring
- Historical drift pattern matching (vector search)

**Input:**
```typescript
interface DriftAnalysisInput {
  driftReportId: string;
  sourceEnv: string;
  targetEnv: string;
  driftItems: DriftItem[];
  audience: 'technical' | 'business' | 'executive';
}
```

**Output:**
```typescript
interface DriftAnalysisOutput {
  summary: string;
  riskScore: number;
  impact: string;
  categorization: DriftCategory[];
  recommendations: Recommendation[];
  rootCauses: RootCause[];
}
```

**LLM Prompt Template:**
```
You are a DevOps expert analyzing configuration drift.

Environment: {{sourceEnv}} → {{targetEnv}}
Changes Detected: {{changeCount}}

Drift Items:
{{driftItems}}

Tasks:
1. Summarize impact in {{audience}} language
2. Assess risk (1-10 scale):
   - 1-3: Low (cosmetic, logs, comments)
   - 4-6: Medium (config changes, non-critical)
   - 7-8: High (breaking changes, security)
   - 9-10: Critical (data loss, security breach)
3. Identify critical issues (security, breaking changes)
4. Provide 3 actionable recommendations

Output format: JSON
```

#### 2. Release Notes Agent

**Responsibilities:**
- Generate release note summaries
- Enrich with JIRA ticket data
- Categorize changes (features, bugs, improvements)
- Assess deployment impact
- Convert technical language to business-friendly

**Tools:**
- LLM for summarization and NLG
- JIRA API for ticket enrichment
- Git API for commit analysis

**Input:**
```typescript
interface ReleaseNotesInput {
  releaseVersion: string;
  commits: Commit[];
  jiraTickets?: string[];
  format: 'executive' | 'technical' | 'customer';
}
```

**Output:**
```typescript
interface ReleaseNotesOutput {
  summary: string;
  highlights: string[];
  risks: string[];
  metrics: ReleaseMetrics;
  categorizedChanges: {
    features: Change[];
    bugFixes: Change[];
    improvements: Change[];
    breakingChanges: Change[];
  };
  recommendation: 'DEPLOY' | 'REVIEW' | 'BLOCK';
}
```

#### 3. Promotion Agent

**Responsibilities:**
- Plan environment promotions
- Validate prerequisites
- Execute deployment scripts
- Monitor deployment progress
- Decide rollback necessity

**Tools:**
- Python script executor (values-promotion.py, deploy.py)
- Jenkins API integration
- Kubernetes API for health checks
- ML model for risk prediction

**Input:**
```typescript
interface PromotionInput {
  releaseVersion: string;
  sourceEnv: string;
  targetEnv: string;
  validationChecks: ValidationCheck[];
}
```

**Output:**
```typescript
interface PromotionOutput {
  plan: PromotionPlan;
  riskAssessment: RiskAssessment;
  executionStatus: ExecutionStatus;
  rollbackDecision?: RollbackDecision;
}
```

#### 4. Anomaly Detection Agent

**Responsibilities:**
- Monitor deployment metrics in real-time
- Detect statistical anomalies
- Correlate anomalies with deployments
- Alert SRE team
- Capture diagnostic logs

**Tools:**
- Prometheus for metrics collection
- Isolation Forest ML model
- Time-series analysis (Prophet)
- PagerDuty API for alerting

**Input:**
```typescript
interface AnomalyDetectionInput {
  deploymentId: string;
  metricsWindow: string; // e.g., "5m", "1h"
  baselineWindow: string; // e.g., "7d"
}
```

**Output:**
```typescript
interface AnomalyDetectionOutput {
  anomalies: Anomaly[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  possibleCauses: string[];
  recommendation: string;
  autoActions: string[];
}
```

## LLM Integration

### LLM Service Architecture

```typescript
// Backend: NestJS Service
@Injectable()
export class LLMService {
  private gemini: GoogleGenerativeAI;
  private anthropic: Anthropic;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    this.gemini = new GoogleGenerativeAI({
      apiKey: this.configService.get('GEMINI_API_KEY'),
    });
    this.anthropic = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });
  }

  async complete(params: LLMCompletionParams): Promise<LLMResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(params);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Select provider based on task
    const provider = this.selectProvider(params.task);

    // Make LLM call
    let response: LLMResponse;
    if (provider === 'gemini') {
      response = await this.callGemini(params);
    } else {
      response = await this.callClaude(params);
    }

    // Cache response
    await this.cacheService.set(cacheKey, response, 3600); // 1 hour

    // Log for audit
    await this.logLLMCall(params, response);

    return response;
  }

  private selectProvider(task: string): 'gemini' | 'anthropic' {
    // Use Claude for complex reasoning
    if (task === 'root_cause_analysis' || task === 'code_review') {
      return 'anthropic';
    }
    // Use Gemini for general tasks
    return 'gemini';
  }

  private async callGemini(params: LLMCompletionParams): Promise<LLMResponse> {
    const response = await this.gemini.generateContent({
      model: params.model || 'gemini-3-pro',
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 2000,
      functions: params.functions,
      function_call: params.functionCall,
    });

    return {
      content: response.choices[0].message.content,
      functionCall: response.choices[0].message.function_call,
      usage: response.usage,
      model: response.model,
    };
  }
}
```

### Function Calling (Tool Use)

```typescript
// Define functions for LLM to call
const functions = [
  {
    name: 'get_deployment_status',
    description: 'Get current deployment status for an environment',
    parameters: {
      type: 'object',
      properties: {
        environment: {
          type: 'string',
          enum: ['dev', 'sit', 'uat', 'prod'],
          description: 'Target environment',
        },
        projectId: { type: 'string' },
      },
      required: ['environment', 'projectId'],
    },
  },
  {
    name: 'analyze_drift',
    description: 'Compare configurations between two environments',
    parameters: {
      type: 'object',
      properties: {
        sourceEnv: { type: 'string' },
        targetEnv: { type: 'string' },
        projectId: { type: 'string' },
      },
      required: ['sourceEnv', 'targetEnv', 'projectId'],
    },
  },
];

// LLM decides which function to call
const response = await gemini.generateContent({
  model: 'gemini-3-pro',
  messages: [
    { role: 'system', content: 'You are a deployment assistant.' },
    { role: 'user', content: 'What is deployed in UAT?' },
  ],
  functions: functions,
  function_call: 'auto',
});

// Execute the function
if (response.choices[0].message.function_call) {
  const functionName = response.choices[0].message.function_call.name;
  const args = JSON.parse(response.choices[0].message.function_call.arguments);
  const result = await executeFunction(functionName, args);
}
```

### Prompt Engineering Best Practices

**1. System Prompts:**
```
You are an AI assistant for the Garuda.One deployment platform.

Your capabilities:
- Analyze configuration drift between environments
- Generate release notes from Git commits
- Assess deployment risks
- Provide actionable recommendations

Guidelines:
- Be concise and specific
- Use technical language for engineers, business language for stakeholders
- Always provide risk assessments (1-10 scale)
- Suggest 3 actionable next steps
- Flag security issues with 🔒 emoji
- Highlight breaking changes with ⚠️ emoji

When uncertain, ask clarifying questions.
```

**2. Few-Shot Learning:**
```
Example 1:
Drift: SESSION_TIMEOUT changed from 30 to 3000
Analysis: HIGH RISK (8/10). Likely typo. 100x increase in timeout could cause resource exhaustion.
Recommendation: Verify intended value. Likely should be 300 (5 minutes).

Example 2:
Drift: Image tag changed from :12-sit to :14-sit
Analysis: LOW RISK (2/10). Normal version progression. No breaking changes detected.
Recommendation: Proceed with deployment. Monitor for errors in first 10 minutes.

Now analyze:
Drift: {{userDriftItem}}
```

**3. Chain-of-Thought Prompting:**
```
Analyze this deployment risk step-by-step:

Step 1: Identify changed components
Step 2: Assess complexity of changes
Step 3: Check test coverage
Step 4: Review historical success rate
Step 5: Calculate overall risk score

Deployment Details: {{deploymentData}}
```

## ML Model Architecture

### Risk Prediction Model

**Model:** XGBoost Classifier

**Features (25 total):**
```python
features = {
    # Code metrics
    'files_changed': int,
    'lines_added': int,
    'lines_deleted': int,
    'cyclomatic_complexity': float,

    # Testing
    'test_coverage': float,
    'tests_added': int,
    'e2e_tests_passed': bool,

    # Review
    'code_review_approvals': int,
    'days_in_review': int,

    # Service characteristics
    'services_affected': int,
    'critical_service_changed': bool,
    'has_db_migration': bool,
    'breaking_changes': int,

    # Context
    'environment': categorical,
    'day_of_week': categorical,
    'time_of_day': int (0-23),
    'days_since_last_deploy': int,

    # Team
    'team_experience': int,
    'author_experience': int,

    # Historical
    'similar_changes_success_rate': float,
    'service_incident_history': int,
    'rollback_rate': float,
}

target = 'deployment_success': boolean
```

**Training Pipeline:**
```python
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score

# Load data
X, y = load_training_data()

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train
model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric='auc',
)

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    early_stopping_rounds=10,
    verbose=True,
)

# Evaluate
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.2f}")
print(f"Precision: {precision_score(y_test, y_pred):.2f}")
print(f"Recall: {recall_score(y_test, y_pred):.2f}")

# Save model
model.save_model('risk_prediction_model.json')
```

**Inference API (FastAPI):**
```python
from fastapi import FastAPI
import xgboost as xgb

app = FastAPI()
model = xgb.XGBClassifier()
model.load_model('risk_prediction_model.json')

@app.post("/predict")
async def predict_risk(features: DeploymentFeatures):
    X = features.to_array()
    proba = model.predict_proba(X)[0][1]  # Probability of failure
    risk_score = proba * 10  # Scale to 1-10

    return {
        "risk_score": round(risk_score, 1),
        "failure_probability": round(proba * 100, 1),
        "confidence": 0.87,
        "recommendation": "DEPLOY" if risk_score < 4 else "REVIEW"
    }
```

### Anomaly Detection Model

**Model:** Isolation Forest

**Implementation:**
```python
from sklearn.ensemble import IsolationForest

# Train on normal deployments
normal_data = load_successful_deployments_metrics()

model = IsolationForest(
    contamination=0.05,  # 5% expected anomalies
    random_state=42,
    n_estimators=100,
)

model.fit(normal_data)

# Real-time detection
def detect_anomaly(current_metrics):
    X = prepare_features(current_metrics)
    prediction = model.predict([X])

    if prediction[0] == -1:  # Anomaly
        score = model.score_samples([X])[0]
        return {
            "is_anomaly": True,
            "anomaly_score": abs(score),
            "confidence": 0.95,
        }

    return {"is_anomaly": False}
```

## Vector Database

### pgvector Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for embeddings
CREATE TABLE drift_embeddings (
    id UUID PRIMARY KEY,
    drift_id UUID REFERENCES drift_reports(id),
    embedding vector(768),  -- Gemini embedding dimension
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast similarity search
CREATE INDEX ON drift_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Semantic Search

```typescript
// Generate embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const model = gemini.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// Store drift embedding
async function storeDriftEmbedding(driftId: string, description: string) {
  const embedding = await generateEmbedding(description);

  await prisma.$executeRaw`
    INSERT INTO drift_embeddings (id, drift_id, embedding, metadata)
    VALUES (gen_random_uuid(), ${driftId}::uuid, ${embedding}::vector, '{}'::jsonb)
  `;
}

// Find similar drifts
async function findSimilarDrifts(queryText: string, limit: number = 5) {
  const queryEmbedding = await generateEmbedding(queryText);

  const results = await prisma.$queryRaw`
    SELECT
      d.id,
      d.description,
      d.resolution,
      1 - (e.embedding <=> ${queryEmbedding}::vector) as similarity
    FROM drift_embeddings e
    JOIN drift_reports d ON e.drift_id = d.id
    WHERE d.resolution IS NOT NULL
    ORDER BY e.embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return results;
}
```

## Data Pipeline

### Training Data Collection

```sql
-- Collect deployment features
SELECT
  d.id,
  d.release_version,
  d.environment,
  d.status as deployment_success,

  -- Code metrics
  m.files_changed,
  m.lines_added,
  m.lines_deleted,
  m.test_coverage,

  -- Context
  EXTRACT(dow FROM d.deployed_at) as day_of_week,
  EXTRACT(hour FROM d.deployed_at) as hour_of_day,

  -- Team
  t.deployment_count as team_experience,

  -- Historical
  (SELECT COUNT(*) FROM incidents i
   WHERE i.service_id = d.service_id
   AND i.created_at > d.deployed_at - INTERVAL '30 days') as recent_incidents

FROM deployments d
JOIN deployment_metrics m ON d.id = m.deployment_id
JOIN teams t ON d.team_id = t.id
WHERE d.deployed_at > NOW() - INTERVAL '1 year'
```

### Model Retraining Pipeline

```python
import schedule
import time

def retrain_model():
    print("Starting model retraining...")

    # 1. Collect new data
    new_data = fetch_deployments_since_last_training()

    # 2. Validate data quality
    if len(new_data) < 100:
        print("Insufficient new data. Skipping retraining.")
        return

    # 3. Append to training set
    training_data = load_existing_training_data()
    training_data = pd.concat([training_data, new_data])

    # 4. Train new model
    new_model = train_xgboost_model(training_data)

    # 5. Evaluate
    accuracy = evaluate_model(new_model)

    # 6. A/B test: Compare with current model
    current_model = load_current_model()
    current_accuracy = evaluate_model(current_model)

    if accuracy > current_accuracy - 0.02:  # Allow 2% tolerance
        deploy_model(new_model)
        print(f"New model deployed. Accuracy: {accuracy:.2f}")
    else:
        print(f"New model underperforms. Keeping current model.")

# Schedule weekly retraining
schedule.every().monday.at("02:00").do(retrain_model)

while True:
    schedule.run_pending()
    time.sleep(3600)
```

## Performance & Scalability

### Caching Strategy

```typescript
// Redis cache for LLM responses
@Injectable()
export class LLMCacheService {
  constructor(private redis: Redis) {}

  private getCacheKey(prompt: string, model: string): string {
    const hash = crypto.createHash('sha256')
      .update(prompt + model)
      .digest('hex');
    return `llm:${model}:${hash}`;
  }

  async get(prompt: string, model: string): Promise<string | null> {
    const key = this.getCacheKey(prompt, model);
    return await this.redis.get(key);
  }

  async set(prompt: string, model: string, response: string, ttl: number = 3600) {
    const key = this.getCacheKey(prompt, model);
    await this.redis.setex(key, ttl, response);
  }
}
```

### Rate Limiting

```typescript
// Prevent excessive LLM API calls
@Injectable()
export class RateLimiter {
  private readonly maxRequestsPerMinute = 60;
  private readonly maxCostPerDay = 100; // USD

  async checkLimit(userId: string): Promise<boolean> {
    const minute = await this.redis.incr(`rate:${userId}:${Date.now()}`);
    const dailyCost = await this.redis.get(`cost:${userId}:${getToday()}`);

    return minute <= this.maxRequestsPerMinute &&
           parseFloat(dailyCost) < this.maxCostPerDay;
  }
}
```

## Monitoring & Observability

### Metrics to Track

```typescript
// Prometheus metrics
const llmRequestDuration = new prometheus.Histogram({
  name: 'llm_request_duration_seconds',
  help: 'LLM API request duration',
  labelNames: ['model', 'task'],
});

const llmRequestTotal = new prometheus.Counter({
  name: 'llm_request_total',
  help: 'Total LLM API requests',
  labelNames: ['model', 'status'],
});

const llmCostTotal = new prometheus.Counter({
  name: 'llm_cost_usd_total',
  help: 'Total LLM API cost in USD',
});

const mlModelAccuracy = new prometheus.Gauge({
  name: 'ml_model_accuracy',
  help: 'Current ML model accuracy',
  labelNames: ['model'],
});
```

### Logging

```typescript
// Structured logging for AI operations
@Injectable()
export class AILogger {
  log(event: string, data: any) {
    logger.info({
      event,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  logLLMCall(params: LLMParams, response: LLMResponse, duration: number) {
    this.log('llm_call', {
      model: params.model,
      task: params.task,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      cost: calculateCost(response.usage, params.model),
      duration,
    });
  }
}
```

---

**Next:** See [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for phased implementation plan.
