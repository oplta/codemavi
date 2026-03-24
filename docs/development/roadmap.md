# Code Mavi IDE Development Roadmap

## Overview

This roadmap outlines the development phases for Code Mavi IDE, following the strategic plan defined in `plan.md`. The project is organized into six phases, each building upon the previous to create a complete, production-ready agent-first IDE.

## Phase 0: Void Fork + Orientation (Week 1-2)

**Goal:** Establish foundation by forking Void editor and understanding the codebase

### Tasks:
- [x] Fork Void editor repository to Code Mavi IDE organization
- [x] Complete initial codebase analysis and documentation
- [x] Identify critical Void components to preserve/modify
- [x] Document Void's architecture and limitations
- [x] Set up development environment and build pipeline

### Key Deliverables:
1. **Codebase Analysis Report** - Understanding what Void does and doesn't do
2. **Development Environment Setup** - Working build system for all contributors
3. **Architecture Documentation** - Clear understanding of VS Code extension model
4. **Initial Branding** - Basic Code Mavi IDE identity applied

### Technical Focus:
- Study `VOID_CODEBASE_GUIDE.md` and create `CODEMAVI_CODEBASE_GUIDE.md`
- Analyze `src/vs/workbench/contrib/void/` directory structure
- Understand LLM message pipeline (`sendLLMMessage.ts`)
- Identify agent system integration points

## Phase 1: Branding + Stabilization (Week 3-4)

**Goal:** Complete rebranding from Void to Code Mavi IDE and stabilize the codebase

### Tasks:
- [ ] Complete rename from Void to Code Mavi IDE across entire codebase
- [ ] Implement Code Mavi IDE theme system (`#020b18` base, `#3b82f6` accent)
- [ ] Disable telemetry and analytics systems
- [ ] Fix broken Void features and stabilize core functionality
- [ ] Update all documentation references from Void to Code Mavi IDE
- [ ] Create comprehensive `CODEMAVI_CODEBASE_GUIDE.md`

### Key Deliverables:
1. **Complete Rebranding** - No remaining "Void" references in UI or code
2. **Stable Build System** - Reliable development and production builds
3. **Theme System** - Consistent Code Mavi IDE branding across all UI components
4. **Privacy-First Configuration** - All telemetry disabled by default

### Technical Focus:
- Global search/replace for "void" → "mavi" (case-sensitive)
- Theme implementation in CSS and product.json
- Telemetry removal from all services
- Build script updates and validation

## Phase 2: Codebase Intelligence (Week 5-7)

**Goal:** Implement semantic search and code understanding capabilities

### Tasks:
- [ ] Integrate tree-sitter for AST parsing and analysis
- [ ] Implement SQLite + vec0 extension for vector similarity search
- [ ] Create embedding service with multiple model support
- [ ] Develop semantic search API with hybrid search capabilities
- [ ] Implement re-ranker for search result optimization
- [ ] Add `@file`, `@folder`, `@symbol` syntax support
- [ ] Create code chunking and indexing system

### Key Deliverables:
1. **Semantic Search Engine** - Vector-based code search with SQLite backend
2. **AST Parser Integration** - Language-aware code analysis with tree-sitter
3. **Embedding Service** - Support for local (Ollama) and cloud embedding models
4. **Search API** - `searchCodebase(query, topK)` function for agents
5. **Hybrid Search** - Combined keyword and semantic search with re-ranking

### Technical Components:
- **tree-sitter Integration:** Node.js bindings for AST parsing
- **Vector Database:** SQLite with vec0 extension for efficient similarity search
- **Embedding Models:** Default to Ollama `nomic-embed-text`, with OpenAI fallback
- **Chunking Strategy:** Intelligent code segmentation with overlap
- **Indexing Pipeline:** Background indexing with incremental updates

## Phase 3: Agent Loop (Week 8-11)

**Goal:** Implement the core triple-agent system with self-correction

### Tasks:
- [ ] Create Orchestrator agent with strategic planning capabilities
- [ ] Implement Executor agent for precise code modification
- [ ] Develop Verifier agent for quality assurance and validation
- [ ] Build agent communication protocol and delegation system
- [ ] Implement self-correction loop with error classification
- [ ] Create checkpoint system for safe rollbacks
- [ ] Develop tool system for agent capabilities
- [ ] Implement apply model for semantic diff application

