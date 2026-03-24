# Code Mavi IDE Implementation Guide
## Bridging Vision to Reality

**Based on:** `plan.md` strategic vision and current codebase analysis  
**Target Audience:** Core developers, contributors, and technical stakeholders  
**Last Updated:** $(date)  
**Codebase Version:** 1.99.3 (VS Code fork)

---

## Executive Summary

This guide translates the strategic vision from `plan.md` into actionable technical implementation steps. Code Mavi IDE aims to become the first open-source, agent-first IDE that combines Cursor's intelligence with Void's openness, while avoiding the architectural pitfalls that limited Void's success.

### Core Thesis from plan.md
> "Void neden öldü? Provider eklediler, UI yaptılar, ama **agent beyni yoktu.**  
> Cursor'u öldürmek için provider sayısı değil — **daha iyi agent mimarisi** gerekiyor."

This insight drives our entire implementation strategy.

---

## Current State Assessment

### ✅ What We Have (Phase 0-1 Complete)

1. **Void Fork Foundation**
   - Working VS Code fork with Code Mavi IDE branding
   - Basic UI components and services
   - Development environment established

2. **Agent System Design**
   - Triple agent architecture fully documented
   - Detailed system prompts for Orchestrator, Executor, Verifier
   - Tool framework interfaces defined
   - Communication protocols specified

3. **Documentation Infrastructure**
   - Comprehensive architecture documentation
   - Development guidelines
   - User guides framework

### ❌ What's Missing (Critical Gaps)

1. **No Semantic Search** (Phase 2 incomplete)
2. **No Agent Execution** (Phase 3 not started)  
3. **No Provider System** (Phase 5 not started)
4. **No Build Pipeline** (Phase 6 not started)

### 📊 Progress Against plan.md Phases

| Phase | Status | Completion | Critical Items |
|-------|--------|------------|----------------|
| 0: Void Fork + Orientation | ✅ Complete | 100% | Codebase analysis done |
| 1: Branding + Stabilization | ⚠️ Partial | 70% | Telemetry removal pending |
| 2: Codebase Intelligence | ❌ Not Started | 0% | Semantic search missing |
| 3: Agent Loop | ⚠️ Design Only | 30% | No implementation |
| 4: System Prompt + Rules | ✅ Foundation | 50% | UI components missing |
| 5: Provider + Auto Dev | ❌ Not Started | 0% | Stub implementations only |
| 6: Release Preparation | ❌ Not Started | 0% | No build pipeline |

---

## Phase 2: Codebase Intelligence Implementation

### 🎯 Objective
Implement semantic search and code understanding capabilities that Void lacked but Cursor mastered.

### 📋 Critical Components from plan.md Analysis

```
Cursor's Three-Layer Architecture (from plan.md):
1. Understanding Layer → Semantic codebase indexing
2. Execution Layer → Main agent + sub-agents  
3. Application Layer → Separate "apply model"
```

### 🛠️ Implementation Steps

#### Week 1: AST Parsing Foundation
**Goal:** Language-aware code analysis

```typescript
// File: src/vs/workbench/contrib/mavi/common/mavi-logic/services/ast-service.ts
export class ASTService {
  private parsers: Map<string, Parser> = new Map();
  
  async initialize(): Promise<void> {
    // Load tree-sitter grammars for supported languages
    await this.loadGrammar('javascript');
    await this.loadGrammar('typescript');
    await this.loadGrammar('python');
    await this.loadGrammar('rust');
  }
  
  async parseFile(uri: URI): Promise<ASTNode> {
    const content = await this.readFile(uri);
    const language = this.detectLanguage(uri);
    return this.parseWithTreeSitter(content, language);
  }
  
  async extractSymbols(ast: ASTNode): Promise<CodeSymbol[]> {
    // Extract functions, classes, interfaces, imports, exports
    return this.walkAST(ast);
  }
}
```

**Deliverables:**
- [ ] tree-sitter integration for 4 core languages
- [ ] AST parsing service with symbol extraction
- [ ] Code chunking algorithm (50 lines with 10-line overlap)

