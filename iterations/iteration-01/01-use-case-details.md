# UC-AI-001: AI Drift Explainer - Detailed Use Case Document

## Iteration 01 | Priority: P0 (MVP - Phase 1) | Complexity: Medium

---

## 1. Overview

The AI Drift Explainer is an LLM-powered feature that analyzes configuration drift between environments (DEV, SIT, UAT, PRE-PROD, PROD) and generates plain-English explanations for different audiences. It transforms raw YAML/JSON comparison output from the existing `create-release-note.py` script into actionable intelligence with risk scoring, categorization, and recommendations.

### Problem Statement

Today, when the `create-release-note.py` script runs, it produces an Excel file (`release-note-<timestamp>.xlsx`) containing raw differences between environments. These differences include:
- Service name, change type, key path, old/new values across environments, and a basic comment (Modified/Added/Deleted/root object added/root object deleted)

Engineers must manually review every row to:
1. Understand what changed and why it matters
2. Assess which changes are risky vs. benign
3. Decide whether the deployment is safe to proceed
4. Communicate the status to business stakeholders and executives

This process takes **30+ minutes per drift report** and requires deep domain knowledge.

### Solution

The AI Drift Explainer takes the structured drift data from the release note Excel output and sends it to an LLM (Google Gemini 3 Pro, with Claude Opus 4.6 fallback) that:
1. Summarizes all changes in audience-appropriate language (technical, business, executive)
2. Assigns a risk score (1-10) based on change patterns
3. Categorizes each drift item by severity (critical, high, medium, low)
4. Provides 3-5 actionable recommendations with priority markers

---

## 2. Actors and Stakeholders

| Actor | Role | How They Use This Feature |
|-------|------|---------------------------|
| **DevOps Engineer** | Primary user | Reviews technical drift explanation before promoting to next environment |
| **Release Manager** | Approver | Reads business-level summary to approve/block deployment |
| **Executive / VP** | Informed | Receives executive summary with risk score and go/no-go recommendation |
| **SRE Team** | Responder | Uses recommendations to plan remediation for high-risk drifts |
| **QA Engineer** | Validator | Cross-references drift explanations with test coverage gaps |

---

## 3. Preconditions

1. The `create-release-note.py` script has been executed and has produced a valid release note Excel file
2. Two environment branches exist in the promotion-repo (e.g., `promotion-x-1` and `promotion-x`)
3. Helm chart values YAML files exist under `helm-charts/<env>-values/app-values/`
4. At minimum one drift item exists between the two environments
5. Google Gemini API key (or Anthropic API key as fallback) is configured
6. Redis is available for caching LLM responses
7. PostgreSQL database is available for storing drift reports and analysis results

---

## 4. Detailed Functional Requirements

### FR-001: Drift Data Ingestion

The system must accept drift data from two sources:
1. **Excel file** - The release note Excel produced by `create-release-note.py` containing columns: Service name, Change Request, Key, `<lower-env>-current value`, `<lower-env>-previous value`, `<higher-env>-current value`, `<higher-env>-previous value`, Comment
2. **API request** - A JSON payload containing structured drift items for on-demand analysis

The system must parse and normalize drift items into a standard internal format:

```typescript
interface DriftItem {
  id: string;                    // UUID
  serviceName: string;           // e.g., "service-auth"
  changeType: string;            // "modify" | "add" | "delete"
  keyPath: string;               // e.g., "image//image_name", "image//tag"
  lowerEnvCurrentValue: string;  // Value in lower env (current release)
  lowerEnvPreviousValue: string; // Value in lower env (previous release)
  higherEnvCurrentValue: string; // Value in higher env (current)
  higherEnvPreviousValue: string;// Value in higher env (previous)
  comment: string;               // "Modified", "Added", "Deleted", "root object added", etc.
}
```

### FR-002: Audience-Specific Explanations

The system must generate explanations for three distinct audiences:

**Technical (for DevOps engineers):**
- Exact field paths that changed (e.g., `service-auth.image.tag`)
- Precise old and new values with magnitude of change
- Specific infrastructure impact (pods, replicas, memory, CPU)
- References to Helm chart paths and Terraform resources
- Deployment sequence recommendations

**Business (for Release Managers):**
- High-level description of what services changed
- Impact on business operations and users
- Whether changes are part of planned releases
- Timeline and risk of proceeding vs. delaying
- Dependencies between changes

