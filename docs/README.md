# Code Mavi Documentation

Welcome to the Code Mavi documentation! This comprehensive guide covers everything you need to know about Code Mavi, the open-source, agent-first IDE.

## 📚 Documentation Categories

### 🚀 Getting Started
- **[Quick Start Guide](user-guide/getting-started.md)** - Installation and first steps
- **[User Guide](user-guide/)** - Complete user documentation
- **[FAQ](user-guide/faq.md)** - Frequently asked questions

### 🏗️ Architecture
- **[Architecture Overview](architecture/overview.md)** - System design and components
- **[Agent System](agents/overview.md)** - Triple agent architecture
- **[Lessons Learned](architecture/lessons-learned.md)** - Analysis of Void and Cursor
- **[Roadmap](development/roadmap.md)** - Development phases and timeline

### 👥 For Users
- **[Custom Rules Guide](user-guide/custom-rules.md)** - Creating project-specific rules
- **[Auto Dev Mode Tutorial](user-guide/auto-dev-mode.md)** - Automated project completion
- **[Provider Configuration](user-guide/providers.md)** - LLM provider setup
- **[Troubleshooting](user-guide/troubleshooting.md)** - Common issues and solutions

### 💻 For Developers
- **[Contributing Guide](development/contributing.md)** - How to contribute to Code Mavi
- **[Quick Start for Developers](development/quick-start.md)** - Development setup
- **[Build Instructions](development/build.md)** - Building from source
- **[Testing Guide](development/testing.md)** - Running tests
- **[Extension Development](development/extensions.md)** - Creating extensions

### 🔧 For Contributors
- **[Codebase Guide](../CODEMAVI_CODEBASE_GUIDE.md)** - Understanding the codebase
- **[API Reference](api/)** - Agent and tool APIs
- **[Performance Guide](development/performance.md)** - Optimization techniques
- **[Security Guide](development/security.md)** - Security best practices

## 🎯 Quick Links

### Essential Reading
1. **[Getting Started](user-guide/getting-started.md)** - First-time setup
2. **[Architecture Overview](architecture/overview.md)** - Understand the system
3. **[Agent System](agents/overview.md)** - Learn about agents
4. **[Contributing Guide](development/contributing.md)** - Start contributing

### Key Concepts
- **Agent-First Architecture**: Code Mavi is built around intelligent agents
- **Triple Agent System**: Orchestrator, Executor, and Verifier work together
- **Transparent Prompts**: All system prompts are visible and editable
- **Self-Correction**: Agents automatically fix errors (max 3 retries)
- **Checkpoint System**: Safe rollback points before changes

## 📖 Documentation Philosophy

### Transparency
All Code Mavi documentation is:
- **Complete**: Covers all features and APIs
- **Accurate**: Regularly updated with the codebase
- **Practical**: Includes real-world examples
- **Accessible**: Written for different skill levels

### Community-Driven
- Documentation improvements welcome via PRs
- Examples from real users encouraged
- Translations for international community
- Regular updates based on feedback

## 🔄 Keeping Updated

### Version Compatibility
- Documentation matches the latest release
- Breaking changes are clearly marked
- Migration guides for major updates
- Deprecation notices with alternatives

### Changelog
- [Release Notes](../CHANGELOG.md) - Version history
- [Roadmap](development/roadmap.md) - Future plans
- [Contributor Updates](development/changelog.md) - Development progress

## 🤝 Getting Help

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and discussions
- **Discord Server**: Real-time chat (link in main README)
- **Documentation Issues**: Report documentation problems

### Community Resources
- **Example Projects**: Community-contributed examples
- **Rule Templates**: Shared `.mavi/rules.md` templates
- **Prompt Library**: Community-optimized agent prompts
- **Tool Extensions**: User-created agent tools

## 📈 Learning Paths

### For New Users
1. Read [Getting Started](user-guide/getting-started.md)
2. Try basic tasks with the [User Guide](user-guide/)
3. Explore [Custom Rules](user-guide/custom-rules.md)
4. Experiment with [Auto Dev Mode](user-guide/auto-dev-mode.md)

### For Developers
1. Study [Architecture Overview](architecture/overview.md)
2. Review [Contributing Guide](development/contributing.md)
3. Set up [Development Environment](development/quick-start.md)
4. Explore [API Reference](api/)

### For Contributors
1. Understand [Codebase Structure](../CODEMAVI_CODEBASE_GUIDE.md)
2. Review [Roadmap](development/roadmap.md)
3. Pick [Good First Issues](https://github.com/mavi/mavi/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
4. Join [Community Channels](#-getting-help)

## 🎓 Tutorials and Examples

### Beginner Tutorials
- [Your First AI-Assisted Project](tutorials/first-project.md)
- [Creating Effective Rules](tutorials/effective-rules.md)
- [Using Semantic Search](tutorials/semantic-search.md)
- [Safe Experimentation with Checkpoints](tutorials/checkpoints.md)

### Advanced Tutorials
- [Building Custom Agents](tutorials/custom-agents.md)
- [Extending with Plugins](tutorials/plugins.md)
- [Performance Optimization](tutorials/performance.md)
- [Team Collaboration](tutorials/collaboration.md)

### Real-World Examples
- [React TypeScript Project Setup](examples/react-typescript.md)
- [Python API Development](examples/python-api.md)
- [Rust Library Refactor](examples/rust-refactor.md)
- [Full-Stack Application](examples/full-stack.md)

## 📋 Documentation Standards

### Writing Guidelines
- Use clear, concise language
- Include code examples where helpful
- Link to related documentation
- Mark deprecated features clearly
- Include troubleshooting sections

### Style Guide
- **Headings**: Use sentence case
- **Code**: Use TypeScript/JavaScript examples
- **Images**: Include alt text and captions
- **Links**: Use descriptive link text
- **Notes**: Use callouts for important information

## 🔍 Searching Documentation

### Local Search
Use your browser's find function (Cmd+F / Ctrl+F) to search within pages.

### Site Search
The documentation website includes full-text search across all pages.

### GitHub Search
Search the documentation repository on GitHub for specific topics.

## 📝 Contributing to Documentation

### How to Contribute
1. Fork the repository
2. Create a documentation branch
3. Make your changes
4. Submit a pull request

### What to Contribute
- Fix typos and grammatical errors
- Add missing information
- Improve examples
- Translate to other languages
- Add new tutorials

### Documentation Review
All documentation changes are reviewed for:
- Accuracy and completeness
- Clarity and readability
- Code example correctness
- Link validity

## 📄 License

This documentation is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## 🙏 Acknowledgments

- **VS Code Team** for the amazing foundation
- **Void Editor Contributors** for the initial fork
- **Cursor Team** for inspiration and innovation
- **All Contributors** who help improve Code Mavi

---

*Last updated: $(date)*  
*Documentation version: $(git describe --tags)*

For the latest updates, check the [GitHub repository](https://github.com/mavi/void).