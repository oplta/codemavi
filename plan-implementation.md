# Code Mavi Implementation Plan
## From Vision to Production - Detailed Technical Roadmap

**Based on:** Analysis of `plan.md` and current codebase state
**Current Status:** Phase 0-1 Complete, Phase 2-6 Pending
**Target Release:** 0.1.0-alpha in 12 weeks

---

## Executive Summary

Code Mavi is positioned to become the first open-source, agent-first IDE that combines Cursor's intelligence with Void's openness. This document translates the strategic vision from `plan.md` into actionable technical implementation steps.

### Core Value Proposition
1. **Transparent Intelligence:** All agent prompts visible and editable
2. **Agent-First Architecture:** Triple-agent system with self-correction
3. **Open Ecosystem:** Community-driven extensions and improvements
4. **Production Ready:** Enterprise-grade safety and reliability

### Competitive Differentiation
| Aspect | Cursor | Void | Code Mavi |
|--------|--------|------|-----------|
| Transparency | ❌ Closed | ⚠️ Partial | ✅ Full |
| Customization | Limited | Basic | Extensive |
| Cost | $20/month | Free | Free |
| Open Source | ❌ No | ✅ Yes | ✅ Yes |
| Agent Intelligence | ✅ Advanced | ❌ Basic | ✅ Advanced |

---

## Current State Assessment

### ✅ Completed (Phase 0-1)
1. **Void Fork Complete**
   - Codebase forked and rebranded
   - Basic Mavi theming implemented
   - Development environment established

2. **Architecture Designed**
   - Triple agent system fully specified
   - Tool framework interfaces defined
   - Communication protocols documented

3. **Documentation Foundation**
   - Architecture documentation complete
   - Agent prompt templates created
   - Development guidelines established

### ❌ Missing (Critical Gaps)
1. **No Semantic Search** - Phase 2 incomplete
2. **No Agent Execution** - Phase 3 not started
3. **No Provider System** - Phase 5 not started
4. **No Build Pipeline** - Phase 6 not started

---

## Phase 2: Codebase Intelligence Implementation (Weeks 1-4)

### Week 1: AST Parsing Foundation
**Objective:** Implement tree-sitter integration for code analysis

**Tasks:**
1. **Install tree-sitter dependencies**
   ```bash
   npm install @vscode/tree-sitter-wasm tree-sitter-javascript tree-sitter-typescript tree-sitter-python tree-sitter-rust
   ```

2. **Create AST Service**
   ```typescript
   // File: src/vs/workbench/contrib/mavi/common/mavi-logic/services/ast-service.ts
   export class ASTService {
     async parseFile(uri: URI): Promise<ASTNode> {
       // tree-sitter implementation
     }
     
     async extractSymbols(ast: ASTNode): Promise<CodeSymbol[]> {
       // Symbol extraction logic
     }
   }
   ```

3. **Implement Code Chunking**
   - Function/method level chunking
   - Class/interface boundaries
   - Import/export statements

**Deliverables:**
- Working AST parser for 4 languages (JS/TS, Python, Rust, Java)
- Symbol extraction service
- Code chunking algorithm

### Week 2: Vector Database Setup
**Objective:** Implement SQLite + vec0 for semantic search

**Tasks:**
1. **Set up SQLite with vec0 extension**
   ```bash
   # Add to package.json
   "dependencies": {
     "sqlite3": "^5.1.8",
     "vec0": "^0.1.0"
   }
   ```

2. **Create Vector Database Service**
   ```typescript
   // File: src/vs/workbench/contrib/mavi/common/mavi-logic/services/vector-db-service.ts
   export class VectorDBService {
     private db: Database;
     
     async initialize(): Promise<void> {
       // Create tables: chunks, embeddings, metadata
     }
     
     async storeEmbedding(chunk: CodeChunk, embedding: number[]): Promise<void> {
       // Store in SQLite + vec0
     }
   }
   ```

3. **Implement Similarity Search**
   - Cosine similarity calculation
   - Top-K nearest neighbors
   - Hybrid search (keyword + semantic)

**Deliverables:**
- Vector database with vec0 extension
- Embedding storage and retrieval
- Basic similarity search API

### Week 3: Embedding Service
**Objective:** Create embedding generation with multiple model support

