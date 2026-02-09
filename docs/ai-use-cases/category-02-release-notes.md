# Category 2: AI-Generated Release Notes

## Overview

This category contains **5 AI-powered use cases** that automate the creation of comprehensive, audience-appropriate release notes from Git commits, JIRA tickets, and deployment metadata.

**Business Value:**
- Reduce release notes generation from 2-4 hours to 5 minutes (30x faster)
- Ensure consistent, high-quality documentation for every release
- Automatically link business requirements to technical changes
- Generate audience-specific formats (executive, technical, customer-facing)

---

## UC-AI-007: Smart Summarization

### Description
LLM-powered summarization that condenses 100+ Git commits into concise, structured release summaries tailored for different audiences.

### Priority
**P0 (MVP - Phase 1)**

### Complexity
Medium

### Estimated Effort
3 days

### Business Value
- Eliminates manual commit-by-commit review
- Produces consistent summaries regardless of release size
- Supports multiple output formats for different stakeholders
- Highlights key changes and potential risks automatically

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/release-notes/summarize

Request:
{
  releaseVersion: string,
  sourceEnv: string,
  targetEnv: string,
  commits: Array<{
    hash: string,
    message: string,
    author: string,
    timestamp: ISO8601,
    filesChanged: number
  }>,
  format: "executive" | "technical" | "customer"
}

Response:
{
  summary: string,
  highlights: string[],
  risks: string[],
  stats: {
    totalCommits: number,
    contributors: number,
    filesChanged: number,
    servicesAffected: string[]
  },
  formattedOutput: {
    executive: string,
    technical: string,
    customer: string
  }
}
```

#### Example Response
```json
{
  "summary": "Release v2.5.0 includes 3 new features, 8 bug fixes, and 2 performance improvements across 5 services.",
  "highlights": [
    "New single sign-on (SSO) integration with Azure AD",
    "Payment processing latency reduced by 40%",
    "Dashboard loading time improved from 5s to 1.2s"
  ],
  "risks": [
    "Database migration required for user-auth service",
    "Breaking API change in /api/v2/payments endpoint"
  ],
  "stats": {
    "totalCommits": 127,
    "contributors": 8,
    "filesChanged": 342,
    "servicesAffected": ["user-auth", "payments", "dashboard", "notifications", "api-gateway"]
  },
  "formattedOutput": {
    "executive": "This release delivers SSO capability (requested by 15 enterprise clients), a 40% payment speed improvement, and faster dashboards. One database migration is required. Deployment risk: MEDIUM.",
    "technical": "127 commits across 5 services. Key changes: Azure AD OIDC integration in user-auth, connection pool optimization in payments service (HikariCP tuning), React lazy loading in dashboard. Breaking: /api/v2/payments response schema changed (added 'processingTime' field). Migration: ALTER TABLE users ADD COLUMN sso_provider VARCHAR(50).",
    "customer": "We've made it easier to sign in with your company credentials (SSO), payments are now faster, and your dashboard loads in under 2 seconds. No action needed on your part."
  }
}
```

### LLM Integration

#### Provider
- **Primary:** OpenAI GPT-4o
- **Fallback:** Anthropic Claude 4.5 Sonnet

#### Prompt Template
```
You are a technical writer creating release notes for a software deployment.

Release: ${releaseVersion}
Environment: ${sourceEnv} → ${targetEnv}
Total Commits: ${commits.length}
Contributors: ${uniqueAuthors.length}

Commits:
${commits.map(c => `- ${c.hash.slice(0,7)} (${c.author}): ${c.message}`).join('\n')}

Tasks:
1. Create a 1-2 sentence executive summary
2. List 3-5 key highlights (most impactful changes)
3. Identify deployment risks and breaking changes
4. Generate three versions:
   - Executive: 3 sentences max, business impact focus, no technical jargon
   - Technical: Detailed, includes service names, migration steps, API changes
   - Customer-facing: User-friendly, focuses on benefits, no internal details

