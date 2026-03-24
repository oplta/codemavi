# Code Mavi IDE Agent System

## Introduction

Code Mavi IDE implements a sophisticated multi-agent system designed to handle complex software development tasks with intelligence, precision, and reliability. Unlike traditional AI assistants that operate as monolithic systems, Code Mavi IDE decomposes tasks across specialized agents that collaborate through well-defined interfaces and feedback loops.

## The Triple Agent Architecture

### 🧠 Orchestrator Agent - The Strategic Planner

**Primary Role:** System-level thinking and coordination
**Analogy:** Project manager + architect + quality assurance lead

**Key Responsibilities:**
- **Request Analysis:** Understand user intent and requirements
- **Context Gathering:** Use semantic search to find relevant code
- **Task Decomposition:** Break complex problems into manageable subtasks
- **Resource Allocation:** Assign tasks to appropriate agents
- **Progress Monitoring:** Track execution and handle exceptions
- **Quality Assurance:** Ensure final output meets standards

**System Prompt Location:** `src/vs/workbench/contrib/mavi/common/mavi-logic/agents/orchestrator-prompt.md`

**Critical Capabilities:**
- **Semantic Understanding:** Goes beyond keyword matching to understand code semantics
- **Strategic Planning:** Creates execution plans with dependency analysis
- **Risk Management:** Implements checkpoints before significant changes
- **Adaptive Learning:** Learns from verification feedback to improve future tasks

### 🛠️ Executor Agent - The Precise Implementer

**Primary Role:** Code modification and implementation
**Analogy:** Senior developer + code reviewer

**Key Responsibilities:**
- **Code Generation:** Produce correct, idiomatic code changes
- **Semantic Diff Creation:** Generate precise search/replace blocks
- **Style Consistency:** Maintain project conventions and patterns
- **Error Handling:** Implement robust error handling patterns
- **Documentation:** Update comments and documentation as needed

**System Prompt Location:** `src/vs/workbench/contrib/mavi/common/mavi-logic/agents/executor-prompt.md`

**Critical Capabilities:**
- **Precision Editing:** Makes minimal, targeted changes
- **Context Awareness:** Understands surrounding code context
- **Pattern Recognition:** Identifies and follows project patterns
- **Quality Focus:** Produces production-ready code

### 🔍 Verifier Agent - The Quality Guardian

**Primary Role:** Validation and quality assurance
**Analogy:** Automated testing suite + linter + security scanner

**Key Responsibilities:**
- **Syntax Validation:** Ensure code compiles/parses correctly
- **Type Checking:** Validate type safety and consistency
- **Lint Enforcement:** Apply project-specific style rules
- **Test Validation:** Run and verify relevant tests
- **Security Scanning:** Identify potential security issues
- **Performance Analysis:** Flag performance anti-patterns

**System Prompt Location:** `src/vs/workbench/contrib/mavi/common/mavi-logic/agents/verifier-prompt.md`

**Critical Capabilities:**
- **Comprehensive Testing:** Multiple validation layers
- **Actionable Feedback:** Specific, fixable error messages
- **Automated Fixing:** Can suggest automatic fixes for common issues
- **Continuous Improvement:** Learns from project-specific patterns

## Agent Collaboration Workflow

### Standard Execution Flow

```
1. User Request
   ↓
2. Orchestrator Activation
   ├── Analyze request complexity
   ├── Gather context via semantic search
   ├── Create execution plan with subtasks
   ├── Establish checkpoint for rollback
   ↓
3. For Each Subtask:
   ├── Orchestrator → Executor: Task specification
   ├── Executor: Generate semantic diff
   ├── Apply Model: Apply changes to files
   ├── Orchestrator → Verifier: Request validation
   ├── Verifier: Run comprehensive checks
   │   ├── If PASS: Continue to next subtask
   │   └── If FAIL: Return error details
   ↓
4. Error Recovery (if needed)
   ├── Orchestrator analyzes error
   ├── Updates task specification
   ├── Retries with Executor (max 3 attempts)
   ↓
5. Completion
   ├── Final verification pass
   ├── Checkpoint consolidation
   ├── User report generation
```