**Tasks:**
1. **Implement Local Embedding (Ollama)**
   ```typescript
   class OllamaEmbeddingService {
     async generateEmbedding(text: string): Promise<number[]> {
       // Call Ollama API for nomic-embed-text
     }
   }
   ```

2. **Implement Cloud Embedding (OpenAI)**
   ```typescript
   class OpenAIEmbeddingService {
     async generateEmbedding(text: string): Promise<number[]> {
       // Call OpenAI text-embedding-3-small
     }
   }
   ```

3. **Create Embedding Manager**
   - Model selection based on configuration
   - Batch processing for efficiency
   - Fallback mechanisms

**Deliverables:**
- Multiple embedding model support
- Batch processing capabilities
- Configuration UI for model selection

### Week 4: Search API Integration
**Objective:** Complete semantic search system and integrate with agents

**Tasks:**
1. **Create Search Service API**
   ```typescript
   export interface SearchResult {
     uri: URI;
     score: number;
     snippet: string;
     lineStart: number;
     lineEnd: number;
   }
   
   export class SemanticSearchService {
     async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
       // Hybrid search implementation
     }
   }
   ```

2. **Implement Re-ranking**
   - Cross-encoder for result refinement
   - Context-aware ranking
   - Project-specific prioritization

3. **Integrate with Agent System**
   - Add `search_codebase` tool
   - Update orchestrator to use search
   - Create search UI in sidebar

**Deliverables:**
- Complete semantic search API
- Re-ranking implementation
- Agent tool integration
- Search UI component

---

## Phase 3: Agent Loop Implementation (Weeks 5-8)

### Week 5: Core Agent Infrastructure
**Objective:** Implement agent execution framework

**Tasks:**
1. **Create Agent Base Classes**
   ```typescript
   // File: src/vs/workbench/contrib/mavi/common/mavi-logic/agents/base-agent.ts
   export abstract class BaseAgent {
     abstract readonly role: string;
     abstract readonly capabilities: string[];
     
     async execute(task: AgentTask): Promise<AgentResult> {
       // Template method pattern
     }
   }
   ```

2. **Implement Orchestrator Agent**
   ```typescript
   class OrchestratorAgent extends BaseAgent {
     readonly role = 'orchestrator';
     readonly capabilities = ['plan', 'delegate', 'monitor'];
     
     async execute(task: AgentTask): Promise<AgentResult> {
       // 1. Analyze request
       // 2. Gather context via semantic search
       // 3. Create execution plan
       // 4. Delegate to executors
     }
   }
   ```

3. **Create Agent Registry**
   - Agent registration system
   - Dependency injection
   - Lifecycle management

**Deliverables:**
- Agent base class framework
- Orchestrator agent implementation
- Agent registry service

### Week 6: Executor & Verifier Agents
**Objective:** Implement specialized agents for code modification and validation

**Tasks:**
1. **Implement Executor Agent**
   ```typescript
   class ExecutorAgent extends BaseAgent {
     readonly role = 'executor';
     readonly capabilities = ['edit', 'create', 'refactor'];
     
     async execute(task: AgentTask): Promise<AgentResult> {
       // 1. Read target files
       // 2. Generate semantic diff
       // 3. Apply changes via Apply Model
     }
   }
   ```

2. **Implement Verifier Agent**
   ```typescript
   class VerifierAgent extends BaseAgent {
     readonly role = 'verifier';
     readonly capabilities = ['lint', 'type_check', 'test'];
     
     async execute(task: AgentTask): Promise<AgentResult> {
       // 1. Run syntax validation
       // 2. Execute type checking
       // 3. Run relevant tests
       // 4. Generate verification report
     }
   }
   ```

3. **Create Apply Model**
   - Semantic diff application
   - File write operations
   - Change validation

**Deliverables:**
- Executor agent with diff generation
- Verifier agent with multi-stage validation
- Apply model for file modifications

### Week 7: Self-Correction Loop
**Objective:** Implement error recovery and retry mechanisms

**Tasks:**
1. **Create Error Classification System**
   ```typescript
   enum ErrorType {
     SYNTAX = 'syntax',
     TYPE = 'type',
     LINT = 'lint',
     TEST = 'test',
     LOGIC = 'logic'
   }
   
   class ErrorClassifier {
     classify(error: Error): ErrorType {
       // Analyze error message and context
     }
   }
   ```