**Executive (for VP/Directors):**
- One-paragraph summary with risk level
- Go/No-Go recommendation with confidence level
- Estimated time to resolve blocking issues
- Business metrics at risk (uptime, performance, security)

### FR-003: Risk Score Calculation

The system must assign a composite risk score from 1-10:

| Score Range | Level | Description |
|-------------|-------|-------------|
| 1-3 | Low | Cosmetic changes, logging, comments, expected version bumps |
| 4-6 | Medium | Configuration changes, non-critical service updates, resource adjustments |
| 7-8 | High | Breaking changes, security configuration changes, database connection changes |
| 9-10 | Critical | Security vulnerabilities (open firewall), data loss risks, authentication bypasses |

Risk factors the LLM must evaluate:
- **Magnitude of change**: A 100x increase in a timeout value is suspicious (likely typo)
- **Security sensitivity**: Fields containing password, token, auth, firewall, secret, key
- **Service criticality**: Changes to core authentication or payment services vs. logging services
- **Missing context**: Changes without JIRA tickets or code review approvals
- **Historical patterns**: Whether similar changes caused incidents in the past
- **Environment gap**: Changes when promoting to production carry more risk than DEV to SIT

### FR-004: Drift Categorization

Each drift item must be categorized into exactly one severity bucket:

- **Critical**: Security exposure, data loss potential, authentication bypass
- **High**: Breaking API changes, significant performance impact, database schema risk
- **Medium**: Configuration adjustments, non-critical resource changes, feature flag updates
- **Low**: Version bumps, cosmetic changes, expected environment-specific differences (URLs, tags)

### FR-005: Actionable Recommendations

The system must provide 3-5 prioritized recommendations with:
- Priority emoji marker: `CRITICAL` for security, `HIGH` for performance, `WARNING` for breaking changes, `OK` for safe changes
- Specific action to take (e.g., "Revert SESSION_TIMEOUT to 60 seconds")
- Justification (why this action is needed)
- Estimated effort/time

### FR-006: Caching

- LLM responses must be cached in Redis with a 1-hour TTL
- Cache key = SHA-256 hash of (drift data + audience + model name)
- Cache hit must return in < 50ms
- Cache must be invalidated when drift data changes

### FR-007: Fallback Handling

- If Google Gemini API fails (timeout, rate limit, error), the system must automatically retry once
- If retry fails, fall back to Anthropic Claude Opus 4.6
- If both fail, return a structured error with the raw drift data and a message indicating AI analysis is temporarily unavailable
- All failures must be logged with correlation IDs

---

## 5. API Contract

### Endpoint

```
POST /api/ai/drift/explain
```

### Request

```json
{
  "driftReportId": "uuid",
  "sourceEnvironment": "dev",
  "targetEnvironment": "sit",
  "audience": "technical",
  "driftItems": [
    {
      "serviceName": "service-auth",
      "changeType": "modify",
      "keyPath": "image//tag",
      "lowerEnvCurrentValue": "14-dev",
      "lowerEnvPreviousValue": "12-dev",
      "higherEnvCurrentValue": "12-sit",
      "higherEnvPreviousValue": "12-sit",
      "comment": "Modified"
    }
  ]
}
```

Note: `driftItems` can be omitted if `driftReportId` is provided and drift data is already stored in the database.

### Response

```json
{
  "id": "uuid",
  "driftReportId": "uuid",
  "timestamp": "2026-02-10T10:30:00Z",
  "audience": "technical",
  "summary": "15 configuration changes detected between DEV and SIT. 3 are critical security risks.",
  "riskScore": 7.5,
  "riskLevel": "HIGH",
  "impact": "Production deployment NOT RECOMMENDED until security issues are resolved.",
  "explanation": {
    "technical": "Detected 3 critical drifts: SESSION_TIMEOUT increased 100x...",
    "business": "The system is configured differently between testing and pre-production...",
    "executive": "Deployment risk is HIGH. Three critical configuration errors detected..."
  },
  "recommendations": [
    {
      "priority": "CRITICAL",
      "action": "Revert SESSION_TIMEOUT to 60 seconds (currently 6000 - likely typo)",
      "justification": "100x increase suggests accidental value. 6000 seconds = 100 minutes timeout.",
      "effort": "5 minutes"
    },
    {
      "priority": "CRITICAL",
      "action": "Restrict firewall rules to specific IP ranges (currently allows all IPs)",
      "justification": "0.0.0.0/0 firewall rule exposes service to the public internet.",
      "effort": "10 minutes"
    },
    {
      "priority": "HIGH",
      "action": "Increase database connection pool from 5 to 25 to match source environment",
      "justification": "80% reduction in connection pool will cause connection exhaustion under load.",
      "effort": "5 minutes"
    }
  ],
  "categorization": {
    "critical": 3,
    "high": 2,
    "medium": 5,
    "low": 5
  },
  "driftDetails": [
    {
      "serviceName": "service-auth",
      "keyPath": "SESSION_TIMEOUT",
      "severity": "critical",
      "oldValue": "60",
      "newValue": "6000",
      "explanation": "Session timeout increased 100x. Likely a typo (intended 600 = 10 minutes)."
    }
  ],
  "metadata": {
    "model": "gemini-3-pro",
    "cached": false,
    "processingTimeMs": 1850,
    "tokenUsage": {
      "prompt": 1200,
      "completion": 800,
      "total": 2000
    },
    "cost": 0.002
  }
}
```

