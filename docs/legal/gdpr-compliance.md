# GDPR Compliance Statement

| Field | Value |
|-------|-------|
| **Document ID** | LEGAL-009 |
| **Version** | 1.0.0 |
| **Owner** | Legal / Compliance / DPO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2027-05-29 |
| **Approved By** | [DPO / CEO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [DPO] | Initial release |

---

## 1. Applicability

The General Data Protection Regulation (EU) 2016/679 ("GDPR") applies to Metups where we process personal data of individuals located in the European Union or United Kingdom, regardless of where Metups operates. This statement documents our compliance posture.

*Note: While Metups is primarily a Zimbabwean platform, GDPR applies if EU/UK users access the service.*

---

## 2. Legal Bases for Processing

We process personal data under the following GDPR legal bases:

| Processing Activity | Legal Basis | Article |
|--------------------|------------|---------|
| Account creation and management | Contract performance | Art. 6(1)(b) |
| Listing display and marketplace operations | Contract performance | Art. 6(1)(b) |
| In-app messaging | Contract performance | Art. 6(1)(b) |
| Fraud prevention | Legitimate interests | Art. 6(1)(f) |
| Marketing emails | Consent | Art. 6(1)(a) |
| Location-based services | Consent | Art. 6(1)(a) |
| Legal compliance (tax, law enforcement) | Legal obligation | Art. 6(1)(c) |

---

## 3. Data Subject Rights Implementation

| Right | Implementation Status | Method |
|-------|----------------------|--------|
| Right of access (Art. 15) | ✅ Implemented | Email request to privacy@metups.com |
| Right to rectification (Art. 16) | ✅ Implemented | Self-service via Settings, or email |
| Right to erasure (Art. 17) | ✅ Implemented | Settings → Delete Account, or email |
| Right to restriction (Art. 18) | ✅ Implemented | Email request |
| Right to portability (Art. 20) | ✅ Implemented | Data export via email request |
| Right to object (Art. 21) | ✅ Implemented | Email request |
| Rights re: automated decisions (Art. 22) | ✅ N/A — no automated decisions affecting legal rights |

Response target: **30 days** from verified request.

---

## 4. Data Protection by Design and Default

- [ ] Minimal data collection — only data necessary for service operation
- [ ] Default privacy settings are most restrictive
- [ ] Supabase Row Level Security (RLS) enforced on all database tables
- [ ] Passwords never stored — Supabase Auth handles hashing (bcrypt)
- [ ] Profile data not indexed publicly
- [ ] Phone numbers not displayed to other users

---

## 5. Data Protection Impact Assessments (DPIA)

| Feature | DPIA Required | Status |
|---------|--------------|--------|
| Location-based listing display | Yes — geolocation data | [Completed / Pending] |
| User rating system | Yes — reputation data | [Completed / Pending] |
| In-app messaging | Yes — communication content | [Completed / Pending] |

---

## 6. International Transfers

| Transfer | Mechanism | Status |
|----------|----------|--------|
| Data to Supabase (USA) | Standard Contractual Clauses | [In place] |
| Data to Cloudflare (USA) | Standard Contractual Clauses | [In place] |
| Data to Google (OAuth) | SCCs + Google DPA | [In place] |

---

## 7. Data Protection Officer

**DPO Name:** [DPO NAME]  
**Contact:** dpo@metups.com  
**Appointed:** [DATE]

---

## 8. Breach Notification

In the event of a personal data breach:
- Supervisory authority notified within **72 hours** where feasible (Art. 33)
- Affected data subjects notified without undue delay where high risk (Art. 34)
- See [Data Breach Response Procedure](../security/data-breach-response.md)

---

## 9. Records of Processing Activities (RoPA)

Maintained internally per Art. 30. Available to supervisory authorities upon request.

---

## 10. Supervisory Authority

EU users may contact their national supervisory authority. UK users may contact the Information Commissioner's Office (ICO) at ico.org.uk.

---

## Compliance Checklist

- [ ] Privacy Policy published and accessible
- [ ] Cookie consent mechanism implemented
- [ ] DPA executed with all processors
- [ ] DPIA completed for high-risk processing
- [ ] DPO appointed and contactable
- [ ] Data subject rights process documented and tested
- [ ] Breach response procedure in place
- [ ] RoPA maintained and up to date
- [ ] Staff trained on GDPR obligations
- [ ] SCCs executed with US-based processors
