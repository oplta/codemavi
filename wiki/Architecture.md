# Architecture

- Orchestrator (The Conductor): Analyzes requests, researches the codebase, and creates a strategic plan.
- Executor (The Implementer): Produces precise changes and semantic diffs to update files.
- Verifier (The Validator): Checks lint and test results; triggers self-correction loops if needed.
- Data flow: Orchestrator -> Executor -> Verifier; feedback loops enable safe, traceable changes.
- Key prompts can be found under:
  - src/vs/workbench/contrib/mavi/common/mavi-logic/agents/
- Notes:
  - The wiki complements the docs and code comments; it is a fast-reference for branding and architecture decisions.
