# Category 1: Intelligent Drift Analysis

## Overview

This category contains **6 AI-powered use cases** that enhance configuration and infrastructure drift detection with intelligent analysis, risk scoring, and automated remediation suggestions.

**Business Value:**
- Reduce drift analysis time from 30 minutes to 2 minutes (15x faster)
- Increase drift detection accuracy by 90%
- Prevent 60% of production incidents caused by configuration drift
- Enable non-technical stakeholders to understand drift impact

---

## UC-AI-001: AI Drift Explainer

### Description
LLM-powered analysis of drift detection results that explains technical changes in plain English for different audiences (technical, business, executive).

### Priority
**P0 (MVP - Phase 1)**

### Complexity
Medium

### Estimated Effort
3 days

### Business Value
- Reduces time to understand drift reports from 30 minutes to 2 minutes
- Enables non-technical stakeholders to make informed decisions
- Provides actionable insights and risk assessment
- Improves cross-team communication about deployments

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/drift/explain

Request:
{
  driftReportId: "uuid",
  audience: "technical" | "business" | "executive"
}

Response:
{
  summary: string,
  riskScore: number (1-10),
  impact: string,
  explanation: {
    technical: string,
    business: string,
    executive: string
  },
  recommendations: string[],
  categorization: {
    critical: number,
    high: number,
    medium: number,
    low: number
  }
}
```

#### Example Response
```json
{
  "summary": "15 configuration changes detected between SIT and UAT. 3 are critical security risks.",
  "riskScore": 7.5,
  "impact": "HIGH - Production deployment NOT RECOMMENDED until security issues resolved",
  "explanation": {
    "technical": "Detected 3 critical drifts: SESSION_TIMEOUT increased 100x (likely typo), firewall rules allow 0.0.0.0/0 (security risk), and database connection pool size reduced by 80% (performance risk). Additional 12 changes are minor version updates and environment-specific URLs.",
    "business": "The system is configured differently between testing and pre-production environments in ways that could cause security breaches and performance problems. Three changes are urgent and must be fixed before going live. The other changes are expected and safe.",
    "executive": "Deployment risk is HIGH. Three critical configuration errors detected that could expose the system to security attacks and cause poor performance. Recommend fixing these issues before proceeding. ETA for fixes: 2 hours."
  },
  "recommendations": [
    "🔒 CRITICAL: Revert SESSION_TIMEOUT to 60 seconds (currently 6000 - likely typo)",
    "🔒 CRITICAL: Restrict firewall rules to specific IP ranges (currently allows all IPs)",
    "⚡ HIGH: Increase database connection pool from 5 to 25 (matches SIT configuration)",
    "✅ LOW: Image version differences are expected and safe to deploy",
    "✅ LOW: Environment-specific URLs are correct"
  ],
  "categorization": {
    "critical": 3,
    "high": 2,
    "medium": 5,
    "low": 5
  }
}
```

### LLM Integration

#### Provider
- **Primary:** OpenAI GPT-4o (gpt-4o)
- **Fallback:** Anthropic Claude 4.5 Sonnet

#### Context
Drift report from `create-release-note.py` output (existing Python script)

#### Prompt Template
```
You are a DevOps expert analyzing configuration drift between environments.

Environment: ${source} → ${target}
Changes Detected: ${changeCount}

Drift Items:
${driftItems.map(item => `
- ${item.field}: ${item.oldValue} → ${item.newValue}
  Type: ${item.changeType}
  Service: ${item.service}
`).join('\n')}

Tasks:
1. Summarize the overall impact in ${audience} language
2. Assess risk on a 1-10 scale:
   - 1-3: Low (cosmetic changes, logs, comments)
   - 4-6: Medium (configuration changes, non-critical)
   - 7-8: High (breaking changes, security concerns)
   - 9-10: Critical (data loss risk, security breach)
3. Identify critical issues (security risks, breaking changes, performance impacts)
4. Categorize each drift item by severity
5. Provide 3-5 actionable recommendations with priority emojis:
   - 🔒 for security issues
   - ⚡ for performance issues
   - ⚠️ for breaking changes
   - ✅ for safe/expected changes

Guidelines:
- Be specific about what changed and why it matters
- Use ${audience} appropriate language
- Highlight numerical differences (e.g., "100x increase")
- Flag typos when values are unrealistic
- Distinguish between expected differences (URLs, image tags) and unexpected ones