---

## 6. Data Flow

```
┌─────────────────────────────────┐
│  create-release-note.py         │
│  (Existing Python Script)       │
│                                 │
│  Inputs:                        │
│  - promotion-x-1 branch         │
│  - promotion-x branch           │
│  - lower env (e.g., dev)        │
│  - higher env (e.g., sit)       │
│                                 │
│  Outputs:                       │
│  - release-note-<ts>.xlsx       │
│  - release-note-summary.xlsx    │
│  - upgrade-services.txt         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Drift Data Ingestion Service   │
│  (New NestJS Service)           │
│                                 │
│  - Parses Excel output          │
│  - Normalizes drift items       │
│  - Stores in PostgreSQL         │
│  - Triggers AI analysis         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  DriftExplainerService          │
│  (New NestJS Service)           │
│                                 │
│  1. Check Redis cache           │
│  2. Build LLM prompt            │
│  3. Call Gemini API             │
│  4. Parse JSON response         │
│  5. Validate & enrich           │
│  6. Cache in Redis              │
│  7. Store in PostgreSQL         │
│  8. Return to client            │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Frontend (Next.js 14)          │
│                                 │
│  - Drift explanation panel      │
│  - Risk score visualization     │
│  - Audience toggle              │
│  - Recommendation cards         │
│  - Export to PDF                 │
└─────────────────────────────────┘
```

---

## 7. LLM Prompt Design

### System Prompt

```
You are a DevOps expert analyzing configuration drift between environments
for the Garuda.One unified state management platform.

The platform manages Helm chart values across environments: DEV, SIT, UAT,
PRE-PROD, PROD. Each service has a YAML file under
helm-charts/<env>-values/app-values/<service>.yaml.

Your job is to analyze drift items (differences between environments) and
produce a structured JSON response with risk assessment, explanations, and
actionable recommendations.

Guidelines:
- Be specific about what changed and why it matters
- Highlight numerical differences (e.g., "100x increase")
- Flag typos when values are unrealistic
- Distinguish between expected differences (image tags, URLs) and unexpected ones
- Always consider security implications
- Never recommend ignoring security-related changes
```

### User Prompt Template

```
Environment: ${sourceEnv} -> ${targetEnv}
Changes Detected: ${changeCount}
Audience: ${audience}

Drift Items:
${driftItems.map(item => `
- Service: ${item.serviceName}
  Key: ${item.keyPath}
  Change Type: ${item.changeType}
  ${sourceEnv} Previous: ${item.lowerEnvPreviousValue}
  ${sourceEnv} Current: ${item.lowerEnvCurrentValue}
  ${targetEnv} Previous: ${item.higherEnvPreviousValue}
  ${targetEnv} Current: ${item.higherEnvCurrentValue}
  Comment: ${item.comment}
`).join('\n')}

Tasks:
1. Summarize the overall impact in ${audience} language
2. Assess risk on a 1-10 scale
3. Categorize each drift item by severity (critical/high/medium/low)
4. Provide 3-5 actionable recommendations

Output: Valid JSON matching the response schema.
```

### Few-Shot Examples (included in prompt)

```
Example 1:
Input: service-auth, image//tag, "12-dev" -> "14-dev"
Output: { severity: "low", explanation: "Normal version progression (+2 builds). Safe." }

Example 2:
Input: service-auth, SESSION_TIMEOUT, "30" -> "3000"
Output: { severity: "critical", explanation: "100x increase in timeout. Likely typo. Should be 300." }

Example 3:
Input: service-gateway, firewall_rules, "10.0.0.0/8" -> "0.0.0.0/0"
Output: { severity: "critical", explanation: "Firewall opened to all IPs. Security risk." }
```

