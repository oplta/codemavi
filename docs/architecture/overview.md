# Code Mavi Architecture Overview

## Vision: Agent-First IDE

Code Mavi is built on the principle that AI-assisted development should be **transparent, controllable, and intelligent**. Unlike traditional AI coding assistants that operate as black boxes, Code Mavi exposes its reasoning process, allows user intervention at every step, and implements a sophisticated multi-agent system for complex task execution.

## Core Philosophy

### 1. Transparency Over Obscurity
- All system prompts are visible and editable
- Every agent decision is traceable
- Users can see exactly how their code is being modified

### 2. Intelligence Through Specialization
- Different agents for different tasks (Orchestrator, Executor, Verifier)
- Each agent optimized for specific responsibilities
- Collaborative workflow with feedback loops

### 3. User Control and Safety
- Custom rules per project and globally
- Checkpoint system for safe experimentation
- Approval workflow for significant changes

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Sidebar   │  │   Editor    │  │   Terminal  │         │
│  │   Chat      │  │   Tools     │  │   Output    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 Agent Orchestration Layer                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Orchestrator Agent                      │  │
│  │  • Request Analysis                                  │  │
│  │  • Task Planning                                     │  │
│  │  • Resource Allocation                               │  │
│  │  • Progress Monitoring                               │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                          │
│    ┌────────────┼────────────┐                            │
│    ▼            ▼            ▼                            │
│  ┌──────┐    ┌──────┐    ┌──────┐                         │
│  │Context│    │Executor│   │Verifier│                      │
│  │Agent  │    │Agent  │   │Agent  │                      │
│  └──────┘    └──────┘    └──────┘                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 Codebase Intelligence Layer                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Semantic Search Engine                   │  │
│  │  • Vector Database (SQLite + vec0)                   │  │
│  │  • AST Parsing (tree-sitter)                         │  │
│  │  • Embedding Generation                               │  │
│  │  • Hybrid Search (Keyword + Semantic)                │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 LLM Provider Layer                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ DeepSeek│ │  Zhipu  │ │  Ollama │ │ OpenAI  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Anthropic│ │  Groq   │ │Together │ │  Custom │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Agent System Architecture

### 1. Orchestrator Agent (The Brain)

**Purpose:** Strategic planning and coordination
**Model:** High-capacity LLM (GPT-4o, Claude Opus, DeepSeek Chat)
**Responsibilities:**
- Analyze user requests and understand intent
- Research codebase using semantic search
- Create detailed execution plans
- Delegate tasks to specialized agents
- Monitor progress and handle errors
- Generate comprehensive reports

**Key Features:**
- Multi-step planning with dependency analysis
- Context gathering from entire codebase
- Checkpoint management for rollback safety
- User interaction for approval of major changes

### 2. Executor Agent (The Hands)

**Purpose:** Precise code modification
**Model:** Fast, cost-effective LLM (GPT-3.5, Claude Haiku, DeepSeek Coder)
**Responsibilities:**
- Execute specific coding tasks
- Generate semantic diffs (search/replace blocks)
- Maintain code style and project conventions
- Handle file creation and modification

**Key Features:**
- Semantic diff generation for precise changes
- Support for multiple edit types (search/replace, rewrite, new file)
- Integration with project-specific rules
- Error recovery and retry mechanisms

### 3. Verifier Agent (The Quality Gate)

**Purpose:** Code quality assurance
**Model:** Specialized for code analysis
**Responsibilities:**
- Syntax validation and error detection
- Type checking and lint rule enforcement
- Test execution and validation
- Performance and security analysis

**Key Features:**
- Multi-stage verification pipeline
- Detailed error reporting with suggestions
- Integration with project build systems
- Automated fix suggestions

## Codebase Intelligence System

### Semantic Search Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Code Parsing  │───▶│   Embedding     │───▶│   Vector Store  │
│   • tree-sitter │    │   Generation    │    │   • SQLite      │
│   • AST walking │    │   • Local/Cloud │    │   • vec0 ext    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                         ┌───────▼───────┐
                         │  Query Engine │
                         │  • Hybrid     │
                         │  • Re-ranking │
                         └───────┬───────┘
                                 │
                         ┌───────▼───────┐
                         │   Results     │
                         │  • Snippets   │
                         │  • Scores     │
                         └───────────────┘