Guidelines:
- Group related commits into logical change descriptions
- Ignore merge commits and trivial changes (typos, formatting)
- Highlight security fixes prominently
- Flag breaking changes with ⚠️
- Use conventional commit prefixes to determine change type (feat, fix, perf, etc.)

Output format: JSON matching the response schema
```

### Dependencies
- Git repository access for commit history
- OpenAI/Anthropic API key
- Redis for caching generated summaries
- PostgreSQL for storing release notes history

### Success Metrics
- 90% user satisfaction with generated summaries
- <5 second generation time for releases with <500 commits
- 95% accuracy in identifying breaking changes
- 80% reduction in time spent writing release notes

### Implementation Steps
1. Create `ReleaseNotesSummaryService` in NestJS
2. Build Git commit parser and aggregator
3. Design prompt template with few-shot examples
4. Implement multi-format output generation
5. Add caching layer for generated summaries
6. Build frontend display component
7. Add manual editing and approval workflow
8. Set up cost and usage tracking

---

## UC-AI-008: JIRA Ticket Enrichment

### Description
Automatically extracts JIRA ticket references from commit messages, fetches ticket details via JIRA API, and uses LLM to enrich release notes with business context and requirements traceability.

### Priority
**P0 (MVP - Phase 1)**

### Complexity
Medium

### Estimated Effort
4 days

### Business Value
- **Traceability:** Links every code change to a business requirement
- **Compliance:** Audit trail from requirement to deployment
- **Context:** Business stakeholders see why changes were made
- **Automation:** Eliminates manual JIRA lookup during release documentation

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/release-notes/enrich-jira

Request:
{
  releaseVersion: string,
  commits: Array<{
    hash: string,
    message: string,
    author: string
  }>
}

Response:
{
  enrichedChanges: Array<{
    commitHash: string,
    commitMessage: string,
    jiraTickets: Array<{
      key: string,
      summary: string,
      type: "Story" | "Bug" | "Task" | "Epic",
      priority: string,
      status: string,
      businessValue: string,
      acceptanceCriteria: string[]
    }>,
    businessContext: string
  }>,
  orphanedCommits: Array<{
    hash: string,
    message: string,
    reason: string
  }>,
  summary: {
    totalCommits: number,
    linkedToJira: number,
    orphaned: number,
    ticketTypes: {
      stories: number,
      bugs: number,
      tasks: number
    }
  }
}
```

#### Algorithm

**Step 1: Extract JIRA References**
```
Pattern: /[A-Z]{2,10}-\d+/g
Example: "feat(PROJ-1234): Add SSO login" → extracts "PROJ-1234"
```

**Step 2: Batch Fetch JIRA Details**
```
For each unique ticket ID:
  - GET /rest/api/2/issue/{ticketId}
  - Extract: summary, description, type, priority, status, acceptance criteria
  - Cache results (24-hour TTL)
```

**Step 3: LLM Enrichment**
```
For each commit + JIRA pair:
  - Generate business context summary
  - Extract key business value from ticket description
  - Summarize acceptance criteria
```

#### LLM Prompt Template
```
You are a business analyst creating release documentation.

Commit: ${commit.message}
Author: ${commit.author}

JIRA Ticket: ${ticket.key}
Title: ${ticket.summary}
Type: ${ticket.type}
Description: ${ticket.description}
Acceptance Criteria: ${ticket.acceptanceCriteria}

Tasks:
1. Summarize the business value of this change in 1-2 sentences
2. Extract key acceptance criteria (3-5 bullet points)
3. Identify any customer-facing impact
4. Note any compliance or regulatory relevance

Output format: JSON
{
  "businessValue": "string",
  "acceptanceCriteria": ["string"],
  "customerImpact": "string | null",
  "complianceNotes": "string | null"
}
```

### Dependencies
- JIRA REST API access (API token)
- Git repository access
- OpenAI/Anthropic API
- Redis cache for JIRA responses
- PostgreSQL for enrichment history

### Success Metrics
- 95% JIRA ticket extraction accuracy
- <3 second enrichment time per commit
- 90% of commits linked to JIRA tickets
- 85% accuracy in business value summaries

