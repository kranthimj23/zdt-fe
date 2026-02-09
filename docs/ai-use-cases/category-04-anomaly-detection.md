# Category 4: Anomaly Detection

## Overview

This category contains **3 AI-powered use cases** that provide real-time monitoring and detection of unusual patterns during and after deployments using statistical methods and machine learning.

**Business Value:**
- Prevent 60% of production incidents through early anomaly detection
- Reduce mean time to detection (MTTD) from 15 minutes to under 1 minute
- Eliminate alert fatigue with intelligent anomaly scoring
- Automatic diagnostic collection when anomalies are detected

---

## UC-AI-016: Deployment Anomaly Detection

### Description
Real-time monitoring system that detects unusual patterns during active deployments — such as 3x slower response times, 10x error rate spikes, and pod crash loops — and automatically alerts the SRE team with diagnostic context.

### Priority
**P1 (Phase 2)**

### Complexity
High

### Estimated Effort
7 days

### Business Value
- **Speed:** Detect deployment issues in seconds, not minutes
- **Automation:** Auto-capture diagnostic logs and metrics at anomaly time
- **Prevention:** Trigger rollback before users are significantly impacted
- **Context:** Provide SRE team with pre-packaged diagnostic information

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/anomaly/deployment/monitor

Request:
{
  deploymentId: string,
  environment: string,
  services: string[],
  monitoringConfig: {
    metricsWindow: "1m" | "5m" | "15m",
    baselineWindow: "1h" | "6h" | "24h" | "7d",
    sensitivityLevel: "low" | "medium" | "high"
  }
}

Response:
{
  status: "monitoring" | "anomaly_detected" | "healthy",
  anomalies: Array<{
    metric: string,
    service: string,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    currentValue: number,
    baselineValue: number,
    deviationFactor: number,
    timestamp: ISO8601,
    description: string
  }>,
  diagnostics: {
    logs: string[],
    podStatuses: Array<{ pod: string, status: string, restarts: number }>,
    recentEvents: string[]
  },
  recommendation: "CONTINUE" | "INVESTIGATE" | "ROLLBACK",
  rollbackScript: string | null
}
```

#### Example Response
```json
{
  "status": "anomaly_detected",
  "anomalies": [
    {
      "metric": "error_rate",
      "service": "payments-service",
      "severity": "CRITICAL",
      "currentValue": 12.5,
      "baselineValue": 0.8,
      "deviationFactor": 15.6,
      "timestamp": "2026-02-09T14:30:00Z",
      "description": "Error rate increased 15.6x above baseline (0.8% → 12.5%). Primarily 500 errors from /api/v2/payments/process endpoint."
    },
    {
      "metric": "response_time_p99",
      "service": "payments-service",
      "severity": "HIGH",
      "currentValue": 4500,
      "baselineValue": 800,
      "deviationFactor": 5.6,
      "timestamp": "2026-02-09T14:30:15Z",
      "description": "P99 response time increased 5.6x (800ms → 4500ms). Likely caused by database connection pool exhaustion."
    }
  ],
  "diagnostics": {
    "logs": [
      "ERROR: Connection pool exhausted. Max connections: 10, Active: 10, Waiting: 47",
      "ERROR: Transaction timeout after 30000ms for payments.process"
    ],
    "podStatuses": [
      { "pod": "payments-service-abc123", "status": "Running", "restarts": 3 },
      { "pod": "payments-service-def456", "status": "CrashLoopBackOff", "restarts": 8 }
    ],
    "recentEvents": [
      "Pod payments-service-def456 restarted due to OOMKilled",
      "Readiness probe failed: HTTP 503"
    ]
  },
  "recommendation": "ROLLBACK",
  "rollbackScript": "kubectl rollout undo deployment/payments-service -n production"
}
```

#### Algorithm

**Step 1: Baseline Calculation**
```
For each monitored metric:
  - Collect baseline data from baselineWindow
  - Calculate: mean, stddev, p50, p95, p99
  - Account for time-of-day and day-of-week patterns
  - Store baseline profile in Redis (5-minute TTL refresh)
```

**Step 2: Real-Time Comparison**
```
Every metricsWindow interval:
  - Collect current metric values from Prometheus
  - Compare against baseline using modified Z-score
  - Flag if deviation > threshold:
    - LOW: 2σ deviation
    - MEDIUM: 3σ deviation
    - HIGH: 5σ deviation
    - CRITICAL: 10σ deviation or hard limit breach
```

**Step 3: Anomaly Scoring (Isolation Forest)**
```
For multi-dimensional anomaly detection:
  - Combine metrics into feature vector
  - Run through pre-trained Isolation Forest model
  - Score: -1 (anomaly) to 1 (normal)
  - Correlate with deployment timeline
```

**Step 4: Diagnostic Collection**
```
On anomaly detection:
  - Capture pod logs (last 100 lines)
  - Snapshot pod statuses and events
  - Record Prometheus metric values
  - Generate rollback script if severity >= HIGH