Output format: JSON matching the response schema
```

### Dependencies
- Drift detection script: `create-release-note.py` (existing)
- PostgreSQL: Store drift reports
- OpenAI API key or Anthropic API key
- Redis: Cache LLM responses (1 hour TTL)

### Success Metrics
- 95% user satisfaction with explanations
- <2 second response time (with caching)
- 90% accuracy in risk assessment (validated by manual review)
- 80% reduction in time spent reviewing drift reports

### Implementation Steps
1. Create `DriftExplainerService` in NestJS
2. Integrate OpenAI API with retry logic
3. Design prompt template with few-shot examples
4. Implement caching layer (Redis)
5. Build API endpoint with validation
6. Create frontend component for displaying explanations
7. Add user feedback mechanism
8. Set up monitoring and cost tracking

---

## UC-AI-002: Root Cause Analysis

### Description
Traces each drift item back to its source: the commit that introduced it, the developer who made the change, the JIRA ticket justifying it, and whether it was intentional.

### Priority
**P0 (MVP - Phase 1)**

### Complexity
High

### Estimated Effort
5 days

### Business Value
- **Accountability:** Know who made each change and why
- **Compliance:** Complete audit trail for regulatory requirements
- **Knowledge:** Build institutional knowledge of change patterns
- **Speed:** Reduce investigation time from hours to minutes

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/drift/root-cause

Request:
{
  driftReportId: "uuid"
}

Response:
{
  rootCauses: Array<{
    drift: string,
    commit: string,
    commitMessage: string,
    author: string,
    timestamp: ISO8601,
    jiraTicket: string | null,
    jiraTitle: string | null,
    jiraDescription: string | null,
    reason: string (AI-generated),
    classification: "intentional" | "accidental" | "experimental",
    confidence: number (0-100),
    reviewed: boolean,
    approver: string | null,
    relatedCommits: string[]
  }>
}
```

#### Example Response
```json
{
  "rootCauses": [
    {
      "drift": "SESSION_TIMEOUT: 30 → 6000",
      "commit": "abc123def456",
      "commitMessage": "feat(auth): Increase session timeout for mobile users",
      "author": "john.doe@example.com",
      "timestamp": "2025-01-15T14:30:00Z",
      "jiraTicket": "PROJ-1234",
      "jiraTitle": "Mobile users being logged out too frequently",
      "jiraDescription": "Users report that mobile app logs them out every 30 seconds...",
      "reason": "Developer increased timeout to address user complaints, but likely intended 600 (10 minutes) not 6000 (100 minutes). Magnitude suggests typo.",
      "classification": "accidental",
      "confidence": 92,
      "reviewed": true,
      "approver": "jane.smith@example.com",
      "relatedCommits": ["def789ghi012"]
    },
    {
      "drift": "firewall_rules: specific_ips → 0.0.0.0/0",
      "commit": "xyz789abc123",
      "commitMessage": "fix: Temporarily open firewall for debugging",
      "author": "debug.user@example.com",
      "timestamp": "2025-01-20T09:15:00Z",
      "jiraTicket": null,
      "jiraTitle": null,
      "jiraDescription": null,
      "reason": "Temporary debugging change that was never reverted. No JIRA ticket found. High security risk.",
      "classification": "experimental",
      "confidence": 95,
      "reviewed": false,
      "approver": null,
      "relatedCommits": []
    }
  ]
}
```

### Algorithm

#### Step 1: Identify Affected Files
```typescript
async function identifyAffectedFiles(driftItem: DriftItem): Promise<string[]> {
  // Map drift to file path
  // e.g., "service-auth.SESSION_TIMEOUT" → "helm-charts/sit-values/app-values/service-auth.yaml"

  const files = [];

  if (driftItem.service) {
    files.push(`helm-charts/${driftItem.env}-values/app-values/${driftItem.service}.yaml`);
  }

  if (driftItem.type === 'infrastructure') {
    files.push(`helm-charts/${driftItem.env}-values/infra-values/${driftItem.resource}.tf`);
  }

  return files;
}
```

#### Step 2: Find Commits
```bash
# Git command to find commits modifying specific file
git log --follow --pretty=format:'%H|%an|%ae|%ad|%s' -- <file_path>
```

```typescript
async function findCommits(filePath: string): Promise<Commit[]> {
  const result = await exec(
    `git log --follow --pretty=format:'%H|%an|%ae|%ad|%s' -- ${filePath}`,
    { cwd: promotionRepoPath }
  );

  return result.stdout.split('\n').map(line => {
    const [hash, name, email, date, message] = line.split('|');
    return { hash, name, email, date, message };
  });
}
```

#### Step 3: Extract JIRA Tickets
```typescript
function extractJiraTickets(commitMessage: string): string[] {
  const jiraPattern = /[A-Z]{2,}-\d+/g;
  return commitMessage.match(jiraPattern) || [];
}
```

#### Step 4: Fetch JIRA Details
```typescript
async function fetchJiraTicket(ticketId: string): Promise<JiraTicket> {
  const response = await jiraClient.getIssue(ticketId);

  return {
    key: response.key,
    title: response.fields.summary,
    description: response.fields.description,
    priority: response.fields.priority.name,
    status: response.fields.status.name,
    assignee: response.fields.assignee?.displayName,
  };
}
```

#### Step 5: LLM Analysis
```typescript
async function analyzeIntent(commit: Commit, jiraTicket?: JiraTicket): Promise<Analysis> {
  const prompt = `
Analyze this commit to determine intent:

Commit: ${commit.hash}
Author: ${commit.author}
Message: ${commit.message}
JIRA Ticket: ${jiraTicket ? `${jiraTicket.key}: ${jiraTicket.title}` : 'None'}
${jiraTicket ? `Description: ${jiraTicket.description}` : ''}

Was this change:
1. Intentional - Planned feature or fix with JIRA ticket
2. Accidental - Typo, mistake, unintended side effect
3. Experimental - Testing, debugging, temporary change

