# Quick Start for Developers

## First 3 Commands (From Plan.md)

Based on the strategic plan in `plan.md`, here are the essential first commands to get started with Code Mavi IDE development:

### 1. Fork and Clone the Repository

```bash
# Fork Void editor to start Code Mavi IDE
gh repo fork voideditor/void --clone --org code-mavi

# Or if starting fresh with existing Code Mavi IDE codebase:
git clone https://github.com/mavi/mavi.git
cd mavi
```

### 2. Build and Launch

```bash
# Install dependencies
npm install

# Start development build (watch mode)
npm run watch

# Launch Code Mavi IDE in development mode
./scripts/code.sh  # macOS/Linux
./scripts/code.bat # Windows
```

### 3. Find Agent Code Location

```bash
# Locate the core LLM message handling code (where agent loop will be added)
find . -name "sendLLMMessage.ts" -path "*/mavi/*"

# Expected output should show:
# ./src/vs/workbench/contrib/mavi/common/sendLLMMessageService.ts
```

## Complete Development Setup

### Prerequisites Installation

**macOS:**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install node@18 git gh
brew install --cask visual-studio-code
```

**Ubuntu/Debian:**
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install GitHub CLI
type -p curl >/dev/null || sudo apt install curl -y
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh -y
```

**Windows (PowerShell):**
```powershell
# Install Node.js via winget
winget install OpenJS.NodeJS.LTS

# Install Git
winget install Git.Git

# Install GitHub CLI
winget install GitHub.cli
```

### Environment Configuration

1. **Set up Git identity:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global core.editor "code --wait"
```

2. **Configure GitHub CLI:**
```bash
gh auth login
```

3. **Create development environment file:**
```bash
# Create .env file for development
cat > .env << EOF
# Development flags
CODEMAVI_DEV_MODE=true
CODEMAVI_LOG_LEVEL=debug

# Optional: LLM API keys for testing
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# DEEPSEEK_API_KEY=...
EOF
```

## Understanding the Codebase Structure

### Critical Files to Know (From Plan.md Analysis)

```
src/vs/workbench/contrib/mavi/
├── common/
│   ├── sendLLMMessageService.ts      # Core LLM messaging (Agent loop entry point)
│   ├── mavi-logic/                   # Agent system core
│   │   ├── agents/                   # System prompts
│   │   │   ├── orchestrator-prompt.md
│   │   │   ├── executor-prompt.md
│   │   │   └── verifier-prompt.md
│   │   ├── tools/                    # Agent tool definitions
│   │   │   ├── agent-tools.ts
│   │   │   ├── orchestrator-service.ts
│   │   │   └── semantic-search-service.ts
│   │   └── rules.md                  # Project rule templates
│   └── modelCapabilities.ts          # Provider/model configurations
├── browser/
│   ├── chatThreadService.ts          # AI conversation management
│   ├── editCodeService.ts            # Code editing operations
│   ├── toolsService.ts               # Tool execution engine
│   └── sidebarPane.tsx               # Main UI component
└── electron-main/
    └── (Main process extensions)
```

### Key Development Workflows

#### 1. Adding a New LLM Provider

```typescript
// 1. Add provider to modelCapabilities.ts
export const providerCapabilities = {
  // ... existing providers
  'zhipu': {
    name: 'Zhipu AI',
    models: ['glm-4', 'glm-3-turbo'],
    capabilities: { tools: true, vision: true }
  }
};

// 2. Implement provider in sendLLMMessageService.ts
async function sendToZhipu(messages: Message[], options: SendOptions) {
  // Implementation using Zhipu AI SDK
}

// 3. Add to provider registry
providerRegistry.set('zhipu', sendToZhipu);
```

#### 2. Creating a New Agent Tool

```typescript
// 1. Define tool interface in agent-tools.ts
export type SemanticSearchParams = {
  'semantic_search': { 
    query: string;
    topK: number;
  }
};

// 2. Implement tool in toolsService.ts
class SemanticSearchTool {
  async execute(params: SemanticSearchParams['semantic_search']) {
    // Implementation using vector database
    return searchResults;
  }
}

// 3. Register tool
toolRegistry.register('semantic_search', new SemanticSearchTool());
```

#### 3. Modifying Agent Prompts

```markdown
# Edit file: src/vs/workbench/contrib/mavi/common/mavi-logic/agents/orchestrator-prompt.md

## Add new rules section:
### Project-Specific Guidelines
- Always check .mavi/rules.md first
- Follow existing code patterns
- Ask for clarification when unsure

## Test your changes:
1. Restart Code Mavi IDE development build
2. Open a test project
3. Use Agent Log Panel to see updated prompts
```

## Development Commands Reference

### Build and Run

```bash
# Development (watch mode - auto-reload on changes)
npm run watch

# Production build
npm run compile

# Run specific component
npm run watch-client      # Client only
npm run watch-extensions  # Extensions only

# Launch in different modes
./scripts/code.sh --verbose    # With debug logging
./scripts/code.sh --disable-extensions  # Clean environment
```

### Testing

```bash
# Run all tests
npm test

# Browser tests
npm run test-browser

