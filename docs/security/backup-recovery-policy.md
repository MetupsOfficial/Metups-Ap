# Backup and Recovery Policy

| Field | Value |
|-------|-------|
| **Document ID** | SEC-006 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## 1. Purpose

This policy defines backup schedules, retention, and recovery procedures for Metups data to ensure business continuity and data integrity.

---

## 2. Data Assets

| Asset | Platform | Backup Responsibility |
|-------|---------|----------------------|
| PostgreSQL database | Supabase | Supabase (automated) + periodic manual exports |
| File storage (images) | Supabase Storage | Supabase (automated) |
| Application source code | GitHub | GitHub (distributed + remote) |
| Configuration files | GitHub (private) | GitHub |
| Environment variables | Cloudflare / Supabase | Metups team (documented) |

---

## 3. Backup Schedule

### Supabase Database (Automated)
| Plan | Backup Frequency | Retention | PITR |
|------|-----------------|-----------|------|
| Supabase Free | Daily | 7 days | No |
| Supabase Pro | Daily | 7 days | Yes (7 days) |
| Supabase Team | Daily | 14 days | Yes (14 days) |

**Action:** Upgrade to Supabase Pro at minimum before reaching 1,000 users to enable Point-in-Time Recovery (PITR).

### Manual Database Exports
- Frequency: Weekly
- Method: `supabase db dump` or Supabase dashboard export
- Storage: Encrypted, stored in [LOCATION — e.g., S3 bucket, encrypted drive]
- Retention: 90 days

### Source Code
- GitHub provides distributed version control
- All production-critical code must be pushed to GitHub before deployment
- No code exists only on local machines

---

## 4. Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Minor data corruption | 1 hour | 24 hours |
| Database failure | 2 hours | 1 hour (with PITR) |
| Complete environment loss | 4 hours | 24 hours |
| Malicious data deletion | 4 hours | 7 days |

**RTO** = Recovery Time Objective (how quickly systems are restored)  
**RPO** = Recovery Point Objective (maximum acceptable data loss)

---

## 5. Recovery Procedures

### Database Recovery from Supabase Backup
1. Log into Supabase dashboard → Project → Settings → Backups
2. Select the backup point to restore to
3. Click "Restore" and confirm
4. Verify data integrity after restoration
5. Notify team of restoration and any data loss window

### Full Environment Recreation
If the Supabase project is unrecoverable:
1. Create a new Supabase project
2. Restore from latest manual export: `supabase db push`
3. Re-configure environment variables (from secure storage)
4. Re-deploy application from GitHub to Cloudflare
5. DNS update if new Supabase URL
6. Test critical paths before re-enabling user access

See [Disaster Recovery Guide](../technical/disaster-recovery.md) for full procedure.

---

## 6. Backup Testing

| Test | Frequency | Responsible |
|------|-----------|-------------|
| Verify backup exists and is accessible | Monthly | Engineering |
| Test database restoration to non-production | Quarterly | Engineering |
| Full disaster recovery drill | Annually | Engineering + CTO |
