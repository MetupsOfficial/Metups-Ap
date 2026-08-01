# Developer Onboarding Guide

| Field | Value |
|-------|-------|
| **Document ID** | TEAM-001 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [CTO] | Initial guide |

---

## Welcome to the Metups Engineering Team

This guide will get you productive in your first week.

---

## Week 1 Checklist

### Day 1 — Access and Setup
- [ ] Receive company email: [YOUR_NAME]@metups.com
- [ ] Enable MFA on company email
- [ ] Receive GitHub invitation and accept
- [ ] Enable MFA on GitHub
- [ ] Receive Supabase dashboard invitation (if applicable to your role)
- [ ] Enable MFA on Supabase
- [ ] Receive Cloudflare dashboard invitation (if applicable)
- [ ] Join team communication channels ([Slack/Teams/WhatsApp])
- [ ] Clone the repository:
  ```bash
  git clone https://github.com/[ORG]/Metups-Ap.git
  cd Metups-Ap
  ```

### Day 1 — Local Setup
- [ ] Set up a development Supabase project (free account)
- [ ] Run migration SQL on your dev project
- [ ] Update `frontend/assets/js/supabase.js` with your dev credentials
- [ ] Start a local server and confirm app runs
- [ ] Sign up as a test user

### Day 2 — Codebase Orientation
- [ ] Read [Architecture Documentation](../technical/architecture.md)
- [ ] Read [Database Documentation](../technical/database-documentation.md)
- [ ] Read [Security Policy](../security/security-policy.md)
- [ ] Walk through the codebase with your onboarding buddy

### Day 3–5 — First Task
- [ ] Pick up a `good-first-issue` ticket from [TICKETING SYSTEM]
- [ ] Create a feature branch following [Branching Strategy](branching-strategy.md)
- [ ] Open your first PR
- [ ] Code review with team member
- [ ] Deploy to staging

---

## Development Environment

### Prerequisites
- Chrome (latest) or Firefox
- Git
- A text editor (VS Code recommended)
- Node.js (only needed for linting tools — no build step)

### No Build Step Required
Metups is vanilla HTML/CSS/JS. Open `frontend/index.html` directly in a browser, or use a local server:

```bash
# Option 1: Python
python3 -m http.server 8080 --directory src

# Option 2: Node.js (npx)
npx serve src

# Option 3: VS Code Live Server extension
# Right-click frontend/index.html → "Open with Live Server"
```

---

## Code Standards

Read [Coding Standards](coding-standards.md) before writing any code.

Key principles:
- Vanilla JS — no frameworks, no build tools
- ES Modules (`import/export`) for code organisation
- Supabase client singleton from `shared/supabase.js`
- All DB access uses `supabaseClient` — never raw fetch to Supabase
- RLS enforced at DB level — don't re-implement auth checks in JS that RLS already handles

---

## Git Workflow

See [Branching Strategy](branching-strategy.md) for full details.

```bash
# Start a new feature
git checkout main && git pull
git checkout -b feature/your-feature-name

# Commit
git add [specific files]
git commit -m "feat: descriptive message"

# Push and open PR
git push origin feature/your-feature-name
# Open PR on GitHub against main
```

---

## Important Policies to Read

- [ ] [Security Policy](../security/security-policy.md) — **mandatory reading**
- [ ] [Acceptable Use Policy](../legal/acceptable-use-policy.md)
- [ ] [Code Review Guidelines](code-review-guidelines.md)
- [ ] [Branching Strategy](branching-strategy.md)
- [ ] [Password Policy](../security/password-policy.md)

---

## Key Contacts

| Role | Name | Contact |
|------|------|---------|
| CTO / Engineering Lead | [NAME] | [EMAIL] |
| Your Onboarding Buddy | [NAME] | [EMAIL] |
| CX (for user questions) | [NAME] | support@metups.com |

---

## Frequently Asked Questions (Dev)

**Q: Why no build step?**  
A: Deliberate choice for simplicity and fast iteration. Static HTML/JS deploys in seconds, runs on any device, and has no dependency on npm or bundler availability. See ADR-001.

**Q: Why Supabase instead of a custom backend?**  
A: Speed to market and built-in RLS security. See ADR-002.

**Q: How do I access production data?**  
A: Production Supabase access requires CTO approval. Development uses a separate project. See [Access Control Policy](../security/access-control-policy.md).

**Q: Who approves PRs?**  
A: CTO or designated senior engineer. No self-merging to main.
