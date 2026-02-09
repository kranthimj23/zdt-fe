# Category 5: Natural Language Interface

## Overview

This category contains **2 AI-powered use cases** that enable users to interact with the Garuda.One platform using natural language and voice commands, making deployment management accessible to non-technical stakeholders.

**Business Value:**
- Enable non-technical users to query deployment status and metrics
- Reduce learning curve for new platform users by 80%
- Provide hands-free platform interaction for on-call engineers
- Achieve 90%+ intent recognition accuracy for platform queries

---

## UC-AI-019: Conversational AI Assistant

### Description
ChatGPT-style conversational interface that understands natural language queries about deployments, environments, drift status, and release notes, executing platform actions through LLM function calling.

### Priority
**P2 (Phase 3)**

### Complexity
High

### Estimated Effort
8 days

### Business Value
- **Accessibility:** Anyone can query the platform without learning the UI
- **Speed:** Get answers in seconds instead of navigating multiple screens
- **Context:** Follow-up questions maintain conversation context
- **Actions:** Execute deployments and analysis through chat commands

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/chat

Request:
{
  message: string,
  conversationId: string | null,
  context: {
    currentProject: string | null,
    currentEnvironment: string | null,
    userRole: string
  }
}

Response:
{
  reply: string,
  conversationId: string,
  actions: Array<{
    type: string,
    description: string,
    requiresConfirmation: boolean,
    parameters: Record<string, any>
  }>,
  suggestedFollowUps: string[],
  sources: Array<{
    type: string,
    reference: string
  }>
}
```

#### Example Conversations

**Query 1: Status Check**
```
User: "What's deployed in UAT right now?"
Assistant: "In UAT, you currently have 12 services deployed:
- user-auth v2.4.1 (deployed 2 hours ago)
- payments v3.1.0 (deployed yesterday)
- dashboard v1.8.2 (deployed 3 days ago)
...

The most recent deployment was user-auth v2.4.1, deployed by @john.doe. All services are healthy with 0 alerts."

Suggested follow-ups:
- "Compare UAT with production"
- "Show me the drift between SIT and UAT"
- "When was the last deployment to production?"
```

**Query 2: Drift Analysis**
```
User: "Compare SIT vs PROD for the payments service"
Assistant: "I found 8 configuration differences between SIT and PROD for payments-service:

🔒 CRITICAL (2):
- API_RATE_LIMIT: 1000 (SIT) vs 100 (PROD) — PROD may be too restrictive
- DB_POOL_SIZE: 25 (SIT) vs 5 (PROD) — PROD pool is undersized

⚠️ MEDIUM (3):
- LOG_LEVEL: DEBUG (SIT) vs INFO (PROD) — Expected
- CACHE_TTL: 300 (SIT) vs 3600 (PROD) — Different caching strategy
- FEATURE_FLAG_BETA: true (SIT) vs false (PROD) — Expected

✅ LOW (3):
- Image tags, URLs — Expected environment differences

Risk Score: 6.5/10 — Review recommended before promotion."

Suggested follow-ups:
- "Generate a drift report"
- "Who changed the DB_POOL_SIZE in PROD?"
- "Create a remediation plan"
```

#### Function Calling Integration

**Available Functions:**
```typescript
const platformFunctions = [
  {
    name: 'get_deployment_status',
    description: 'Get current deployment status for an environment',
    parameters: {
      environment: { type: 'string', enum: ['dev', 'sit', 'uat', 'prod'] },
      projectId: { type: 'string' },
      service: { type: 'string', optional: true }
    }
  },
  {
    name: 'compare_environments',
    description: 'Compare configurations between two environments',
    parameters: {
      sourceEnv: { type: 'string' },
      targetEnv: { type: 'string' },
      service: { type: 'string', optional: true }
    }
  },
  {
    name: 'generate_release_notes',
    description: 'Generate release notes for a version',
    parameters: {
      releaseVersion: { type: 'string' },
      format: { type: 'string', enum: ['executive', 'technical', 'customer'] }
    }
  },
  {
    name: 'get_drift_report',
    description: 'Get drift analysis between environments',
    parameters: {
      sourceEnv: { type: 'string' },
      targetEnv: { type: 'string' }
    }
  },
  {
    name: 'get_deployment_history',
    description: 'Get deployment history for a service or environment',
    parameters: {
      environment: { type: 'string' },
      service: { type: 'string', optional: true },
      limit: { type: 'number', default: 10 }
    }
  },
  {
    name: 'predict_deployment_risk',
    description: 'Predict risk for a planned deployment',
    parameters: {
      releaseVersion: { type: 'string' },
      targetEnvironment: { type: 'string' }
    }
  }
];
```

#### LLM System Prompt
```
You are Garuda, an AI assistant for the Garuda.One deployment management platform.

Your capabilities:
- Check deployment status across environments (dev, sit, uat, prod)
- Compare configurations between environments (drift analysis)
- Generate release notes from Git commits
- Predict deployment risks
- Explain drift in plain English
- Suggest remediation for configuration issues