Provide:
{
  "classification": "intentional" | "accidental" | "experimental",
  "reason": "Brief explanation (1-2 sentences)",
  "confidence": 0-100,
  "indicators": ["list", "of", "evidence"]
}

Indicators of accidental changes:
- Unrealistic values (100x increase/decrease)
- "fix typo" in commit message
- No JIRA ticket for significant change
- "temporarily" or "debug" in message
- Value inconsistent with related configs

Indicators of intentional changes:
- Has JIRA ticket with detailed description
- Gradual value changes (2x, not 100x)
- Multiple related commits
- Code review approvals
- Follows team conventions
`;

  const response = await llmService.complete({
    prompt,
    model: 'gpt-4o',
    temperature: 0.3, // Low temperature for factual analysis
  });

  return JSON.parse(response.content);
}
```

### Dependencies
- Git repository access (promotion-repo)
- JIRA API integration
- OpenAI/Claude API
- PostgreSQL for storing analysis results

### Success Metrics
- 95% accuracy in identifying root cause commits
- <10 seconds analysis time per drift item
- 90% accuracy in intent classification
- 100% audit trail coverage (every drift traced)

### Implementation Steps
1. Build Git analysis service
2. Integrate JIRA API client
3. Create commit-to-drift mapping logic
4. Implement LLM intent analysis
5. Build caching layer for JIRA data
6. Create API endpoint
7. Design frontend visualization (commit timeline)
8. Add export to audit report (PDF)

---

## UC-AI-003: Risk Scoring with ML

### Description
Machine learning model that predicts the severity and risk level of each drift item based on historical data and change characteristics.

### Priority
**P0 (MVP - Phase 1)**

### Complexity
High

### Estimated Effort
7 days (including model training)

### Business Value
- **Prioritization:** Focus on high-risk drifts first (80/20 rule)
- **Prediction:** 85%+ accuracy in incident probability
- **Automation:** Automatically block critical-risk deployments
- **Resource allocation:** Optimize engineering time

### ML Model Architecture

#### Features (Input)
```python
features = {
    # Drift characteristics
    'drift_type': categorical ['config', 'code', 'infra', 'database'],
    'change_magnitude': float,  # % difference or absolute change
    'field_name': text_embedding,  # e.g., "SESSION_TIMEOUT", "firewall_rules"

    # Environment context
    'source_environment': categorical ['dev', 'sit', 'uat', 'prod'],
    'target_environment': categorical ['dev', 'sit', 'uat', 'prod'],

    # Service characteristics
    'service_name': categorical,
    'service_criticality': int (1-10),
    'affected_users': int,
    'daily_traffic': int,

    # Change context
    'has_jira_ticket': boolean,
    'has_rollback_plan': boolean,
    'deployment_window': categorical ['peak', 'off-peak'],
    'days_since_last_change': int,

    # Team factors
    'team_experience': int,  # Successful deploys
    'author_experience': int,
    'code_review_approvals': int,

    # Testing
    'test_coverage': float (0-100),
    'e2e_tests_passed': boolean,

    # Historical patterns
    'similar_past_incidents': int,
    'field_incident_history': int,  # How often this field caused issues
    'service_incident_rate': float,
}

# Target (output)
target = {
    'risk_score': float (0-10),
    'incident_probability': float (0-1),
    'estimated_impact': categorical ['low', 'medium', 'high', 'critical'],
}
```

#### Model Selection
**Primary:** XGBoost Classifier
- Handles mixed data types (categorical + numerical)
- Feature importance analysis
- High accuracy on tabular data
- Fast inference (<100ms)

**Alternative:** LightGBM (if XGBoost is slow)

#### Model Implementation
```python
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score

# Load training data
df = load_historical_drifts_and_incidents()

# Feature engineering
def engineer_features(df):
    # Encode categorical variables
    le = LabelEncoder()
    df['drift_type_encoded'] = le.fit_transform(df['drift_type'])

    # Calculate change magnitude
    df['change_magnitude'] = abs(df['new_value'] - df['old_value']) / df['old_value']

    # Field name embeddings (use pre-trained model)
    df['field_embedding'] = df['field_name'].apply(lambda x: get_embedding(x))

    return df

df = engineer_features(df)

# Prepare features and target
X = df[feature_columns]
y = df['incident_occurred']  # Binary: 0 = no incident, 1 = incident

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Train XGBoost model
model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric='auc',
    random_state=42,
)

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    early_stopping_rounds=10,
    verbose=True,
)

# Evaluate
y_pred = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]

print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}")
print(f"Precision: {precision_score(y_test, y_pred):.3f}")
print(f"Recall: {recall_score(y_test, y_pred):.3f}")
print(f"AUC-ROC: {roc_auc_score(y_test, y_pred_proba):.3f}")

# Feature importance
import matplotlib.pyplot as plt
xgb.plot_importance(model, max_num_features=15)
plt.savefig('feature_importance.png')

# Save model
model.save_model('drift_risk_model.json')
```

