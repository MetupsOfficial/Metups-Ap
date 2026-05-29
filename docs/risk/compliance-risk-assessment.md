# Compliance Risk Assessment

| Field | Value |
|-------|-------|
| **Document ID** | RISK-004 |
| **Version** | 1.0.0 |
| **Owner** | Legal / CEO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO / Legal Counsel] |
| **Classification** | Confidential |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Legal] | Initial assessment |

---

## Applicable Regulations

| Regulation | Jurisdiction | Applicability | Priority |
|-----------|-------------|--------------|---------|
| Zimbabwe Data Protection Act (pending) | Zimbabwe | Primary | Monitor |
| POPIA (Protection of Personal Information Act) | South Africa | High (SA users) | High |
| GDPR | EU / UK | Medium (EU/UK users) | Medium |
| Zimbabwe Electronic Commerce Act | Zimbabwe | High (marketplace) | High |
| Consumer Protection (Zimbabwe) | Zimbabwe | High | High |
| Competition laws (Zimbabwe) | Zimbabwe | Low (early stage) | Low |

---

## 1. Zimbabwe Regulatory Compliance

### 1.1 Cyber and Data Security Act (CDSA) 2021
**Status:** Partially applicable  
**Requirements:** Cybersecurity standards; data breach notification  
**Metups status:**
- [ ] Review CDSA requirements with Zimbabwean legal counsel
- [ ] Register with POTRAZ if required
- [ ] Ensure breach notification procedure aligns with CDSA

### 1.2 Electronic Commerce Act
**Status:** Applicable  
**Requirements:** Electronic contracts are valid; consumer protection for online transactions  
**Metups status:**
- ✅ Terms of Service clearly govern the platform
- ✅ Disclaimers clearly state Metups is not party to transactions
- [ ] Review with Zimbabwean legal counsel for full compliance

### 1.3 Consumer Protection Legislation
**Requirements:** Fair trading, honest advertising, dispute resolution  
**Metups status:**
- ✅ Terms of Service include dispute resolution clause
- ✅ Acceptable Use Policy prevents fraudulent listings
- ✅ Complaint handling procedure in place

---

## 2. POPIA Compliance

**Compliance status:** Partially compliant  
**Key gaps:**

| Gap | Risk | Action | Due |
|-----|------|--------|-----|
| Information Officer not formally appointed | High | Appoint and register | 2026-06-30 |
| PAIA manual not updated | Medium | Update with Metups data practices | 2026-07-31 |
| DPA not executed with all processors | High | Execute DPAs with Supabase, Netlify | 2026-06-30 |
| Staff POPIA training not completed | Medium | Complete training | 2026-06-30 |

---

## 3. GDPR Compliance

**Applicability:** Moderate — EU users may access the platform  
**Compliance status:** Partially compliant

| Gap | Risk | Action | Due |
|-----|------|--------|-----|
| DPO not appointed if >250 employees (N/A) | N/A | — | — |
| SCCs not executed for US data transfers | High | Execute SCCs with Supabase, Netlify | 2026-06-30 |
| DPIA not completed for geolocation | Medium | Complete DPIA | 2026-07-31 |
| Cookie consent banner not implemented | Medium | Implement cookie consent | 2026-06-30 |

---

## 4. Intellectual Property Compliance

| Risk | Control |
|------|---------|
| User posts copyrighted content (images, music) | Copyright Notice; DMCA-like takedown process |
| Metups name/logo infringement | Trademark registration (planned) |
| Open source licence compliance | Licences documented in Copyright Notice |

**Action:** Implement a copyright takedown process (DMCA-style) before scaling:
- Email: legal@metups.com with DMCA notice format
- Response within 5 business days
- Counter-notice procedure

---

## 5. Compliance Calendar

| Activity | Frequency | Next Due |
|----------|-----------|---------|
| Legal document review (ToS, Privacy Policy) | Annually | 2027-05-29 |
| DPA renewal/review | Annually | 2027-05-29 |
| POPIA Information Officer renewal | Annually | [DATE] |
| Regulatory change monitoring | Quarterly | 2026-08-29 |
| Staff compliance training | Annually | 2026-05-29 |
| IP audit | Annually | 2027-05-29 |

---

## 6. Compliance Budget Estimate

| Item | Estimated Cost (Annual) |
|------|------------------------|
| Zimbabwean legal counsel (retainer) | USD [AMOUNT] |
| POPIA Information Officer registration | ZAR [AMOUNT] |
| GDPR/data protection consultant | USD [AMOUNT] |
| Trademark registration (Zimbabwe) | USD [AMOUNT] |
| **Total** | USD [TOTAL] |
