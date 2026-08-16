# Code Style

- Do not rename existing variables, functions, or fields to match product or brand names (e.g. "OrbitOps"). Always keep whatever name already exists in the file you're editing.
- If this repo ever calls an AI provider, every prompt must be versioned inside that feature's spec (the "AI Prompts" section from `specs/TEMPLATE.md`) — never hardcode a prompt string in application code without a versioned copy in the spec. No AI calls exist in this repo yet.
- Code comments must explain *why*, not *where*. Never reference a spec filename, CR number, or line number in a comment — state the reason inline in plain English, 1-4 lines maximum.
