# 🟦 Code Mavi IDE: The Agentic Open-Source IDE

> **"A tool that doesn't just assist, but thinks, acts, and verifies."**
> 
> Geçmişin ışığı geleceğin yolunu aydınlatır. (Ata Sözü)

## Table of Contents
- Quick Start
- Documentation
- Development
- Contributing
- Roadmap
- Troubleshooting
- Wiki
- License
- Acknowledgments

Code Mavi IDE is an **"Agent-First"** open-source IDE designed to revolutionize AI-assisted software development. Built as a fork of VS Code (via Void), it combines the convenience of tools like Cursor with the transparency and extensibility of open-source software.

## 🎯 Vision: Transparent and Powerful Agent Experience

We bring the convenience of tools like Cursor to the open-source world with complete transparency. In Code Mavi IDE, you can see how agents think, intervene in prompts, and guide them with your local rules.

- **Transparent Prompts:** No black boxes. Every step is traceable and customizable.
- **Agentic Loop:** Intelligence that doesn't stop at errors—it analyzes and retries.
- **Multi-Model Support:** Full compatibility with DeepSeek, Zhipu AI, Ollama, and more.

## 🏗️ Architecture: Triple Agent System (The Brain)

Code Mavi IDE uses three specialized agent layers to solve complex tasks:

### 🧠 1. Orchestrator (The Conductor)
The central nervous system of the system. Analyzes user requests, researches the codebase, and creates a strategic plan.
*File: `src/vs/workbench/contrib/mavi/common/mavi-logic/agents/orchestrator-prompt.md`*

### 🛠️ 2. Executor (The Implementer)
The "hands" that bring plans to life. Produces precise "Search/Replace" blocks and semantic diffs to physically update files.
*File: `src/vs/workbench/contrib/mavi/common/mavi-logic/agents/executor-prompt.md`*

### 🔍 3. Verifier (The Validator)
Works on the principle of "trust but verify." Checks for lint errors and test results after changes. If errors are found, it manages the **Self-Correction** process by sending the loop back to the Executor.
*File: `src/vs/workbench/contrib/mavi/common/mavi-logic/agents/verifier-prompt.md`*

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **Semantic Search** | Intelligent search that understands code structure with SQLite + Vector DB. |
| **Recursive Correction** | Automatically detects lint errors and enables agent-driven fixes. |
| **Custom Rules** | Dictate project-specific standards to agents via `rules.md`. |
| **Checkpoints** | Automatic safe rollback points before major changes. |
| **Transparent Prompts** | View and edit all agent system prompts. |
| **Multi-Provider Support** | 15+ LLM providers including DeepSeek, Zhipu, Ollama, OpenAI, Anthropic. |
| **Auto Dev Mode** | Complete entire projects with step-by-step agent orchestration. |

## 🏁 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/mavi/mavi.git
cd mavi

# Install dependencies
npm install

# Start development build
npm run watch

# Launch Code Mavi IDE in development mode
./scripts/code.sh  # Mac/Linux
./scripts/code.bat # Windows
```

### First-Time Setup

1. **Configure LLM Provider:**
   - Open Code Mavi IDE
   - Go to Settings → Code Mavi IDE → Providers
   - Add your preferred LLM provider (Ollama recommended for local use)

2. **Create Project Rules:**
   ```bash
   echo "# Project Rules" > .mavi/rules.md
   echo "- Use TypeScript strict mode" >> .mavi/rules.md
   echo "- No 'any' types allowed" >> .mavi/rules.md
   ```

3. **Try Auto Dev Mode:**
   - Open Command Palette (Cmd+Shift+P)
   - Type "Code Mavi IDE: Auto Dev Mode"
   - Enter: "Fix all TypeScript errors in this project"

## 📖 Documentation

### For Users
- [Getting Started Guide](docs/user-guide/getting-started.md) - Complete setup and first use
- [Agent System Explained](docs/agents/overview.md) - Understanding the triple agent architecture
- [Custom Rules Guide](docs/user-guide/custom-rules.md) - Creating project-specific agent rules
- [Auto Dev Mode Tutorial](docs/user-guide/auto-dev-mode.md) - Automated project completion

### Wiki
- [Wiki Home](wiki/Home.md) - Quick access to branding, architecture, and contribution docs

### For Developers
- [Architecture Overview](docs/architecture/overview.md) - System design and components
- [Development Guide](docs/development/contributing.md) - How to contribute to Code Mavi IDE
- [Agent API Reference](docs/agents/api-reference.md) - Building custom agents
- [Extension Development](docs/development/extensions.md) - Creating Code Mavi IDE extensions

### For Contributors
- [Codebase Guide](CODEMAVI_CODEBASE_GUIDE.md) - Understanding the codebase structure
- [Build Instructions](docs/development/build.md) - Building from source
- [Testing Guide](docs/development/testing.md) - Running tests and quality checks

## 🛠️ Development

### Building from Source

```bash
# Development build (watch mode)
npm run watch

