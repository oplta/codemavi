# Contributing to Code Mavi IDE

Welcome! 👋 This is the official guide on how to contribute to Code Mavi IDE. We want to make it as easy as possible to contribute, so if you have any questions or comments, reach out via email or discord!

## Ways to Contribute

- 💫 Complete items on the [Roadmap](https://github.com/orgs/mavi/projects/2).
- 💡 Make suggestions in our [Discord](https://discord.gg/RSNjgaugJs).
- 🪴 Start new Issues - see [Issues](https://github.com/mavi/mavi/issues).

## Codebase Guide

We [highly recommend reading this](https://github.com/mavi/mavi/blob/main/CODEMAVI_CODEBASE_GUIDE.md) guide that we put together on Code Mavi IDE's sourcecode if you'd like to add new features.

The repo is not as intimidating as it first seems if you read the guide!

Most of Code Mavi IDE's code lives in the folder `src/vs/workbench/contrib/mavi/`.

---

## Editing Code Mavi IDE's Code

If you're making changes to Code Mavi IDE's code as a contributor, you'll want to run a local version of Code Mavi IDE to make sure your changes worked. Developer mode lets you do this. Here's how to use it.

### Prerequisites

#### Mac
You need Python and XCode. You probably have these by default.

#### Windows
First get [Visual Studio 2022](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=Community) (recommended) or [VS Build Tools](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools) (not recommended). If you already have both, you might need to run the next few steps on both of them.

Go to the "Workloads" tab and select:
- `Desktop development with C++`
- `Node.js build tools`

Go to the "Individual Components" tab and select:
- `MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)`
- `C++ ATL for latest build tools with Spectre Mitigations`
- `C++ MFC for latest build tools with Spectre Mitigations`

Finally, click Install.

#### Linux
First, run `npm install -g node-gyp`. Then:

- **Debian (Ubuntu, etc):** `sudo apt-get install build-essential g++ libx11-dev libxkbfile-dev libsecret-1-dev libkrb5-dev python-is-python3`
- **Red Hat (Fedora, etc):** `sudo dnf install @development-tools gcc gcc-c++ make libsecret-devel krb5-devel libX11-devel libxkbfile-devel`
- **SUSE (openSUSE, etc):** `sudo zypper install patterns-devel-C-C++-devel_C_C++  krb5-devel libsecret-devel libxkbfile-devel libX11-devel`
- **Others:** see [How to Contribute](https://github.com/microsoft/vscode/wiki/How-to-Contribute).

---

### Developer Mode Instructions

Here's how to start changing Code Mavi IDE's code. These steps cover everything from cloning Code Mavi IDE, to opening a Developer Mode window where you can play around with your updates.

1. `git clone https://github.com/mavi/mavi` to clone the repo.
2. `npm install` to install all dependencies.
3. Open Code Mavi IDE or VSCode, and initialize Developer Mode (this can take ~5 min to finish, it's done when 2 of the 3 spinners turn to check marks):
   - Windows: Press <kbd>Ctrl+Shift+B</kbd>.
   - Mac: Press <kbd>Cmd+Shift+B</kbd>.
   - Linux: Press <kbd>Ctrl+Shift+B</kbd>.
4. Open the Code Mavi IDE Developer Mode window:
   - Windows: `./scripts/code.bat`.
   - Mac: `./scripts/code.sh`.
   - Linux: `./scripts/code.sh`.
5. You're good to start editing Code Mavi IDE's code! 
   - You won't see your changes unless you press <kbd>Ctrl+R</kbd> (<kbd>Cmd+R</kbd>) inside the new window to reload. Alternatively, press <kbd>Ctrl+Shift+P</kbd> and `Reload Window`.
   - You might want to add the flags `--user-data-dir ./.tmp/user-data --extensions-dir ./.tmp/extensions` to the command in step 4, which lets you reset any IDE changes you made by deleting the `.tmp` folder.
   - You can kill any of the build scripts by pressing `Ctrl+D` in its terminal. If you press `Ctrl+C` the script will close but will keep running in the background.

---

### Common Fixes

- Make sure you followed the prerequisite steps above.
- Make sure you have Node version `20.18.2` (the version in `.nvmrc`).
    - You can do this without changing your global Node version using [nvm](https://github.com/nvm-sh/nvm): run `nvm install`, followed by `nvm use` to install the version in `.nvmrc` locally.
- Make sure the path to your Code Mavi IDE folder does not have any spaces in it.
- If you get `"TypeError: Failed to fetch dynamically imported module"`, make sure all imports end with `.js`.
- If you get an error with React, try running `NODE_OPTIONS="--max-old-space-size=8192" npm run buildreact`.
- If you see missing styles, wait a few seconds and then reload.
- If you get errors like `npm error libtool:   error: unrecognised option: '-static'`, when running ./scripts/code.sh, make sure you have GNU libtool instead of BSD libtool (BSD is the default in macos)
- If you get errors like `The SUID sandbox helper binary was found, but is not configured correctly` when running ./scripts/code.sh, run:
  `sudo chown root:root .build/electron/chrome-sandbox && sudo chmod 4755 .build/electron/chrome-sandbox` and then run `./scripts/code.sh` again.
- If you have any other questions, feel free to [submit an issue](https://github.com/mavi/mavi/issues/new). You can also refer to VSCode's complete [How to Contribute](https://github.com/microsoft/vscode/wiki/How-to-Contribute) page.

---

### Building Code Mavi IDE from Terminal

To build Code Mavi IDE from the terminal instead of from inside VSCode, follow the steps above, but instead of pressing <kbd>Cmd+Shift+B</kbd>, run `npm run watch`. The build is done when you see something like this:

```
[watch-extensions] [00:37:39] Finished compilation extensions with 0 errors after 19303 ms
[watch-client    ] [00:38:06] Finished compilation with 0 errors after 46248 ms
[watch-client    ] [00:38:07] Starting compilation...
[watch-client    ] [00:38:07] Finished compilation with 0 errors after 5 ms
```

---

## Distributing

Code Mavi IDE's maintainers distribute Code Mavi IDE on our website and in releases. Our build pipeline is a fork of VSCodium, and it works by running GitHub Actions which create the downloadables. The build repo with more instructions lives [here](https://github.com/mavi/mavi-builder).

If you want to completely control Code Mavi IDE's build pipeline for your own internal usage, which comes with a lot of time cost (and is typically not recommended), see our [`mavi-builder`](https://github.com/mavi/mavi-builder) repo which builds Code Mavi IDE and contains a few important notes about auto-updating and rebasing.

### Building a Local Executable

We don't usually recommend building a local executable of Code Mavi IDE - typically you should follow the steps above to distribute a complete executable with the advantages of VSCodium baked-in, or you should just use Developer Mode to run Code Mavi IDE locally which is much faster. If you're certain this is what you want, see details below.

<details>
<summary>Building Locally (not recommended)</summary>

If you're certain you want to build a local executable of Code Mavi IDE, follow these steps. It can take ~25 minutes.

Make sure you've already entered Developer Mode with Code Mavi IDE first, then run one of the following commands. This will create a folder named `VSCode-darwin-arm64` or similar outside of the mavi/ repo.

#### Mac
- `npm run gulp vscode-darwin-arm64` - most common (Apple Silicon)
- `npm run gulp vscode-darwin-x64` (Intel)

#### Windows
- `npm run gulp vscode-win32-x64` - most common
- `npm run gulp vscode-win32-arm64`

#### Linux
- `npm run gulp vscode-linux-x64` - most common
- `npm run gulp vscode-linux-arm64`

#### Local Executable Output

The local executable will be located in a folder outside of `mavi/`:
```bash
workspace/
├── mavi/   # Your Code Mavi IDE fork
└── VSCode-darwin-arm64/ # Generated output
```

</details>

---

## Pull Request Guidelines

- Please submit a pull request once you've made a change.
- No need to submit an Issue unless you're creating a new feature that might involve multiple PRs.
- Please don't use AI to write your PR 🙂

---

## Project Structure

```
mavi-ide/
├── src/vs/workbench/contrib/mavi/     # Core Code Mavi IDE functionality
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

---

## Code Standards

### TypeScript Standards
- Use TypeScript strict mode
- No `any` types (use `unknown` or proper types)
- Explicit return types for public functions
- Use interfaces for object shapes
- Prefer `const` over `let`

### Naming Conventions
- **Files:** kebab-case for all files
- **Variables:** camelCase
- **Constants:** UPPER_SNAKE_CASE
- **Types/Interfaces:** PascalCase
- **Components:** PascalCase

### Commit Message Format
```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style changes
- refactor: Code refactoring
- test: Adding tests
- chore: Maintenance tasks
```

---

## Community

### Communication Channels
- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and discussions
- **Discord Server:** Real-time chat (link in README)

### Getting Help
- Check the [documentation](../docs/) first
- Search existing issues and discussions
- Ask in GitHub Discussions
- Join our Discord server

---

## License

By contributing to Code Mavi IDE, you agree that your contributions will be licensed under the project's [MIT License](../../LICENSE.txt).

---

Thank you for contributing to Code Mavi IDE! Your efforts help make AI-assisted development more transparent, accessible, and powerful for everyone.