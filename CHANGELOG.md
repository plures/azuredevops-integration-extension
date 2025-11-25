# Change Log

<!-- markdownlint-disable MD024 -->

All notable changes to the "Azure DevOps Integration" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [2.4.3] - 2025-11-23

### Developer Experience

- complexity fix

## [2.4.2] - 2025-11-23

### Developer Experience

- fix create new wi

## [2.4.1] - 2025-11-23

### Other

- Fix: Add missing CREATE_WORK_ITEM event handler (#99)

## [2.4.0] - 2025-11-19

### Added

- Complete Tauri desktop app with Azure DevOps API integration and Kanban board (#96)

## [2.2.8] - 2025-11-18

### Other

- build(deps-dev): bump the npm_and_yarn group across 1 directory with 2 updates (#97)

## [2.2.7] - 2025-11-18

### Other

- Add Tauri-based cross-platform desktop application with shared FSM architecture (#94)

## [2.2.6] - 2025-11-15

### Other

- build(deps-dev): bump svelte from 3.59.2 to 5.43.6 in the npm_and_yarn group across 1 directory (#91)

## [2.2.5] - 2025-11-15

### Other

- Fix formatting in dependabot.yml

## [2.2.4] - 2025-11-13

### Fixed

- always run build job for workflow_dispatch in release workflow
- fix condition syntax and add debugging to release workflow

## [2.2.3] - 2025-11-13

### Fixed

- simplify condition syntax in release workflow
- fix tag name resolution in release workflow

## [2.2.2] - 2025-11-13

### Fixed

- add workflow_dispatch to release workflow for manual triggering

## [2.2.1] - 2025-11-13

### Fixed

- require user confirmation before opening browser for Entra reauth (#90)

## [2.2.0] - 2025-11-12

### Added

- enhance connection deletion with cache clearing and persistence

### Fixed

- restore missing release automation scripts (#89)

### Other

- Issue with connections command triggering (#86)
- Troubleshooting connection and device code flow (#85)

## [2.0.9] - 2025-11-10

### Fixed

- Fixed 6 TypeScript build errors in `App.svelte` related to Svelte store reactivity
  - Resolved incorrect store unwrapping using `$derived()` which doesn't work with Svelte stores
  - Implemented proper reactive store subscription using `$state` and `$effect` in Svelte 5 runes mode
  - Fixed property access errors for `context`, `matches`, and `value` properties on store
  - Removed unused `get` import that was causing linter warnings
  - All TypeScript compilation errors now resolved, extension builds successfully

## [2.0.7] - 2025-11-07

### Other

- Add missing package:vsix script and document release automation (#70)

## [2.0.6] - 2025-11-07

### Fixed

- resolve test runner ESM/CJS interop preventing test execution (#68)

## [2.0.5] - 2025-11-07

### Other

- Initial plan (#66)

## [2.0.4] - 2025-11-07

### Fixed

- resolve FSM state transition errors and update documentation (#59)

## [2.0.3] - 2025-11-07

### Changed

- **Major Architecture Overhaul**: Complete migration to XState v5 Finite State Machine (FSM) architecture
  - Replaced complex messaging system with reactive FSM-based state management
  - Implemented type-safe state machines for application, connection, authentication, data, timer, and setup flows
  - Added build-time validation for state machine structure to catch errors before extension activation
  - Migrated to Svelte 5 rune-first reactive architecture for webview UI
  - Improved state synchronization between extension host and webview using reactive patterns

### Fixed

- Fixed invalid state transition definitions in connection machine that prevented extension activation
- Improved state machine validation to catch structural errors at build time
- Enhanced error handling and recovery in FSM state transitions

### Developer Experience

- Added runtime validation of state machines to compile step
- Improved type safety for state transitions with state name constants
- Enhanced debugging capabilities with FSM state visualization

### Other

- Feature/enhanced setup process (#50)

## [2.0.2] - 2025-11-02

### Fixed

- resolve unit test failures and improve coverage command

## [2.0.1] - 2025-10-31

### Other

- Fix CI version bump logic and release-check script errors (#48)

## [2.0.0] - 2025-10-29

### Added

- implement action buttons for work items with reactive state management (#38)
- Complete Foundation Architecture Discipline and Resolve Build Warnings (#32)
- wire action buttons to VS Code commands
- reload connections before triggering temp Entra auth
- auto-finalize PAT to Entra conversion on auth success
- safe PAT to Entra with temporary connection approach
- prompt reload after PAT to Entra conversion
- safe PAT to Entra conversion with rollback protection
- auto-trigger device code flow after PAT to Entra conversion
- add PAT authentication to status bar indicator
- add full-featured action buttons to work item cards
- implement Svelte 5 rune-first XState migration with pub/sub broker
- remove internal toolbar, add query selector, gate debug view
- device-code auth success dispatch, webview browser delegation, connection tabs UI
- add Kanban scaffolding and restore setupMachine connection test states
- Implement secure token storage for Entra ID
- implement data fetching machine
- handle auth events from child machines
- implement Entra ID device code flow
- integrate authMachine into applicationMachine
- Refactor connection management logic
- route auth reminder actions
- add existing connection testing flow
- enable auth-aware connection handler

### Fixed

- route action buttons to legacy handleMessage implementations
- execute VS Code commands in dispatchApplicationEvent
- add FSM event handlers for work item actions
- simplify convert flow - save then trigger interactive auth
- define connectionLabel variable before use
- correct variable references in convert function
- auto-select single PAT connection without prompting
- load connections from workspace config not globalState
- context-aware setup menu and convert PAT detection
- remove horizontal scrollbar on card hover
- load main.css instead of styles.css for component styles
- work items not returned when query filter matches nothing
- provider messages not reaching FSM (work items not displaying)
- query case sensitivity - 'Assigned To Me' → 'Assigned to me'
- critical PAT retrieval and connection management bugs
- webview display and add setup button icon
- remove workspace protocol from xstate-svelte package.json
- improve FSM state matching in webview UI
- sanitize FSM context before posting to webview
- ensure applicationStore initialized before webview provider registration
- send initial FSM state to webview on panel resolve and ready message
- resolve VS Code API double acquisition error in webview
- activate FSM and connect webview panel for state synchronization
- resolve multiple linting errors
- migrate missing apiBaseUrl for pre-v1.9.6 connections

### Changed

- fsm-first action buttons with activation execution

### Documentation

- add comprehensive git workflow strategy
- document action button implementation status and requirements
- comprehensive session summary for Oct 27, 2025
- add PAT connection troubleshooting guide
- record migration backlog

### Developer Experience

- add applicationMachine view mode toggle tests
- 2.0.0
- add comprehensive logging to convert PAT to Entra
- add comprehensive logging for work items message flow
- add logging to storeWorkItemsInContext action
- add enhanced debug logging for work items flow
- checkpoint
- checkpoint
- cleanup activation.ts and legacy files
- checkpoint retry fix
- disable integration tests
- silence Svelte source-map warning

### Other

- Specify branch in git push command
- Fix automated release tag creation by bypassing pre-commit hooks in CI (#45)
- Upgrade Node.js version from 20 to 24 in CI
- Configure GitHub Copilot instructions per best practices (#41)
- Fix Husky hook CRLF line endings and add GitHub Actions permissions (#39)
- build: force clean rebuild of all assets
- WIP: Force commit to save progress
- build: emit extension.cjs bundle
- Route ensureActiveConnection through FSM adapter
- Implement FSM-first architecture overhaul

## [2.0.0] - 2025-10-29

### Added

- implement action buttons for work items with reactive state management (#38)
- Complete Foundation Architecture Discipline and Resolve Build Warnings (#32)
- wire action buttons to VS Code commands
- reload connections before triggering temp Entra auth
- auto-finalize PAT to Entra conversion on auth success
- safe PAT to Entra with temporary connection approach
- prompt reload after PAT to Entra conversion
- safe PAT to Entra conversion with rollback protection
- auto-trigger device code flow after PAT to Entra conversion
- add PAT authentication to status bar indicator
- add full-featured action buttons to work item cards
- implement Svelte 5 rune-first XState migration with pub/sub broker
- remove internal toolbar, add query selector, gate debug view
- device-code auth success dispatch, webview browser delegation, connection tabs UI
- add Kanban scaffolding and restore setupMachine connection test states
- Implement secure token storage for Entra ID
- implement data fetching machine
- handle auth events from child machines
- implement Entra ID device code flow
- integrate authMachine into applicationMachine
- Refactor connection management logic
- route auth reminder actions
- add existing connection testing flow
- enable auth-aware connection handler

### Fixed

- route action buttons to legacy handleMessage implementations
- execute VS Code commands in dispatchApplicationEvent
- add FSM event handlers for work item actions
- simplify convert flow - save then trigger interactive auth
- define connectionLabel variable before use
- correct variable references in convert function
- auto-select single PAT connection without prompting
- load connections from workspace config not globalState
- context-aware setup menu and convert PAT detection
- remove horizontal scrollbar on card hover
- load main.css instead of styles.css for component styles
- work items not returned when query filter matches nothing
- provider messages not reaching FSM (work items not displaying)
- query case sensitivity - 'Assigned To Me' → 'Assigned to me'
- critical PAT retrieval and connection management bugs
- webview display and add setup button icon
- remove workspace protocol from xstate-svelte package.json
- improve FSM state matching in webview UI
- sanitize FSM context before posting to webview
- ensure applicationStore initialized before webview provider registration
- send initial FSM state to webview on panel resolve and ready message
- resolve VS Code API double acquisition error in webview
- activate FSM and connect webview panel for state synchronization
- resolve multiple linting errors
- migrate missing apiBaseUrl for pre-v1.9.6 connections

### Changed

- fsm-first action buttons with activation execution

### Documentation

- add comprehensive git workflow strategy
- document action button implementation status and requirements
- comprehensive session summary for Oct 27, 2025
- add PAT connection troubleshooting guide
- record migration backlog

### Developer Experience

- add applicationMachine view mode toggle tests
- add comprehensive logging to convert PAT to Entra
- add comprehensive logging for work items message flow
- add logging to storeWorkItemsInContext action
- add enhanced debug logging for work items flow
- checkpoint
- checkpoint
- cleanup activation.ts and legacy files
- checkpoint retry fix
- disable integration tests
- silence Svelte source-map warning

### Other

- Fix automated release tag creation by bypassing pre-commit hooks in CI (#45)
- Upgrade Node.js version from 20 to 24 in CI
- Configure GitHub Copilot instructions per best practices (#41)
- Fix Husky hook CRLF line endings and add GitHub Actions permissions (#39)
- build: force clean rebuild of all assets
- WIP: Force commit to save progress
- build: emit extension.cjs bundle
- Route ensureActiveConnection through FSM adapter
- Implement FSM-first architecture overhaul

## [1.10.0] - 2025-10-15

### Added

- **Finite State Machine Architecture**: Implemented XState v5-based state machine architecture to replace complex messaging system interactions. Added experimental FSM support for timer operations with feature flag control (`experimental.useFSM`), visual debugging via XState Inspector, and backward compatibility adapter. This resolves race conditions and conflicting function names while providing a robust foundation for future state management improvements.

### Changed

- **Timer State Management**: Enhanced timer operations with predictable state transitions through FSM implementation. Timer now properly handles idle → running → paused state changes with improved error handling and validation.

### Developer Experience

- **Debug Tools**: Added FSM inspector integration accessible at `http://localhost:8080` when `enableFSMInspector` is enabled, plus FSM status and debug commands in the command palette.
- **Configuration**: Added experimental FSM settings under `azureDevOpsIntegration.experimental.useFSM`, `fsmComponents.enableTimer`, and `enableFSMInspector` for granular control over FSM features.

## [1.9.14] - 2025-10-15

### Fixed

- **Missing apiBaseUrl Migration**: Fixed critical 404 "Project not found" errors for connections created before v1.9.6 by adding automatic migration logic that reconstructs missing `apiBaseUrl` fields using the correct URL format (`https://dev.azure.com/{organization}/{project}/_apis`). This resolves authentication loops and ensures existing connections work properly without requiring users to recreate them.

## [1.9.13] - 2025-10-13

### Fixed

- **Webview initialization**: Fixed tabs getting stuck on "Initializing extension..." when authentication reminders couldn't be delivered because the webview panel wasn't ready yet. Authentication reminders are now properly queued and delivered when the webview loads, ensuring users see sign-in prompts instead of indefinite loading screens.

## [1.9.12] - 2025-10-08

### Changed

- **Microsoft Entra sign-in flow**: Reminder cards now stay quiet until you click **Sign in**, at which point the extension clears stale credentials and launches the device-code prompt so you always get a fresh code on demand.
- **Setup wizard**: Completing a new project with Entra authentication automatically kicks off the device-code sign-in, making sure the connection is ready to use immediately.
- **Timer workflow**: Stopping the timer opens the comment composer directly inside the work items view with a concise **Apply** button—no more extra quick pick dialog—while starting a timer keeps the composer hidden so focus stays on the board/list.

### Fixed

- **Status bar timer**: The Svelte webview now reports user activity again, allowing the timer to resume from “Paused” the moment you interact with the UI.

## [1.9.11] - 2025-10-08

### Fixed

- **Comment composer**: Spacebar and normal typing now work reliably inside the comment/summary textarea; global selection toggle shortcuts are ignored whenever focus is in that field.

### Changed

- **Keyboard navigation**: Added a Vim-style insert mode toggle—press `i` to pause navigation shortcuts and `Esc` to resume—plus clear status indicators so power users can control when shortcuts are active.

## [1.9.9] - 2025-10-08

### Changed

- Streamlined timer stop flow so the compose dialog now opens directly in the work items webview, eliminating the redundant quick pick prompt in VS Code.
- Starting a timer no longer opens the compose dialog by default; focus remains on the work items list unless the user explicitly opens the composer.
- Added lightweight activity detection in the Svelte webview to keep timer status in sync with user interaction.
- Preserved legacy fallback flow when the webview isn’t available, ensuring work item updates can still be applied through VS Code dialogs.

## [1.9.7] - 2025-10-07

### Added

- **Query Performance Limits**: Implemented client-side limiting to prevent performance issues with large result sets
  - Added 100-item limit for potentially large queries: "All Active", "Recently Updated", "Current Sprint", and custom WIQL queries
  - User-scoped queries ("My Activity", "Assigned to me") remain unlimited as they are naturally bounded
  - Applied smart limiting logic that distinguishes between user-scoped and project-wide queries
  - Results are truncated after successful API response to ensure consistent performance

### Fixed

- **WIQL Query Syntax**: Fixed "All Active" query that was causing 400 Bad Request errors
  - Changed problematic `WHERE 1=1` clause to proper `WHERE [System.TeamProject] = @Project`
  - Resolved "Expecting field name. The error is caused by «1»." error that affected both cloud and on-premises deployments
  - All built-in queries now use proper WIQL syntax compatible with Azure DevOps Services and Server

### Changed

- **UI Terminology Consistency**: Updated terminology from "connection" to "project" throughout the interface
  - Setup wizard now shows "Add new project", "Manage existing project", "Remove project"
  - All UI labels, tooltips, and messages use consistent "project" terminology
  - Added skipInitialChoice parameter to SetupWizard for improved navigation flow
  - Setup flow now navigates directly from manage to project list (skips redundant menu)

- **README Enhancement**: Complete rewrite focused on user attraction and quick onboarding
  - Restructured with "Why Choose This Extension?" value propositions
  - Added "Get Started in 3 Steps" quick setup process
  - Moved animated demo GIF to top for immediate visual impact ("a picture is worth a thousand words")
  - Condensed feature descriptions while preserving all functionality
  - Maintained all security notices and legal compliance requirements
  - Streamlined advanced features into organized, scannable sections

## [1.9.6] - 2025-01-17

### Fixed

- **On-Premises URL Parsing and Identity**: Fixed multiple issues with on-premises Azure DevOps Server connections
  - **Manual Entry apiBaseUrl**: Fixed hardcoded `dev.azure.com` URL in manual entry flow - now properly generates `apiBaseUrl` for all instance types (dev.azure.com, visualstudio.com, custom/on-prem)
  - **Identity Name for On-Premises**: Added required identity prompting for on-premises connections
    - On-premises servers often don't resolve `@Me` in WIQL queries correctly
    - Now prompts for user identity (domain\username or email) after PAT entry
    - Pre-fills with detected identity from environment variables (USERDOMAIN\USERNAME on Windows, USER on Linux/Mac)
    - Identity name is required (not optional) for on-premises to ensure queries work
    - Identity is passed to AzureDevOpsIntClient for proper @Me substitution
  - Updated both `SetupWizardData` and `StoredConnection` interfaces to include `identityName` field
- **Missing apiBaseUrl in Connections**: Fixed critical bug where `apiBaseUrl` was not being saved when creating connections through SetupWizard
  - On-premises connections were missing `apiBaseUrl`, causing them to not appear in UI or be accessible
  - SetupWizard now properly copies `apiBaseUrl` from parsed URL to connection object
  - Updated `StoredConnection` interface to include `apiBaseUrl` field
  - This fixes the issue where on-premises connections would save but not be detected or usable
- **Entra ID Authentication Option Missing**: Fixed critical bug where users adding new connections were not offered the choice between Entra ID and PAT authentication
  - Legacy "Add project connection" flow was bypassing the modern SetupWizard
  - Now uses SetupWizard for all new connections, properly offering both auth methods
  - Cloud connections (dev.azure.com, visualstudio.com) now correctly show "Microsoft Entra ID (Recommended)" option
  - Added debug logging to setup wizard for future troubleshooting
  - See [BUG_FIX_ENTRA_ID_NOT_OFFERED.md](docs/BUG_FIX_ENTRA_ID_NOT_OFFERED.md) for details
- **Status Bar Click Command**: Fixed status bar item to directly sign in/refresh the active connection instead of cycling through pending connections
  - Clicking the Entra ID status bar now acts on the displayed connection
  - Improved user experience when managing authentication status
- **Setup Wizard Error Handling**: Added comprehensive logging and error messages for connection setup failures
  - Better diagnostics for PAT validation issues
  - Clearer error messages when connection save fails
  - All setup steps now log progress to help troubleshoot issues

### Changed

- **Comprehensive Animated GIF**: Replaced three static screenshots with one 90-frame animated GIF demonstrating complete extension workflow
  - Shows: initializing → loading → list view → transition → kanban board
  - Applied authentic VS Code Dark+ theme with 50+ CSS variables
  - Fixed viewport width calculation for `deviceScaleFactor: 2` (viewport must be `(width + padding) * 2`)
  - Solid background (#0d1117) for GitHub README compatibility
  - Frame size: 3200x1432 (1600x716 at 1x scale)
  - File size: ~4.68 MB for 90 frames at 20fps (4.5 seconds)

## [1.9.5] - 2025-10-06

### Added

- **Enhanced Loading States**: New "Initializing extension..." and "Loading work items..." states provide clear feedback during startup and query execution
  - Eliminates premature "No items found" flash before items load
  - Smart state management only exits initializing state when meaningful data is received
  - Connection switching properly resets to initializing state

### Changed

- **Improved TFS/Azure DevOps Server URL Parsing**: Enhanced parser now correctly handles 3-segment on-premises URLs (collection/organization/project)
  - Fixed API URL construction for on-premises installations
  - Added smart URL validator that detects project segment before special folders (`_workitems`, `_git`, `_apis`)
  - Cloud URL parsing remains unchanged and protected from on-premises logic
- **Connection-Specific PAT Storage**: Eliminated global PAT storage for improved security
  - Each connection now stores its own PAT independently
  - On-premises connections prompt for username (identityName) for proper identity resolution
  - Enhanced identity fallback logic when connectionData endpoint is unavailable

### Fixed

- **On-Premises Query Issues**: Resolved issue where "Assigned to me" and "My Activity" queries returned 0 items
  - Fixed API endpoint construction to use correct path: `https://server/collection/org/project/_apis`
  - Added identity name fallback for on-premises username resolution
  - Improved connection validation during setup
- **Cross-Connection Data Isolation**: Fixed webview message filtering to prevent data contamination between connections
  - All provider messages now include connectionId for proper routing
  - Auth reminder clearing works correctly when switching connections
- **Cloud URL Regression**: Protected Azure DevOps Services (dev.azure.com, visualstudio.com) from on-premises URL parsing logic

### Development

- **Automated Screenshot Generation**: Added fully automated GIF generation for loading sequence documentation
  - Pure JavaScript implementation using gifenc + pngjs (no external dependencies)
  - Generates 4-second animated GIF showing initializing → loading → loaded states
  - Command: `npm run screenshots:loading-gif`
  - Output: 80 frames at 20fps showing complete user experience

## [1.9.4] - 2025-10-06

### Added

- **Azure DevOps Server (On-Premises) Support**: Full compatibility with on-premises Azure DevOps Server installations
  - Extension now correctly uses custom `baseUrl` for all API operations
  - URL parser handles on-premises server URLs (e.g., `https://server/collection/project/...`)
  - Updated URL generation functions for PAT creation and work item links
  - Comprehensive test coverage for on-premises scenarios

### Changed

- **Setup Wizard Authentication Detection**: Setup wizard now automatically detects Azure DevOps Server (on-premises) installations and guides users to use PAT authentication
  - Microsoft Entra ID (OAuth) is only offered for Azure DevOps Services (cloud)
  - Clear messaging explains that on-premises servers require PAT authentication
  - Automatic selection of appropriate authentication method based on server type

### Documentation

- Added detailed on-premises testing guide (`docs/ONPREMISES_TESTING.md`)
- Updated README with on-premises support information and authentication requirements
- Added examples for on-premises URL formats and configuration

## [1.9.3] - 2025-10-03

### Changed

- **Documentation screenshots**: Regenerated list and Kanban captures with a light theme backdrop so text remains readable and the README shows consistent framing across both views.

### Technical

- **Screenshot generator styling**: Updated the Playwright capture script to enforce light foreground/background colors, refreshed card styling, and standardized padding for future documentation assets.

## [1.9.1] - 2025-10-03

### Changed

- **Entra ID scope updates**: Every Microsoft Entra connection now requests `offline_access` alongside the Azure DevOps resource scope so refresh tokens are issued for long-lived sessions.

### Fixed

- **Persistent token cache**: MSAL’s token cache is serialized to VS Code secret storage, allowing silent token renewal to survive window reloads and reducing repeat sign-in prompts.

## [1.9.0] - 2025-01-XX

### Added

- **🔐 Microsoft Entra ID Authentication (OAuth 2.0)**: Modern, secure authentication as an alternative to Personal Access Tokens
  - **Device Code Flow**: Simple browser-based sign-in with your Microsoft account
  - **Automatic Token Refresh**: Tokens refresh automatically in the background every 30 minutes
  - **Enterprise Compatible**: Works seamlessly with your organization's security policies
  - **No Manual Setup**: No need to create or manage Personal Access Tokens
  - **Secure Token Storage**: Refresh tokens encrypted using VS Code's SecretStorage API
  - **Dual Authentication Support**: Seamlessly coexist with existing PAT connections

- **🚀 Enhanced Setup Wizard**: Streamlined onboarding with authentication choice
  - **Authentication Method Selection**: Choose between Entra ID (recommended) or PAT
  - **Integrated Device Code Flow**: Complete OAuth 2.0 sign-in within the wizard
  - **Smart Guidance**: Clear recommendations for authentication method selection
  - **Connection Testing**: Validate both authentication types during setup

- **📊 Authentication Status Indicators**: Real-time authentication monitoring
  - **Status Bar Integration**: Visual indicators showing current authentication state
  - **Token Health Monitoring**: Display token expiration and refresh status
  - **Connection Manager Enhancement**: Auth method and status display in connection overview
  - **Interactive Status**: Click status bar to access authentication commands

- **⚡ Background Token Management**: Seamless authentication experience
  - **Automatic Refresh**: Background service refreshes tokens before expiration
  - **Proactive Handling**: Prevents authentication interruptions during work
  - **Error Recovery**: Automatic retry and fallback mechanisms
  - **Resource Cleanup**: Proper cleanup of background timers and resources

### New Commands

- `Azure DevOps Integration: Sign In with Microsoft Entra ID`: OAuth 2.0 device code authentication
- `Azure DevOps Integration: Sign Out from Entra ID`: Sign out and clear stored tokens
- `Azure DevOps Integration: Convert Connection to Entra ID`: Migrate existing PAT connection to Entra ID

### Changed

- **Setup Wizard**: Enhanced from 5 to 6 steps with authentication method selection
- **Connection Manager**: Now displays authentication method and token status
- **Azure DevOps Client**: Enhanced with dual authentication support and automatic token refresh on API failures

### Technical Improvements

- **MSAL Integration**: Official Microsoft Authentication Library (MSAL) for Node.js
- **Secure Architecture**: Proper separation of authentication providers with unified interface
- **Background Services**: Efficient token refresh with configurable intervals and cleanup
- **Error Handling**: Enhanced error recovery for authentication failures and token expiration

## [1.8.2] - 2025-10-02

### Added

- **🎯 Bulk Operations**: Professional multi-select work item management
  - Bulk Assign: Assign multiple work items to any user with progress tracking
  - Bulk Move: Change state for multiple items simultaneously
  - Bulk Add Tags: Add tags to multiple items with smart deduplication
  - Bulk Delete: Soft delete with double-confirmation for safety
  - Multi-select UI with checkboxes on all work items
  - Ctrl/Cmd+Click for quick selection
  - Animated bulk actions toolbar with visual feedback
  - Real-time progress notifications and detailed error reporting

- **🔍 Filter & Query Management**: Complete filtering system
  - Clear All Filters: Reset all active filters with one click (keybinding: `/`)
  - Focus Search: Keyboard shortcut to jump to search box
  - Export/Import Filters: Share configurations via JSON files
  - Saved Filters Management: Save, load, delete, and list named filter sets
  - Query Builder: Interactive WIQL construction with templates and validation
    - 5 pre-built query templates (My Items, Recent, Bugs, Sprint, Unassigned)
    - Live syntax validation and comprehensive help reference
    - Macro support (@Me, @Today, @Project, @CurrentIteration)

- **📊 Performance Monitoring**: Complete observability suite
  - Performance Dashboard: Comprehensive metrics display
    - Operation statistics (total, avg/min/max duration, error/cache rates)
    - Memory usage tracking (heap, RSS, peak usage)
    - Cache statistics and efficiency metrics
    - Smart recommendations for optimization
  - Clear Performance Data: Reset metrics baseline
  - Force Garbage Collection: Manual memory cleanup (requires --expose-gc)

### Changed

- **Enhanced Error Handling**: Transformed from silent failures to actionable guidance
  - Context-specific error messages (401/403/404/5xx/network)
  - Detailed troubleshooting steps for common issues
  - Prominent error banner in webview with warning icon
  - All errors logged to Output Channel for debugging
  - Console bridging: All console.log/error/warn routed to Output Channel

- **UI/UX Improvements**: Professional, intuitive interface
  - Multi-select checkboxes on every work item (list & Kanban views)
  - Visual selection indicators (blue border & background)
  - Selected count badge in header
  - Animated bulk actions toolbar with contextual buttons
  - Keyboard shortcuts help and discovery

### Fixed

- **Critical: Module Format**: Changed from ESM to CommonJS for Cursor compatibility
  - Extension now works in both VSCode and Cursor
  - Fixed "Cannot find package 'vscode'" error in Cursor

- **Critical: Configuration Properties**: Removed writes to non-existent config properties
  - Fixed "Unable to write to User Settings" error in Setup Wizard
  - Removed legacy organization/project/team config writes

- **Critical: Webview Scope Bug**: Recovered 600+ lines of missing code
  - Fixed missing closing brace that nested all webview logic
  - Webview bundle grew from 12kb to 203kb (proper size)
  - Boot function and app initialization now execute correctly

- **Critical: Variable Scope Error**: Fixed `normalizedQuery is not defined`
  - Moved variable declaration outside try block for proper error handling
  - Error logging now works correctly with full context

- **Performance Dashboard**: Fixed cache stats property access
  - Changed from non-existent properties to correct structure
  - Dashboard now displays accurate cache metrics

### Removed

- **14 Stub Commands**: Removed all "coming soon" placeholder commands
  - No more fake/incomplete features visible to users
  - Professional, honest feature set
  - All remaining 38 commands are fully functional

- **11 Non-functional Keybindings**: Removed shortcuts with no implementations
  - Only working keybindings remain (r, v, /)

### Technical

- **Build System**: ESM → CommonJS migration for extension host
  - Webview remains ESM for browser compatibility
  - Proper externalization of 'vscode' module
- **Console Bridging**: All console output captured to Output Channel when debug logging enabled
- **Selection Infrastructure**: ID-based selection tracking with Set efficiency
- **Error Propagation**: Errors now throw instead of returning empty arrays
- **Type Safety**: Fixed TypeScript compilation errors

### Developer Experience

- **Zero Linter Errors**: Clean build with no warnings
- **Complete Feature Set**: No stubs, all commands production-ready
- **Enhanced Logging**: Comprehensive error context and stack traces
- **Better Debugging**: Console bridging provides full visibility

## [1.7.11] - 2025-10-01

### Changed

- **Activity Bar Icon Label**: Updated the Activity Bar icon title from "Azure DevOps" to "Azure DevOps Integration" for better clarity and consistency with the extension name.

## [1.7.10] - 2025-10-01

### Fixed

- **Connection Tabs Display**: Fixed bug where connection tabs were not appearing in the webview when multiple Azure DevOps connections/projects were configured. The webview now properly receives and displays connection tabs for switching between projects.
- **Per-Connection State Isolation**: Implemented connection-specific state management so each connection/project maintains its own independent query, filters (text, type, state, sort), and Kanban/List view preference. Switching between tabs now preserves the context for each connection.

### Technical

- Added `connectionsUpdate` message handler in webview to receive connection list from extension
- Implemented per-connection state storage using localStorage with in-memory caching
- Connection state persists across sessions and survives extension reloads
- Added visual tab UI matching VS Code's native tab styling when multiple connections exist

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

- **Microsoft Entra reminders**: Work Items view now surfaces sign-in reminder cards with one-click reconnect or a 30-minute snooze when a connection loses access.

- **🚀 Performance Optimization**: Intelligent caching system with 60-80% faster API responses
  - LRU + TTL caching with automatic memory management
  - Multi-level caching for work items, API responses, and metadata
  - Real-time performance monitoring and analytics
  - Automatic garbage collection and memory optimization

- **⌨️ Advanced Keyboard Navigation**: Vim-style shortcuts and power user features
  - `j/k` for up/down navigation, `h/l` for left/right (Kanban view)
  - `gg`/`G` for top/bottom, `Home`/`End` support
  - `Space` to toggle selection, `Ctrl+A` to select all
  - `Enter` to open, `r` to refresh, `v` to toggle view, `f` to focus search
  - Full accessibility support with ARIA labels and screen reader compatibility

- **📊 Performance Dashboard**: Real-time monitoring and health analytics
  - Live performance metrics and cache statistics
  - Memory usage tracking and optimization recommendations
  - Health indicators (Excellent/Good/Warning/Critical)
  - Force garbage collection and clear performance data commands

- **🔧 Bulk Operations**: Mass work item management
  - Bulk assign, move, tag, and delete work items
  - Progress tracking with cancellation support
  - Configurable batch sizes and error handling
  - Detailed error reporting and recovery options

- **🔍 Advanced Filtering**: Visual query builder and saved filters
  - Drag-and-drop query builder interface
  - Save, manage, and share custom filters
  - Complex criteria support (equals, contains, between, etc.)
  - Import/export filters across teams and environments

- **♿ Accessibility Excellence**: Comprehensive accessibility features
  - Full ARIA implementation with proper labels and roles
  - High contrast theme support
  - Complete keyboard-only operation
  - Screen reader compatibility and voice control structure

### Changed

- **Entra status bar cycling**: The Microsoft Entra status bar button now displays the remaining token lifetime and cycles through every connection that needs attention when clicked.
- **Device code convenience**: Choosing “Open Browser” during Entra sign-in now copies the device code to your clipboard before launching the Microsoft sign-in page.

- **Performance**: 60-80% faster API responses through intelligent caching
- **Memory Usage**: Automatic memory management with intelligent cleanup
- **User Experience**: Enhanced keyboard navigation and accessibility
- **Workflow Efficiency**: Bulk operations for managing large numbers of work items
- **Filtering**: Advanced filtering capabilities with visual query builder

### Fixed

- **Memory Leaks**: Automatic garbage collection and memory optimization
- **Performance Issues**: Intelligent caching reduces API calls and improves response times
- **Accessibility**: Full keyboard navigation and screen reader support
- **User Experience**: Enhanced focus management and visual feedback

### Notes

- **Major Version Update**: This represents a significant enhancement to the extension
- **Backward Compatibility**: All existing functionality remains unchanged
- **Performance**: Substantial performance improvements across all operations
- **Accessibility**: Now fully accessible with keyboard-only operation support

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
- Merge pull request #16 from plures/copilot/fix-15
- Apply prettier formatting to all files
- Fix integration tests failing due to improper setup with fallback mechanisms
- Initial plan
- Merge pull request #14 from plures/copilot/fix-13
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

- Merge pull request #10 from plures/feature/mcpserver
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

- Merge pull request #6 from plures/copilot/add-branch-and-pr-creation
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

- Merge pull request #4 from plures/feature/svelte-ui-scaffold
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

- Merge pull request #2 from plures/copilot/timer-implementation-comprehensive
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
