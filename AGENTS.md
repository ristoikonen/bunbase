# AI Agent Guide (AGENTS.md)


---

## 1. Project Identity & Purpose



### Core Objectives



---

## 2. Architecture & File Structure
Agents interacting with this workspace must adhere to the following file layout and responsibilities:

```text
bunbase/
├── server.ts                 # Main Bun.serve entry point and HTTP route handler
├── package.json              # Dependencies (like: bun, @google/genai, libsql, zod)
├── .env                      # Environment secrets (never commit plaintext credentials)
├── middleware/
│   └── m2131Logger.ts        # M-21-31 compliant telemetry & structured JSON logger
├── services/
│   ├── ask_gemini.ts         # Optional:Gemini API generation and streaming wrapper
│   └── dbratelimiter.ts      # Optional:Turso database connection and rate-limiting logic
└── utils/
    └── hash.ts               # SHA-256 salted IP anonymization utilities

```