Guidelines:
- Be concise but thorough
- Use tables for comparing multiple items
- Use emojis for severity: 🔒 critical, ⚠️ medium, ✅ low
- Always suggest 2-3 follow-up actions
- If uncertain, ask clarifying questions
- Never execute destructive actions without explicit confirmation
- Respect user roles (read-only users can't trigger deployments)

When the user asks about deployments, environments, or configurations,
use the available functions to fetch real data before responding.
Do NOT make up deployment data.
```

### Dependencies
- Google Gemini 3 Pro (for function calling support)
- Anthropic Claude Opus 4.6 (alternative)
- Platform API access (all read endpoints)
- Redis for conversation context (1-hour TTL)
- PostgreSQL for conversation history
- WebSocket for streaming responses

### Success Metrics
- 90%+ intent recognition accuracy
- <3 second response time for simple queries
- <10 second response time for queries requiring function calls
- 85% user satisfaction rating
- 70% of queries resolved without UI navigation

### Implementation Steps
1. Design and implement LLM function calling registry
2. Create conversation context management service
3. Build chat API endpoint with streaming support
4. Implement platform function handlers
5. Design system prompt with few-shot examples
6. Build chat UI component (message bubbles, typing indicator)
7. Add conversation history and search
8. Implement role-based action restrictions
9. Add feedback mechanism (thumbs up/down)
10. Set up usage analytics and cost monitoring

---

## UC-AI-020: Voice Commands

### Description
Speech-to-text and text-to-speech integration that enables hands-free interaction with the platform, particularly useful for on-call engineers during incident response.

### Priority
**P2 (Phase 3)**

### Complexity
Medium

### Estimated Effort
5 days

### Business Value
- **Hands-Free:** Query platform status while handling incidents
- **Accessibility:** Support for users with visual impairments
- **Speed:** Faster than typing during high-pressure situations
- **Mobile:** Voice interaction for mobile app users

### Technical Implementation

#### API Endpoint
```typescript
POST /api/ai/voice/command

Request:
{
  audioBlob: Blob,
  format: "webm" | "wav" | "mp3",
  language: "en-US",
  conversationId: string | null
}

Response:
{
  transcript: string,
  confidence: number,
  intent: string,
  chatResponse: ChatResponse,
  audioResponse: {
    url: string,
    duration: number
  } | null,
  conversationId: string
}
```

#### Architecture

**Speech-to-Text Pipeline:**
```
User Audio → WebSocket → Google Cloud Speech-to-Text → Transcript
                                                  ↓
                                          Chat AI (UC-AI-019)
                                                  ↓
                                          Text Response
                                                  ↓
                                    Google Cloud Text-to-Speech → Audio Response
                                                  ↓
                                          WebSocket → User Speaker
```

**Voice Processing Steps:**
1. Capture audio via browser MediaRecorder API
2. Stream audio chunks via WebSocket
3. Transcribe with Google Cloud Speech-to-Text (or browser SpeechRecognition API)
4. Process transcript through Conversational AI (UC-AI-019)
5. Convert response to speech with Google Cloud Text-to-Speech
6. Stream audio response back to user

#### Voice Command Examples
```
"Hey Garuda, what's the status of production?"
→ Transcribed → Processed as chat query → Audio response

"Check if there's any drift between UAT and prod"
→ Triggers drift analysis → Reads summary aloud

"What's the risk score for deploying version 2.5 to production?"
→ Triggers risk prediction → Speaks risk assessment

"Roll back the payments service in UAT"
→ Requires confirmation → "I'll prepare the rollback. Please confirm by saying 'yes'."
```

#### LLM Prompt Addition for Voice
```
Additional guidelines for voice responses:
- Keep responses short (under 30 seconds when spoken)
- Use natural speaking patterns (avoid technical notation)
- Spell out numbers and abbreviations
- For complex data, summarize key points and offer to show details on screen
- Confirm destructive actions with "Please say 'confirm' to proceed"
```

### Dependencies
- Google Cloud Speech-to-Text API
- Google Cloud Text-to-Speech API
- Browser MediaRecorder API
- WebSocket for audio streaming
- Conversational AI (UC-AI-019) for intent processing

### Success Metrics
- 95% speech-to-text accuracy for platform-specific terms
- <2 second transcription latency
- <5 second total response time (speech-to-speech)
- 85% user satisfaction for voice interactions
- 90% intent recognition for voice commands

### Implementation Steps
1. Implement browser audio capture with MediaRecorder
2. Build WebSocket audio streaming service
3. Integrate Google Cloud Speech-to-Text for transcription
4. Connect transcript to chat AI pipeline (UC-AI-019)
5. Implement Google Cloud Text-to-Speech for response audio
6. Build voice UI component (waveform, push-to-talk)
7. Add wake word detection ("Hey Garuda")
8. Optimize for platform-specific vocabulary
9. Add noise cancellation and audio preprocessing
10. Test with various accents and speaking styles

---

## Summary

**Category 5: Natural Language Interface** provides 2 AI-powered capabilities that make the platform accessible through conversation:

1. **UC-AI-019: Conversational AI Assistant** - Chat interface with function calling (8 days)
2. **UC-AI-020: Voice Commands** - Speech-to-text platform interaction (5 days)

**Total Effort:** 13 days (~2.5 weeks with 1 developer)

**Next:** See [category-06-intelligent-automation.md](./category-06-intelligent-automation.md) for Intelligent Automation use cases.