```

### Dependencies
- Prometheus for real-time metrics
- Kubernetes API for pod status and events
- Isolation Forest model (scikit-learn)
- Redis for baseline caching
- WebSocket for real-time alerts
- PagerDuty/Slack for notifications

### Success Metrics
- <30 second detection latency
- <5% false positive rate
- 95% true positive rate for critical anomalies
- 100% diagnostic coverage on detected anomalies

### Implementation Steps
1. Build Prometheus metrics collection pipeline
2. Implement baseline calculation engine
3. Create statistical anomaly detection (Z-score)
4. Train and deploy Isolation Forest model
5. Build diagnostic collection service
6. Implement real-time monitoring API with WebSocket
7. Create frontend anomaly dashboard
8. Integrate with PagerDuty/Slack alerting
9. Add automatic rollback trigger for critical anomalies

---

## UC-AI-017: Configuration Anomaly Detection

### Description
AI system that automatically flags configuration values that appear anomalous — such as typos (100x value increase), missing required fields, inconsistent cross-environment values, and values outside historical norms.

### Priority
**P1 (Phase 2)**

### Complexity
Medium

### Estimated Effort
4 days

### Business Value
- **Typo Detection:** Catch configuration typos before they reach production
- **Consistency:** Ensure cross-environment configuration coherence
- **Validation:** AI-powered config validation beyond simple schema checks
- **Prevention:** Block obviously wrong configurations early

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/anomaly/configuration

Request:
{
  environment: string,
  service: string,
  configValues: Record<string, any>,
  compareWith: string[] | null
}

Response:
{
  anomalies: Array<{
    field: string,
    currentValue: any,
    expectedRange: { min: any, max: any } | null,
    historicalValues: any[],
    anomalyType: "magnitude" | "type_mismatch" | "missing" | "inconsistent" | "outlier",
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    confidence: number,
    explanation: string,
    suggestedValue: any | null
  }>,
  crossEnvInconsistencies: Array<{
    field: string,
    values: Record<string, any>,
    shouldMatch: boolean,
    explanation: string
  }>,
  overallHealth: "healthy" | "warnings" | "critical"
}
```

#### Algorithm

**Type 1: Magnitude Anomaly Detection**
```
For numeric configuration values:
  - Compare against historical distribution for same field
  - Flag if change magnitude > 10x (likely typo)
  - Flag if value outside 3σ of historical values
  - Example: SESSION_TIMEOUT: 30 → 3000 (100x, likely typo)
```

**Type 2: Cross-Environment Consistency**
```
For fields that should match across environments:
  - Compare value across dev/sit/uat/prod
  - Flag inconsistencies for security-critical fields
  - Allow expected differences (URLs, image tags)
  - Example: MAX_RETRIES is 3 in all envs except prod (30)
```

**Type 3: Pattern-Based Detection**
```
For text configuration values:
  - Validate URL formats
  - Check email formats
  - Verify IP address ranges
  - Detect placeholder values ("TODO", "CHANGE_ME")
```

**Type 4: ML-Based Outlier Detection**
```
For complex patterns:
  - Encode config values as feature vectors
  - Run Isolation Forest for outlier detection
  - Identify configs that deviate from cluster norms
```

#### LLM Prompt Template
```
You are a configuration auditor reviewing application settings.

Service: ${service}
Environment: ${environment}

Current Configuration:
${Object.entries(configValues).map(([k,v]) => `${k}: ${v}`).join('\n')}

Historical Values for Flagged Fields:
${flaggedFields.map(f => `${f.name}: ${f.history.join(' → ')}`).join('\n')}

Cross-Environment Comparison:
${crossEnvComparison}

Identify:
1. Values that look like typos (unrealistic magnitudes)
2. Security risks (overly permissive settings)
3. Performance concerns (undersized pools, short timeouts)
4. Inconsistencies that suggest errors (not expected env differences)

For each anomaly provide:
{
  "field": "field_name",
  "anomalyType": "magnitude|type_mismatch|missing|inconsistent|outlier",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "explanation": "Why this is anomalous",
  "suggestedValue": "correct value or null"
}
```

### Dependencies
- Configuration data store (PostgreSQL)
- Historical configuration snapshots
- Isolation Forest model (for complex patterns)
- Google Gemini/Anthropic API (for LLM analysis)
- Redis for caching cross-env comparisons

### Success Metrics
- 95% detection rate for magnitude anomalies (typos)
- <5% false positive rate
- 90% accuracy in suggested corrections
- <3 second analysis time per configuration set

### Implementation Steps
1. Build historical configuration snapshot system
2. Implement magnitude anomaly detection
3. Create cross-environment consistency checker
4. Build pattern-based validation engine
5. Train Isolation Forest for complex patterns
6. Add LLM analysis for contextual understanding
7. Create API endpoint with batch support
8. Build frontend anomaly highlighting in config viewer

---

## UC-AI-018: Performance Anomaly Detection