### Error Handling and Recovery

The agent system implements sophisticated error recovery:

1. **Error Classification:**
   - Syntax errors → Automatic retry with fix
   - Type errors → Context-aware correction
   - Lint violations → Style adjustment
   - Test failures → Logic refinement
   - Dependency issues → User consultation

2. **Retry Strategy:**
   - Maximum 3 attempts per subtask
   - Increasing context with each retry
   - Alternative approaches on subsequent attempts
   - Escalation to user after exhaustion

3. **Learning from Errors:**
   - Error patterns are logged
   - Successful fixes are remembered
   - Project-specific solutions are prioritized

## System Prompts Architecture

### Layered Prompt System

Code Mavi IDE uses a hierarchical prompt system that combines:

```
1. Base Agent Prompt (System-defined)
   ↓
2. Global User Rules (~/.mavi/global-rules.md)
   ↓
3. Project Rules (.mavi/rules.md)
   ↓
4. Dynamic Context (Current session state)
   ↓
5. Task-specific Instructions
```

### Prompt Transparency

Unlike closed systems, Code Mavi IDE exposes all prompts:

1. **Viewable:** Users can see exactly what instructions agents receive
2. **Editable:** Users can modify prompts for their specific needs
3. **Versionable:** Prompts can be saved and shared across projects
4. **Testable:** Prompt changes can be validated before use

### Custom Rules System

Users can define rules at multiple levels:

**Global Rules (`~/.mavi/global-rules.md`):**
```markdown
# Global Development Rules
- Always write descriptive commit messages
- Use conventional commits format
- Add tests for new functionality
- Document public APIs
```

**Project Rules (`.mavi/rules.md`):**
```markdown
# Project-Specific Rules
- Use TypeScript strict mode
- No 'any' types allowed
- Functional components only
- Tailwind CSS for styling
- Jest for testing
```

## Agent Communication Protocol

### Task Delegation Format

Orchestrator delegates tasks using structured XML-like format:

```xml
<delegate>
  <agent>executor</agent>
  <task_id>task-001</task_id>
  <task_description>
    Add loading state to UserProfile component
  </task_description>
  <input_files>
    <file path="src/components/UserProfile.tsx" lines="1-50"/>
    <file path="src/types/user.ts" lines="10-30"/>
  </input_files>
  <expected_output>
    - Add loading prop to UserProfileProps interface
    - Show spinner when loading=true
    - Disable interactive elements during loading
  </expected_output>
  <constraints>
    - Use existing Spinner component
    - Maintain accessibility standards
    - Update tests accordingly
  </constraints>
</delegate>
```

### Verification Request Format

```xml
<delegate>
  <agent>verifier</agent>
  <verification_id>verify-001</verification_id>
  <files_to_verify>
    <file path="src/components/UserProfile.tsx"/>
    <file path="src/components/UserProfile.test.tsx"/>
  </files_to_verify>
  <verification_types>
    <syntax/>
    <type_check/>
    <lint rules="project"/>
    <test pattern="**/*.test.tsx"/>
  </verification_types>
</delegate>
```

## Agent Tools and Capabilities

### Core Toolset

Each agent has access to specialized tools:

**Orchestrator Tools:**
- `search_codebase(query, topK)` - Semantic code search
- `create_checkpoint(reason)` - Safe rollback points
- `ask_user(question, options)` - Interactive clarification
- `delegate_to_executor(task)` - Task assignment
- `delegate_to_verifier(files)` - Quality validation

**Executor Tools:**
- `read_file(path, lines?)` - File content reading
- `generate_diff(file, changes)` - Semantic diff creation
- `apply_changes(diff)` - File modification
- `search_pattern(pattern, files)` - Pattern matching

**Verifier Tools:**
- `lint_file(path)` - Code style validation
- `type_check(files)` - Type safety verification
- `run_tests(pattern)` - Test execution
- `analyze_security(files)` - Security scanning

### Tool Execution Model

1. **Declarative Interface:** Tools are described in TypeScript interfaces
2. **Runtime Binding:** Tools are bound to actual implementations at runtime
3. **Error Handling:** Tool failures are caught and handled gracefully
4. **Result Validation:** Tool outputs are validated before use