#### Inference API (FastAPI)
```python
from fastapi import FastAPI
from pydantic import BaseModel
import xgboost as xgb
import numpy as np

app = FastAPI()

# Load model
model = xgb.XGBClassifier()
model.load_model('drift_risk_model.json')

class DriftFeatures(BaseModel):
    drift_type: str
    change_magnitude: float
    field_name: str
    source_environment: str
    target_environment: str
    service_criticality: int
    has_jira_ticket: bool
    test_coverage: float
    # ... other features

@app.post("/api/ml/risk-score")
async def predict_risk(features: DriftFeatures):
    # Prepare features
    X = prepare_features(features)

    # Predict
    proba = model.predict_proba([X])[0]
    incident_probability = proba[1]  # Probability of incident
    risk_score = incident_probability * 10  # Scale to 1-10

    # Get feature contributions (SHAP values)
    import shap
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values([X])

    # Top contributing factors
    top_factors = get_top_factors(shap_values, features)

    return {
        "risk_score": round(risk_score, 1),
        "incident_probability": round(incident_probability * 100, 1),
        "estimated_impact": categorize_impact(risk_score),
        "confidence": 87.0,
        "factors": top_factors,
        "recommendation": get_recommendation(risk_score),
    }

def categorize_impact(risk_score):
    if risk_score < 3:
        return "low"
    elif risk_score < 6:
        return "medium"
    elif risk_score < 8:
        return "high"
    else:
        return "critical"

def get_recommendation(risk_score):
    if risk_score < 4:
        return "DEPLOY"
    elif risk_score < 7:
        return "REVIEW"
    else:
        return "BLOCK"
```

#### API Response Example
```json
{
  "risk_score": 8.3,
  "incident_probability": 83,
  "estimated_impact": "high",
  "confidence": 87,
  "factors": [
    {
      "factor": "change_magnitude",
      "value": 100.0,
      "impact": +3.2,
      "reason": "Value increased 100x - likely typo"
    },
    {
      "factor": "has_jira_ticket",
      "value": false,
      "impact": +1.5,
      "reason": "No JIRA ticket for significant change"
    },
    {
      "factor": "field_incident_history",
      "value": 12,
      "impact": +2.1,
      "reason": "This field has caused 12 incidents historically"
    },
    {
      "factor": "test_coverage",
      "value": 45.0,
      "impact": +1.0,
      "reason": "Low test coverage (45% < 80% threshold)"
    },
    {
      "factor": "team_experience",
      "value": 87,
      "impact": -0.5,
      "reason": "Experienced team mitigates risk slightly"
    }
  ],
  "recommendation": "BLOCK"
}
```

### Training Data Requirements
- **Minimum:** 500 historical drift incidents
- **Ideal:** 2,000+ drifts with incident labels
- **Labeling:** Manual review of past drifts
  - Label 1: Drift caused production incident
  - Label 0: Drift deployed successfully
- **Data sources:**
  - Drift reports from `create-release-note.py`
  - Incident tickets (JIRA, PagerDuty)
  - Deployment logs
  - Rollback events

### Model Retraining
- **Frequency:** Weekly (automated)
- **Trigger:** Every 100 new labeled drift events
- **A/B Testing:** Run new model in shadow mode for 1 week
- **Rollback:** If accuracy drops >2%, revert to previous model

### Success Metrics
- **Accuracy:** >85%
- **Precision:** >80% (minimize false alarms)
- **Recall:** >90% (catch all high-risk drifts)
- **AUC-ROC:** >0.90
- **Inference time:** <100ms per drift item
- **Business impact:** 50% reduction in production incidents

### Dependencies
- Historical drift data (500+ samples)
- Incident tracking system (JIRA/PagerDuty)
- Python ML environment (scikit-learn, XGBoost)
- FastAPI for model serving
- PostgreSQL for feature storage

### Implementation Steps
1. **Week 1: Data Collection**
   - Extract historical drifts from database
   - Label drifts with incident outcomes
   - Engineer features
2. **Week 1: Model Training**
   - Train XGBoost classifier
   - Hyperparameter tuning
   - Cross-validation
3. **Week 2: Model Deployment**
   - Build FastAPI inference service
   - Containerize (Docker)
   - Deploy to Kubernetes
4. **Week 2: Integration**
   - Create NestJS client for ML API
   - Integrate with drift detection flow
   - Build frontend risk visualization

---

## UC-AI-004: Auto-Categorization

### Description
Automatically categorizes drift items into predefined types using NLP and pattern matching: Breaking Changes, Security Risks, Configuration, Cosmetic, Performance, Database, Infrastructure.

### Priority
**P1 (Phase 1)**

### Complexity
Medium

### Estimated Effort
3 days

### Business Value
- **Organization:** Structured drift reports for faster review
- **Prioritization:** Filter by category (show only security risks)
- **Automation:** Auto-route categories to relevant teams
- **Consistency:** Eliminate manual categorization errors

### Categories

1. **Breaking Change** - API changes, schema modifications, contract changes
2. **Security Risk** - Authentication, authorization, encryption, firewall, secrets
3. **Configuration** - Environment variables, feature flags, timeouts
4. **Cosmetic** - Logging levels, comments, formatting, non-functional
5. **Performance** - Resource limits, caching, optimization, scaling
6. **Database** - Schema changes, migrations, indexes, connections
7. **Infrastructure** - Terraform, Kubernetes, networking, storage

### Implementation Approach

