# Contributing to Code Mavi

Thank you for your interest in contributing to Code Mavi! This guide will help you understand our development process and how to contribute effectively.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Contribution Areas](#contribution-areas)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

We are committed to fostering a welcoming and inclusive community. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm 8 or higher
- Git
- Basic understanding of TypeScript and React

### First-Time Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub first, then:
   git clone https://github.com/YOUR_USERNAME/codemavi.git
   cd codemavi
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   # Development build (watch mode)
   npm run watch
   
   # Or for a one-time build:
   npm run compile
   ```

4. **Launch Code Mavi**
   ```bash
   # macOS/Linux
   ./scripts/code.sh
   
   # Windows
   ./scripts/code.bat
   ```

## Development Environment

### Recommended Tools
- **VS Code** (with TypeScript and ESLint extensions)
- **Node.js 18+**
- **Git** with commit signing enabled
- **Docker** (optional, for testing)

### Environment Variables

Create a `.env` file in the project root for development:

```bash
# LLM Provider API Keys (for testing)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=...

# Development flags
CODEMAVI_DEV_MODE=true
CODEMAVI_LOG_LEVEL=debug
CODEMAVI_ENABLE_TELEMETRY=false
```

### Common Development Commands

```bash
# Start development server
npm run watch

# Run tests
npm test
npm run test-browser  # Browser tests
npm run test-node     # Node.js tests

# Lint code
npm run eslint
npm run stylelint

# Type checking
npm run tsec-compile-check
npm run vscode-dts-compile-check

# Build for production
npm run compile
npm run minify-vscode

# Clean build artifacts
npm run clean
```

## Project Structure

```
mavi-ide/
├── src/vs/workbench/contrib/mavi/     # Core Code Mavi functionality
│   ├── common/                       # Shared code (both main and renderer)
│   │   ├── mavi-logic/              # Agent system core
│   │   │   ├── agents/              # Agent prompts and logic
│   │   │   ├── tools/               # Tool definitions
│   │   │   └── rules.md             # Rule templates
│   │   ├── services/                # Core services
│   │   └── types/                   # Type definitions
│   ├── browser/                     # Renderer process code
│   │   ├── components/              # React components
│   │   ├── services/                # Browser services
│   │   └── ui/                      # UI utilities
│   └── electron-main/               # Main process code
├── extensions/                      # VS Code extensions
├── intelligence/                    # AI intelligence modules
├── docs/                           # Documentation
├── test/                           # Tests
└── scripts/                        # Build and utility scripts
```

### Key Directories

1. **`src/vs/workbench/contrib/mavi/common/mavi-logic/`**
   - Heart of the agent system
   - Contains agent prompts, tool definitions, and core logic
   - Changes here affect all agent behavior

2. **`src/vs/workbench/contrib/mavi/browser/`**
   - User interface components
   - React-based views and services
   - Integration with VS Code workbench

3. **`src/vs/workbench/contrib/mavi/electron-main/`**
   - Main process extensions
   - Native integrations and system APIs
   - Provider management

## Contribution Areas

We welcome contributions in all areas! Here are some specific areas where help is especially valuable:

### 1. Agent System Improvements
- **Enhance agent prompts** in `mavi-logic/agents/`
- **Add new tools** to extend agent capabilities
- **Improve error handling** and recovery mechanisms
- **Optimize token usage** and context management

### 2. LLM Provider Integrations
- **Add new providers** (local or cloud)
- **Improve existing provider** implementations
- **Add provider-specific optimizations**
- **Implement fallback mechanisms**

### 3. User Interface
- **Improve existing UI components**
- **Add new views and panels**
- **Enhance user experience**
- **Improve accessibility**

### 4. Codebase Intelligence
- **Enhance semantic search**
- **Add new code analysis features**
- **Improve AST parsing and analysis**
- **Add language-specific optimizations**

### 5. Documentation
- **Improve existing documentation**
- **Add tutorials and guides**
- **Create API documentation**
- **Translate documentation**

### 6. Testing and Quality
- **Add unit tests**
- **Improve test coverage**
- **Add integration tests**
- **Enhance CI/CD pipelines**

### 7. Performance Optimization
- **Reduce bundle size**
- **Improve startup time**
- **Optimize memory usage**
- **Enhance caching mechanisms**

## Development Workflow

### 1. Find an Issue
- Check [GitHub Issues](https://github.com/codemavi/codemavi/issues)
- Look for issues labeled `good-first-issue` or `help-wanted`
- Or create a new issue if you have an idea

### 2. Discuss the Change
- Comment on the issue to express interest
- Discuss implementation approach
- Ask questions if anything is unclear

### 3. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 4. Make Changes
- Follow our [Code Standards](#code-standards)
- Write tests for new functionality
- Update documentation as needed

### 5. Test Your Changes
```bash
# Run all tests
npm test

# Run specific test suites
npm run test-browser
npm run test-node

# Lint your code
npm run eslint

# Type checking
npm run tsec-compile-check
```

### 6. Commit Your Changes
```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new LLM provider integration"
```

**Commit Message Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### 7. Push and Create Pull Request
```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub with:
- Clear description of changes
- Reference to related issue
- Screenshots for UI changes
- Test results

## Code Standards

### TypeScript Standards
- Use TypeScript strict mode
- No `any` types (use `unknown` or proper types)
- Explicit return types for public functions
- Use interfaces for object shapes
- Prefer `const` over `let`

### React Standards
- Use functional components
- Implement proper TypeScript interfaces for props
- Use hooks appropriately
- Follow React best practices
- Use CSS modules or styled-components

### Naming Conventions
- **Files:** kebab-case for all files
- **Variables:** camelCase
- **Constants:** UPPER_SNAKE_CASE
- **Types/Interfaces:** PascalCase
- **Components:** PascalCase

### Code Organization
- One component per file
- Group related functionality
- Use barrel exports (`index.ts`)
- Keep files under 300 lines when possible

### Comments and Documentation
- Use JSDoc for public APIs
- Add comments for complex logic
- Keep comments up-to-date
- Use TODO comments for future work

## Testing

### Test Structure
```
test/
├── unit/                    # Unit tests
│   ├── browser/            # Browser-specific tests
│   └── node/               # Node.js tests
├── integration/            # Integration tests
└── e2e/                    # End-to-end tests
```

### Writing Tests

**Unit Test Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { someFunction } from './some-module';

describe('someFunction', () => {
  it('should handle normal input', () => {
    const result = someFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle edge cases', () => {
    const result = someFunction('');
    expect(result).toBe('');
  });
});
```

**Integration Test Example:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentSystem } from '../src/agent-system';

describe('AgentSystem Integration', () => {
  let agentSystem: AgentSystem;

  beforeEach(() => {
    agentSystem = new AgentSystem();
  });

  it('should complete full agent workflow', async () => {
    const result = await agentSystem.executeTask('test task');
    expect(result.success).toBe(true);
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- test/unit/some-test.ts

# Watch mode
npm test -- --watch
```

## Pull Request Process

### PR Requirements
1. **Tests Pass:** All tests must pass
2. **Code Linted:** No ESLint errors
3. **Type Checking:** No TypeScript errors
4. **Documentation Updated:** Relevant docs updated
5. **Commit Messages:** Follow conventional commits

### Review Process
1. **Automated Checks:** CI runs tests and linting
2. **Code Review:** At least one maintainer reviews
3. **Feedback:** Address all review comments
4. **Merge:** Once approved, maintainer merges

### PR Labels
- `enhancement`: New features or improvements
- `bug`: Bug fixes
- `documentation`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test-related changes
- `dependencies`: Dependency updates

## Community

### Communication Channels
- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and discussions
- **Discord Server:** Real-time chat (link in README)
- **Weekly Meetings:** Community calls (announced in Discussions)

### Getting Help
- Check the [documentation](docs/) first
- Search existing issues and discussions
- Ask in GitHub Discussions
- Join our Discord server

### Recognition
Contributors are recognized in:
- GitHub contributor list
- Release notes
- Project documentation
- Community highlights

## Advanced Topics

### Working with Agent Prompts
Agent prompts are in Markdown format with special syntax:

```markdown
# Agent Prompt Template

## Role
[Agent role description]

## Rules
- [Rule 1]
- [Rule 2]

## Tools Available
- `tool_name(params)` - Description

## Output Format
[Expected output format]
```

When modifying prompts:
1. Test with various scenarios
2. Consider edge cases
3. Update documentation
4. Add examples if needed

### Adding New LLM Providers
1. Create provider class in `src/vs/workbench/contrib/mavi/common/providers/`
2. Implement required interfaces
3. Add to provider registry
4. Update configuration UI
5. Add tests
6. Update documentation

### Performance Profiling
```bash
# Build with profiling
npm run compile -- --profile

# Run performance tests
npm run perf

# Memory profiling
node --inspect-brk scripts/profile-memory.js
```

## Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **Major:** Breaking changes
- **Minor:** New features (backward compatible)
- **Patch:** Bug fixes

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes prepared
- [ ] Build artifacts created
- [ ] Announcement prepared

## License

By contributing to Code Mavi, you agree that your contributions will be licensed under the project's [MIT License](LICENSE.txt).

---

Thank you for contributing to Code Mavi! Your efforts help make AI-assisted development more transparent, accessible, and powerful for everyone.

If you have any questions not covered in this guide, please don't hesitate to ask in our community channels.