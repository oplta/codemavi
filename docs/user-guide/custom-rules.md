# Custom Rules Guide for Code Mavi IDE

## Introduction to Code Mavi IDE Rules

Code Mavi IDE's rule system allows you to customize how agents interact with your codebase. Unlike black-box AI assistants, Code Mavi IDE gives you complete control over agent behavior through a hierarchical rule system.

### Why Custom Rules Matter

1. **Consistency:** Ensure all code follows your team's standards
2. **Quality:** Enforce best practices automatically
3. **Efficiency:** Reduce code review time
4. **Safety:** Prevent dangerous patterns
5. **Customization:** Tailor agents to your specific needs

## Rule Hierarchy

Code Mavi IDE applies rules in this priority order (highest to lowest):

```
1. Session Rules (temporary, in-memory)
2. Project Rules (.mavi/rules.md)
3. Global Rules (~/.mavi/global-rules.md)
4. Base Agent Rules (system defaults)
```

## Creating Your First Rules File

### Step 1: Create Rules Directory

```bash
# In your project root
mkdir .mavi
```

### Step 2: Create Rules File

```bash
# Create the rules file
touch .mavi/rules.md
```

### Step 3: Add Basic Rules

Edit `.mavi/rules.md`:

```markdown
# Project Rules for [Your Project Name]

## General Principles
- Write clean, maintainable code
- Follow DRY (Don't Repeat Yourself) principle
- Add comments for complex logic
- Keep functions under 50 lines

## Language-Specific Rules

### TypeScript/JavaScript
- Use TypeScript strict mode
- No 'any' types allowed
- Use async/await instead of promises
- Export only what's necessary
- Prefer const over let

### React (if applicable)
- Use functional components
- Implement proper TypeScript interfaces
- Use hooks appropriately
- Follow React best practices

### Python (if applicable)
- Use type hints
- Follow PEP 8 style guide
- Write docstrings for public functions
- Use virtual environments

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

## Rule Categories and Examples

### 1. Code Style Rules

```markdown
## Code Style
- Use 2-space indentation (not tabs)
- Maximum line length: 100 characters
- Use single quotes for strings
- Trailing commas in multiline objects/arrays
- Semicolons required
```

### 2. Architecture Rules

```markdown
## Architecture
- Keep components small and focused
- Separate business logic from presentation
- Use dependency injection
- Follow clean architecture principles
- Implement proper error boundaries
```

### 3. Naming Convention Rules

```markdown
## Naming Conventions
- Variables: camelCase
- Functions: camelCase
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case
- Components: PascalCase
```

### 4. Security Rules

```markdown
## Security
- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user input
- Implement CSRF protection
- Use HTTPS in production
- Regular dependency updates
```

### 5. Performance Rules

```markdown
## Performance
- Optimize images before inclusion
- Implement code splitting
- Use memoization for expensive calculations
- Avoid unnecessary state updates
- Implement virtual scrolling for large lists
```

## Advanced Rule Patterns

### Conditional Rules

```markdown
## Conditional Rules
- If using React: Use functional components
- If file ends with .test.ts: Follow testing conventions
- If in src/components/: Maximum 3 props per component
- If database query: Use parameterized statements
```

### File-Specific Rules

```markdown
## File-Specific Rules
- In package.json: Sort dependencies alphabetically
- In README.md: Include installation instructions
- In .env.example: Include all required variables
- In Dockerfile: Use multi-stage builds
```

### Tool-Specific Rules

```markdown
## Tool Integration
- ESLint: Use airbnb configuration
- Prettier: Trailing commas, single quotes
- TypeScript: Strict mode enabled
- Jest: Coverage threshold 80%
- Husky: Pre-commit hooks for linting
```

## Global Rules

Create global rules that apply to all your projects:

```bash
# Create global config directory
mkdir -p ~/.mavi

# Create global rules file
touch ~/.mavi/global-rules.md
```

Example `~/.mavi/global-rules.md`:

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

## Personal Preferences
- Use dark theme in IDE
- Enable word wrap at 100 characters
- Show line numbers
- Auto-save every 5 minutes
```

## Rule Syntax Reference

### Basic Syntax

```markdown
# Section Title
- Rule description
- Another rule
- Third rule with [optional parameter]
```

### Priority Indicators

```markdown
## Critical Rules (MUST)
- [REQUIRED] Validate user input
- [MUST] Write tests for new features

## Important Rules (SHOULD)
- [SHOULD] Use TypeScript strict mode
- [RECOMMENDED] Implement error boundaries

## Optional Rules (MAY)
- [OPTIONAL] Add performance monitoring
- [MAY] Include accessibility attributes
```

### Exclusion Rules

```markdown
## Exclusions
- [EXCEPT] In legacy code: Can use class components
- [UNLESS] Performance critical: Avoid heavy abstractions
- [EXCLUDE] Test files: No need for extensive comments
```

## Testing Your Rules

### 1. Rule Validation

Code Mavi IDE validates rules on load. Check the Output panel (View → Output → Code Mavi IDE Rules) for validation errors.

### 2. Testing with Simple Tasks

```typescript
// Test your rules with simple requests:
// "Add a button component with proper TypeScript types"
// "Fix all TypeScript errors in this file"
// "Refactor this function to be more readable"
```