### Implementation Steps
1. Build JIRA ticket extraction regex engine
2. Create JIRA API integration client with retry logic
3. Implement batch fetching with rate limiting
4. Design LLM enrichment prompt
5. Build caching layer for JIRA responses
6. Create API endpoint with validation
7. Build frontend component for enriched release notes
8. Add orphaned commit detection and alerting

---

## UC-AI-009: Change Categorization

### Description
Automatically categorizes commits into structured release note sections: Features, Bug Fixes, Improvements, Breaking Changes, Documentation, and Chores using conventional commit parsing and LLM classification.

### Priority
**P0 (MVP - Phase 1)**

### Complexity
Medium

### Estimated Effort
3 days

### Business Value
- **Structure:** Organized release notes that are easy to scan
- **Consistency:** Same categorization rules applied every time
- **Automation:** No manual sorting of 100+ commits
- **Filtering:** Stakeholders can focus on relevant sections

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/release-notes/categorize

Request:
{
  commits: Array<{
    hash: string,
    message: string,
    body: string | null,
    filesChanged: string[]
  }>
}

Response:
{
  categorized: {
    features: Array<CategorizedCommit>,
    bugFixes: Array<CategorizedCommit>,
    improvements: Array<CategorizedCommit>,
    breakingChanges: Array<CategorizedCommit>,
    documentation: Array<CategorizedCommit>,
    chores: Array<CategorizedCommit>
  },
  uncategorized: Array<{
    commit: Commit,
    suggestedCategory: string,
    confidence: number
  }>,
  stats: {
    features: number,
    bugFixes: number,
    improvements: number,
    breakingChanges: number,
    documentation: number,
    chores: number
  }
}
```

#### Algorithm

**Tier 1: Conventional Commit Parsing (80% of commits)**
```
Prefix mapping:
  feat:     → Features
  fix:      → Bug Fixes
  perf:     → Improvements
  refactor: → Improvements
  docs:     → Documentation
  chore:    → Chores
  ci:       → Chores
  test:     → Chores
  style:    → Chores
  BREAKING CHANGE: → Breaking Changes
  feat!:    → Breaking Changes (+ Features)
```

**Tier 2: LLM Classification (20% ambiguous commits)**
```
For commits without conventional prefixes:
  - Send to LLM with commit message + changed files
  - LLM returns category + confidence score
  - Commits with confidence <70% flagged for manual review
```

#### LLM Prompt Template
```
Classify the following Git commit into one category:
- Feature: New functionality or capability
- Bug Fix: Corrects incorrect behavior
- Improvement: Enhances existing functionality (performance, UX)
- Breaking Change: Incompatible API or behavior changes
- Documentation: Docs, README, comments only
- Chore: Build, CI, tests, dependencies, formatting

Commit: ${commit.message}
Files Changed: ${commit.filesChanged.join(', ')}
${commit.body ? `Body: ${commit.body}` : ''}

Output format: JSON
{
  "category": "Feature" | "Bug Fix" | "Improvement" | "Breaking Change" | "Documentation" | "Chore",
  "confidence": 0-100,
  "reasoning": "Brief explanation"
}
```

### Dependencies
- Git commit history access
- OpenAI/Anthropic API (for ambiguous commits)
- Conventional commit parser library

### Success Metrics
- 95% accuracy for conventional commits (rule-based)
- 85% accuracy for non-conventional commits (LLM)
- 100% commit coverage (every commit categorized)
- <1 second per commit processing time

### Implementation Steps
1. Build conventional commit parser
2. Create category mapping rules
3. Implement LLM fallback for ambiguous commits
4. Build batch categorization API
5. Create formatted release notes output
6. Add manual override capability
7. Build frontend category view with filtering

---

## UC-AI-010: Impact Assessment

### Description
AI analyzes release changes to predict which teams, services, APIs, and end users will be affected, generating a comprehensive impact report for deployment planning.

### Priority
**P0 (MVP - Phase 1)**

### Complexity
High

### Estimated Effort
5 days

### Business Value
- **Coordination:** Know which teams to notify before deploying
- **Risk Management:** Understand blast radius of each release
- **Planning:** Better deployment scheduling based on impact scope
- **Communication:** Auto-generate impact notifications to stakeholders

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/release-notes/impact

Request:
{
  releaseVersion: string,
  commits: Array<Commit>,
  serviceDependencyGraph: Graph | null
}

Response:
{
  impactSummary: string,
  affectedServices: Array<{
    service: string,
    impactLevel: "direct" | "downstream" | "potential",
    changes: string[],
    risk: "low" | "medium" | "high"
  }>,
  affectedTeams: Array<{
    team: string,
    reason: string,
    notificationPriority: "immediate" | "standard" | "informational"
  }>,
  affectedAPIs: Array<{
    endpoint: string,
    changeType: "added" | "modified" | "deprecated" | "removed",
    breakingChange: boolean,
    consumingServices: string[]
  }>,
  userImpact: {
    scope: "none" | "minimal" | "moderate" | "significant",
    description: string,
    affectedUserSegments: string[],
    requiresUserAction: boolean
  },
  deploymentRecommendations: string[]
}
```