### Key Deliverables:
1. **Triple Agent System** - Orchestrator, Executor, Verifier working in concert
2. **Agent Communication Protocol** - Structured XML-based task delegation
3. **Self-Correction Loop** - Automatic error detection and recovery (max 3 retries)
4. **Checkpoint System** - Automatic snapshots before significant changes
5. **Tool Framework** - Extensible tool system for agent capabilities
6. **Apply Model** - Semantic diff to code transformation engine

### Agent Capabilities:
- **Orchestrator:** Request analysis, planning, context gathering, delegation
- **Executor:** Semantic diff generation, precise code editing, style consistency
- **Verifier:** Syntax validation, type checking, lint enforcement, test validation

## Phase 4: System Prompt + Rules (Week 12-13)

**Goal:** Implement transparent, customizable prompt system with rule hierarchy

### Tasks:
- [ ] Create `.mavi/rules.md` file system and parser
- [ ] Implement global `~/.mavi/global-rules.md` support
- [ ] Develop prompt layering system with priority hierarchy
- [ ] Build UI for viewing and editing system prompts
- [ ] Create "Prompt Inspector" for debugging agent interactions
- [ ] Develop community rule template system
- [ ] Implement prompt versioning and sharing capabilities

### Key Deliverables:
1. **Rule Hierarchy System** - Global → Project → Session rule layering
2. **Prompt Transparency UI** - View and edit all agent prompts
3. **Prompt Inspector** - Debug tool for understanding agent decisions
4. **Rule Template Library** - Community-contributed rule sets
5. **Prompt Version Control** - Save, share, and revert prompt configurations

### Prompt Architecture:
```
1. Base Agent Prompt (System-defined)
2. Global User Rules (~/.mavi/global-rules.md)
3. Project Rules (.mavi/rules.md)
4. Dynamic Context (Current session state)
5. Task-specific Instructions
```

## Phase 5: Provider + Auto Dev Mode (Week 14-16)

**Goal:** Expand LLM provider support and implement automated development mode

### Tasks:
- [ ] Stabilize existing Void provider implementations
- [ ] Add new providers: Zhipu AI, Perplexity, Together AI
- [ ] Implement provider failover and load balancing
- [ ] Create Auto Dev Mode with project planning UI
- [ ] Develop task list preview and approval system
- [ ] Implement token usage tracking and cost optimization
- [ ] Add progress monitoring and interruption capabilities
- [ ] Create provider health monitoring and automatic fallback

### Key Deliverables:
1. **Expanded Provider Support** - 15+ LLM providers with failover
2. **Auto Dev Mode** - Complete project automation with user oversight
3. **Provider Management** - Health monitoring, rate limiting, cost tracking
4. **Task Orchestration UI** - Visual planning and progress tracking
5. **Cost Optimization** - Token usage analytics and optimization suggestions

### Auto Dev Mode Features:
- Project analysis and task breakdown
- Step-by-step execution with user approval
- Progress tracking and interruption support
- Token usage reporting and cost estimation
- Checkpoint management throughout automation

## Phase 6: Release Preparation (Week 17-18)

**Goal:** Prepare for public release with packaging, documentation, and testing

### Tasks:
- [ ] Create Mac + Windows + Linux build pipelines
- [ ] Implement auto-update system
- [ ] Develop comprehensive installation documentation
- [ ] Create user tutorials and getting started guides
- [ ] Perform security audit and vulnerability assessment
- [ ] Conduct performance testing and optimization
- [ ] Prepare marketing materials and announcement
- [ ] Set up community infrastructure (Discord, forums, etc.)

### Key Deliverables:
1. **Production Builds** - Signed packages for all major platforms
2. **Auto-Update System** - Seamless updates for end users
3. **Complete Documentation** - User guides, API references, troubleshooting
4. **Security Audit Report** - Vulnerability assessment and mitigation
5. **Performance Benchmarks** - Optimization targets achieved
6. **Community Infrastructure** - Support channels and contribution guidelines

### Release Artifacts:
- `CodeCode Mavi IDE-darwin-x64.zip` (macOS)
- `CodeCode Mavi IDE-win32-x64.zip` (Windows)
- `CodeCode Mavi IDE-linux-x64.tar.gz` (Linux)
- Source code archive
- Documentation website
- Example projects and tutorials