```

### Components:

1. **AST Parser (tree-sitter):**
   - Language-aware code parsing
   - Symbol extraction and relationship mapping
   - Chunk generation with semantic boundaries

2. **Embedding Service:**
   - Support for multiple embedding models
   - Batch processing for efficiency
   - Local (Ollama) and cloud (OpenAI) options

3. **Vector Database:**
   - SQLite with vec0 extension
   - Efficient similarity search
   - Incremental updates

4. **Query Engine:**
   - Hybrid search (keyword + semantic)
   - Result re-ranking with cross-encoder
   - Context-aware filtering

## Data Flow Architecture

### Typical Workflow

```
1. User Request
   │
   ▼
2. Orchestrator Analysis
   ├── Semantic search for context
   ├── Plan generation with subtasks
   └── Checkpoint creation
   │
   ▼
3. Task Execution Loop
   ├── For each subtask:
   │   ├── Executor: Generate semantic diff
   │   ├── Apply Model: Apply changes
   │   └── Verifier: Validate changes
   │       ├── If error: Retry (max 3)
   │       └── If success: Next task
   │
   ▼
4. Completion & Reporting
   ├── Final verification
   ├── Checkpoint consolidation
   └── User report generation
```

### Error Recovery Flow

```
1. Error Detection
   │
   ▼
2. Error Classification
   ├── Syntax error → Executor retry
   ├── Type error → Executor retry
   ├── Lint error → Executor retry
   ├── Test failure → Executor retry
   └── Logic error → User intervention
   │
   ▼
3. Retry Mechanism
   ├── Error context provided to Executor
   ├── Modified approach attempted
   └── Max 3 retries per task
   │
   ▼
4. Escalation
   └── If still failing → User notification
```

## Integration Points

### VS Code Integration

Code Mavi extends VS Code through:

1. **Workbench Contributions:**
   - Custom sidebar panels
   - Enhanced editor capabilities
   - Integrated terminal tools

2. **Service Architecture:**
   - Singleton services for state management
   - Event-driven communication
   - Resource lifecycle management

3. **UI Components:**
   - React-based interface components
   - VS Code theme integration
   - Responsive design patterns

### LLM Provider Integration

**Provider Manager Features:**
- Unified interface for multiple providers
- Automatic failover and load balancing
- Token usage tracking and optimization
- Streaming support for real-time responses

**Supported Providers:**
- Local: Ollama, LocalAI
- Cloud: OpenAI, Anthropic, DeepSeek, Zhipu AI
- Open Source: Together AI, Groq, Hugging Face

## Security and Safety Architecture

### 1. Code Modification Safety
- **Checkpoint System:** Automatic snapshots before changes
- **Dry Run Mode:** Preview changes without application
- **Approval Workflow:** User confirmation for significant changes
- **Rollback Mechanism:** One-click restoration to previous states

### 2. Data Privacy
- **Local Processing:** Option to run everything locally
- **Configurable Data Sharing:** Control what gets sent to cloud providers
- **Encrypted Storage:** Secure credential management
- **Audit Logging:** Track all agent actions and decisions

### 3. Resource Management
- **Token Budgeting:** Control LLM usage costs
- **Rate Limiting:** Prevent runaway agent loops
- **Memory Management:** Efficient context handling
- **Performance Monitoring:** Real-time system health checks

## Scalability and Performance

### Horizontal Scaling
- **Parallel Agent Execution:** Multiple agents can work simultaneously
- **Distributed Processing:** Codebase indexing can be distributed
- **Caching Layer:** Frequently accessed code chunks are cached

### Vertical Optimization
- **Lazy Loading:** Code intelligence loads on demand
- **Incremental Updates:** Only changed files are re-indexed
- **Background Processing:** Non-critical tasks run in background

## Extension Points

### 1. Custom Agents
Developers can create specialized agents for:
- Domain-specific tasks (React, Python, Rust)
- Custom validation rules
- Integration with external tools

### 2. Tool Extensions
- New semantic search backends
- Additional LLM providers
- Custom code analysis tools

### 3. UI Customization
- Custom sidebar views
- Enhanced editor integrations
- Project-specific workflows

## Future Architecture Directions

### 1. Distributed Agent Networks
- Multiple agents collaborating across projects
- Shared knowledge bases
- Federated learning from community patterns

### 2. Advanced Code Understanding
- Cross-file dependency analysis
- Architectural pattern recognition
- Performance optimization suggestions

### 3. Collaborative Features
- Multi-user agent sessions
- Team knowledge sharing
- Code review automation

---

*This architecture enables Code Mavi to provide intelligent, transparent, and controllable AI-assisted development while maintaining the flexibility and extensibility of the open-source ecosystem.*