#### Week 2: Vector Database Setup
**Goal:** Efficient similarity search with SQLite + vec0

```typescript
// File: src/vs/workbench/contrib/mavi/common/mavi-logic/services/vector-db-service.ts
export class VectorDBService {
  private db: Database;
  private readonly DIMENSIONS = 768; // nomic-embed-text dimensions
  
  async initialize(dbPath: string): Promise<void> {
    this.db = new Database(dbPath);
    
    // Enable vec0 extension
    await this.db.exec('LOAD vec0');
    
    // Create chunks table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_chunks (
        id TEXT PRIMARY KEY,
        uri TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        embedding BLOB NOT NULL,
        created_at INTEGER NOT NULL
      );
      
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts 
      USING vec0(embedding, dimensions=${this.DIMENSIONS});
    `);
  }
  
  async searchSimilar(
    queryEmbedding: number[],
    topK: number = 10
  ): Promise<SearchResult[]> {
    const results = await this.db.all(`
      SELECT c.*, 
             vec0_distance(c.embedding, ?) as distance
      FROM code_chunks c
      JOIN chunks_fts f ON c.id = f.rowid
      ORDER BY distance ASC
      LIMIT ?
    `, [JSON.stringify(queryEmbedding), topK]);
    
    return results.map(r => ({
      uri: URI.parse(r.uri),
      score: 1 - r.distance, // Convert distance to similarity score
      snippet: r.content,
      lineStart: r.line_start,
      lineEnd: r.line_end
    }));
  }
}
```

**Deliverables:**
- [ ] SQLite + vec0 database setup
- [ ] Chunk storage and retrieval
- [ ] Similarity search implementation

#### Week 3: Embedding Service
**Goal:** Multiple embedding model support with fallback

```typescript
// File: src/vs/workbench/contrib/mavi/common/mavi-logic/services/embedding-service.ts
export interface EmbeddingConfig {
  provider: 'ollama' | 'openai' | 'local';
  model: string;
  dimensions: number;
  apiKey?: string;
  baseUrl?: string;
}

export class EmbeddingService {
  private config: EmbeddingConfig;
  
  constructor(config: EmbeddingConfig) {
    this.config = config;
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    switch (this.config.provider) {
      case 'ollama':
        return this.callOllama(text);
      case 'openai':
        return this.callOpenAI(text);
      case 'local':
        return this.localEmbedding(text);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }
  
  private async callOllama(text: string): Promise<number[]> {
    // Default: nomic-embed-text (768 dimensions, free, local)
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      })
    });
    
    const data = await response.json();
    return data.embedding;
  }
  
  async batchEmbed(chunks: CodeChunk[]): Promise<EmbeddingResult[]> {
    // Batch processing for efficiency
    const batchSize = 32;
    const results: EmbeddingResult[] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await Promise.all(
        batch.map(chunk => this.generateEmbedding(chunk.content))
      );
      
      batch.forEach((chunk, index) => {
        results.push({
          chunkId: chunk.id,
          embedding: embeddings[index]
        });
      });
    }
    
    return results;
  }
}
```

**Deliverables:**
- [ ] Ollama embedding integration (default)
- [ ] OpenAI embedding fallback
- [ ] Batch processing for efficiency
- [ ] Configuration UI for model selection

#### Week 4: Search API Integration
**Goal:** Complete semantic search system

```typescript
// File: src/vs/workbench/contrib/mavi/common/mavi-logic/services/semantic-search-service.ts
export class SemanticSearchService {
  private astService: ASTService;
  private embeddingService: EmbeddingService;
  private vectorDB: VectorDBService;
  