#### Hybrid: Rule-Based + ML

**Rule-Based (Fast, Deterministic):**
- Pattern matching for known categories
- 80% of cases handled by rules
- <10ms latency

**ML-Based (Flexible, Learning):**
- Neural network classifier for ambiguous cases
- 20% of cases requiring ML
- ~100ms latency

### Rule-Based Patterns

```typescript
// Security patterns
const securityPatterns = [
  /password|secret|token|auth|session|jwt|oauth|api[_-]?key/i,
  /encryption|certificate|ssl|tls|https|credential/i,
  /firewall|security[_-]?group|iam|role|permission/i,
  /private[_-]?key|public[_-]?key|ssh[_-]?key/i,
];

// Breaking change patterns
const breakingPatterns = [
  /BREAKING|major version|v\d+\.0\.0/i,
  /removed|deprecated|deleted/i,
  /renamed.*to/i,
  /incompatible|breaking[_-]?change/i,
];

// Performance patterns
const performancePatterns = [
  /timeout|cache|pool|limit|quota|throttle/i,
  /cpu|memory|disk|storage|bandwidth/i,
  /scale|replica|instance|pod/i,
  /performance|optimization|latency/i,
];

// Database patterns
const databasePatterns = [
  /database|db|sql|postgres|mysql|mongo/i,
  /schema|migration|index|query/i,
  /connection[_-]?pool|transaction|commit/i,
];

// Infrastructure patterns
const infrastructurePatterns = [
  /terraform|infrastructure|gke|kubernetes|k8s/i,
  /vpc|subnet|network|load[_-]?balancer/i,
  /bucket|storage|volume|disk/i,
];

// Configuration patterns
const configPatterns = [
  /config|env|environment[_-]?variable|flag/i,
  /setting|parameter|option/i,
];

// Cosmetic patterns
const cosmeticPatterns = [
  /log|logging|debug|trace|comment/i,
  /format|indent|style|whitespace/i,
  /typo|spelling|rename[_-]?variable/i,
];
```

```typescript
function categorizeDrift(drift: DriftItem): Category {
  const text = `${drift.field} ${drift.oldValue} ${drift.newValue}`.toLowerCase();

  // Check security first (highest priority)
  for (const pattern of securityPatterns) {
    if (pattern.test(text)) {
      return {
        category: 'Security Risk',
        confidence: 0.95,
        method: 'rule-based',
      };
    }
  }

  // Check breaking changes
  for (const pattern of breakingPatterns) {
    if (pattern.test(drift.field) || pattern.test(drift.commitMessage || '')) {
      return {
        category: 'Breaking Change',
        confidence: 0.90,
        method: 'rule-based',
      };
    }
  }

  // Check database
  for (const pattern of databasePatterns) {
    if (pattern.test(text)) {
      return {
        category: 'Database',
        confidence: 0.85,
        method: 'rule-based',
      };
    }
  }

  // Check infrastructure
  for (const pattern of infrastructurePatterns) {
    if (pattern.test(text)) {
      return {
        category: 'Infrastructure',
        confidence: 0.85,
        method: 'rule-based',
      };
    }
  }

  // Check performance
  for (const pattern of performancePatterns) {
    if (pattern.test(text)) {
      return {
        category: 'Performance',
        confidence: 0.80,
        method: 'rule-based',
      };
    }
  }

  // Check configuration
  for (const pattern of configPatterns) {
    if (pattern.test(text)) {
      return {
        category: 'Configuration',
        confidence: 0.75,
        method: 'rule-based',
      };
    }
  }

  // Check cosmetic
  for (const pattern of cosmeticPatterns) {
    if (pattern.test(text)) {
      return {
        category: 'Cosmetic',
        confidence: 0.70,
        method: 'rule-based',
      };
    }
  }

  // Fall back to ML classifier
  return await mlClassifier.categorize(drift);
}
```

### ML Classifier (for ambiguous cases)

```python
from transformers import pipeline

# Use pre-trained BERT for text classification
classifier = pipeline(
    "text-classification",
    model="distilbert-base-uncased",
    return_all_scores=True,
)

# Fine-tune on labeled drift data
training_data = [
    {"text": "SESSION_TIMEOUT: 30 → 60", "label": "Configuration"},
    {"text": "firewall_rules: specific_ips → 0.0.0.0/0", "label": "Security Risk"},
    {"text": "database_connection_pool: 25 → 5", "label": "Performance"},
    # ... 500+ labeled examples
]

# Fine-tuning code
from transformers import Trainer, TrainingArguments

trainer = Trainer(
    model=model,
    args=TrainingArguments(output_dir="./drift_classifier"),
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
)

trainer.train()
```

### API Endpoint

```typescript
POST /api/ai/drift/categorize

Request:
{
  driftItems: Array<DriftItem>
}

Response:
{
  categorized: Array<{
    driftId: string,
    category: string,
    confidence: number,
    method: "rule-based" | "ml",
    reasoning: string
  }>,
  summary: {
    "Breaking Change": 2,
    "Security Risk": 3,
    "Configuration": 8,
    "Performance": 1,
    "Cosmetic": 3
  }
}
```

