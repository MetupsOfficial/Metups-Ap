# Security Monitoring Procedure

| Field | Value |
|-------|-------|
| **Document ID** | SEC-009 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Security Lead |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## 1. Monitoring Stack

| Tool | Purpose | Coverage |
|------|---------|---------|
| Supabase Dashboard | Auth events, DB queries, API usage | Database + Auth |
| Cloudflare Analytics | Traffic, error rates, bandwidth | CDN/hosting |
| [UPTIME MONITOR — e.g., UptimeRobot, Better Uptime] | Service availability | Platform uptime |
| [ERROR TRACKER — e.g., Sentry] | JavaScript errors, crashes | Frontend |
| [OPTIONAL: Grafana / Datadog] | Custom metrics and dashboards | All systems |

---

## 2. Key Metrics to Monitor

### Authentication Security
| Signal | Normal | Alert Threshold |
|--------|--------|----------------|
| Failed login attempts per user | <5/hour | >20/hour |
| Failed logins per IP | <10/hour | >50/hour |
| New account registrations | <100/hour | >500/hour (potential bot) |
| Password reset requests | <20/hour | >100/hour |

### Application Health
| Signal | Normal | Alert Threshold |
|--------|--------|----------------|
| 5XX error rate | <1% | >5% |
| API response time | <500ms | >2000ms |
| Service availability | >99.5% | <99% |

### Data Access
| Signal | Alert Trigger |
|--------|--------------|
| Mass data export via API | Any bulk download >1000 records |
| Unusual access patterns | Access from unexpected geographies |
| RLS policy violations | Any violation should not occur — investigate immediately |

---

## 3. Monitoring Schedule

| Activity | Frequency | Responsible |
|----------|-----------|-------------|
| Review Supabase auth logs | Daily | On-call engineer |
| Review error rates | Daily | On-call engineer |
| Check uptime monitor | Automated (continuous) | [TOOL] |
| Review weekly traffic anomalies | Weekly | CTO |
| Security posture review | Monthly | Security Lead |

---

## 4. Alert Response

| Alert | Response |
|-------|---------|
| Uptime alert (service down) | Page on-call engineer → investigate within 15 minutes |
| High failed login rate | Review IPs → consider temporary block → log |
| Mass data access | Immediate investigation → possible containment |
| 5XX spike | Check Supabase status + Cloudflare status → rollback if needed |

---

## 5. Log Retention

| Log Type | Retention |
|---------|-----------|
| Supabase auth logs | 7–90 days (depends on plan) |
| Cloudflare access logs | 30 days |
| Application error logs | 30 days |
| Security incident logs | 3 years |

---

## 6. On-Call Rotation

| Role | Primary | Backup |
|------|---------|--------|
| On-call engineer | [NAME] | [NAME] |
| Security incident | CTO | [BACKUP] |

**Escalation:** If unresolvable in 30 minutes → escalate to CTO.
