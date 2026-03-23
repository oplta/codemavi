# Code Mavi IDE Implementation

## Goal
Transform Void fork into Code Mavi IDE with agent-first architecture as specified in plan.md

## Phases

### Phase 1: Branding + Stabilization (Week 1-2)
- [x] Rename Void → Code Mavi in product.json and all string references
- [ ] Create Mavi theme (#020b18 base, #3b82f6 accent)
- [x] Disable telemetry
- [x] Update README and documentation
- [x] Create CODEMAVI_CODEBASE_GUIDE.md

### Phase 2: Codebase Intelligence (Week 3-5)
- [ ] Integrate tree-sitter for AST parsing
- [ ] Add SQLite with vec extension for vector storage
- [ ] Implement embedding service (Ollama nomic-embed-text default)
- [ ] Create semantic search API: searchCodebase(query, topK)
- [ ] Add re-ranker for top-20 → top-5
- [ ] Implement @file, @folder, @symbol syntax in sidebar

### Phase 3: Agent Loop (Week 5-8) - CRITICAL
- [x] Create tool definitions in src/vs/workbench/contrib/void/common/toolsServiceTypes.ts:
  - read_file(path)
  - write_file(path, semantic_diff)
  - run_command(cmd)
  - search_codebase(query)
  - lint_file(path)
  - create_checkpoint()
  - ask_user(question)
- [ ] Implement Orchestrator agent loop in sendLLMMessage.ts
- [ ] Add Apply model integration (semantic diff → real code)
- [ ] Create Verifier service (lint + type check loop)
- [ ] Implement Self-correction loop (error → retry, max 3)
- [ ] Add Checkpoint system (git stash-like)

### Phase 4: System Prompt + Rules (Week 8-9)
- [ ] Create .codemavi/rules.md file system
- [ ] Add global ~/.codemavi/global-rules.md
- [ ] Implement system prompt layer combiner
- [ ] Create UI for viewing/editing system prompts
- [ ] Build "Prompt Inspector" feature
- [ ] Create community rule templates (Rust, Python, Next.js)

### Phase 5: Provider + Auto Dev Mode (Week 9-11)
- [ ] Stabilize existing Void providers
- [ ] Add new providers: Zhipu AI, Perplexity, Together AI
- [ ] Implement provider failover
- [ ] Build Auto Dev Mode UI
- [ ] Add task list preview
- [ ] Implement step-by-step approval
- [ ] Add stop/continue controls
- [ ] Create token + cost tracking

### Phase 6: Release (Week 12)
- [ ] Mac + Windows + Linux builds
- [ ] Auto-update system
- [ ] Installation documentation
- [ ] 0.1.0-alpha tag

## Current Working Directory
/Users/polat/Ortak/mavi-ide/void

## Key Files to Modify
- product.json - branding
- src/vs/workbench/contrib/void/common/sendLLMMessageService.ts - agent loop
- src/vs/workbench/contrib/void/common/modelCapabilities.ts - providers
- src/vs/workbench/contrib/void/browser/react/src2/sidebar-tsx/ - UI
- src/vs/workbench/contrib/void/common/toolsServiceTypes.ts - tool definitions
