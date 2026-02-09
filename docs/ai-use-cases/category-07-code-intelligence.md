# Category 7: Code Intelligence

## Overview

This category contains **4 AI-powered use cases** that analyze code changes for security vulnerabilities, breaking changes, quality issues, and dependency risks before they reach production.

**Business Value:**
- Catch 95%+ security vulnerabilities before production deployment
- Detect breaking API changes before they affect consumers
- Reduce code review time by 40% with AI-powered analysis
- Proactive dependency risk management preventing supply chain attacks

---

## UC-AI-026: Security Vulnerability Detection

### Description
AI-powered security scanner that analyzes code changes, configuration diffs, and dependency updates for common vulnerabilities including OWASP Top 10, exposed secrets, insecure configurations, and known CVEs.

### Priority
**P2 (Phase 3)**

### Complexity
High

### Estimated Effort
7 days

### Business Value
- **Prevention:** Catch vulnerabilities before they reach production
- **Coverage:** Broader than traditional SAST tools with LLM understanding
- **Speed:** Scan code changes in seconds during PR review
- **Compliance:** Automated security checks for SOC2/PCI requirements

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/code/security-scan

Request:
{
  changeSet: {
    files: Array<{
      path: string,
      diff: string,
      language: string
    }>,
    dependencies: Array<{
      name: string,
      oldVersion: string,
      newVersion: string,
      ecosystem: "npm" | "pip" | "maven" | "go"
    }>
  },
  scanLevel: "quick" | "thorough"
}

