# Change Log

<!-- markdownlint-disable MD024 -->

All notable changes to the "Azure DevOps Integration" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.7.2] - 2025-09-24

### Added

- When stopping a timer, users can now choose to generate a Copilot prompt and copy it to the clipboard without stopping the timer. This allows for generating summaries of ongoing work.

### Changed

- The "Stop Timer" action now presents a quick pick menu with options to either stop the timer and apply time, or to generate a Copilot summary while the timer continues to run.

## [1.7.1] - 2025-09-23

### Changed

- **Svelte UI by Default**: The Svelte-based webview is now the default experience, removing the need for the `experimentalSvelteUI` feature flag. The legacy UI remains as a fallback if Svelte assets are missing.

### Fixed

- **PAT Storage**: Corrected an issue where the Personal Access Token (PAT) was not being consistently stored in the VS Code secret store after being updated via the setup command. The extension now reliably uses the secret store for PAT management.

## [Unreleased]

### Added

- **Enhanced Setup Experience**: New setup wizard that parses work item URLs and guides users through configuration
- **Improved README**: Streamlined documentation focusing on key features and easier setup process
- **Better Command Organization**: Simplified command palette with essential commands clearly highlighted

### Changed

- **README Structure**: Reorganized highlights to focus on core features (Work Items, Time Tracking, Git Integration, AI Summaries)
- **Setup Process**: Added step-by-step setup wizard as the recommended setup method
- **Documentation**: Simplified configuration section to show only the most important settings
- **Troubleshooting**: Added common issues table with quick solutions

### Fixed

- **Documentation Accuracy**: Verified all features mentioned in README are actually implemented
- **Command References**: Updated command table to reflect actual available commands
- **Setup Instructions**: Clarified the difference between wizard and manual setup

### Notes

- No breaking changes; all existing functionality remains the same
- Documentation improvements make the extension easier to discover and use

## [1.6.3] - 2025-09-20

## [1.7.0] - 2025-09-23

### Added

- Accessible keyboard Kanban navigation (Ctrl/Cmd + Arrow Left/Right moves focused work item between adjacent columns)
- Toast notification system with optimistic move feedback (success & error toasts, aria-live polite region)
- Codicon-based action icons replacing legacy emoji set for visual consistency with VS Code UI

### Changed

- Replaced emoji glyphs (play/stop/view/edit/comment/assignee/timer) with codicons and improved accessible labels
- Minor UI refinements to Kanban card actions and timer indicator styling

### Accessibility

- Added aria-label enhancements describing new keyboard move shortcut
- Toasts announced via aria-live and dismissible via close button

### Notes

- Dynamic per-type columns and additional tests scheduled for a follow-up release

### Improved

- Azure DevOps WIQL capability detection: remember if [System.StateCategory] is unsupported after the first 400 and automatically fallback to legacy state filters for the rest of the session. Reduces log noise and avoids repeat roundtrips.

### Notes

- No breaking changes. If your org supports [System.StateCategory], it will be used by default; otherwise the client will transparently adapt.

## [1.6.0] - 2025-09-19

### Added

- Automated screenshot generation system using Playwright for consistent documentation
- Sample data generator with realistic work items for screenshot scenarios
- File watching support for automatic screenshot regeneration during development

### Documentation

- Updated README.md with missing features documentation
- Corrected Marketplace installation command and link
- Added comprehensive screenshots showcasing list view, Kanban view, and timer functionality
- Moved technical screenshot automation documentation to developer-focused ARCHITECTURE.md
- Enhanced developer documentation with CI/CD automation details

### Developer Experience

- Added Playwright and Chokidar dependencies for screenshot automation
- ESLint configuration updated for Node.js automation scripts
- Comprehensive technical documentation in docs/SCREENSHOTS.md

## [1.5.0] - 2025-09-19

### Added

- Add VSIX packaging automation and changelog workflow integration

### Developer Experience

- 1.4.0
- 1.3.0
- 1.2.0
- 1.1.0

### Other