## Performance Characteristics

### Token Usage Optimization

The agent system optimizes token usage through:

1. **Context Pruning:** Only relevant context is included
2. **Result Caching:** Repeated operations use cached results
3. **Streaming Responses:** Progressive disclosure of results
4. **Model Selection:** Appropriate models for each task type

### Parallel Execution

Multiple agents can work in parallel:

```
Orchestrator
  ├── Executor (Task A) ──┐
  ├── Executor (Task B) ──┤ → Verifier (Batch)
  └── Executor (Task C) ──┘
```

### Resource Management

- **Memory:** Context windows are managed efficiently
- **CPU:** Intensive operations are offloaded to background
- **Network:** API calls are batched and rate-limited
- **Storage:** Intermediate results are cached appropriately

## Customization and Extension

### Creating Custom Agents

Developers can create custom agents by:

1. **Defining Agent Interface:**
```typescript
interface ICustomAgent {
  readonly role: string;
  readonly capabilities: string[];
  execute(task: AgentTask): Promise<AgentResult>;
}
```

2. **Implementing Agent Logic:**
```typescript
class CodeReviewAgent implements ICustomAgent {
  readonly role = 'code_reviewer';
  readonly capabilities = ['review', 'suggest', 'approve'];
  
  async execute(task: AgentTask): Promise<AgentResult> {
    // Implementation
  }
}
```

3. **Registering with System:**
```typescript
agentRegistry.register('code_reviewer', new CodeReviewAgent());
```

### Extending Agent Capabilities

New tools can be added through:

1. **Tool Definition:** Define tool interface and parameters
2. **Implementation:** Create the actual tool implementation
3. **Registration:** Register tool with agent system
4. **Documentation:** Document tool usage and examples

## Best Practices for Agent Usage

### Effective Task Formulation

**Do:**
- Be specific about requirements and constraints
- Provide relevant context and examples
- Break complex tasks into subtasks
- Define success criteria clearly

**Don't:**
- Use vague or ambiguous language
- Assume agent knows project specifics
- Request too many changes at once
- Forget to specify edge cases

### Rule Definition Guidelines

1. **Be Specific:** Clear, unambiguous rules
2. **Be Consistent:** Avoid contradictory rules
3. **Be Practical:** Rules that can actually be followed
4. **Be Maintainable:** Organized, commented rule files

### Performance Optimization

1. **Use Checkpoints:** Before major changes
2. **Review Plans:** Before execution begins
3. **Monitor Progress:** During execution
4. **Validate Results:** After completion

## Troubleshooting Common Issues

### Agent Stuck in Loop

**Symptoms:**
- Repeated retries without progress
- Same error recurring
- No user escalation

**Solutions:**
1. Check `.mavi/rules.md` for conflicting rules
2. Review agent logs for error patterns
3. Use checkpoint to rollback and retry
4. Simplify the task and try again

### Poor Quality Results

**Symptoms:**
- Code doesn't compile
- Tests fail
- Style violations

**Solutions:**
1. Strengthen project rules
2. Provide more context
3. Use more specific task descriptions
4. Enable stricter verification

### Performance Issues

**Symptoms:**
- Slow response times
- High token usage
- Memory pressure

**Solutions:**
1. Optimize context selection
2. Use appropriate model sizes
3. Implement caching
4. Batch similar operations

## Future Agent Developments

### Planned Enhancements

1. **Learning Agents:** Agents that improve over time
2. **Specialized Agents:** Domain-specific expertise
3. **Collaborative Agents:** Multiple agents working together
4. **Autonomous Agents:** Self-directed task execution

### Research Directions

1. **Agent Communication:** More sophisticated inter-agent protocols
2. **Knowledge Sharing:** Cross-project learning
3. **Adaptive Prompts:** Dynamic prompt optimization
4. **Human-AI Collaboration:** Enhanced interaction patterns

---

*The Code Mavi IDE agent system represents a significant advancement in AI-assisted development, combining the precision of specialized agents with the flexibility of open, transparent prompts. This architecture enables developers to harness AI capabilities while maintaining control, understanding, and quality throughout the development process.*