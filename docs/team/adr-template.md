# Architecture Decision Record (ADR) Template

| Field | Value |
|-------|-------|
| **Document ID** | TEAM-007 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Approved By** | [CTO] |

---

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | Vanilla JS over frontend framework | Accepted | 2026 |
| ADR-002 | Supabase over custom backend | Accepted | 2026 |
| ADR-003 | Netlify over Vercel | Accepted | 2026 |
| ADR-004 | Self-host dependencies (Supabase JS, fonts) | Accepted | 2026 |

---

## ADR-001: Vanilla JS over Frontend Framework

**Date:** 2026  
**Status:** Accepted  
**Decision Makers:** [Founding Team]

### Context
Need to choose frontend technology for the Metups marketplace PWA.

### Decision
Use vanilla JavaScript with ES Modules, no framework (no React, Vue, Svelte).

### Reasoning
- No build step required — deploy by simply uploading static files
- Faster initial page loads critical for 3G connections in Zimbabwe
- Zero framework dependency risk (React/Vue breaking changes)
- Small team — no need for component abstraction at this scale
- PWA Service Worker works naturally with static assets

### Consequences
- More boilerplate for repeated UI patterns
- No state management — manual DOM updates
- Harder to onboard React/Vue-experienced developers

### Alternatives Considered
- React: Overkill; requires build tooling; heavier bundle
- Vue 3: Similar concerns; adds complexity without clear benefit at this scale
- Svelte: Interesting but small ecosystem and less hiring pool

---

## ADR-002: Supabase over Custom Backend

**Date:** 2026  
**Status:** Accepted  
**Decision Makers:** [Founding Team]

### Context
Need backend for database, authentication, and file storage.

### Decision
Use Supabase (Backend-as-a-Service) instead of building a custom Node.js/Python backend.

### Reasoning
- Row Level Security provides robust access control at database level
- Built-in auth eliminates risk of rolling our own (bcrypt, JWT, OAuth)
- Realtime subscriptions for chat without building WebSocket infrastructure
- PostgreSQL gives us full SQL power as we grow
- Generous free tier for early-stage development
- Significantly faster time-to-market

### Consequences
- Platform dependency on Supabase availability
- Limited ability to add custom business logic (no server-side code beyond DB functions)
- Costs increase at scale compared to self-hosted PostgreSQL

### Alternatives Considered
- Firebase: Vendor lock-in; Firestore less flexible than SQL
- Custom Express/Node: Significant development and ops overhead
- PocketBase: Less mature; smaller ecosystem

---

## ADR-003: Netlify over Vercel

**Date:** 2026  
**Status:** Accepted

### Context
Need static hosting + CDN for the PWA.

### Decision
Deploy to Netlify.

### Reasoning
- `netlify.toml` is well-documented for header and redirect configuration
- Excellent PWA/service worker support
- DX is slightly simpler for static-only sites
- Both are equivalent for our needs

### Consequences
- Minor: Netlify and Vercel are both excellent; this is a low-stakes decision

---

## ADR-004: Self-Host Dependencies

**Date:** 2026  
**Status:** Accepted

### Context
Frontend dependencies (Supabase JS, Font Awesome, fonts) could be loaded from CDNs.

### Decision
Self-host all dependencies in the repository and serve them locally.

### Reasoning
- Zimbabwean users often have limited or inconsistent mobile data — local serving avoids CDN latency
- Eliminates supply chain risk (compromised CDN delivering malicious JS)
- PWA offline mode requires local assets to cache
- No dependency on third-party CDN availability

### Consequences
- Larger repository (woff2 font files)
- Must manually update dependencies — no automatic CDN version bumps
- This is a deliberate trade-off: security and reliability over convenience

---

## Template for New ADRs

```markdown
## ADR-[NNN]: [Title]

**Date:** [DATE]
**Status:** Proposed / Accepted / Deprecated / Superseded by ADR-[NNN]
**Decision Makers:** [NAMES / ROLES]

### Context
[What is the issue that necessitates this decision?]

### Decision
[What was decided?]

### Reasoning
[Why was this decision made?]
- Bullet points of key factors

### Consequences
[What are the trade-offs and implications?]
- Positive and negative consequences

### Alternatives Considered
[What other options were evaluated and why they were rejected?]
```