- Fix workflow automation issue preventing automatic tagging and release creation (#22)
- Fix missing v1.3.0 release with automated recovery tools (#20)
- Fix integration test ESM compatibility, VS Code version mismatch, and hanging issues (#18)
- Merge pull request [#16](https://github.com/plures/azuredevops-integration-extension/issues/16) from plures/copilot/fix-15
- Apply prettier formatting to all files
- Fix integration tests failing due to improper setup with fallback mechanisms
- Initial plan
- Merge pull request [#14](https://github.com/plures/azuredevops-integration-extension/issues/14) from plures/copilot/fix-13
- Add @vscode/vsce as dev dependency and fix packaging
- Initial plan

## [1.4.0] - 2025-09-18

### Added

- Add MCP (Model Context Protocol) Server for programmatic access to work items
- JSON-RPC 2.0 interface for external tool integration
- Docker containerization support for MCP server
- Comprehensive error handling with proper JSON-RPC error codes
- Environment-based configuration management

### Developer Experience

- MCP server standalone functionality with full Azure DevOps API integration

### Other

- Merge pull request [#10](https://github.com/plures/azuredevops-integration-extension/issues/10) from plures/feature/mcpserver
- Add comprehensive MCP server with Docker support and full Azure DevOps integration
- add mcp server initial

## [1.3.0] - 2025-09-18

### Added

- Branch creation from work items with customizable naming templates
- Smart branch naming with work item ID and sanitized title
- Pull request creation with automatic work item linking
- Quick access to active pull requests
- Repository selection and preference management
- Git integration enhancements

### Other

- Merge pull request [#6](https://github.com/plures/azuredevops-integration-extension/issues/6) from plures/copilot/add-branch-and-pr-creation
- Add branch and PR creation features with Git integration and repository management
- plan

## [1.2.0] - 2025-09-18

### Added

- Enhanced webview with Kanban board view toggle
- Advanced filtering by Sprint, Type, and Assigned To
- Draft persistence for work item notes (localStorage)
- Timer integration with work item selection
- Status bar timer display with elapsed time
- Inactivity detection and auto-pause functionality
- Improved error handling and user feedback
- Comprehensive time reporting (Today, Week, Month, All Time)

### Developer Experience

- Svelte-based webview architecture for better maintainability
- TypeScript integration with proper ESM support
- Vite build system for faster development
- Enhanced testing framework with integration tests

### Other

- Merge pull request [#4](https://github.com/plures/azuredevops-integration-extension/issues/4) from plures/feature/svelte-ui-scaffold
- Comprehensive Svelte webview implementation with advanced features
- plan

## [1.1.0] - 2025-09-18

### Added

- Comprehensive time tracking functionality
- Timer state management with persistence
- Inactivity detection and auto-pause
- Time reporting across different periods
- Status bar integration for active timers
- Configurable timer settings

### Developer Experience

- Robust timer state machine implementation
- Comprehensive test coverage for timer functionality
- ESM-compatible test runner with proper TypeScript support

### Other

- Merge pull request [#2](https://github.com/plures/azuredevops-integration-extension/issues/2) from plures/copilot/timer-implementation-comprehensive
- Add comprehensive time tracking with inactivity detection and reporting
- plan

## [1.0.0] - 2025-09-18

### Added

- Azure DevOps work item integration
- Personal Access Token authentication with secure storage
- Work item queries (My Work Items, All Active, Recently Updated, Current Sprint)
- Team-aware sprint queries with iteration support
- WIQL custom query support
- Comprehensive error handling and retry logic
- Rate limiting for API calls
- Configuration migration from legacy settings
- Extensive logging and diagnostics
- Activity bar integration with work items view

### Developer Experience

- ESM-first architecture with modern tooling
- Comprehensive unit and integration test coverage
- TypeScript throughout with strict type checking
- ESBuild for fast compilation
- Prettier and ESLint for code quality
- Husky and lint-staged for pre-commit hooks
- Commitlint for conventional commit messages

### Other

- Initial release with core Azure DevOps integration functionality