# Production build
npm run compile

# Run tests
npm test

# Lint code
npm run eslint
```

### Project Structure

```
mavi-ide/
├── src/vs/workbench/contrib/mavi/     # Code Mavi IDE core
│   ├── common/mavi-logic/            # Agent logic and prompts
│   ├── browser/                      # UI components and services
│   └── electron-main/                # Main process extensions
├── docs/                             # Documentation
├── extensions/                       # VS Code extensions
└── intelligence/                     # AI intelligence modules
```

### Key Directories

- **`src/vs/workbench/contrib/mavi/common/mavi-logic/`** - Agent system core
  - `agents/` - System prompts for Orchestrator, Executor, Verifier
  - `tools/` - Agent tool definitions and services
  - `rules.md` - Project rule templates
- **`src/vs/workbench/contrib/mavi/browser/`** - User interface
  - `chatThreadService.ts` - AI conversation management
  - `editCodeService.ts` - Code editing operations
  - `toolsService.ts` - Tool execution engine

## 🤝 Contributing

Code Mavi IDE is a community-driven project. We welcome contributions in all areas:

### How to Contribute

1. **Improve Agent Prompts:** Help us create better system prompts for agents
2. **Add New Tools:** Extend agent capabilities with new tools
3. **Enhance UI/UX:** Improve the developer experience
4. **Support New Providers:** Add integration with more LLM providers
5. **Fix Bugs:** Help us make Code Mavi IDE more stable

### Contribution Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

 See our [Contributing Guide](HOW_TO_CONTRIBUTE.md) for detailed instructions.

## Documentation Hub
- Central hub for Wiki and Docs: [Documentation](documentation/README.md)

## 📋 Roadmap

### Phase 1: Foundation (Current)
- ✅ Basic agent system implementation
- ✅ Transparent prompt architecture
- ✅ Multi-provider support
- 🔄 Semantic search integration

### Phase 2: Enhancement (Q2 2024)
- Auto Dev Mode with project planning
- Advanced codebase intelligence
- Plugin system for custom agents
- Performance optimizations

### Phase 3: Ecosystem (Q3 2024)
- Marketplace for agent prompts
- Team collaboration features
- Enterprise deployment options
- Advanced analytics and insights

## 🐛 Troubleshooting

### Common Issues

**Issue:** "Provider not responding"
- **Solution:** Check your API keys and network connection. Try switching to Ollama for local testing.

**Issue:** "Agent stuck in loop"
- **Solution:** Check `.mavi/rules.md` for conflicting rules. Use checkpoint system to rollback.

**Issue:** "Build errors"
- **Solution:** Ensure Node.js version is 18+. Clear node_modules and reinstall.

### Getting Help

- [GitHub Issues](https://github.com/mavi/mavi/issues) - Report bugs and request features
- [Discussions](https://github.com/mavi/mavi/discussions) - Ask questions and share ideas
- [Documentation](docs/) - Comprehensive guides and references

## 📄 License

Code Mavi IDE is released under the [MIT License](LICENSE.txt).

VS Code components are licensed under their respective licenses as noted in [LICENSE-VS-Code.txt](LICENSE-VS-Code.txt).

## 🙏 Acknowledgments

- **VS Code Team** for creating the amazing foundation
- **Void Editor** for the initial fork and inspiration
- **Cursor** for showing what's possible with AI-assisted development
- **All Contributors** who help make Code Mavi IDE better every day

---

*Code Mavi IDE — Making what Cursor does open, transparent, and free.*
*Completing Void's vision with an agent brain.*
```

Şimdi plan.md'de belirtilen fazlara göre dokümantasyon yapısını oluşturmaya devam edelim. Önce mimari dokümantasyonu oluşturalım:
