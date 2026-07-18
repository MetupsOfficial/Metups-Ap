# Monitoring Checklist

| Field | Value |
|-------|-------|
| **Document ID** | OPS-004 |
| **Version** | 1.0.0 |
| **Owner** | Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Approved By** | [CTO] |

---

## Monitoring Stack

| Tool | Purpose | URL |
|------|---------|-----|
| Cloudflare Dashboard | Deploy status, bandwidth, errors | dash.cloudflare.com |
| Supabase Dashboard | DB, Auth, Storage metrics | app.supabase.com |
| [UptimeRobot / Better Uptime] | Availability alerts | [TOOL URL] |
| [Sentry — optional] | JS error tracking | [TOOL URL] |
| Supabase Status | Platform status | status.supabase.com |
| Cloudflare Status | Platform status | www.cloudflarestatus.com |

---

## Key Metrics Dashboard

### Availability
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Platform uptime | ≥ 99.5% | — | ☐ |
| API availability | ≥ 99.5% | — | ☐ |
| Auth service | ≥ 99.9% | — | ☐ |

### Performance
| Metric | Target | Notes |
|--------|--------|-------|
| Page load time (3G) | < 3 seconds | Run Lighthouse monthly |
| Time to interactive | < 5 seconds | |
| Lighthouse performance | ≥ 80 | |
| Lighthouse PWA | ≥ 90 | |

### Business Metrics (Weekly Review)
| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| New user signups | — | — | — |
| Active listings | — | — | — |
| Messages sent | — | — | — |
| Listings marked sold | — | — | — |
| Support tickets | — | — | — |

---

## Alert Thresholds

| Alert | Threshold | Action |
|-------|-----------|--------|
| Platform unreachable | 1 failed check | Page on-call immediately |
| Auth failures >50/hour | Any single IP | Investigate + consider block |
| 5xx errors >5% | 10-minute window | Investigate + consider rollback |
| Storage usage >80% | — | Upgrade plan |
| DB size >80% of limit | — | Upgrade plan |
| New signups >500/hour | Unusual spike | Investigate for bot activity |

---

## Monitoring Setup Checklist

- [ ] UptimeRobot (or equivalent) configured for https://metups.com
- [ ] Alert email: ops@metups.com
- [ ] Alert escalation: CTO mobile (for P1)
- [ ] Supabase email alerts enabled for quota warnings
- [ ] Cloudflare deploy notifications to #deployments Slack channel
- [ ] Monthly Lighthouse audit scheduled

---

## Monthly Monitoring Review

| Item | Review |
|------|--------|
| Uptime % for month | [VALUE] |
| Average response time | [VALUE] |
| Errors logged | [COUNT] |
| Support ticket volume | [COUNT] |
| Database growth (MB) | [VALUE] |
| Storage usage | [VALUE] |
| Bandwidth used | [VALUE] |
| Incidents this month | [COUNT] |