---

## 8. Integration with Existing Code

### How `create-release-note.py` Output Maps to AI Input

The existing script produces an Excel with these columns:
1. **Service name** -> `driftItem.serviceName`
2. **Change Request** -> `driftItem.changeType` (modify/add/delete)
3. **Key** -> `driftItem.keyPath` (e.g., "image//image_name", "image//tag")
4. **`<lower-env>`-current value** -> `driftItem.lowerEnvCurrentValue`
5. **`<lower-env>`-previous value** -> `driftItem.lowerEnvPreviousValue`
6. **`<higher-env>`-current value** -> `driftItem.higherEnvCurrentValue`
7. **`<higher-env>`-previous value** -> `driftItem.higherEnvPreviousValue`
8. **Comment** -> `driftItem.comment` (Modified, Added, Deleted, root object added, root object deleted)

### Infrastructure Drift Integration

The `drift_lower_env.py` script produces `infra_difference.xlsx` with columns:
- Sheet Name, Object Id, Field, `<lower-env> Previous Value`, `<lower-env> Current Value`, `<higher-env> Current Value`, `<higher-env> Value`, Change

This output also feeds into the AI Drift Explainer using the same normalized `DriftItem` format.

---

## 9. Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Response time (cache miss) | < 3 seconds | P95 latency |
| Response time (cache hit) | < 50ms | P95 latency |
| Availability | 99.5% | Monthly uptime |
| LLM accuracy | > 90% | Manual review of 100 samples |
| Risk score accuracy | > 85% | Correlation with actual incidents |
| Concurrent requests | 50 | Load test |
| Cache hit ratio | > 60% | Redis metrics |
| Cost per analysis | < $0.01 | Token usage tracking |

---

## 10. Assumptions and Constraints

### Assumptions
1. The Gemini 3 Pro API provides consistent JSON output when given structured prompts
2. Drift reports typically contain 5-50 items per environment pair
3. The same drift data is queried multiple times by different audiences (cache benefit)
4. Historical drift data will be available for training ML risk models in later iterations

### Constraints
1. LLM token limit: prompts must fit within model context window (~128K tokens for Gemini 3 Pro)
2. For drift reports with 50+ items, items must be batched into groups of 20 per LLM call
3. Sensitive values (passwords, tokens, connection strings) must be redacted before sending to LLM
4. No PII should ever be included in LLM prompts
5. LLM API costs must stay under $20/month for 100 projects

---

## 11. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to understand drift report | < 2 minutes (from 30 min) | User survey |
| User satisfaction with explanations | > 95% | Thumbs up/down feedback |
| Risk score accuracy | > 85% | Compare predicted vs. actual incidents |
| Recommendation acceptance rate | > 80% | Track which recommendations are actioned |
| False negative rate (missed critical) | < 2% | Manual audit of "low risk" assessments |
| LLM response time | < 2 seconds | P95 API latency |
| Cost per analysis | < $0.01 | Token usage dashboard |

---

## 12. Out of Scope (Deferred to Later Iterations)

- UC-AI-002: Root Cause Analysis (tracing to commits/JIRA) - Iteration 02
- UC-AI-003: Risk Scoring with ML (XGBoost model) - Iteration 03
- UC-AI-004: Auto-Categorization with ML classifier - Iteration 03
- UC-AI-005: Smart Filtering - Iteration 04
- UC-AI-006: Remediation Suggestions with auto-fix scripts - Iteration 05
- Infrastructure drift from `drift_lower_env.py` (will use same service but added later)
- PDF export of drift analysis
- Slack/Teams notification integration
- Voice summary

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Drift** | A difference in configuration between two environments that may or may not be intentional |
| **Promotion** | The process of moving configuration from a lower environment to a higher one |
| **Lower Environment** | The source environment (e.g., DEV, SIT) |
| **Higher Environment** | The target environment (e.g., UAT, PROD) |
| **promotion-x-1** | Git branch containing the previous stable release |
| **promotion-x** | Git branch containing the current release with updates |
| **Helm Values** | YAML configuration files under `helm-charts/<env>-values/app-values/` |
| **infra_sheet.xlsx** | Excel file containing infrastructure specifications (buckets, CloudSQL, GKE, PubSub) |

---

**Document Version:** 1.0
**Last Updated:** February 10, 2026
**Author:** AI-Assisted (Iteration Planning)