### 3. Monitoring Agent Behavior

Open the Agent Log Panel (View → Output → Code Mavi IDE Agents) to see how rules affect agent decisions.

## Common Rule Patterns

### For React Projects

```markdown
# React Project Rules

## Components
- Use functional components with hooks
- One component per file
- Export as default
- Use PropTypes or TypeScript interfaces

## State Management
- Use React Context for global state
- Keep state as local as possible
- Use useReducer for complex state
- Implement proper loading/error states

## Styling
- Use CSS Modules or styled-components
- Follow BEM naming convention
- Mobile-first responsive design
- Use design system tokens
```

### For Node.js/Backend Projects

```markdown
# Node.js Project Rules

## Structure
- Separate routes, controllers, services
- Use dependency injection
- Implement proper error handling
- Use environment-based configuration

## API Design
- RESTful endpoints
- Version APIs (v1/, v2/)
- Implement rate limiting
- Use JWT for authentication

## Database
- Use migrations for schema changes
- Implement connection pooling
- Use transactions for multiple operations
- Implement proper indexing
```

### For Python Projects

```markdown
# Python Project Rules

## Code Style
- Follow PEP 8
- Use Black for formatting
- Use isort for imports
- Maximum line length: 88 characters

## Type Safety
- Use type hints
- Run mypy in CI/CD
- Use dataclasses for data containers
- Implement proper exception hierarchy

## Testing
- Use pytest
- Aim for 100% test coverage
- Use fixtures for test data
- Mock external services
```

## Troubleshooting Rules

### Common Issues

**Issue:** Rules not being applied
```bash
# Check if rules file is in correct location
ls -la .mavi/rules.md

# Check rule syntax
cat .mavi/rules.md

# Check agent logs
# View → Output → Code Mavi IDE Agents
```

**Issue:** Conflicting rules
```markdown
# Problem: These rules conflict
- Use single quotes
- Use double quotes for JSX

# Solution: Be specific
- Use single quotes for JavaScript strings
- Use double quotes for JSX attributes
```

**Issue:** Rules too restrictive
```markdown
# Problem: Agent can't complete tasks
- [REQUIRED] Write tests for every function

# Solution: Add exceptions
- [REQUIRED] Write tests for public functions
- [OPTIONAL] Write tests for private helper functions
```

### Debugging Tips

1. **Start Simple:** Begin with basic rules, add complexity gradually
2. **Test Incrementally:** Test each rule category separately
3. **Check Logs:** Agent logs show which rules are being applied
4. **Ask Community:** Share rule patterns in Code Mavi IDE Discord

## Best Practices for Rule Creation

### 1. Be Specific
```markdown
# ❌ Bad: Be consistent
# ✅ Good: Use camelCase for variables, PascalCase for components
```

### 2. Be Realistic
```markdown
# ❌ Bad: 100% test coverage required
# ✅ Good: Aim for 80% test coverage, 100% for critical paths
```

### 3. Be Maintainable
```markdown
# Organize rules logically
## Code Style
## Architecture  
## Testing
## Security
## Performance
```

### 4. Be Flexible
```markdown
# Allow exceptions where needed
- Use functional components [EXCEPT in legacy code]
- Write tests for all features [UNLESS prototyping]
```

## Sharing Rules

### Export Rules
```bash
# Copy rules to share with team
cp .mavi/rules.md rules-template.md
```

### Import Rules
```bash
# Use shared rules template
cp rules-template.md .mavi/rules.md
# Customize for your project
```

### Community Rule Templates

Check the Code Mavi IDE community for rule templates:
- React + TypeScript + Tailwind
- Node.js + Express + TypeScript
- Python + FastAPI + SQLAlchemy
- Rust + Actix + Diesel

## Advanced: Dynamic Rules

### Environment-Based Rules

```markdown
## Environment Rules
- In development: Enable debug logging
- In staging: Use test API endpoints
- In production: Disable console.log
```

### User Role-Based Rules

```markdown
## Role-Based Rules
- For junior developers: Require code review
- For senior developers: Allow direct commits
- For architects: Can modify core architecture
```

### Time-Based Rules

```markdown
## Time-Based Rules
- During work hours: Allow major refactors
- After hours: Only critical fixes
- Weekends: Emergency fixes only
```

## Rule Evolution

### Versioning Rules

```markdown
# Rules Version: 2.1.0
# Last Updated: 2024-01-15
# Changelog:
# - Added TypeScript strict mode requirement
# - Removed jQuery dependency rule
# - Updated React hooks best practices
```

### Deprecating Rules

```markdown
## Deprecated Rules
- [DEPRECATED] Use class components → Migrate to functional components
- [LEGACY] jQuery allowed → Remove jQuery dependency by Q2 2024
```

## Conclusion

Effective rules make Code Mavi IDE agents more powerful and aligned with your project needs. Start with simple rules, test them thoroughly, and evolve them as your project grows.

Remember: The goal is not to restrict creativity, but to ensure consistency and quality while leveraging AI assistance effectively.

### Next Steps
1. Create your `.mavi/rules.md` file
2. Test with simple agent tasks
3. Refine based on results
4. Share successful patterns with the community
5. Contribute to community rule templates

Happy rule-making! 🎯