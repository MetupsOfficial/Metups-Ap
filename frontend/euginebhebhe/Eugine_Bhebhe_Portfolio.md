# Eugine Bhebhe — Portfolio

## Who I Am

I am a 20-year-old Computer Engineering student at the University of Zimbabwe (Honours in Computer Engineering, Part 2.1) and a solo developer building real products for real Zimbabweans.

I do not wait for opportunities to build. I identify problems in my environment, architect solutions, and ship them — alone, under resource constraints, and at a level of technical depth that most teams take months to reach.

I work across the full stack: mobile, web, backend, database, infrastructure, and business. I have built and launched two independent products simultaneously while studying full-time and leading the technical development of a university research project.

---

## Projects

---

### 1. Metups Zimbabwe
**Zimbabwe's First Dedicated Second-Hand Marketplace**
`metups.com` · Sole Founder & Solo Developer · 2025–Present

#### What It Is

Metups is a mobile-first progressive web application (PWA) that connects buyers and sellers of second-hand goods across Zimbabwe. No download required, no fees, no middleman. It works on any smartphone, including on slow mobile data connections common in Zimbabwe.

The platform solves a genuine market gap: Zimbabwe has no dedicated second-hand marketplace. Buyers and sellers rely on fragmented WhatsApp groups with no search, no trust system, and no structure. Metups replaces that with a structured, searchable, location-aware platform built specifically for the Zimbabwean context.

#### What I Built — Alone

**Frontend**
- Full progressive web application in plain HTML, CSS, and vanilla JavaScript — no framework overhead, optimised for low-bandwidth connections
- Mobile-first responsive layout with a custom sidebar navigation system, filter chip bar, and advanced filter drawer
- Fuzzy search engine with Levenshtein distance and trigram matching implemented from scratch
- PersonaEngine — a session affinity system that learns user preferences and adjusts listing rankings in real-time without requiring login
- SmartSuggest autocomplete system with debounced query processing
- Full PWA implementation: service worker, offline capability, manifest, installable on Android home screen

**Backend & Database**
- Supabase (PostgreSQL) backend with over 15 relational tables
- Row Level Security (RLS) policies on every table
- Custom SQL functions and RPCs for search, filtering, ranking, and analytics
- pgcrypto-based authentication for admin sessions
- Custom analytics views: DAU tracking, cohort retention, GMV calculation, supply/demand analysis, seller response time, geographic distribution

**Admin System**
- Full custom admin dashboard — not an off-the-shelf solution
- Role-based access control across four tiers: Super Admin, Admin, Moderator, Analyst
- Ten custom admin RPCs: login, session verification, logout, analytics, user management, listing management, moderation, audit log, admin management, supporter verification
- Six-tab commercial analytics dashboard with Chart.js integration: Overview, Growth, Marketplace, Engagement, Geography, Revenue
- CSV and PDF export from the analytics dashboard
- Complete audit logging of every admin action

**Monetisation Infrastructure**
- Featured listings system with database-level expiry and frontend scoring boost
- Seller verification badge system
- Voluntary support/tip feature with EcoCash and Paynow payment flows, supporter badge award system, and admin verification workflow
- Subscription tier architecture (Free / Seller / Pro / Business) ready for activation
- Sale commission tracking framework (3% model)