#### Algorithm

**Step 1: File-to-Service Mapping**
```
Map changed files to services:
  src/services/auth/* → user-auth service
  src/services/payments/* → payments service
  helm-charts/*/app-values/* → infrastructure changes
```

**Step 2: Dependency Graph Traversal**
```
For each directly affected service:
  - Query service dependency graph
  - Identify downstream consumers
  - Calculate impact propagation depth
```

**Step 3: API Change Detection**
```
For changed API files:
  - Diff OpenAPI specs (before/after)
  - Identify added/modified/removed endpoints
  - Cross-reference with API consumer registry
```

**Step 4: LLM Impact Analysis**
```
Combine all data and send to LLM for:
  - Natural language impact summary
  - User-facing impact assessment
  - Deployment timing recommendations
```

#### LLM Prompt Template
```
You are a deployment planner assessing the impact of a software release.

Release: ${releaseVersion}
Services Changed: ${affectedServices.join(', ')}
API Changes: ${apiChanges.length} endpoints affected
Dependency Chain: ${dependencyDepth} levels deep

Changes Summary:
${categorizedChanges}

Service Dependencies:
${dependencyGraph}

Tasks:
1. Summarize overall impact in 2-3 sentences
2. Identify which teams need to be notified and why
3. Assess user-facing impact (none/minimal/moderate/significant)
4. Recommend deployment strategy (immediate/scheduled/staged)
5. List any prerequisite actions needed before deployment

Output format: JSON matching the response schema
```

### Dependencies
- Service dependency graph (from infrastructure config)
- OpenAPI specification files
- Team ownership registry
- Git repository access
- OpenAI/Anthropic API

### Success Metrics
- 90% accuracy in identifying affected services
- 85% accuracy in team notification routing
- 95% detection rate for breaking API changes
- <10 second analysis time per release

### Implementation Steps
1. Build file-to-service mapping engine
2. Integrate service dependency graph
3. Implement API change detection (OpenAPI diff)
4. Create team ownership registry integration
5. Design LLM impact analysis prompt
6. Build impact report API endpoint
7. Create frontend impact visualization
8. Add automatic notification triggers

---

## UC-AI-011: Natural Language Generation

### Description
Converts technical diffs, commit messages, and deployment data into natural, business-friendly language suitable for customer-facing release announcements and stakeholder communications.

### Priority
**P0 (MVP - Phase 1)**

### Complexity
Medium

### Estimated Effort
3 days

### Business Value
- **Communication:** Bridge the gap between technical and business teams
- **Marketing:** Auto-generate customer release announcements
- **Efficiency:** Eliminate manual rewriting of technical content
- **Consistency:** Uniform tone and style across all communications

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/release-notes/generate

Request:
{
  releaseVersion: string,
  technicalSummary: string,
  categorizedChanges: CategorizedChanges,
  targetAudience: "internal-engineering" | "internal-business" | "customer" | "marketing",
  tone: "formal" | "conversational" | "announcement",
  maxLength: number | null
}

