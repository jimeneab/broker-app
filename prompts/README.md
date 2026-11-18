# Prompts

This folder documents how AI was used to build this project. It contains every system instruction, spec and working-session prompt, so the development process is transparent and reproducible.

## Structure

```
prompts/
├── README.md                 # This file
├── system/                   # Persistent instructions for the AI
│   ├── CLAUDE.md             # Project context for Claude Code (imported by /CLAUDE.md)
│   ├── rules.md              # Coding rules and conventions
│   └── system-prompts.md     # System prompts used inside the app (chat demo, MCP tool descriptions)
├── specs/                    # What we are building
│   ├── 01-product.md         # Product scope and user stories
│   ├── 02-backend.md         # API, providers, data model, MCP
│   └── 03-frontend.md        # Pages, components, UX
└── sessions/                 # Log of each working session
    ├── 01-setup.md           # Project setup and architecture decisions
    └── 02-auth.md            # Authentication
```

## How it is used

1. **`system/`** is loaded automatically by Claude Code through the root `CLAUDE.md`.
2. **`specs/`** are written before implementing a feature and referenced in session prompts.
3. **`sessions/`** record the prompts sent in each working session, the decisions made, and the outcome.

## Session log format

Each file in `sessions/` follows this template:

```markdown
# Session NN — <topic>

**Date:** YYYY-MM-DD
**Goal:** ...

## Prompts
### 1. <short title>
> prompt text

**Outcome:** ...

## Decisions
- ...

## Follow-ups
- [ ] ...
```