Response:
{
  vulnerabilities: Array<{
    id: string,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    category: string,
    file: string,
    line: number,
    title: string,
    description: string,
    cweId: string | null,
    cvss: number | null,
    recommendation: string,
    codeSnippet: string
  }>,
  dependencyVulnerabilities: Array<{
    dependency: string,
    version: string,
    cves: Array<{
      id: string,
      severity: string,
      description: string,
      fixedVersion: string | null
    }>
  }>,
  secretsDetected: Array<{
    file: string,
    line: number,
    type: string,
    redactedValue: string
  }>,
  summary: {
    critical: number,
    high: number,
    medium: number,
    low: number,
    blockers: number,
    recommendation: "PASS" | "REVIEW" | "BLOCK"
  }
}
```

#### Scanning Approach

**Layer 1: Pattern-Based Detection (Fast)**
```
Regex patterns for common vulnerabilities:
  - SQL injection: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE)/i
  - XSS: /innerHTML|dangerouslySetInnerHTML|document\.write/
  - Secrets: /(?:api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]+['"]/i
  - Insecure HTTP: /http:\/\/(?!localhost)/
  - Hardcoded IPs: /\b(?:\d{1,3}\.){3}\d{1,3}\b(?!.*(?:127\.0\.0\.1|0\.0\.0\.0))/
```

**Layer 2: CVE Database Lookup**
```
For each dependency change:
  - Query NVD (National Vulnerability Database)
  - Query GitHub Advisory Database
  - Query Snyk vulnerability database
  - Cross-reference with known exploits
```

**Layer 3: LLM Analysis (Thorough)**
```
For complex vulnerability patterns:
  - Send code context to LLM
  - Detect business logic vulnerabilities
  - Identify authorization bypass patterns
  - Analyze data flow for injection risks
```

#### LLM Prompt Template
```
You are a security engineer performing a code review.

File: ${file.path}
Language: ${file.language}

Code Changes (diff):
${file.diff}

Analyze for security vulnerabilities:
1. OWASP Top 10 (injection, broken auth, XSS, etc.)
2. Exposed secrets or credentials
3. Insecure configurations
4. Authorization/authentication bypass
5. Data exposure risks
6. Insecure deserialization
7. Server-side request forgery (SSRF)

For each vulnerability found, provide:
{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "category": "OWASP category or CWE",
  "line": line_number,
  "title": "brief title",
  "description": "detailed explanation of the risk",
  "recommendation": "specific fix suggestion with code example"
}

Be specific. Only flag real issues, not false positives.
Do NOT flag standard logging, test code, or environment-specific configs.
```

### Dependencies
- NVD / GitHub Advisory Database API
- SAST tool integration (optional: Semgrep, SonarQube)
- Google Gemini/Anthropic API for LLM analysis
- Git diff access
- PostgreSQL for vulnerability tracking

### Success Metrics
- 95% detection rate for known vulnerability patterns
- <10% false positive rate
- <30 second scan time for typical PR
- 100% dependency CVE coverage

### Implementation Steps
1. Build pattern-based vulnerability scanner
2. Integrate CVE database lookup
3. Create secret detection engine
4. Implement LLM-based deep analysis
5. Build scanning API endpoint
6. Integrate with CI/CD pipeline (PR checks)
7. Create vulnerability dashboard
8. Add remediation tracking and SLA monitoring

---

## UC-AI-027: Breaking Change Detection

### Description
AI system that analyzes code changes to detect breaking API changes, schema modifications, contract violations, and backward-incompatible changes before they affect downstream consumers.

### Priority
**P2 (Phase 3)**

### Complexity
Medium

### Estimated Effort
5 days

### Business Value
- **Prevention:** Catch breaking changes before they reach consumers
- **Communication:** Auto-notify affected teams of API changes
- **Versioning:** Enforce semantic versioning based on change analysis
- **Documentation:** Auto-generate API migration guides

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/code/breaking-changes

Request:
{
  sourceVersion: string,
  targetVersion: string,
  apiSpecs: {
    before: OpenAPISpec | null,
    after: OpenAPISpec | null
  },
  codeChanges: Array<{
    file: string,
    diff: string
  }>,
  schemaChanges: Array<{
    type: "database" | "graphql" | "protobuf",
    before: string,
    after: string
  }>
}

Response:
{
  breakingChanges: Array<{
    type: "api-removal" | "api-modification" | "schema-change" | "behavioral" | "contract-violation",
    severity: "minor" | "major" | "critical",
    component: string,
    description: string,
    affectedConsumers: string[],
    migrationSteps: string[],
    suggestedVersion: string
  }>,
  nonBreakingChanges: Array<{
    type: string,
    description: string
  }>,
  versionRecommendation: {
    currentVersion: string,
    suggestedVersion: string,
    bumpType: "patch" | "minor" | "major",
    reasoning: string
  },
  migrationGuide: string | null
}
```

#### Detection Algorithm

**API Breaking Change Detection:**
```
Compare OpenAPI specs (before vs after):
  - Removed endpoints → CRITICAL breaking change
  - Changed request parameters (required added) → MAJOR breaking change
  - Changed response schema (fields removed) → MAJOR breaking change
  - Changed HTTP methods → CRITICAL breaking change
  - Changed authentication requirements → MAJOR breaking change
  - New optional parameters → Non-breaking (minor)
  - New endpoints → Non-breaking (minor)
```

**Schema Breaking Change Detection:**
```
Database:
  - Column removed → CRITICAL
  - Column type changed → MAJOR
  - NOT NULL added to existing column → MAJOR
  - New column with NOT NULL and no default → MAJOR
  - New nullable column → Non-breaking

GraphQL:
  - Field removed → CRITICAL
  - Type changed → MAJOR
  - Required argument added → MAJOR
  - New optional field → Non-breaking
```

#### LLM Prompt Template
```
Analyze these code changes for backward-incompatible (breaking) changes.

API Spec Changes:
${apiSpecDiff}

Code Changes:
${codeChanges}

Schema Changes:
${schemaChanges}

Identify:
1. Removed or renamed API endpoints
2. Changed request/response schemas
3. Modified authentication requirements
4. Database schema incompatibilities
5. Behavioral changes that could break existing integrations
6. Contract violations

For each breaking change:
{
  "type": "api-removal|api-modification|schema-change|behavioral|contract-violation",
  "severity": "minor|major|critical",
  "description": "what changed and why it breaks",
  "affectedConsumers": ["list of affected services"],
  "migrationSteps": ["step-by-step migration guide"]
}

Also recommend semantic version bump: patch, minor, or major.
```

### Dependencies
- OpenAPI spec files (before/after)
- Database migration files
- API consumer registry
- Google Gemini/Anthropic API
- Git diff access

### Success Metrics
- 95% detection rate for API breaking changes
- 90% accuracy in consumer impact identification
- <10 second analysis time
- 100% coverage of API spec changes

### Implementation Steps
1. Build OpenAPI spec diff analyzer
2. Create database schema change detector
3. Implement semantic version recommendation engine
4. Add LLM analysis for behavioral changes
5. Build consumer impact identification
6. Create migration guide generator
7. Build API endpoint and CI/CD integration
8. Add notification to affected teams

---

## UC-AI-028: Code Quality Analysis

### Description
AI-powered code review assistant that analyzes code changes for quality issues including complexity, maintainability, design patterns, best practices, and potential bugs.

### Priority
**P2 (Phase 3)**

### Complexity
Medium

### Estimated Effort
5 days

### Business Value
- **Quality:** Catch code quality issues before merge
- **Speed:** 40% reduction in code review time
- **Consistency:** Enforce coding standards automatically
- **Learning:** Developers learn from AI suggestions

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/code/quality

Request:
{
  pullRequestId: string | null,
  files: Array<{
    path: string,
    diff: string,
    language: string,
    fullContent: string | null
  }>,
  context: {
    projectLanguage: string,
    framework: string,
    styleGuide: string | null
  }
}

Response:
{
  issues: Array<{
    severity: "info" | "warning" | "error",
    category: "complexity" | "maintainability" | "performance" | "best-practice" | "bug-risk" | "duplication",
    file: string,
    line: number,
    title: string,
    description: string,
    suggestion: string,
    codeExample: string | null
  }>,
  metrics: {
    averageComplexity: number,
    maintainabilityIndex: number,
    duplicationPercentage: number,
    testableScore: number
  },
  summary: {
    totalIssues: number,
    byCategory: Record<string, number>,
    overallScore: number,
    recommendation: string
  }
}
```

#### Analysis Categories

**1. Complexity Analysis:**
```
- Cyclomatic complexity per function (flag if >10)
- Cognitive complexity (nested conditionals, complex logic)
- Function length (flag if >50 lines)
- File length (flag if >500 lines)
- Parameter count (flag if >5)
```

**2. Maintainability:**
```
- Code duplication detection
- Dead code identification
- Unclear naming conventions
- Missing error handling
- Magic numbers/strings
```

**3. Performance:**
```
- N+1 query patterns
- Missing pagination for large queries
- Synchronous operations that should be async
- Memory leak patterns
- Inefficient algorithms
```

**4. Best Practices:**
```
- Framework-specific anti-patterns
- Missing input validation
- Improper error handling
- Logging best practices
- Configuration management
```

#### LLM Prompt Template
```
You are a senior software engineer reviewing code changes.

Project: ${context.projectLanguage} / ${context.framework}
${context.styleGuide ? `Style Guide: ${context.styleGuide}` : ''}

Code Changes:
${files.map(f => `--- ${f.path} ---\n${f.diff}`).join('\n\n')}

Review for:
1. Code complexity and readability
2. Potential bugs or logic errors
3. Performance issues
4. Security concerns
5. Best practice violations
6. Design pattern improvements

Guidelines:
- Only flag genuine issues (not style preferences unless style guide specified)
- Provide specific, actionable suggestions with code examples
- Focus on the changed code, not the entire file
- Be respectful and constructive
- Prioritize issues by impact

Output format: JSON array of issues with severity, category, file, line, title, description, suggestion
```

### Dependencies
- Git diff access
- Static analysis tools (ESLint, SonarQube) for baseline metrics
- Google Gemini/Anthropic API for LLM analysis
- PostgreSQL for tracking quality trends

### Success Metrics
- 80% of AI suggestions accepted by reviewers
- 40% reduction in code review cycle time
- 30% reduction in post-merge bug reports
- <20 second analysis time per PR

### Implementation Steps
1. Build static analysis integration (complexity metrics)
2. Create code duplication detector
3. Implement LLM-based code review
4. Build API endpoint with PR integration
5. Create inline comment posting (GitHub/GitLab)
6. Add quality trend tracking over time
7. Build developer dashboard
8. Add team-specific rule configuration

---

## UC-AI-029: Dependency Risk Analysis

### Description
AI system that evaluates dependency updates for risk factors including CVE vulnerabilities, maintainer activity, breaking changes, license issues, and supply chain security concerns.

### Priority
**P2 (Phase 3)**

### Complexity
Medium

### Estimated Effort
4 days

### Business Value
- **Security:** Detect vulnerable dependencies before deployment
- **Risk:** Assess dependency health and maintainer activity
- **Compliance:** License compatibility checking
- **Prevention:** Block risky dependency updates

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/code/dependency-risk

Request:
{
  dependencies: Array<{
    name: string,
    currentVersion: string,
    targetVersion: string,
    ecosystem: "npm" | "pip" | "maven" | "go" | "nuget"
  }>,
  lockfileChanges: string | null
}

Response:
{
  assessments: Array<{
    dependency: string,
    currentVersion: string,
    targetVersion: string,
    riskLevel: "low" | "medium" | "high" | "critical",
    riskScore: number,
    vulnerabilities: Array<{
      cveId: string,
      severity: string,
      description: string,
      fixedIn: string | null
    }>,
    maintainerHealth: {
      lastPublished: ISO8601,
      monthlyDownloads: number,
      maintainerCount: number,
      openIssues: number,
      healthScore: number
    },
    breakingChanges: boolean,
    licenseChange: {
      from: string,
      to: string,
      compatible: boolean
    } | null,
    recommendation: "update" | "review" | "block" | "pin-version"
  }>,
  summary: {
    totalDependencies: number,
    safe: number,
    needsReview: number,
    blocked: number,
    overallRisk: "low" | "medium" | "high"
  }
}
```

#### Risk Scoring Algorithm

**Component Scores:**
```
Vulnerability Score (0-10):
  - 0: No known CVEs
  - 3: Low severity CVEs
  - 6: Medium severity CVEs
  - 8: High severity CVEs
  - 10: Critical CVEs with known exploits

Maintainer Health Score (0-10):
  - Last publish > 2 years: +3
  - Single maintainer: +2
  - <100 weekly downloads: +2
  - >50 open issues: +1
  - No security policy: +2

Breaking Change Score (0-10):
  - Major version bump: 5
  - Deprecated API usage: 3
  - Peer dependency conflicts: 4

License Score (0-10):
  - Compatible license: 0
  - More restrictive license: 5
  - Incompatible license: 10

Overall Risk = (0.4 × vulnerability) + (0.25 × maintainer) + (0.2 × breaking) + (0.15 × license)
```

#### LLM Prompt Template
```
Analyze these dependency updates for risk:

${dependencies.map(d => `
${d.name}: ${d.currentVersion} → ${d.targetVersion}
  CVEs: ${d.vulnerabilities.length > 0 ? d.vulnerabilities.map(v => v.cveId).join(', ') : 'None'}
  Last Published: ${d.maintainerHealth.lastPublished}
  Downloads: ${d.maintainerHealth.monthlyDownloads}/month
  License: ${d.licenseChange ? `${d.licenseChange.from} → ${d.licenseChange.to}` : 'Unchanged'}
`).join('\n')}

Assess:
1. Are any dependencies high-risk for supply chain attacks?
2. Are there dependencies that appear abandoned?
3. Are there license incompatibilities?
4. Which updates are safe to auto-merge?
5. Which require manual review?

Output format: JSON with per-dependency assessment and recommendations
```

### Dependencies
- NPM registry API / PyPI API / Maven Central API
- NVD (National Vulnerability Database)
- GitHub API (for maintainer activity)
- License compatibility database
- Google Gemini/Anthropic API for analysis

### Success Metrics
- 100% CVE detection for direct dependencies
- 90% accuracy in risk scoring
- <15 second analysis time for typical project
- Zero blocked deployments due to missed vulnerabilities

### Implementation Steps
1. Build dependency metadata fetcher (multi-ecosystem)
2. Integrate CVE/vulnerability databases
3. Create maintainer health scoring engine
4. Implement license compatibility checker
5. Build LLM risk assessment
6. Create API endpoint
7. Integrate with CI/CD for automated checks
8. Build dependency dashboard with trend tracking

---

## Summary

**Category 7: Code Intelligence** provides 4 AI-powered capabilities for proactive code quality and security:

1. **UC-AI-026: Security Vulnerability Detection** - AI-powered security scanning (7 days)
2. **UC-AI-027: Breaking Change Detection** - API and schema compatibility analysis (5 days)
3. **UC-AI-028: Code Quality Analysis** - AI code review assistant (5 days)
4. **UC-AI-029: Dependency Risk Analysis** - Dependency health and vulnerability assessment (4 days)

**Total Effort:** 21 days (~4 weeks with 1 developer)

**Next:** See [category-08-intelligent-recommendations.md](./category-08-intelligent-recommendations.md) for Intelligent Recommendations use cases.
