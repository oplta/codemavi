# Getting Started with Code Mavi IDE

## Welcome to Code Mavi IDE!

Code Mavi IDE is an open-source, agent-first IDE that brings powerful AI-assisted development to your fingertips. This guide will help you set up Code Mavi IDE and start using its advanced features.

## System Requirements

### Minimum Requirements
- **Operating System:** Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 2GB free space
- **Node.js:** Version 18 or higher
- **Git:** Latest version

### Recommended for Best Experience
- **RAM:** 16GB or more
- **CPU:** 4+ cores
- **Internet:** Stable connection for cloud LLM providers
- **GPU:** Optional but helpful for local models (NVIDIA with CUDA support)

## Installation Methods

### Method 1: Download Pre-built Binary (Recommended)

   1. **Visit the Releases Page:**
   - Go to [GitHub Releases](https://github.com/mavi/mavi/releases)
   - Download the appropriate version for your OS:
       - `Code Mavi IDE-darwin-x64.zip` for macOS
      - `Code Mavi IDE-win32-x64.zip` for Windows
      - `Code Mavi IDE-linux-x64.tar.gz` for Linux

 2. **Installation Steps:**

   **macOS:**
   ```bash
   # Extract the archive
   unzip "Code Mavi IDE-darwin-x64.zip"
   
   # Move to Applications
   mv "Code Mavi IDE.app" /Applications/
   
   # Launch from Applications folder or Spotlight
   ```

   **Windows:**
   - Extract the ZIP file
   - Run `Code Mavi IDE.exe`
   - (Optional) Create a shortcut on your desktop

   **Linux:**
   ```bash
   # Extract the archive
   tar -xzf "Code Mavi IDE-linux-x64.tar.gz"
   
   # Run Code Mavi IDE
   ./Code\ Mavi\ IDE/code-mavi
   
   # (Optional) Create desktop entry
   sudo cp -r Code Mavi IDE /opt/
   sudo ln -s /opt/Code Mavi IDE/code-mavi /usr/local/bin/code-mavi
   ```

### Method 2: Build from Source

If you want the latest features or need to customize Code Mavi IDE:

```bash
# Clone the repository
git clone https://github.com/mavi/mavi.git
cd mavi

# Install dependencies
npm install

# Build in development mode
npm run watch

# Launch Code Mavi IDE
./scripts/code.sh  # macOS/Linux
./scripts/code.bat # Windows
```

## First-Time Setup

### 1. Launch Code Mavi IDE

When you first launch Code Mavi IDE, you'll see the welcome screen:

```
┌─────────────────────────────────────┐
│         Welcome to Code Mavi IDE        │
│                                     │
│  [ ] I accept the license terms     │
│  [ ] Send anonymous usage data      │
│                                     │
│        [Get Started]                │
└─────────────────────────────────────┘
```

**Recommended:** Uncheck "Send anonymous usage data" for maximum privacy.

### 2. Configure LLM Provider

Code Mavi IDE needs at least one LLM provider to function. Here are your options:

#### Option A: Local Provider (Recommended for Privacy)

**Using Ollama (Free, Local):**
```bash
# Install Ollama (if not already installed)
# Visit https://ollama.ai/download

# Pull a model
ollama pull deepseek-coder:6.7b
ollama pull codellama:7b

# In Code Mavi IDE:
# 1. Open Settings (Cmd+, or Ctrl+,)
# 2. Navigate to "Code Mavi IDE" → "Providers"
# 3. Click "Add Provider"
# 4. Select "Ollama"
# 5. Enter localhost:11434 as the URL
# 6. Test connection
```

#### Option B: Cloud Providers

**OpenAI:**
- Get API key from [platform.openai.com](https://platform.openai.com)
- In Code Mavi IDE Settings → Providers → Add Provider → OpenAI
- Enter your API key
- Select default model (GPT-4o recommended)

**DeepSeek:**
- Get API key from [platform.deepseek.com](https://platform.deepseek.com)
- Free tier available with generous limits

**Zhipu AI:**
- Chinese provider with excellent Chinese language support
- Get API key from [open.bigmodel.cn](https://open.bigmodel.cn)

### 3. Create Your First Project Rules

Project rules help agents understand your coding standards:

```bash
# In your project root
mkdir .mavi
echo "# Project Rules" > .mavi/rules.md
```

Edit `.mavi/rules.md`:
```markdown
# Project Rules for Code Mavi IDE Agents

## General Principles
- Write clean, maintainable code
- Follow DRY (Don't Repeat Yourself) principle
- Add comments for complex logic
- Keep functions small and focused

## TypeScript/JavaScript Rules
- Use TypeScript strict mode
- No 'any' types allowed
- Use async/await instead of promises
- Export only what's necessary

## React Rules (if applicable)
- Use functional components
- Implement proper TypeScript interfaces
- Use hooks appropriately
- Follow React best practices

## Testing Rules
- Write tests for new functionality
- Maintain test coverage > 80%
- Use descriptive test names
- Mock external dependencies

## Security Rules
- Validate all user input
- Use parameterized queries for databases
- Implement proper error handling
- Follow OWASP guidelines

## Performance Rules
- Avoid unnecessary re-renders
- Implement lazy loading for large components
- Optimize bundle size
- Use appropriate data structures
```

### 4. Set Up Global Rules (Optional)

Create global rules that apply to all your projects:

```bash
# Create config directory
mkdir -p ~/.mavi

# Create global rules
echo "# Global Development Rules" > ~/.mavi/global-rules.md
```

Edit `~/.mavi/global-rules.md`:
```markdown
# Global Development Rules

## Code Quality
- Always write meaningful commit messages
- Use conventional commits format
- Review code before committing
- Keep commits focused and atomic

## Documentation
- Document public APIs
- Update README with major changes
- Keep CHANGELOG.md updated
- Add inline comments for complex logic

## Collaboration
- Respect existing code style
- Communicate breaking changes
- Help teammates when stuck
- Share knowledge regularly

## Security
- Never commit secrets or API keys
- Use environment variables for configuration
- Regular dependency updates
- Security scanning before deployment
```

## Your First AI-Assisted Task

### Basic Interaction

1. **Open the Code Mavi IDE Sidebar:**
   - Click the Code Mavi IDE icon in the activity bar (blue icon)
   - Or press `Cmd+L` (macOS) / `Ctrl+L` (Windows/Linux)

2. **Start a Conversation:**
   ```
   [You] Add a loading state to the UserProfile component
   
   [Orchestrator] I'll help you add a loading state. Let me first analyze the codebase...
   ✓ Found UserProfile component at src/components/UserProfile.tsx
   ✓ Analyzing current implementation...
   ✓ Creating checkpoint before changes...
   
   Plan:
   1. Add loading prop to UserProfileProps interface
   2. Update component to show spinner when loading
   3. Disable interactive elements during loading
   4. Update tests
   
   Proceed with this plan? [Yes] [No] [Modify]
   ```

3. **Review and Approve:**
   - Click "Yes" to proceed
   - Watch as agents execute the plan step by step
   - Review changes before they're applied

### Quick Edit Mode (Cmd+K / Ctrl+K)

For quick, focused edits:

1. **Select code** in the editor
2. **Press Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux)
3. **Enter your request:**
   ```
   Convert this to use async/await instead of promises
   ```
4. **Review the proposed changes** and click "Apply"

## Understanding the Agent System

### The Three Agents

When you make a request, three specialized agents work together:

1. **🧠 Orchestrator:** Analyzes your request and creates a plan
2. **🛠️ Executor:** Implements the actual code changes
3. **🔍 Verifier:** Checks the changes for errors and quality

### Viewing Agent Activity

**Agent Log Panel:**
- Open View → Output
- Select "Code Mavi IDE Agents" from the dropdown
- See real-time agent activity and decisions

**Prompt Inspector:**
- In Code Mavi IDE sidebar, click "Prompt Inspector"
- See exactly what prompts are sent to each agent
- Understand how agents make decisions

## Essential Features to Try

### 1. Semantic Search

Find code by meaning, not just keywords:

```typescript
// In Code Mavi IDE sidebar:
search: "authentication error handling"
// Returns: Files dealing with auth errors, even if they don't contain those exact words
```

### 2. Auto Dev Mode

Automate entire development tasks:

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "Code Mavi IDE: Auto Dev Mode"
3. Enter a complex task:
   ```
   Refactor all API calls to use the new HttpClient class
   ```
4. Watch as agents plan and execute the entire refactor

### 3. Checkpoint System

Safe experimentation with automatic rollback points:

```typescript
// Agents automatically create checkpoints before major changes
// If something goes wrong:
// 1. Open Code Mavi IDE sidebar
// 2. Click "Checkpoints"
// 3. Select a checkpoint
// 4. Click "Restore"
```

### 4. Custom Tool Creation

Extend agent capabilities with custom tools:

```typescript
// In .mavi/tools/my-tool.ts
export interface MyToolParams {
  analyzePerformance: { filePath: string };
}

export class MyTool {
  async analyzePerformance(filePath: string) {
    // Custom analysis logic
    return { score: 95, suggestions: [] };
  }
}
```

## Configuration Reference

### Key Settings

**Settings Path:** `File → Preferences → Settings → Code Mavi IDE`

| Setting | Description | Recommended Value |
|---------|-------------|-------------------|
| `mavi.provider.default` | Default LLM provider | Your preferred provider |
| `mavi.agents.enabled` | Enable/disable agent system | true |
| `mavi.autoDevMode.enabled` | Enable Auto Dev Mode | true |
| `mavi.checkpoints.autoCreate` | Auto-create checkpoints | true |
| `mavi.verification.strict` | Strict verification mode | true |
| `mavi.privacy.telemetry` | Send usage data | false |

### Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Cmd+L` / `Ctrl+L` | Open Code Mavi IDE sidebar | Main AI interface |
| `Cmd+K` / `Ctrl+K` | Quick edit | Edit selected code |
| `Cmd+Shift+P` / `Ctrl+Shift+P` | Command palette | Access all commands |
| `Cmd+Shift+A` / `Ctrl+Shift+A` | Toggle agent view | Show/hide agent activity |
| `Cmd+Shift+C` / `Ctrl+Shift+C` | Create checkpoint | Manual checkpoint |

## Troubleshooting Common Issues

### Issue: "No LLM provider configured"
**Solution:**
1. Open Settings → Code Mavi IDE → Providers
2. Click "Add Provider"
3. Configure at least one provider
4. Test the connection

### Issue: "Agent stuck in loop"
**Solution:**
1. Check `.mavi/rules.md` for conflicting rules
2. Open Agent Log Panel to see what's happening
3. Use checkpoint to rollback
4. Simplify your request and try again

### Issue: "Slow performance"
**Solution:**
1. Switch to a faster model (e.g., GPT-3.5 instead of GPT-4)
2. Reduce context window size in settings
3. Disable unnecessary verification steps
4. Use local provider (Ollama) for better latency

### Issue: "Code changes not applying"
**Solution:**
1. Check file permissions
2. Ensure no other process is locking files
3. Try with a smaller change first
4. Check agent logs for error messages

## Next Steps

### Learn More
- **Read the [Agent System Guide](agents/overview.md)** to understand how agents work
- **Explore [Custom Rules Guide](user-guide/custom-rules.md)** to tailor agents to your needs
- **Try [Auto Dev Mode Tutorial](user-guide/auto-dev-mode.md)** for complex tasks

### Join the Community
- **GitHub Discussions:** Share ideas and get help
- **Discord Server:** Real-time chat with other users
- **Contributor Guide:** Help improve Code Mavi IDE

### Provide Feedback
- **GitHub Issues:** Report bugs and request features
- **Feature Requests:** Suggest new capabilities
- **Share Your Rules:** Contribute to community rule templates

## Quick Reference Commands

```bash
# Development commands
npm run watch        # Start development build
npm run compile      # Production build
npm test            # Run tests
npm run eslint      # Lint code

# Common tasks in Code Mavi IDE
Cmd+L → Type request    # Use AI assistance
Cmd+K on selection      # Quick edit
Cmd+Shift+P → "Auto Dev Mode"  # Complex automation
View → Output → Code Mavi IDE Agents  # Monitor agents
```

---

**Congratulations!** You're now ready to use Code Mavi IDE for AI-assisted development. Remember:

1. **Start small** with simple tasks
2. **Review changes** before applying
3. **Use checkpoints** for safety
4. **Customize rules** for your workflow
5. **Join the community** for support and inspiration

Happy coding with Code Mavi IDE! 🚀
