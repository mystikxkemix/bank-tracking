---
name: ship-feature
description: Build or change a feature of the bank-tracking app end to end by coordinating the developer and ux-designer agents (contract first, API and UI in parallel, browser verification, green checks). Use when asked to implement, finish or change a feature such as transactions, import, budgets, goals, dashboard, split, categories, sharing or users.
---

# Ship a feature with the two agents

You are the orchestrator. The agents cannot talk to each other: you carry information between them, so be precise.

## 1. Frame (you)
- Read `CLAUDE.md`, `AI_MEMORY.md` and `.claude/rules/features/<feature>.md`.
- Restate the goal and acceptance criteria in 3 to 6 bullets. If a product decision is missing, ask the user (AskUserQuestion) before spawning anything.

## 2. Contract (developer, alone, short)
Spawn `developer` to update `packages/shared` and the feature context API table ONLY if the contract must change. Skip when the contract already covers the need. Wait for it: this is the sync point.

## 3. Build (in parallel, one message with two Agent calls)
- `developer`: API (service, routes, registry), pure logic tests, smoke script against a throwaway Mongo, web hooks in `features/<f>/api.ts`.
- `ux-designer`: pages and components for the feature against the shared types, following the design direction in `design/`.
Give each the feature name, the acceptance criteria, the contract summary, and which files the other one owns (no overlap: hooks belong to the developer; if the ux-designer starts first it may write missing hooks following `features/accounts/api.ts`, and the developer must then reuse them, not duplicate).

## 4. Integrate (you)
- Relay "Needs from developer" items to the developer, then contract changes back to the ux-designer. Loop until empty.
- Run `npm run check` yourself. Then ask the `ux-designer` for the browser verification pass (owner + viewer, desktop + mobile, light + dark) if it has not done it after the API landed.

## 5. Close (you)
- Feature context Status updated, AI_MEMORY.md appended if needed, `npm run check` green.
- Tell the user what works, what was verified and how, and what is left. Do not commit unless asked.
