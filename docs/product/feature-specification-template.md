# Feature Specification Template

| Field | Value |
|-------|-------|
| **Document ID** | FEAT-[NNN] |
| **Feature Name** | [FEATURE NAME] |
| **Version** | 1.0.0 |
| **Owner** | [PRODUCT MANAGER / ENGINEER] |
| **Status** | Draft / In Review / Approved / In Development / Done |
| **Target Release** | v[X.Y.Z] — [DATE] |
| **Approved By** | [CTO / CPO] |

---

## Problem Statement

[1–3 sentences describing the user problem this feature solves. Why does it matter?]

---

## Solution Overview

[1–3 sentences describing what we're building and how it solves the problem.]

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-1 | Buyer | [action] | [benefit] |
| US-2 | Seller | [action] | [benefit] |

---

## Acceptance Criteria

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Edge case handled]
- [ ] [Error state handled]
- [ ] [Mobile responsive]
- [ ] [Accessible (WCAG 2.1 AA)]

---

## Technical Specification

### New Database Changes
```sql
-- Any new tables, columns, or indexes
ALTER TABLE [TABLE] ADD COLUMN [COLUMN] [TYPE];
```

### New RLS Policies
```sql
-- Any new Row Level Security policies
CREATE POLICY "[policy_name]" ON [table]
  FOR [operation] TO authenticated
  USING ([condition]);
```

### API / Supabase Calls
```javascript
// New Supabase queries required
const { data } = await supabaseClient
  .from('[table]')
  .select('[columns]')
  .eq('[condition]');
```

### New Files
| File | Purpose |
|------|---------|
| `frontend/features/[feature]/[file].html` | [Purpose] |
| `frontend/features/[feature]/[file].js` | [Purpose] |

---

## Design

[Link to Figma or wireframes — or describe the UI in text]

---

## Out of Scope

[Explicitly list what is NOT included in this feature to prevent scope creep]

- [Out of scope item 1]
- [Out of scope item 2]

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| [Risk] | Low/Med/High | Low/Med/High | [Action] |

---

## Testing Plan

- [ ] Happy path tested
- [ ] Error states tested
- [ ] Mobile (Android Chrome) tested
- [ ] Mobile (iOS Safari) tested
- [ ] Offline behaviour tested
- [ ] Performance acceptable (<3s on 3G)

---

## Rollout Plan

- [ ] Feature flag: [Yes/No]
- [ ] Gradual rollout: [Yes/No — if yes, describe]
- [ ] Communications: [In-app notice / Email / None]
- [ ] Help Center article needed: [Yes/No]

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | [DATE] | [NAME] | Initial spec |