# Node.js tests  
npm run test-node

# Extension tests
npm run test-extension

# Run specific test file
npm test -- --grep "agent system"

# Test with coverage
npm test -- --coverage
```

### Code Quality

```bash
# Lint code
npm run eslint

# Type checking
npm run tsec-compile-check
npm run vscode-dts-compile-check

# Style linting
npm run stylelint

# Hygiene checks
npm run hygiene
```

### Debugging

```bash
# Enable debug logging
export CODEMAVI_LOG_LEVEL=debug
npm run watch

# Open developer tools in Code Mavi IDE
# Press Cmd+Shift+I (macOS) or Ctrl+Shift+I (Windows/Linux)

# Monitor agent activity
# View → Output → Select "Code Mavi IDE Agents"
```

## Common Development Tasks

### Task 1: Implement Semantic Search (Phase 2)

```bash
# 1. Install required dependencies
npm install @vscode/tree-sitter-wasm sqlite3

# 2. Create semantic search service
touch src/vs/workbench/contrib/mavi/common/mavi-logic/tools/semantic-search-service.ts

# 3. Implement core functionality:
#    - File indexing with tree-sitter
#    - Vector embedding generation
#    - SQLite + vec0 integration
#    - Search API endpoints

# 4. Integrate with agent system
#    - Add semantic_search tool
#    - Update orchestrator to use search
```

### Task 2: Add Agent Loop (Phase 3)

```bash
# 1. Study existing sendLLMMessageService.ts
# 2. Create agent orchestration layer:
touch src/vs/workbench/contrib/mavi/common/mavi-logic/orchestrator.ts

# 3. Implement triple agent system:
#    - Orchestrator: Planning and delegation
#    - Executor: Code modification
#    - Verifier: Quality assurance

# 4. Add self-correction loop:
#    - Error detection and classification
#    - Automatic retry mechanism (max 3)
#    - Checkpoint system integration
```

### Task 3: Create Checkpoint System (Phase 3)

```bash
# 1. Design checkpoint interface
touch src/vs/workbench/contrib/mavi/common/mavi-logic/checkpoint-system.ts

# 2. Implement:
#    - Automatic checkpoint creation
#    - Git-based snapshot system
#    - Rollback functionality
#    - Checkpoint management UI

# 3. Integrate with agents:
#    - Checkpoint before major changes
#    - Rollback on critical errors
#    - User approval workflow
```

## Troubleshooting Common Issues

### Build Issues

**Problem:** `npm install` fails
```bash
# Solution:
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Problem:** Build errors after VS Code updates
```bash
# Solution: Update VS Code dependencies
npm update @types/vscode @vscode/vscode-types
```

### Runtime Issues

**Problem:** Code Mavi IDE won't launch
```bash
# Check Electron version compatibility
npm list electron

# Clear Electron cache
rm -rf ~/.config/Code\ Code Mavi IDE
```

**Problem:** Agents not responding
```bash
# Check provider configuration
# Verify API keys are set
# Check network connectivity
# Review agent logs in Output panel
```

### Development Issues

**Problem:** Hot reload not working
```bash
# Ensure watch mode is running
npm run watch

# Check file watcher limits (Linux/macOS)
sudo sysctl fs.inotify.max_user_watches=524288
```

**Problem:** TypeScript errors
```bash
# Clean and rebuild
npm run clean
npm run compile

# Check TypeScript version compatibility
npx tsc --version
```

## Next Steps After Setup

1. **Read the Codebase Guide:**
   ```bash
   # Essential reading for understanding the architecture
   cat CODEMAVI_CODEBASE_GUIDE.md | less
   ```

2. **Explore Example Projects:**
   ```bash
   # Check for example implementations
   find . -name "*.example.*" -o -name "*.test.*" | head -20
   ```

3. **Join Development:**
   - Pick an issue from GitHub labeled `good-first-issue`
   - Join Discord for real-time discussion
   - Attend weekly community calls

4. **Start with Simple Contributions:**
   - Fix documentation typos
   - Add test cases
   - Improve error messages
   - Create example configurations

## Quick Reference Card

```bash
# Essential commands
npm run watch        # Start development
npm test            # Run tests
npm run eslint      # Check code quality

# File locations
Agent prompts:      src/vs/workbench/contrib/mavi/common/mavi-logic/agents/
Core services:      src/vs/workbench/contrib/mavi/common/
UI components:      src/vs/workbench/contrib/mavi/browser/

# Debug shortcuts
Cmd+Shift+I         # Open dev tools (macOS)
Ctrl+Shift+I        # Open dev tools (Windows/Linux)
View → Output → Code Mavi IDE Agents  # Agent logs
```

## Getting Help

- **GitHub Issues:** Bug reports and feature requests
- **Discord Server:** Real-time chat with developers
- **Weekly Office Hours:** Announced in GitHub Discussions
- **Code Reviews:** Submit PRs for feedback and guidance

---

**Remember:** The most important first step is understanding the existing codebase. Spend time reading `CODEMAVI_CODEBASE_GUIDE.md` and exploring the agent system architecture before making significant changes.

Happy coding! 🚀