### Success Metrics
- **Accuracy:** >92% (validated by manual review)
- **Latency:** <50ms per drift item (rule-based), <200ms (ML)
- **Coverage:** 100% of drifts categorized
- **Agreement with manual review:** >90%

### Dependencies
- Rule-based pattern library
- ML classifier model (optional, for ambiguous cases)
- PostgreSQL for storing categories

### Implementation Steps
1. **Day 1:** Implement rule-based categorization
2. **Day 2:** Train ML classifier on historical data
3. **Day 2:** Build hybrid decision logic
4. **Day 3:** Create API endpoint and integrate with frontend
5. **Day 3:** Build category filter UI

---

## UC-AI-005: Smart Filtering

### Description
AI-powered filtering that hides expected/benign drifts and surfaces only actionable items. Reduces noise by 70%, enabling teams to focus on critical changes.

### Priority
**P1 (Phase 1)**

### Complexity
Medium

### Estimated Effort
4 days

### Business Value
- **Noise Reduction:** Filter out 70% of benign drifts
- **Focus:** Surface only actionable changes
- **Efficiency:** Reduce review time from 30 min to 5 min
- **Learning:** AI learns from user feedback

### Use Cases

**Filter Out:**
- ✅ Timestamp-only changes (e.g., `createdAt`, `lastModified`)
- ✅ Comment/documentation updates
- ✅ Environment-specific values (dev DB URL ≠ prod DB URL)
- ✅ Expected version progression (`:12-sit` → `:13-sit`)
- ✅ Auto-generated fields (build IDs, UUIDs)

**Surface:**
- ⚠️ Security-related changes
- ⚠️ Breaking API changes
- ⚠️ Unusual value changes (100x increase)
- ⚠️ Unapproved changes (no JIRA ticket)

### Implementation

#### Filter Types

```typescript
interface FilterRule {
  type: 'whitelist' | 'pattern' | 'learned';
  condition: string | RegExp;
  reason: string;
  priority: number;
}
```

#### 1. Whitelist (User-Defined)

```typescript
const whitelist: FilterRule[] = [
  {
    type: 'whitelist',
    condition: 'image.tag',
    reason: 'Expected to differ across environments',
    priority: 1,
  },
  {
    type: 'whitelist',
    condition: /.*DATABASE_URL.*/,
    reason: 'Each environment has its own database',
    priority: 1,
  },
  {
    type: 'whitelist',
    condition: 'metadata.createdAt',
    reason: 'Timestamp field, not actionable',
    priority: 2,
  },
];

function isWhitelisted(drift: DriftItem): boolean {
  return whitelist.some(rule =>
    typeof rule.condition === 'string'
      ? drift.field === rule.condition
      : rule.condition.test(drift.field)
  );
}
```

#### 2. Pattern-Based (Automatic)

```typescript
const benignPatterns = [
  // Timestamps
  /createdAt|updatedAt|lastModified|timestamp/i,

  // Version fields
  /version|buildId|commitSha|gitHash/i,

  // Auto-generated IDs
  /uuid|guid|id$/i,

  // Comments and docs
  /comment|description|readme|changelog/i,

  // Logging
  /log[_-]?level|debug|trace/i,
];

function matchesBenignPattern(drift: DriftItem): boolean {
  const text = `${drift.field} ${drift.oldValue} ${drift.newValue}`;
  return benignPatterns.some(pattern => pattern.test(text));
}
```

#### 3. Learned Filters (ML)

```typescript
interface LearnedFilter {
  driftPattern: string;
  confidence: number;
  incidentCount: number;  // How many times this pattern caused incidents
  deploymentCount: number; // How many times this pattern was deployed
  benignProbability: number; // incidentCount / deploymentCount
}

async function learnFilters(): Promise<LearnedFilter[]> {
  // Query historical drifts
  const drifts = await prisma.drift.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
    },
    include: {
      incidents: true,
      deployments: true,
    },
  });

  // Group by pattern
  const patterns = groupByPattern(drifts);

  // Calculate benign probability
  const learned = patterns.map(pattern => ({
    driftPattern: pattern.key,
    confidence: pattern.count > 20 ? 0.95 : 0.70,
    incidentCount: pattern.incidents.length,
    deploymentCount: pattern.deployments.length,
    benignProbability: pattern.incidents.length / pattern.deployments.length,
  }));

  // Filter: Keep patterns with <5% incident rate
  return learned.filter(l => l.benignProbability < 0.05);
}

async function isLearnedBenign(drift: DriftItem): Promise<boolean> {
  const learnedFilters = await getLearnedFilters(); // Cached

  for (const filter of learnedFilters) {
    if (matchesPattern(drift, filter.driftPattern)) {
      return filter.benignProbability < 0.05 && filter.confidence > 0.90;
    }
  }

  return false;
}
```

#### Combined Filtering Logic

