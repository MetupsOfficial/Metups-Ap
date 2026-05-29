# Data Processing Agreement (DPA)

| Field | Value |
|-------|-------|
| **Document ID** | LEGAL-006 |
| **Version** | 1.0.0 |
| **Owner** | Legal / Compliance |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2027-05-29 |
| **Approved By** | [CEO / Legal Counsel] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Legal Team] | Initial release |

---

## Parties

**Data Controller (Controller):**  
[COMPANY LEGAL NAME] ("Metups"), registration [REG NUMBER], [ADDRESS], Zimbabwe

**Data Processor (Processor):**  
[PROCESSOR COMPANY NAME], [PROCESSOR ADDRESS]

*(This template is to be executed with each third-party processor. Current processors: Supabase Inc., Netlify Inc., [EMAIL PROVIDER].)*

---

## 1. Definitions

- **"Personal Data"** means any information relating to an identified or identifiable natural person
- **"Processing"** means any operation performed on Personal Data
- **"Data Subject"** means the individual whose Personal Data is processed
- **"Applicable Data Protection Law"** means GDPR, POPIA, and any other applicable legislation

---

## 2. Scope and Purpose

2.1 The Processor shall process Personal Data only as instructed by the Controller and for the purposes set out in **Schedule A** of this Agreement.  
2.2 The Processor shall not process Personal Data for its own purposes.  

---

## 3. Processor Obligations

The Processor shall:

- [ ] Process Personal Data only on documented instructions from the Controller
- [ ] Ensure persons authorised to process data are bound by confidentiality obligations
- [ ] Implement appropriate technical and organisational security measures (Article 32 GDPR)
- [ ] Assist the Controller in responding to Data Subject rights requests
- [ ] Notify the Controller within **72 hours** of becoming aware of a Personal Data breach
- [ ] Delete or return all Personal Data upon termination of the Agreement
- [ ] Provide all information necessary to demonstrate compliance with this Agreement
- [ ] Allow and contribute to audits conducted by the Controller

---

## 4. Sub-processors

4.1 The Processor shall not engage sub-processors without prior written authorisation from the Controller.  
4.2 Current approved sub-processors are listed in **Schedule B**.  
4.3 The Processor remains liable for sub-processors' compliance.  

---

## 5. International Transfers

5.1 The Processor shall not transfer Personal Data outside the EEA/Zimbabwe without appropriate safeguards.  
5.2 Where transfers occur, the parties agree to execute Standard Contractual Clauses (SCCs) as required.  

---

## 6. Security Measures

The Processor shall implement at minimum:
- Encryption of Personal Data at rest and in transit (TLS 1.2+)
- Access controls and principle of least privilege
- Regular security testing and vulnerability assessments
- Incident detection and response capabilities
- Business continuity and backup procedures

---

## 7. Audit Rights

The Controller may audit the Processor's compliance with this Agreement no more than once per year, with 30 days' notice, during business hours.

---

## 8. Liability

Each party's liability under this Agreement is subject to the limitations in the master services agreement between the parties.

---

## 9. Term and Termination

This Agreement remains in force for the duration of the services agreement and terminates automatically upon its expiry or termination.

---

## Schedule A — Processing Activities

| Activity | Personal Data Categories | Data Subjects | Retention |
|----------|------------------------|--------------|-----------|
| User authentication | Email, password hash, OAuth tokens | Registered users | Account lifetime |
| Product listings | Photos, description, location | Registered sellers | 2 years post-deactivation |
| In-app messaging | Message content, timestamps | Registered users | 1 year |
| File storage | Profile photos, listing images | Registered users | Account lifetime |

---

## Schedule B — Approved Sub-processors

| Sub-processor | Location | Purpose |
|---------------|---------|---------|
| Amazon Web Services (via Supabase) | USA | Database, storage infrastructure |
| [CDN PROVIDER] | [LOCATION] | Content delivery |

---

## Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Controller Representative | [NAME] | __________ | [DATE] |
| Processor Representative | [NAME] | __________ | [DATE] |