  async indexWorkspace(workspaceRoot: URI): Promise<IndexingResult> {
    const files = await this.scanWorkspace(workspaceRoot);
    let chunksIndexed = 0;
    
    for (const file of files) {
      // Parse file to AST
      const ast = await this.astService.parseFile(file);
      
      // Extract and chunk code
      const chunks = await this.astService.chunkCode(ast, file);
      
      // Generate embeddings
      const embeddings = await this.embeddingService.batchEmbed(chunks);
      
      // Store in vector DB
      for (let i = 0; i < chunks.length; i++) {
        await this.vectorDB.storeChunk(chunks[i], embeddings[i].embedding);
        chunksIndexed++;
      }
    }
    
    return {
      filesIndexed: files.length,
      chunksIndexed,
      durationMs: Date.now() - startTime
    };
  }
  
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // Vector similarity search
    const vectorResults = await this.vectorDB.searchSimilar(queryEmbedding, 50);
    
    // Keyword search (fallback)
    const keywordResults = await this.keywordSearch(query, 50);
    
    // Hybrid ranking: 70% semantic, 30% keyword
    const hybridResults = this.hybridRank(vectorResults, keywordResults);
    
    // Re-rank with cross-encoder (optional)
    if (options.reRank) {
      return await this.reRank(hybridResults, query, options.topK || 10);
    }
    
    return hybridResults.slice(0, options.topK || 10);
  }
  
  private hybridRank(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[]
  ): SearchResult[] {
    // Reciprocal Rank Fusion (RRF)
    const scores = new Map<string, number>();
    
    vectorResults.forEach((result, index) => {
      const score = scores.get(result.uri.toString()) || 0;
      scores.set(result.uri.toString(), score + (1 / (60 + index + 1)));
    });
    
    keywordResults.forEach((result, index) => {
      const score = scores.get(result.uri.toString()) || 0;
      scores.set(result.uri.toString(), score + (1 / (60 + index + 1)));
    });
    
    // Convert to array and sort
    return Array.from(scores.entries())
      .map(([uri, score]) => ({
        uri: URI.parse(uri),
        score,
        snippet: '', // Would need to retrieve from results
        lineStart: 0,
        lineEnd: 0
      }))
      .sort((a, b) => b.score - a.score);
  }
}
```

**Deliverables:**
- [ ] Complete semantic search API
- [ ] Hybrid search (vector + keyword)
- [ ] Re-ranking with cross-encoder
- [ ] Integration with agent system

---

## Phase 3: Agent Loop Implementation

### 🎯 Objective
Implement the triple-agent system with self-correction that Void completely missed.

### 📋 Critical Insight from plan.md
> "Cursor'un en büyük sırrı: Ana agent hiç dosya yazmıyor.  
> Ana model sadece 'semantic diff' üretiyor.  
> Ayrı bir ucuz/hızlı 'apply model' bunu gerçek koda çeviriyor."

### 🛠️ Implementation Steps

#### Week 5: Core Agent Infrastructure
**Goal:** Agent execution framework

```typescript
// File: src/vs/workbench/contrib/mavi/common/mavi-logic/agents/agent-system.ts
export interface AgentTask {
  id: string;
  description: string;
  context: AgentContext;
  dependencies?: string[];
  retryCount: number;
  maxRetries: number;
}

export interface AgentContext {
  relevantFiles: URI[];
  searchResults: SearchResult[];
  projectRules: RuleSet;
  userPreferences: UserPreferences;
}

export class AgentSystem {
  private orchestrator: OrchestratorAgent;
  private executors: Map<string, ExecutorAgent> = new Map();
  private verifiers: Map<string, VerifierAgent> = new Map();
  private taskQueue: TaskQueue;
  
  async initialize(): Promise<void> {
    this.orchestrator = new OrchestratorAgent();
    
    // Register specialized executors
    this.executors.set('typescript', new TypeScriptExecutor());
    this.executors.set('python', new PythonExecutor());
    this.executors.set('rust', new RustExecutor());
    
    // Register verifiers
    this.verifiers.set('syntax', new SyntaxVerifier());
    this.verifiers.set('types', new TypeVerifier());
    this.verifiers.set('tests', new TestVerifier());
    
    this.taskQueue = new TaskQueue();
  }
  