```typescript
async function filterDrifts(drifts: DriftItem[]): Promise<FilteredResult> {
  const actionable: DriftItem[] = [];
  const hidden: Array<{ drift: DriftItem; reason: string }> = [];

  for (const drift of drifts) {
    let isFiltered = false;
    let reason = '';

    // Check whitelist (highest priority)
    if (isWhitelisted(drift)) {
      isFiltered = true;
      reason = 'Whitelisted field';
    }

    // Check benign patterns
    else if (matchesBenignPattern(drift)) {
      isFiltered = true;
      reason = 'Matches benign pattern (timestamps, comments, etc.)';
    }

    // Check learned filters
    else if (await isLearnedBenign(drift)) {
      isFiltered = true;
      reason = 'Historically benign (0% incident rate)';
    }

    // Force surface critical items (override filters)
    if (drift.category === 'Security Risk' || drift.category === 'Breaking Change') {
      isFiltered = false;
      reason = 'Critical category - always surfaced';
    }

    if (isFiltered) {
      hidden.push({ drift, reason });
    } else {
      actionable.push(drift);
    }
  }

  return {
    actionable,
    hidden,
    summary: {
      total: drifts.length,
      actionable: actionable.length,
      hidden: hidden.length,
      reductionRate: (hidden.length / drifts.length) * 100,
    },
  };
}
```

### API Endpoint

```typescript
POST /api/ai/drift/filter

Request:
{
  driftReportId: "uuid",
  showHidden: boolean // Optional: Include hidden items in response
}

Response:
{
  actionable: Array<DriftItem>,
  hidden: Array<{
    drift: DriftItem,
    reason: string
  }>,
  summary: {
    total: 47,
    actionable: 14,
    hidden: 33,
    reductionRate: 70.2  // percentage
  },
  filterStats: {
    whitelisted: 12,
    benignPatterns: 15,
    learned: 6
  }
}
```

### User Feedback Loop

```typescript
// User marks filtered drift as "should have been shown"
POST /api/ai/drift/feedback

Request:
{
  driftId: "uuid",
  action: "show" | "hide",
  reason: string
}

// System learns from feedback
async function handleFeedback(feedback: Feedback) {
  // Update learned filters
  await adjustLearnedFilter(feedback.driftId, feedback.action);

  // If multiple users report same pattern, update global filter
  const feedbackCount = await countFeedback(feedback.pattern);
  if (feedbackCount > 5) {
    await updateGlobalFilter(feedback.pattern, feedback.action);
  }
}
```

### Success Metrics
- **Noise Reduction:** >70% of drifts filtered
- **Accuracy:** <5% false negatives (missing critical drifts)
- **User Satisfaction:** >90% agree with filtering decisions
- **Time Saved:** 80% reduction in review time

### Dependencies
- Historical drift data (for learning)
- Incident tracking (to calculate benign probability)
- User feedback system

### Implementation Steps
1. **Day 1:** Implement whitelist and pattern-based filtering
2. **Day 2:** Build learned filter algorithm
3. **Day 3:** Create API endpoint
4. **Day 3:** Build frontend with "Show Hidden" toggle
5. **Day 4:** Add user feedback mechanism
6. **Day 4:** Set up weekly retraining of learned filters

---

## UC-AI-006: Remediation Suggestions

### Description
AI generates step-by-step remediation plans for detected drifts, including automated fix scripts when possible.

### Priority
**P1 (Phase 2)**

### Complexity
High

### Estimated Effort
5 days

### Business Value
- **Speed:** Fix drifts in minutes instead of hours
- **Safety:** Automated scripts with rollback plans
- **Knowledge:** Institutional knowledge captured in AI
- **Consistency:** Same fix applied across environments

### Remediation Types

1. **Auto-fixable** - Safe, automated, no approval needed
   - Image tag updates
   - Resource limit increases
   - Environment variable additions (non-critical)

2. **Semi-automated** - Requires approval, then auto-execute
   - Database connection pool resizing
   - Timeout adjustments
   - Firewall rule updates

3. **Manual** - Requires human intervention
   - Database schema migrations
   - Breaking API changes
   - Major architecture changes

### Implementation

#### API Endpoint

```typescript
POST /api/ai/drift/remediate

Request:
{
  driftId: "uuid",
  autoApprove: boolean  // Only works for auto-fixable drifts
}

Response:
{
  remediable: boolean,
  remediation: {
    type: "auto" | "semi-auto" | "manual",
    steps: string[],
    script: string | null,
    estimatedTime: string,
    rollbackPlan: string,
    risks: string[],
    requiresApproval: boolean
  }
}
```

#### Example Response

```json
{
  "remediable": true,
  "remediation": {
    "type": "semi-auto",
    "steps": [
      "1. Update UAT configuration file: helm-charts/uat-values/app-values/service-auth.yaml",
      "2. Change image tag from :12-uat to :14-uat",
      "3. Apply changes via kubectl rolling update",
      "4. Monitor pod health for 5 minutes",
      "5. Verify service endpoints responding"
    ],
    "script": "#!/bin/bash\n# Auto-generated remediation script\nkubectl set image deployment/service-auth service-auth=registry.example.com/service-auth:14-uat -n uat\nkubectl rollout status deployment/service-auth -n uat --timeout=5m\nkubectl get pods -n uat -l app=service-auth",
    "estimatedTime": "3-5 minutes",
    "rollbackPlan": "kubectl rollout undo deployment/service-auth -n uat",
    "risks": [
      "Brief downtime during rolling update (< 30 seconds)",
      "If new image has bugs, requires manual investigation"
    ],
    "requiresApproval": true
  }
}
```