**Business & Legal**
- Full company incorporation documentation (Articles of Incorporation under Zimbabwe's Companies and Other Business Entities Act [Chapter 24:31])
- Complete legal document library: Terms of Service, Privacy Policy, Cookie Policy, Acceptable Use Policy, GDPR and POPIA compliance statements, Data Processing Agreement, Refund Policy, Subscription Policy, Copyright Notice, Accessibility Statement
- Staff hiring documentation: Employment Contract, Freelancer Agreement, Equity & Vesting Agreement, NDA, Community Manager Agreement
- Business Plan with 3-year financial projections, break-even analysis, and seed funding model
- Brand Guidelines, Seller Onboarding Guide, Buyer Safety Guide

**Marketing**
- 12-week university outreach campaign targeting Student Representative Councils across Zimbabwe
- TikTok content campaign ("It Won't Fit") — 50-video script series built around psychological repetition and brand recall, designed for production at scale using Sora AI video generation
- OG image and full social media meta tag implementation for WhatsApp link preview cards

#### Technical Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript, PWA |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth + custom admin session RPCs |
| Hosting | Netlify |
| Analytics | Custom SQL views + Chart.js |
| Payments | EcoCash manual flow + Paynow (integration ready) |
| Search | Custom Levenshtein + trigram fuzzy search |
| AI/ML | PersonaEngine session affinity (custom) |

#### Why This Is Technically Impressive

Most developers at Part 2 of a Computer Engineering degree are building tutorial projects. Metups is a live, production application with real users, a real domain, a real database with security policies, a commercial-grade admin system, and a documented monetisation strategy.

Every component — the search engine, the analytics system, the admin authentication, the PWA — was built without a framework doing the heavy lifting. That means I understand exactly what I built and why each architectural decision was made.

The admin dashboard alone — with its six analytics tabs, RBAC system, ten custom RPCs, and export functionality — is the kind of system junior developers are hired to maintain, not build. I built it as a side component of a larger project, while studying full-time.

---

### 2. MDUMENI — AI Agronomist
**Mobile App for Zimbabwean Farmers**
`INTELLI-Farming Project, University of Zimbabwe` · Lead Developer · 2025–Present

#### What It Is

MDUMENI is an AI-powered agronomist mobile application that gives Zimbabwean smallholder farmers access to expert crop guidance, disease diagnosis, and market information — in their language, on their phone, without requiring an agronomist to be physically present.

The name "Mdumeni" means advisor or counsellor in Ndebele. The app covers 60 crops and includes specialised logic for Zimbabwe's agricultural regions, including Pfumvudza conservation farming basin calculations for Regions 4 and 5.

#### What I Built

**Mobile Application**
- React Native with Expo SDK 54, written entirely in TypeScript
- Full cross-platform mobile app targeting Android (primary) and iOS
- Clean architecture with proper separation of concerns across feature modules
- MarketScreen with four real-time data tabs: prices, buyers, sellers, trends

**Backend API**
- FastAPI backend deployed on Render (mdumeni-api.onrender.com)
- 60-crop database with agronomic data, disease profiles, and treatment recommendations
- Pfumvudza basin planting logic implemented for 13 crops across Zimbabwe's agricultural regions 4 and 5
- Marketplace router with full CRUD operations wired into the main application
- Supabase database with marketplace tables and RLS policies

**What I Fixed and Delivered in One Sprint**
- Diagnosed and resolved dead duplicate endpoint routing causing silent API failures
- Fixed hardcoded crop ID mismatches corrupting data across multiple screens
- Removed personal data leaking through default form field values
- Resolved duplicate marketplace.py files in two unlinked locations causing deployment inconsistencies
- Produced a 10-document technical documentation suite covering architecture, API reference, database schema, and deployment

#### Technical Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo SDK 54, TypeScript |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL) |
| Deployment | Render (API), Expo EAS (mobile) |
| AI | Integrated agronomic AI model |

#### Context

This project is developed through the INTELLI-Farming research initiative at the University of Zimbabwe. I serve as lead developer on a team of five, responsible for all technical architecture decisions, full-stack implementation, and delivery of working features against research milestones.

---

### 3. Eloqui — Android English Tutor
**Personal Language Learning App**
`Personal Project` · Solo Developer · 2025–Present

#### What It Is

Eloqui is a personal Android application I built to improve my own English vocabulary acquisition. It uses spaced repetition, daily notifications, and AI-powered explanations to teach words in context.

#### What I Built

- Native Android application in Kotlin with Jetpack Compose
- Full MVVM architecture with clean separation across data, domain, and presentation layers
- Room database for local-first storage — works fully offline
- Supabase cloud sync for word database backup and restoration across devices
- WorkManager integration for three scheduled daily notification reminders
- AIProvider abstraction layer supporting Gemini (default), Claude, and Grok — all three at full commercial parity, not placeholder stubs
- Ten+ screens built from scratch
- Release signing configured for Play Store submission

#### Why It Matters for a Hiring Agent

Eloqui demonstrates something most portfolio projects do not: I build tools for myself because I genuinely enjoy building. This is not a tutorial project or a class assignment. It is a complete, architecturally sound, production-signed Android application that I use every day. The AI abstraction layer — supporting three different providers through a clean interface — shows I understand software design patterns at a level beyond surface-level implementation.

---

## What Makes Me Different

**I build real things, not demo projects.**
Every project in this portfolio is live, used, and continuously developed. Metups has real users and real listings. MDUMENI is deployed and being used in an active research context. Eloqui is installed on my phone.

**I work at full-stack depth.**
I do not specialise in one layer and call APIs for everything else. I design the database, write the SQL, build the backend, implement the frontend, configure the deployment, write the documentation, and handle the business logic. I understand every layer of what I build.

**I build for constrained environments.**
Every technical decision I make accounts for low-bandwidth networks, low-end devices, and limited infrastructure — because my users live in Zimbabwe and that is the reality they operate in. This makes me a better engineer than someone who has only built for ideal conditions.

**I move fast without breaking things.**
The Metups admin system — ten RPCs, RBAC, six analytics tabs, session management — was built and debugged in days, not weeks. I diagnose root causes precisely (token hash mismatch in pgcrypto, RLS blocking session INSERTs, duplicate endpoint routing in FastAPI) rather than applying surface-level fixes.

**I think like a founder.**
I do not just implement features. I understand why they exist, what business problem they solve, and how they connect to the product's long-term strategy. The monetisation architecture in Metups, the legal documentation, the marketing plan — all of this came from me thinking like the owner of the product, not just the developer.

---

## Skills Summary

**Languages:** JavaScript, TypeScript, Python, Kotlin, SQL, HTML, CSS

**Frameworks & Libraries:** React Native, Expo, FastAPI, Jetpack Compose

**Databases:** PostgreSQL (Supabase), Room (SQLite), SQL query optimisation, Row Level Security

**Mobile:** Android (Kotlin/Compose), React Native cross-platform, PWA, Service Workers, Expo EAS

**Backend:** FastAPI, REST API design, custom RPCs, pgcrypto, WorkManager

**DevOps:** Netlify, Render, Supabase, Git

**Design:** Mobile-first UI, accessibility, low-bandwidth optimisation

**Business:** Product strategy, monetisation architecture, legal documentation, marketing strategy

---

## Education

**Bachelor of Engineering Honours — Computer Engineering (HCE)**
University of Zimbabwe, Faculty of Computer Engineering, Informatics and Communication (CEIC)
Currently: Part 2.1

---

## Contact

**Email:** bhebheeugine@gmail.com
**Phone:** +263 784 617 009
**Location:** Harare, Zimbabwe
**Website:** metups.com