Response:
{
  generatedContent: string,
  title: string,
  sections: Array<{
    heading: string,
    content: string
  }>,
  callToAction: string | null,
  metadata: {
    wordCount: number,
    readingTime: string,
    audience: string,
    tone: string
  }
}
```

#### Example Response
```json
{
  "generatedContent": "We're excited to announce Garuda.One v2.5.0! This release brings single sign-on support for enterprise teams, faster payment processing, and a snappier dashboard experience.\n\n**What's New:**\n- **Enterprise SSO:** Sign in using your company's Azure AD credentials — no separate password needed\n- **Faster Payments:** Transaction processing is now 40% faster\n- **Improved Dashboard:** Pages load in under 2 seconds\n\n**Bug Fixes:**\n- Fixed an issue where notifications were delayed by up to 5 minutes\n- Resolved a rare error when exporting reports to PDF\n\nNo action is needed on your part. These improvements are available immediately.",
  "title": "Garuda.One v2.5.0: Enterprise SSO, Faster Payments & More",
  "sections": [
    {
      "heading": "What's New",
      "content": "Enterprise SSO, faster payment processing, improved dashboard loading."
    },
    {
      "heading": "Bug Fixes",
      "content": "Notification delay fix, PDF export error resolution."
    }
  ],
  "callToAction": "Visit our documentation for details on configuring SSO for your organization.",
  "metadata": {
    "wordCount": 142,
    "readingTime": "1 min",
    "audience": "customer",
    "tone": "announcement"
  }
}
```

#### LLM Prompt Template
```
You are a technical writer creating a release announcement.

Target Audience: ${targetAudience}
Tone: ${tone}
${maxLength ? `Maximum Length: ${maxLength} words` : ''}

Technical Summary:
${technicalSummary}

Changes:
Features: ${features.map(f => f.description).join('; ')}
Bug Fixes: ${bugFixes.map(b => b.description).join('; ')}
Improvements: ${improvements.map(i => i.description).join('; ')}

Guidelines for ${targetAudience}:
${targetAudience === 'customer' ? `
- No technical jargon (no service names, API endpoints, database terms)
- Focus on user benefits and outcomes
- Use "you" and "your" language
- Include a call-to-action if relevant
- Keep it under 200 words
` : ''}
${targetAudience === 'internal-business' ? `
- Minimal technical detail
- Focus on business impact and KPIs
- Mention affected teams and timelines
- Include risk assessment
` : ''}
${targetAudience === 'marketing' ? `
- Exciting, benefit-focused language
- Suitable for blog post or email newsletter
- Include headline suggestions
- Social media snippets (Twitter, LinkedIn)
` : ''}

Output format: JSON matching the response schema
```

### Dependencies
- Categorized changes (from UC-AI-009)
- Impact assessment (from UC-AI-010)
- OpenAI/Anthropic API
- Template library for different output formats

### Success Metrics
- 90% user satisfaction with generated content
- <3 second generation time
- 85% of generated content used without major edits
- Consistent brand voice across releases

### Implementation Steps
1. Create `NLGService` in NestJS
2. Design audience-specific prompt templates
3. Implement tone and style controls
4. Build template library for output formats
5. Add manual editing workflow
6. Create API endpoint with validation
7. Build frontend preview and editing component
8. Add version history for generated content

---

## Summary

**Category 2: AI-Generated Release Notes** provides 5 AI-powered capabilities that automate the entire release documentation lifecycle:

1. **UC-AI-007: Smart Summarization** - Condenses commits into structured summaries (3 days)
2. **UC-AI-008: JIRA Ticket Enrichment** - Links changes to business requirements (4 days)
3. **UC-AI-009: Change Categorization** - Organizes changes by type (3 days)
4. **UC-AI-010: Impact Assessment** - Predicts who and what is affected (5 days)
5. **UC-AI-011: Natural Language Generation** - Creates audience-appropriate content (3 days)

**Total Effort:** 18 days (~3.5 weeks with 1 developer)

**Next:** See [category-03-predictive-analytics.md](./category-03-predictive-analytics.md) for Predictive Analytics use cases.
