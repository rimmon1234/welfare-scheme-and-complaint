# 🏛️ SevaNest (সেবানীয় / सेवाघोंसला)
### Centralized Welfare Scheme Access & Transparent Grievance Redressal Portal
> **Hackathon Track:** IEMH4-SI-01 — Track 5: Community Platform for Welfare-Scheme Access & Transparent Grievance Redressal

---

## 🔗 Project Links

* 🌐 **Live Deployed Application:** [https://welfare-scheme-and-complaint.vercel.app/](https://welfare-scheme-and-complaint.vercel.app/)
* 📊 **PPT Presentation Link:** [https://canva.link/ct3s6lcd6i750yx](https://canva.link/ct3s6lcd6i750yx)
* 🎥 **Video Demo Link:** https://www.loom.com/share/2a071e325b8c4e4bb9f1087e044c9e01

---

## 📌 Executive Summary

**SevaNest** is an AI-powered, multi-tenant citizen assistance platform engineered to simplify access to government welfare schemes and provide transparent, SLA-enforced grievance redressal for rural and urban citizens alike.

By replacing opaque government portals with an **intelligent 6-stage hybrid AI & AST rule-tree pipeline** and an **e-commerce-style complaint tracker with automated SLA escalation**, SevaNest eliminates bureaucratic delays, prevents broker exploitation, and guarantees zero-hallucination eligibility matching.

---

## 🌟 Key Features

### 1. ⚡ 6-Stage Hybrid AI & Rule-Tree Eligibility Matcher
- **Natural Language Profile Parser:** Uses the official `@google/genai` SDK powered by **Gemini 2.5 Flash** with strict JSON schemas to parse plain text/voice prompts in English, Hindi, or Bengali into structured profile JSON.
- **Zero-Hallucination AST Engine (`ruleValidator.js`):** Sole authority for eligibility status (🟢 `ELIGIBLE`, 🟡 `POTENTIALLY_ELIGIBLE`, 🔵 `MORE_INFO_REQUIRED`, 🔴 `INELIGIBLE`). Evaluates strict nested logical trees (`all`, `any`, `not`) across age, gender, occupation, income, and state jurisdiction bounds.
- **Strict State Jurisdiction Filter:** Automatically disqualifies mismatched state-specific schemes (e.g. excluding Odisha-only or UP-only schemes for West Bengal residents).
- **Humanized Audit Checklists:** Translates complex AST code into citizen-friendly evidence points (e.g., `✓ You are a practicing Farmer`, `✓ West Bengal Resident`).

### 2. 👨‍👩‍👧‍👦 Household Member-Specific Eligibility Checker
- **Household Selection Modal:** Allows citizens to evaluate individual family members (e.g., Asha - Self, Ramesh - Father, Sunita - Mother, Sourav - Son).
- **Member-Targeted Audit Box:** Provides targeted matching factor lists OR explicit reasons why a member is ineligible (e.g. `❌ Restricted to Female applicants`, `❌ Minimum age requirement is 60 years`).

### 3. ⚖️ Transparent Grievance Redressal & Auto-Escalation Engine
- **Anonymous Complaint Filing:** Submit grievances securely without mandatory sign-in; generates a secure 6-digit PIN and reference code.
- **AI NLP Classifier (`complaintClassifierService.js`):** Automatically categorizes grievances into municipal departments (Water Supply, Electricity, Roads, Sanitation, Ration, Health) and assigns priority levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **7-Stage Visual E-Commerce Tracking Timeline:** Live progress tracking (`Submitted` ➔ `Acknowledged` ➔ `Assigned` ➔ `Investigation` ➔ `Action Taken` ➔ `Resolved` ➔ `Closed`).
- **SLA Breach & Auto-Escalation Engine:** Automatically monitors pending grievance SLA timers and escalates unresolved complaints to higher District Magistrates (DMs) with an SLA breach alert badge.

### 4. 📊 Officer & Admin Command Center
- **Admin Analytics Dashboard:** Real-time metrics on total complaints, pending SLAs, department resolution rates, and priority distribution.
- **Management Console:** Department routing, investigator updates, citizen feedback logs, and resolution verification.

### 5. 🎙️ Multilingual Speech & Chat Support (11 Indian Languages)
- Native AI chat and voice input across **11 major Indian languages**: Bengali (`bn`), Hindi (`hi`), English (`en`), Tamil (`ta`), Telugu (`te`), Marathi (`mr`), Gujarati (`gu`), Kannada (`kn`), Malayalam (`ml`), Punjabi (`pa`), and Odia (`or`). Powered by Sarvam AI STT & Gemini 2.5 Flash.

---

## 🛠️ System Architecture & Tech Stack

```
                          CITIZEN / OFFICER
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │   React 19 + TypeScript      │
                   │   Vite + Tailwind CSS v4     │
                   │   GSAP Motion Animations     │
                   └──────────────┬───────────────┘
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │   Express Node.js REST API   │
                   └──────┬────────────────┬──────┘
                          │                │
           ┌──────────────┴─┐            ┌─┴──────────────┐
           ▼                ▼            ▼                ▼
    PostgreSQL DB      Google GenAI    Prisma 6        Supabase
    (Database)         (Gemini 2.5)    (ORM)           (Auth/OTP)
```

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & Animations** | Tailwind CSS v4, GSAP, Lucide React Icons |
| **Backend Runtime** | Node.js, Express.js |
| **Database & ORM** | PostgreSQL, Prisma 6 ORM |
| **Artificial Intelligence** | `@google/genai` SDK (`gemini-2.5-flash`), Sarvam AI Speech API (`saarika:v2.5`) |
| **Authentication** | Supabase Auth (Email OTP), JWT |
| **Deployment** | Vercel |

---

## 📂 Repository Structure

```
├── backend/
│   ├── prisma/
│   │   └── schema.prisma            # PostgreSQL Database Schema
│   ├── src/
│   │   ├── controllers/             # Express Route Controllers
│   │   ├── middleware/              # Auth & Validation Middleware
│   │   ├── routes/                  # API Endpoints (ai, schemes, complaints, family)
│   │   ├── services/
│   │   │   ├── aiSchemeMatcher.js   # 6-Stage Matching Pipeline Orchestrator
│   │   │   ├── ruleValidator.js     # AST Rule Tree Evaluator
│   │   │   ├── aiProfileParser.js   # Gemini 2.5 Flash Profile Parser
│   │   │   ├── aiFollowupService.js # Dynamic Question Generator
│   │   │   └── complaintClassifierService.js # AI Complaint Categorizer
│   │   └── index.js                 # Server Entry Point
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable UI Components
│   │   ├── pages/                   # Application Views (Catalog, SchemeDetail, Complaints, Admin)
│   │   ├── services/                # API Helper Services
│   │   └── App.tsx                  # App Shell & Router
└── README.md
```

---

## 🚀 Local Development & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database URL (or Supabase Postgres connection string)
- Google Gemini API Key (`GEMINI_API_KEY`)

### 1. Backend Setup
```bash
cd backend
npm install

# Configure Environment Variables in backend/.env
# GEMINI_API_KEY=your_gemini_api_key
# DATABASE_URL=your_postgres_connection_string

# Sync Database Schema
npx prisma db push

# Start Backend Server
npm run start
```
*Backend runs at `http://localhost:5000`*

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start Vite Development Server
npm run dev
```
*Frontend runs at `http://localhost:5173`*

---

## 👥 Contributors & Hackathon Team

Developed for **IEM Hackathon 2026** — Track 5 (*IEMH4-SI-01*).

---
© 2026 **SevaNest** — Empowering Citizens Through Transparent Governance.