2. **Implement Retry Mechanism**
   ```typescript
   class SelfCorrectionLoop {
     private maxRetries = 3;
     
     async executeWithRetry(task: AgentTask): Promise<AgentResult> {
       for (let i = 0; i < this.maxRetries; i++) {
         try {
           const result = await this.executeTask(task);
           if (this.isSuccess(result)) return result;
           
           // Analyze error and retry with improved context
           task = this.enhanceTaskWithError(task, result.error);
         } catch (error) {
           // Log and continue retry
         }
       }
       throw new MaxRetriesExceededError();
     }
   }
   ```

3. **Create Feedback Integration**
   - Linter output parsing
   - Compiler error analysis
   - Test failure interpretation

**Deliverables:**
- Error classification system
- Retry mechanism with context enhancement
- Feedback integration from build tools

### Week 8: Checkpoint System
**Objective:** Implement safety mechanisms for rollback and recovery

**Tasks:**
1. **Create Checkpoint Service**
   ```typescript
   class CheckpointService {
     async createCheckpoint(reason: string): Promise<string> {
       // 1. Create Git stash or commit
       // 2. Store metadata
       // 3. Return checkpoint ID
     }
     
     async restoreCheckpoint(checkpointId: string): Promise<void> {
       // Restore from Git
     }
   }
   ```

2. **Implement Automatic Checkpointing**
   - Before major changes (3+ files)
   - Before risky operations (refactoring)
   - User-configurable thresholds

3. **Create Checkpoint Management UI**
   - List checkpoints with metadata
   - One-click restoration
   - Diff visualization

**Deliverables:**
- Git-based checkpoint system
- Automatic checkpoint creation
- Checkpoint management UI
- Rollback functionality

---

## Phase 4: System Prompt & Rules (Weeks 9-10)

### Week 9: Rule System Implementation
**Objective:** Create hierarchical rule system with file-based configuration

**Tasks:**
1. **Implement Rule Parser**
   ```typescript
   class RuleParser {
     async parseRules(filePath: string): Promise<RuleSet> {
       // Parse .mavi/rules.md
       // Extract sections and rules
     }
   }
   ```

2. **Create Rule Hierarchy**
   ```
   Priority Order:
   1. Session-specific rules (temporary)
   2. Project rules (.mavi/rules.md)
   3. Global rules (~/.mavi/global-rules.md)
   4. Base agent rules (system)
   ```

3. **Implement Rule Application**
   - Rule merging with priority
   - Conflict resolution
   - Validation and error reporting

**Deliverables:**
- Rule parsing and validation
- Hierarchical rule application
- Rule conflict resolution

### Week 10: Prompt Transparency System
**Objective:** Create UI for viewing and editing agent prompts

**Tasks:**
1. **Create Prompt Inspector**
   ```typescript
   class PromptInspector {
     getFullPrompt(agent: string, context: AgentContext): string {
       // Combine all prompt layers
       // Return complete prompt sent to LLM
     }
   }
   ```

2. **Implement Prompt Editor UI**
   - Real-time prompt editing
   - Syntax highlighting for prompt templates
   - Preview mode for changes

3. **Create Prompt Versioning**
   - Save/load prompt configurations
   - Share prompts across projects
   - Community prompt library

**Deliverables:**
- Prompt inspector with full transparency
- Interactive prompt editor
- Prompt versioning and sharing

---

## Phase 5: Provider & Auto Dev Mode (Weeks 11-12)

### Week 11: Provider System Enhancement
**Objective:** Expand LLM provider support with failover capabilities

**Tasks:**
1. **Implement Additional Providers**
   - Zhipu AI (Chinese language optimization)
   - Together AI (open model hosting)
   - Perplexity (web search integration)
   - Groq (ultra-fast inference)

2. **Create Provider Manager**
   ```typescript
   class ProviderManager {
     private providers: Map<string, LLMProvider>;
     
     async getResponse(
       request: LLMRequest,
       preferredProvider?: string
     ): Promise<LLMResponse> {
       // Try preferred provider first
       // Fallback to others on failure
       // Load balance between available providers
     }
   }
   ```

3. **Implement Health Monitoring**
   - API endpoint health checks
   - Rate limit tracking
   - Automatic failover on errors

**Deliverables:**
- 5+ additional LLM providers
- Provider failover and load balancing
- Health monitoring dashboard

### Week 12: Auto Dev Mode Implementation
**Objective:** Create automated project development with user oversight