### Description
Compares pre-deployment and post-deployment performance metrics using statistical analysis and ML to detect degradations in response time, throughput, error rates, and resource utilization.

### Priority
**P1 (Phase 2)**

### Complexity
High

### Estimated Effort
6 days

### Business Value
- **Quality:** Catch performance regressions immediately after deployment
- **Automation:** Eliminate manual performance comparison
- **Confidence:** Statistical rigor in performance assessment
- **Speed:** Auto-detect degradations in minutes, not days

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/anomaly/performance

Request:
{
  deploymentId: string,
  service: string,
  preDeploymentWindow: "1h" | "6h" | "24h",
  postDeploymentWindow: "15m" | "30m" | "1h",
  metrics: string[]
}

Response:
{
  comparison: Array<{
    metric: string,
    preDeployment: {
      mean: number,
      p50: number,
      p95: number,
      p99: number,
      stddev: number
    },
    postDeployment: {
      mean: number,
      p50: number,
      p95: number,
      p99: number,
      stddev: number
    },
    change: {
      absolute: number,
      percentage: number,
      direction: "improved" | "degraded" | "unchanged",
      statistically_significant: boolean,
      pValue: number
    }
  }>,
  overallAssessment: {
    status: "healthy" | "degraded" | "critical",
    summary: string,
    recommendation: "CONTINUE" | "MONITOR" | "INVESTIGATE" | "ROLLBACK"
  },
  regressions: Array<{
    metric: string,
    severity: "minor" | "moderate" | "severe",
    description: string,
    possibleCauses: string[]
  }>
}
```

#### Algorithm

**Step 1: Metric Collection**
```
Pre-deployment metrics:
  - Query Prometheus for preDeploymentWindow
  - Calculate: mean, p50, p95, p99, stddev for each metric
  - Store as baseline snapshot

Post-deployment metrics:
  - Query Prometheus for postDeploymentWindow
  - Calculate same statistics
  - Compare against baseline
```

**Step 2: Statistical Comparison**
```
For each metric:
  - Welch's t-test (unequal variance t-test) for mean comparison
  - Mann-Whitney U test for distribution comparison
  - Calculate p-value and effect size (Cohen's d)
  - Statistically significant if p < 0.05 and effect size > 0.5
```

**Step 3: ML-Based Pattern Detection**
```
For complex multi-metric patterns:
  - Encode pre/post metrics as feature vectors
  - Compare using Mahalanobis distance
  - Detect correlated metric changes (e.g., CPU up + throughput down)
  - Identify slow degradation trends (not just point changes)
```

**Step 4: LLM Root Cause Suggestion**
```
For detected regressions:
  - Send metric comparison + deployment changes to LLM
  - Generate possible root cause explanations
  - Suggest investigation steps
```

#### LLM Prompt Template
```
You are a performance engineer analyzing a deployment's impact.

Service: ${service}
Deployment: ${deploymentId}

Performance Comparison:
${metrics.map(m => `
${m.name}:
  Before: mean=${m.pre.mean}, p99=${m.pre.p99}
  After:  mean=${m.post.mean}, p99=${m.post.p99}
  Change: ${m.change.percentage}% (${m.change.direction})
  Significant: ${m.change.statistically_significant}
`).join('\n')}

Deployment Changes:
${deploymentChanges}

For each regression:
1. Suggest 2-3 most likely root causes
2. Recommend investigation steps
3. Assess severity (minor/moderate/severe)
4. Suggest immediate mitigation if needed

Output format: JSON
```

### Dependencies
- Prometheus for metrics collection
- SciPy for statistical tests
- Isolation Forest / Mahalanobis distance for ML detection
- Google Gemini/Anthropic API for root cause suggestions
- PostgreSQL for storing comparison results

### Success Metrics
- 90% detection rate for >10% performance regressions
- <5% false positive rate
- <2 minute post-deployment assessment time
- 80% accuracy in root cause suggestions

### Implementation Steps
1. Build pre/post metric collection pipeline
2. Implement statistical comparison engine (t-test, Mann-Whitney)
3. Add ML-based multi-metric pattern detection
4. Create LLM root cause analysis integration
5. Build comparison API endpoint
6. Create frontend performance comparison dashboard
7. Add automated post-deployment performance checks
8. Integrate with deployment pipeline for automatic assessment

---

## Summary

**Category 4: Anomaly Detection** provides 3 AI-powered capabilities for real-time monitoring and intelligent issue detection:

1. **UC-AI-016: Deployment Anomaly Detection** - Real-time monitoring during deployments (7 days)
2. **UC-AI-017: Configuration Anomaly Detection** - Flags config typos and inconsistencies (4 days)
3. **UC-AI-018: Performance Anomaly Detection** - Detects post-deployment performance regressions (6 days)

**Total Effort:** 17 days (~3.5 weeks with 1 developer)

**Next:** See [category-05-natural-language-interface.md](./category-05-natural-language-interface.md) for Natural Language Interface use cases.