### LLM-Based Remediation Generation

```typescript
async function generateRemediation(drift: DriftItem): Promise<Remediation> {
  const prompt = `
You are a DevOps expert. Generate a remediation plan for this configuration drift:

Drift Details:
- Field: ${drift.field}
- Current Value: ${drift.oldValue}
- Target Value: ${drift.newValue}
- Environment: ${drift.targetEnv}
- Service: ${drift.service}

Tasks:
1. Determine if this is auto-fixable, semi-automated, or manual
2. Provide step-by-step remediation instructions
3. Generate a safe automation script (bash/kubectl) if applicable
4. Estimate time required
5. Describe rollback procedure
6. List potential risks

Guidelines:
- Auto-fixable: Safe changes with zero downtime (image tags, resource increases)
- Semi-automated: Requires approval but can be scripted (config updates, restarts)
- Manual: Complex changes requiring human judgment (DB migrations, architecture)

Output format: JSON
{
  "type": "auto" | "semi-auto" | "manual",
  "steps": ["step 1", "step 2", ...],
  "script": "bash script or null",
  "estimatedTime": "X minutes",
  "rollbackPlan": "how to undo",
  "risks": ["risk 1", "risk 2", ...]
}
`;

  const response = await llmService.complete({
    prompt,
    model: 'gpt-4o',
    temperature: 0.3, // Low temp for safe, deterministic output
  });

  return JSON.parse(response.content);
}
```

### Safety Checks

```typescript
interface RemediationRule {
  condition: (drift: Drift) => boolean;
  action: (drift: Drift) => RemediationPlan;
  safety: {
    reversible: boolean;
    requiresApproval: boolean;
    maxRisk: number; // 1-10 scale
    downtime: boolean;
  };
}

const remediationRules: RemediationRule[] = [
  {
    name: "Image Tag Update",
    condition: (drift) =>
      drift.field === 'image.tag' &&
      isValidImageTag(drift.newValue) &&
      isSameMajorVersion(drift.oldValue, drift.newValue),

    action: (drift) => ({
      type: "semi-auto",
      script: generateImageUpdateScript(drift),
      rollback: `kubectl rollout undo deployment/${drift.service}`,
    }),

    safety: {
      reversible: true,
      requiresApproval: true,
      maxRisk: 3,
      downtime: false,
    },
  },

  {
    name: "Database Schema Change",
    condition: (drift) =>
      drift.type === 'database' &&
      (drift.field.includes('schema') || drift.field.includes('migration')),

    action: (drift) => ({
      type: "manual",
      steps: [
        "1. Review database migration scripts",
        "2. Test migration in non-prod environment first",
        "3. Schedule maintenance window",
        "4. Execute migration with DBA supervision",
        "5. Verify data integrity",
      ],
      script: null,
    }),

    safety: {
      reversible: false, // Data migrations often irreversible
      requiresApproval: true,
      maxRisk: 9,
      downtime: true,
    },
  },
];
```

### Execution API

```typescript
POST /api/ai/drift/execute-remediation

Request:
{
  remediationId: "uuid",
  approved: boolean,
  approver: string
}

Response:
{
  status: "queued" | "executing" | "success" | "failed",
  executionId: "uuid",
  logs: string[],
  rollbackAvailable: boolean
}

// WebSocket for real-time progress
ws://api/v1/remediation/:executionId/status

{
  "status": "executing",
  "currentStep": 2,
  "totalSteps": 5,
  "log": "kubectl set image deployment/service-auth...",
  "timestamp": "2025-02-06T10:30:00Z"
}
```

### Success Metrics
- **Automation Rate:** 60% of drifts auto-fixable or semi-automated
- **Success Rate:** >95% of automated remediations succeed
- **Time Saved:** 80% reduction in manual fixing time
- **Safety:** Zero incidents caused by automated fixes

### Dependencies
- LLM API (OpenAI/Claude)
- Kubectl/Helm access to clusters
- Git repository write access
- PostgreSQL for tracking executions

### Implementation Steps
1. **Days 1-2:** Build remediation rule engine
2. **Day 2:** Integrate LLM for generating plans
3. **Days 3-4:** Implement script execution engine
4. **Day 4:** Build approval workflow
5. **Day 5:** Create real-time status WebSocket
6. **Day 5:** Add safety checks and rollback mechanism

---

## Summary

**Category 1: Intelligent Drift Analysis** provides 6 AI-powered capabilities that transform raw drift detection data into actionable intelligence:

1. **UC-AI-001: AI Drift Explainer** - Explains drift in plain English (3 days)
2. **UC-AI-002: Root Cause Analysis** - Traces changes to source commits (5 days)
3. **UC-AI-003: Risk Scoring with ML** - Predicts incident probability (7 days)
4. **UC-AI-004: Auto-Categorization** - Organizes drifts by type (3 days)
5. **UC-AI-005: Smart Filtering** - Hides benign changes (4 days)
6. **UC-AI-006: Remediation Suggestions** - Generates fix scripts (5 days)

**Total Effort:** 27 days (~5.5 weeks with 1 developer)

**Next:** See [category-02-release-notes.md](./category-02-release-notes.md) for AI-Generated Release Notes use cases.