**Tasks:**
1. **Create Project Analyzer**
   ```typescript
   class ProjectAnalyzer {
     async analyzeProject(goal: string): Promise<ProjectPlan> {
       // 1. Scan project structure
       // 2. Identify required changes
       // 3. Create task breakdown
     }
   }
   ```

2. **Implement Task Orchestration UI**
   - Visual task breakdown
   - Progress tracking
   - User approval workflow
   - Pause/resume capabilities

3. **Create Cost Optimization**
   - Token usage tracking
   - Model selection optimization
   - Batch operation suggestions

**Deliverables:**
- Project analysis and planning
- Task orchestration UI
- Cost optimization features
- User control mechanisms

---

## Phase 6: Release Preparation (Weeks 13-14)

### Week 13: Build & Distribution
**Objective:** Create production builds for all platforms

**Tasks:**
1. **Set up Build Pipeline**
   ```yaml
   # GitHub Actions workflow
   name: Build and Release
   on:
     push:
       tags: ['v*']
   
   jobs:
     build:
       strategy:
         matrix:
           os: [macos-latest, windows-latest, ubuntu-latest]
       runs-on: ${{ matrix.os }}
       
       steps:
       - name: Build for ${{ matrix.os }}
         run: npm run build-${{ matrix.os }}
   ```

2. **Create Installer Packages**
   - macOS: .dmg and .zip
   - Windows: .exe installer
   - Linux: .deb, .rpm, .AppImage

3. **Implement Auto-Update System**
   - GitHub Releases integration
   - In-app update notifications
   - Seamless update process

**Deliverables:**
- Multi-platform build pipeline
- Installer packages for all OS
- Auto-update system

### Week 14: Documentation & Community
**Objective:** Complete documentation and community infrastructure

**Tasks:**
1. **Create User Documentation**
   - Getting started guide
   - Video tutorials
   - API reference
   - Troubleshooting guide

2. **Set up Community Infrastructure**
   - Discord server with moderation
   - GitHub Discussions categories
   - Contribution guidelines
   - Code of conduct

3. **Prepare Marketing Materials**
   - Website with features showcase
   - Comparison with competitors
   - Case studies and testimonials

**Deliverables:**
- Complete documentation suite
- Community infrastructure
- Marketing website
- Release announcement

---

## Technical Architecture Details

### Agent Communication Protocol
```xml
<!-- Task Delegation Format -->
<delegate>
  <agent>executor</agent>
  <task_id>task-001</task_id>
  <task_description>Add loading state to component</task_description>
  <input_files>
    <file path="src/components/Button.tsx" lines="1-50"/>
  </input_files>
  <constraints>
    <constraint>Use existing Spinner component</constraint>
    <constraint>Maintain TypeScript strict mode</constraint>
  </constraints>
</delegate>

<!-- Verification Request Format -->
<verify>
  <files>
    <file path="src/components/Button.tsx"/>
    <file path="src/components/Button.test.tsx"/>
  </files>
  <checks>
    <check type="syntax"/>
    <check type="type"/>
    <check type="lint" rules="strict"/>
    <check type="test" pattern="**/*.test.tsx"/>
  </checks>
</verify>
```

### Semantic Search Architecture
```
Components:
1. Indexing Pipeline:
   File System → tree-sitter AST → Code Chunks → Embeddings → Vector DB
   
2. Search Pipeline:
   Query → Embedding → Vector Search → Re-ranking → Results
   
3. Hybrid Search:
   Vector Similarity (70%) + Keyword Matching (30%) = Final Score
```

### Performance Targets
- **Response Time:** <2s for simple tasks, <30s for complex tasks
- **Memory Usage:** <500MB for semantic search index
- **Build Time:** <10 minutes for full production build
- **Startup Time:** <3s cold start, <1s warm start

---

## Risk Mitigation Strategy

### Technical Risks
1. **VS Code Dependency Risk**
   - **Mitigation:** Create abstraction layer for VS Code APIs
   - **Fallback:** Maintain compatibility with last 3 VS Code versions

2. **LLM API Changes**
   - **Mitigation:** Support multiple providers with failover
   - **Monitoring:** API health checks and automatic switching

3. **Performance Scaling**
   - **Mitigation:** Implement caching at all layers
   - **Optimization:** Lazy loading and incremental processing

### Community Risks
1. **Contributor Burnout**
   - **Solution:** Clear contribution boundaries
  