## Post-Release Roadmap

### Phase 7: Ecosystem Development (Months 4-6)
- Plugin system for custom agents and tools
- Marketplace for agent prompts and rule sets
- Team collaboration features
- Advanced analytics and insights

### Phase 8: Advanced Intelligence (Months 7-9)
- Cross-file dependency analysis
- Architectural pattern recognition
- Performance optimization suggestions
- Security vulnerability detection

### Phase 9: Enterprise Features (Months 10-12)
- On-premise deployment options
- SSO and team management
- Audit logging and compliance features
- Custom model fine-tuning support

## Success Metrics

### Technical Metrics:
- **Build Success Rate:** >95% for all platforms
- **Test Coverage:** >80% for core functionality
- **Performance:** <2s response time for common operations
- **Stability:** <1 critical bug per 1000 user hours

### User Metrics:
- **Adoption:** 10,000+ active users within 6 months
- **Satisfaction:** >4.5/5 average rating
- **Retention:** >60% weekly active user retention
- **Community:** 100+ contributors within first year

### Quality Metrics:
- **Code Quality:** <0.1% lint error rate
- **Security:** Zero critical vulnerabilities
- **Accessibility:** WCAG 2.1 AA compliance
- **Documentation:** >90% API coverage

## Risk Mitigation

### Technical Risks:
1. **VS Code Dependency Risk**
   - **Mitigation:** Maintain close tracking of VS Code updates, create abstraction layer for critical dependencies

2. **LLM Provider API Stability**
   - **Mitigation:** Implement provider abstraction layer, maintain multiple provider options, create mock services for testing

3. **Performance at Scale**
   - **Mitigation:** Implement caching, lazy loading, and incremental processing from day one

### Community Risks:
1. **Contributor Burnout**
   - **Mitigation:** Clear contribution guidelines, good first issues, mentorship program

2. **Feature Bloat**
   - **Mitigation:** Strict feature acceptance criteria, modular architecture, deprecation policy

3. **Fragmentation**
   - **Mitigation:** Strong API compatibility guarantees, migration tools, clear versioning policy

## Resource Requirements

### Development Team:
- **Core Maintainers:** 3-5 experienced TypeScript/VS Code developers
- **AI/ML Specialists:** 2-3 for agent system and semantic search
- **UI/UX Designers:** 1-2 for interface design and user experience
- **Documentation:** 1-2 technical writers
- **Community Management:** 1-2 for support and engagement

### Infrastructure:
- **CI/CD:** GitHub Actions with macOS, Windows, Linux runners
- **Testing:** Automated testing infrastructure with browser and Node.js environments
- **Documentation:** GitHub Pages or dedicated documentation site
- **Community:** Discord server, GitHub Discussions, regular community calls

## Timeline Summary

```
Week 1-2:   Phase 0 - Void Fork & Orientation
Week 3-4:   Phase 1 - Branding & Stabilization
Week 5-7:   Phase 2 - Codebase Intelligence
Week 8-11:  Phase 3 - Agent Loop
Week 12-13: Phase 4 - System Prompt & Rules
Week 14-16: Phase 5 - Provider & Auto Dev Mode
Week 17-18: Phase 6 - Release Preparation

Month 4-6:  Phase 7 - Ecosystem Development
Month 7-9:  Phase 8 - Advanced Intelligence
Month 10-12: Phase 9 - Enterprise Features
```

## Conclusion

This roadmap represents a comprehensive plan to transform Code Mavi IDE from a Void editor fork into a fully-featured, agent-first IDE that competes with commercial solutions while remaining open source and transparent. Each phase builds upon the previous, with clear deliverables and success metrics.

The key differentiators of Code Mavi IDE will be:
1. **Transparency:** All prompts and agent logic visible and editable
2. **Control:** User-defined rules and approval workflows
3. **Intelligence:** Sophisticated multi-agent system with self-correction
4. **Openness:** Community-driven development and extensibility

By following this roadmap, Code Mavi IDE will deliver on its promise: making what Cursor does open, transparent, and free, while completing Void's vision with a sophisticated agent brain.