  async executeUserRequest(request: string): Promise<ExecutionResult> {
    // 1. Create checkpoint for safety
    const checkpointId = await this.checkpointService.createCheckpoint(
      `Before: ${request.substring(0, 50)}...`
    );
    
    try {
      // 2. Orchestrator analyzes and plans
      const plan = await this.orchestrator.analyzeAndPlan(request);
      
      // 3. Execute plan with monitoring
      const results = await this.executePlan(plan);
      
      // 4. Generate comprehensive report
      const report = this.generateReport(plan, results);
      
      return {
        success: true,
        checkpointId,
        report,
        changes: results
      };
    } catch (error) {
      // 5. Rollback on failure
      await this.checkpointService.restoreCheckpoint(checkpointId);
      
      return {
        success: false,
        checkpointId,
        error: error.message,
        suggestions: this.suggestFix(error)
      };
    }
  }
  
  private async executePlan(plan: ExecutionPlan): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    
    for (const task of plan.tasks) {
      let success = false;
      let attempt = 0;
      
      while (!success && attempt < task.maxRetries) {
        attempt++;
        
        try {
          // Delegate to appropriate executor
          const executor = this.selectExecutor(task);
          const diff = await executor.execute(task);
          
          // Apply changes
          await this.applyModel.applyDiff(diff);
          
          // Verify changes
          const verification = await this.verifyChanges(task, diff);
          
          if (verification.success) {
            success = true;
            results.push({
              taskId: task.id,
              success: true,
              diff,
              verification
            });
          } else {
            // Self-correction: Update task with error context
            task.context = this.enhanceContextWithError(
              task.context,
              verification.errors
            );
            task.retryCount++;
          }
        } catch (error) {
          task.retryCount++;
          // Continue to next attempt
        }
      }
      
      if (!success) {
        throw new MaxRetriesExceededError(task.id, attempt);
      }
    }
    
    return results;
  }
}
```

**Deliverables:**
- [ ] Agent system core framework
- [ ] Task queue and execution pipeline
- [ ] Checkpoint integration
- [ ] Error handling infrastructure

#### Week 6: Specialized Agent Implementation
**Goal:** Orchestrator, Executor, and Verifier agents

```typescript
// File: src/vs/workbench/contrib/mavi/common/mavi-logic/agents/orchestrator-agent.ts
export class OrchestratorAgent extends BaseAgent {
  readonly role = 'orchestrator';
  readonly capabilities = ['analyze', 'plan', 'delegate', 'monitor'];
  
  async analyzeAndPlan(request: string): Promise<ExecutionPlan> {
    // 1. Semantic search for context
    const searchResults = await this.semanticSearch.search(
      request,
      { topK: 20, reRank: true }
    );
    
    // 2. Read relevant files
    const relevantFiles = await this.gatherContext(searchResults);
    
    // 3. LLM-based planning (using system prompt from orchestrator-prompt.md)
    const plan = await this.llmService.generatePlan({
      request,
      context: {
        files: relevantFiles,
        searchResults: searchResults.slice(0, 5),
        rules: this.ruleService.getActiveRules()
      },
      systemPrompt: this.loadSystemPrompt('orchestrator')
    });
    
    // 4. Validate and optimize plan
    return this.validatePlan(plan);
  }
  
  private async gatherContext(searchResults: SearchResult[]): Promise<FileContext[]> {
    const contexts: FileContext[] = [];
    
    for (const result of searchResults.slice(0, 10)) {
      const content = await this.fileService.readFile(result.uri);
      const symbols = await this.astService.extractSymbols(result.uri);
      
      contexts.push({
        uri: result.uri,
        content: content.substring(0, 5000), // Limit context
        symbols,
        relevance: result.score
      });
    }
    
    return contexts;
  }
}
```

```typescript
// File: src/vs/workbench/contrib/mavi/common/mavi-logic/agents/executor-agent.ts
export class TypeScriptExecutor extends BaseAgent {
  readonly role = 'executor';
  readonly capabilities = ['edit', 'create', 'refactor'];
  
  async execute(task: AgentTask): Promise<SemanticDiff> {
    // 1. Read target files
    const files = await Promise.all(
      task.context.relevantFiles.map