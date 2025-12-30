# Validation Checklist

## Overview

This checklist ensures the Azure DevOps Integration Extension meets all quality, security, and performance standards before release. All items must be completed and verified.

## Reactive Architecture Philosophy ✅

### Separation of Concerns

- [x] Svelte controls webview UI rendering and user interactions
- [x] Praxis manages all application state and business logic (Facts, Rules, Flows)
- [x] Svelte informs Praxis of user actions (not controls it)
- [x] Praxis updates state/context via Rules (not UI directly)
- [x] UI reacts automatically to state/context changes

### Reactive Paradigm (Not Messaging)

- [x] State/context updates drive UI reactively
- [x] Single `syncState` message for all state updates
- [x] Removed partial state messages (`syncTimerState`, `workItemsError`, `workItemsLoaded`, `timerUpdate`)
- [x] All UI-visible state in Praxis context (Facts)
- [x] No command messages to control UI
- [ ] Single context definition file is the only source of schema
- [ ] Runtime context is immutable (deep-frozen snapshots in dev)
- [ ] Context updates happen via typed reducers/patches only (no ad-hoc mutation)

### Status Bar Behavior

- [x] Status bar is created at activation and is always visible while extension is active
- [x] Shows "$(plug) No connections" when there are zero configured connections
- [x] Shows "$(plug) Select a connection" when connections exist but none is active
- [x] Shows "$(sync~spin) … Connecting…" during connecting/retrying states (no premature failure)
- [x] Shows "Sign In Required" only after all retries are exhausted (final state)
- [x] Reacts to Praxis context changes immediately (no polling/timers)
- [x] Logging cannot break UI updates (no undefined identifiers in log payloads)

### URL Semantics (ADO Online and On-Prem)

- [x] apiBaseUrl includes project and ends with `/_apis` (canonical REST root)
- [x] All REST API calls are built from `apiBaseUrl` (never from `baseUrl`)
- [x] baseUrl is used only for browser links (openExternal, work item URLs)
- [x] dev.azure.com: `https://dev.azure.com/{org}/{project}/_apis`
- [x] \*.visualstudio.com: `https://{org}.visualstudio.com/{project}/_apis`
- [x] On-Prem: `{server}/{collection}/{project}/_apis`
- [x] Manual `apiBaseUrl` is auto-corrected to include `{project}/_apis` if missing

### Implementation Status

- [x] Toggle debug view: Svelte controls locally, notifies Praxis
- [x] User actions: Svelte sends events, Praxis Rules process
- [x] State sync: Praxis sends full context via `syncState`
- [x] Provider updates Praxis context (not direct messages) - Messages go through forwardProviderMessage → sendToWebview → Praxis dispatch
- [x] Timer state in Praxis context (not separate messages) - Timer state managed by Praxis TimerManager, sent via syncState

### Context Ownership & Enforcement

- [ ] Context schema defined once (e.g., `src/context/applicationContext.ts`)
- [ ] Exported as `Readonly`/`ReadonlyDeep` types to all consumers
- [ ] Write APIs are confined to reducer factories in the same module
- [ ] Lint rules block additional context type definitions elsewhere
- [ ] Event factories enforce origin/owner for selection updates (webview-only)

## Foundation Architecture Discipline ✅

### Validation Infrastructure

- [x] Architecture discipline documentation
- [x] TDD template and workflow
- [x] XState v5 validation script
- [x] Type-safe helpers for XState
- [x] ESLint rules for file size
- [x] Post-mortem analysis
- [x] **Fixed all 9 XState violations** across 3 machine files
- [x] **Build succeeds** without errors
- [x] **Validation passes** - all machines valid

### Test Infrastructure

- [x] Create `tests/features/` directory
- [x] Add vitest configuration
- [x] Write timer integration test (14 tests)
- [x] Verified test fails (RED phase) - caught missing RESTORE
- [x] Fixed until GREEN - all 14 tests passing
- [x] Discovered dynamic target syntax issue in XState v5
- [x] Fixed with guard-based transition array

### Module Extraction

- [x] Extract timer module into small files (< 300 lines each)
- [x] Create feature-based directory structure
- [x] Implement pure functions for persistence
- [x] Add co-located tests for utilities
- [x] Maintain single responsibility principle
- [x] **Extract Command Handlers module** from activation.ts (2,929 lines → modular)
- [x] **Extract Azure Client module** from azureClient.ts (1,535 lines → modular)
- [x] **Extract Connection Machine module** from connectionMachine.ts (1,316 lines → modular)
- [x] **Fix all parsing errors** in activation.ts (95 problems → 0 errors)
- [x] **Remove duplicate code** and old command registrations

### Pre-Commit Enforcement

- [x] Update `.husky/pre-commit` with validation checks
- [x] Add lint-staged configuration
- [x] Run XState validation before commit
- [x] Run feature tests before commit
- [x] Prevent broken code from entering git history

### Praxis Type-Safe Architecture

- [x] Enhanced runtime validation (Layer 1) - Build-time validation script
- [x] Facts and Events migration (Layer 2) - **Praxis migration complete** ✅ COMPLETE
  - [x] All state represented as Facts in context
  - [x] IntelliSense works for Events and Facts
  - [x] Type-safe Rules with proper context typing
- [x] **Praxis Schema Format (PSF)** - Schema-first definition
  - [x] Schema format defined in Praxis framework
  - [x] Type generation from schemas
  - [x] All engines use Praxis schema format
- [x] **Praxis Rules Validation** - Type-safe Rules
  - [x] Rules are pure functions with typed context
  - [x] Events are type-safe with proper payloads
  - [x] Facts are properly typed in context
- [x] **Praxis Unified Svelte Integration** - Official Integration
  - [x] Migrated from polling to reactive subscriptions
  - [x] Using `createPraxisStore` for reactive state management
  - [x] Using `createContextStore` for direct context access
  - [x] Eliminated polling overhead (100ms intervals)
  - [x] Event-driven updates with instant reactivity
  - [x] Proper subscription management and cleanup
- [x] **Praxis v1.2.0 Upgrade** - Latest version integration ✅ COMPLETE
  - [x] Updated @plures/praxis to v1.2.0
  - [x] Unified Svelte integration implemented
  - [x] Build scripts updated to use npx praxis CLI
  - [x] Canvas command updated to use npx praxis canvas
  - [x] Build configuration verified for compatibility
  - [x] Introspection tools available via praxis CLI commands
  - [x] Framework-agnostic reactive engine available (for future use)
  - [x] Enhanced Svelte 5 runes support available

### Action Buttons Implementation

- [x] **Fixed Svelte deprecation warnings** (on:click → onclick, on:keydown → onkeydown)
- [x] **Added missing webview variables** (nonce, scriptUri, mainCssUri)
- [x] **Fixed webview loading error** - view now renders correctly
- [x] **Enhanced branch creation** with work item linking and comments
- [x] **Added in-VSCode edit dialog** for work items
- [x] **Improved timer state synchronization** between Praxis and webview
- [x] **Added comprehensive error handling** for all action buttons
- [x] **Resolved build errors** - duplicate methods, file size limits
- [x] **Extension activation successful** - all features operational
- [x] **Added webview message handler** - critical fix for ALL button functionality
- [x] **Fixed timer state sync** - Praxis TimerManager now broadcasts state to application context
- [x] **Fixed branch creation** - corrected synchronous getWorkItems usage
- [x] **Removed unused syncDataToWebview** - eliminated confusing dead code

### Quality Gates

- [x] All Praxis engines pass validation
- [x] Timer feature has integration tests (14 tests)
- [x] Timer module extracted into small files
- [x] Pre-commit validation enabled
- [x] Build succeeds without errors
- [x] **Command Handlers module extracted** and tested
- [x] **Azure Client module extracted** and tested
- [x] **All parsing errors resolved** (0 errors, 5 complexity warnings)
- [x] **Architecture discipline enforced** via ESLint rules

### Developer Experience

- [x] Can add features without fear
- [x] Tests catch regressions immediately
- [x] Small modules easy to understand
- [x] Clear error messages from validation

### Feature Design Process

- [x] **Feature Design Template created** (`docs/FeatureDesignTemplate.md`)
- [ ] Feature design template is documented and accessible
- [ ] All new features have design documents in `docs/features/`
- [ ] Design documents are reviewed and approved before implementation
- [ ] Design documents include MoSCoW prioritization
- [ ] Design documents include testable acceptance criteria (Gherkin)
- [ ] Design documents link to related issues/PRs
- [ ] Design documents are kept updated during implementation

### Entra ID Authentication Migration

- [x] **Migration Plan Created** (`docs/ENTRA_AUTH_MIGRATION_PLAN.md`)
- [ ] Migration plan reviewed and approved
- [ ] PKCE utilities implemented (`src/auth/pkceUtils.ts`)
- [ ] Authorization code flow provider implemented (`src/auth/authorizationCodeProvider.ts`)
- [ ] URI handler registered in package.json
- [ ] URI handler registered in activation.ts
- [ ] EntraAuthProvider updated to support auth code flow
- [ ] Praxis authentication rules updated
- [ ] UI components updated for auth code flow
- [ ] Unit tests for PKCE utilities (>90% coverage)
- [ ] Integration tests for auth code flow
- [ ] Manual testing completed on all platforms
- [ ] Feature flag implemented for gradual rollout
- [ ] Backward compatibility maintained (device code fallback)
- [ ] Documentation updated (README, CHANGELOG, security docs)
- [ ] User communication prepared (release notes, migration guide)

---

### Project Setup

- [ ] Project structure follows established patterns
- [ ] All required directories exist
- [ ] Configuration files are properly set up
- [ ] Dependencies are correctly specified
- [ ] TypeScript configuration is strict mode
- [ ] ESM-first architecture is implemented
- [ ] `src/context/applicationContext.ts` owns ApplicationContext shape
- [ ] `createInitialContext()` returns deep-frozen default snapshot in dev
- [ ] `ContextPatch` reducers exported from context module only
- [ ] ESLint `no-restricted-imports` enforces single writer for selection factory (webview)

### Development Environment

- [ ] VS Code workspace is configured
- [ ] Debug configurations are set up
- [ ] Recommended extensions are installed
- [ ] Git hooks are configured
- [ ] Pre-commit checks are working

## Code Quality Checklist

### TypeScript Compliance

- [ ] All code uses TypeScript strict mode
- [ ] No `any` types used (except where necessary)
- [ ] All public APIs have explicit type annotations
- [ ] Null safety is properly handled
- [ ] ESM imports/exports are used consistently
- [ ] No CommonJS patterns (`require`, `module.exports`)

### Code Style

- [ ] All code is formatted with Prettier
- [ ] ESLint passes without errors
- [ ] Naming conventions are followed
- [ ] Code is properly commented
- [ ] JSDoc comments are present for public APIs
- [ ] No console.log statements in production code

### File Organization

- [ ] One class per file principle followed
- [ ] Barrel exports are used appropriately
- [ ] Directory structure is logical
- [ ] File names follow conventions
- [ ] No duplicate or legacy files

## Security Checklist

### Authentication & Authorization

- [ ] Personal Access Tokens are stored securely
- [ ] No hardcoded secrets in code
- [ ] Least privilege principle is followed
- [ ] Token rotation is supported
- [x] Authentication errors are handled properly
- [x] Entra token expiration triggers interactive re-auth (no legacy refresh path)
- [x] Status bar shows "Connecting..." during retries (no premature failure)
- [x] Entra ID reauth requires user confirmation before browser opens (security fix: prevents automatic browser opening)

### Input Validation

- [ ] All user inputs are sanitized
- [ ] API responses are validated
- [ ] HTML content is properly escaped
- [ ] File paths are validated
- [ ] SQL injection prevention is implemented
- [x] Query selector validates user input for security
- [x] Query selector prevents dangerous SQL operations
- [x] Query validation provides clear error messages

### Content Security Policy

- [ ] Strict CSP is implemented
- [ ] No inline scripts without nonces
- [ ] No external resources in webviews
- [ ] Data URLs are used appropriately
- [ ] Script sources are properly restricted

### Data Protection

- [ ] Sensitive data is not logged
- [ ] User data is properly encrypted
- [ ] Data retention policies are followed
- [ ] Privacy settings are respected
- [ ] GDPR compliance is maintained

## Performance Checklist

### Activation Performance

- [ ] Extension activates in < 100ms
- [ ] No synchronous file operations in activation
- [ ] Lazy loading is implemented
- [ ] Resources are properly disposed
- [ ] Memory leaks are prevented

### Runtime Performance

- [ ] API calls are debounced
- [ ] Caching is implemented
- [ ] Pagination is used for large datasets
- [ ] Background processing is used appropriately
- [ ] UI remains responsive

### Memory Management

- [ ] Disposables are properly managed
- [ ] Event listeners are removed
- [ ] Timers are cleared
- [ ] Memory usage is monitored
- [ ] No memory leaks detected

## Testing Checklist

### Test Coverage

- [ ] Unit test coverage > 90%
- [ ] Integration tests cover major workflows
- [ ] E2E tests cover user journeys
- [ ] Edge cases are tested
- [ ] Error conditions are tested

### Test Quality

- [ ] Tests are descriptive and clear
- [ ] AAA pattern is followed
- [ ] Mocks are used appropriately
- [ ] Tests are independent
- [ ] Test data is properly managed

### Test Execution

- [ ] All tests pass consistently
- [ ] Tests run in reasonable time
- [ ] No flaky tests
- [ ] Tests are properly isolated
- [ ] CI/CD pipeline includes all tests

## Documentation Checklist

### Code Documentation

- [ ] All public APIs are documented
- [ ] Complex logic is commented
- [ ] README is up to date
- [ ] Changelog is current
- [ ] Architecture is documented

### User Documentation

- [ ] Installation instructions are clear
- [ ] Usage examples are provided
- [x] Screenshots are included (automated generation during build)
- [ ] Troubleshooting guide exists
- [ ] FAQ is comprehensive

### Developer Documentation

- [ ] Development setup is documented
- [ ] Build process is explained
- [ ] Testing procedures are clear
- [ ] Contributing guidelines exist
- [ ] Code review process is defined

## Build and Deployment Checklist

### Build Process

- [ ] Build is reproducible
- [ ] Dependencies are pinned
- [ ] Build artifacts are correct
- [ ] Source maps are generated
- [ ] Minification works properly

### Packaging

- [ ] Extension packages correctly
- [ ] All required files are included
- [ ] No unnecessary files are included
- [ ] Package size is reasonable
- [ ] VSIX file is valid

### Release Process

- [ ] Version is incremented correctly
- [ ] Changelog is updated
- [ ] Release notes are written
- [ ] GitHub release is created
- [ ] Marketplace is updated

## Integration Checklist

### VS Code Integration

- [x] Commands are properly registered
- [x] Views are correctly configured
- [x] Menus are properly set up
- [x] Settings are defined
- [x] Keybindings work correctly
- [x] Setup wizard properly saves connections to configuration
- [x] Setup wizard supports multiple connections (add new, modify existing)
- [x] Settings use JSON connections array instead of individual fields
- [x] Connection management commands available (add, edit, delete)
- [x] Query selector provides easy access to all default queries
- [x] Query selector includes descriptive text for each query option
- [x] Query selection is persisted per connection
- [x] Query selection persists across sessions (per-connection via globalState)
- [x] Work items reload on query change (debounce queues a deferred refresh)
- [x] WIQL fallback is bounded (project-scoped, recent window, excludes completed)
- [x] No unbounded WIQL queries executed (guards against 20k server limit)
- [x] "Recently Updated" query includes project filter and active filter (prevents 20k limit errors)
- [x] "Recently Updated" query uses 3-day window (aligned with ADO defaults)
- [x] Error retry logic uses shorter date windows (1 day) instead of longer ones
- [x] All default queries include project filter where applicable
- [x] All default queries use active filter to exclude completed items
- [x] Work item expansion uses chunked requests (prevents HTTP 414 long URLs)
- [x] “Created By Me” query is mapped to valid WIQL
- [x] Timer action button displays active timer with elapsed time on work item cards
- [x] Timer button toggles between Start and Stop states
- [x] Timer persists across VSCode restarts and work item refreshes
- [x] Edit action button implements in-VSCode edit dialog with field selection
- [x] Edit dialog supports Title, State, Assigned To, Tags, and Description fields
- [x] Branch action button links created branch back to work item
- [x] Branch linking adds comment to work item with branch name

### Azure DevOps Integration

- [x] API calls are properly authenticated
- [x] Rate limiting is respected
- [x] Error handling is comprehensive
- [x] Retry logic is implemented
- [x] Data is properly normalized
- [x] Connection persistence works correctly (setup wizard saves connections)
- [x] Multiple connections supported with proper management
- [x] Legacy settings maintained for backward compatibility
- [x] Each connection has its own PAT (connection-specific PAT storage)
- [x] PAT isolation between connections works correctly
- [x] Each connection stores its own base URL (supports different Azure DevOps instances)
- [x] Base URL migration works for existing connections
- [x] New Azure client exposes getWorkItemById (timer/comment operations)
- [x] Cross-connection UI isolation enforced (provider/webview messages carry connectionId and are filtered)
- [x] Work item list and kanban strictly show data for the active connection

#### Webview Connection Isolation Design (Implemented)

**Design Document**: `docs/WEBVIEW_CONNECTION_ISOLATION_DESIGN.md`

**Architecture Requirements:**

- [ ] Query selector appears below tab buttons (not adjacent)
- [ ] All controls and views are children of ConnectionView component
- [ ] Praxis context includes per-connection state maps (`connectionQueries`, `connectionWorkItems`, `connectionFilters`)
- [ ] Components use visibility toggle (not mount/unmount) for connection switching
- [ ] Per-connection state persists when switching connections
- [ ] Per-connection state persists across VS Code sessions

**Component Structure:**

- [ ] `ConnectionViews.svelte` container component created
- [ ] `ConnectionView.svelte` per-connection component created
- [ ] Query selector moved into `ConnectionView` (below tabs)
- [ ] Filters moved into `ConnectionView` (below tabs)
- [ ] WorkItemList scoped to `ConnectionView`
- [ ] StatusBar scoped to `ConnectionView`

**State Management:**

- [ ] FSM actions for `SET_CONNECTION_QUERY` implemented
- [ ] FSM actions for `SET_CONNECTION_WORK_ITEMS` implemented
- [ ] FSM actions for `SET_CONNECTION_FILTERS` implemented
- [ ] Per-connection state maps initialized in context
- [ ] State restoration from `globalState` on activation

**Data Loading:**

- [ ] Provider instances created per connection
- [ ] Data loading populates `connectionWorkItems` map
- [ ] Background refresh updates inactive connections (optional)
- [ ] Query changes trigger refresh for specific connection only

**User Experience:**

- [ ] Query selection persists when switching connections
- [ ] Work items persist when switching connections
- [ ] Filters persist when switching connections
- [ ] View mode (list/kanban) persists per connection
- [ ] Selected items persist per connection
- [ ] Instant switching (no loading delay for cached data)
- [ ] No data loss when switching connections rapidly

**Performance:**

- [ ] Components don't unmount/remount on connection switch
- [ ] Data persists in memory for all connections
- [ ] Acceptable performance with multiple connections (5+)
- [ ] Memory usage is reasonable

#### Upgrade Validation: Connections

- [ ] After upgrade, `azureDevOpsIntegration.connections` is present in current profile’s settings
- [ ] Extension startup reads connections (Output: “[connections] Loaded connections from config” with `count > 0` when configured)
- [ ] An `activeConnectionId` is resolved or persisted (UI does not show “No active connection selected.” when connections exist)
- [ ] Editing/saving settings triggers live reload (config change watcher re-loads connections)
- [ ] Legacy single `organization/project` settings (namespace `azureDevOps`) are migrated into a connection when no connections array exists
- [ ] Multi-root/workspace profile verified: connections available in both User and Workspace scopes as expected
- [ ] Entra/PAT tokens remain scoped per-connection after upgrade (no cross-connection leakage)
- [ ] Visual Studio Online (`*.visualstudio.com`) and `dev.azure.com` base URLs both normalize `apiBaseUrl` correctly after upgrade

### Git Integration

- [ ] Branch creation works correctly
- [ ] Pull request creation functions
- [ ] Repository detection is accurate
- [ ] Git commands are properly executed
- [ ] Error handling is appropriate

## Accessibility Checklist

### Keyboard Navigation

- [ ] All features are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Keyboard shortcuts work
- [ ] Escape key functions properly

### Screen Reader Support

- [ ] ARIA labels are present
- [ ] Alt text is provided for images
- [ ] Form labels are associated
- [ ] Status messages are announced
- [ ] Error messages are accessible
- [x] Query selector has proper ARIA labels and titles
- [x] Query descriptions are accessible to screen readers

### Visual Accessibility

- [ ] Color contrast meets standards
- [ ] Text is readable
- [ ] Icons have text alternatives
- [ ] Layout is responsive
- [ ] Font sizes are appropriate

## Error Handling Checklist

### User Errors

- [ ] Input validation errors are clear
- [ ] Error messages are helpful
- [ ] Recovery options are provided
- [ ] Errors are logged appropriately
- [ ] User feedback is collected

### System Errors

- [ ] Network errors are handled
- [ ] API errors are managed
- [ ] File system errors are caught
- [ ] Memory errors are prevented
- [ ] Crashes are avoided

### Error Reporting

- [ ] Errors are logged with context
- [ ] Stack traces are captured
- [ ] User information is protected
- [ ] Error reporting is optional
- [ ] Debug information is available

### Error Handling and User Feedback Feature - **Branch: `feature/error-handling-user-feedback`**

- [x] Error detection and type classification implemented (`src/fsm/functions/ui/error-handling.ts`)
- [x] Error banner component displays authentication errors (`src/webview/components/ErrorBanner.svelte`)
- [x] Connection status indicator in status bar (`src/webview/components/ConnectionStatus.svelte`)
- [x] Empty state component with error context (`src/webview/components/EmptyState.svelte`)
- [x] Recovery actions (Re-authenticate, Retry) implemented
- [x] Last refresh status tracking
- [x] Connection health monitoring
- [x] Error message catalog implemented (in `detectErrorType` function)
- [x] Unit tests for error detection (`tests/fsm/functions/ui/error-handling.test.ts`)
- [x] Integration tests for error handling flow (`tests/features/error-handling-integration.test.ts`)
- [x] E2E tests for user recovery scenarios (`tests/features/error-handling-e2e.test.ts`)

## Monitoring and Observability Checklist

### Logging

- [x] Structured logging is implemented
- [ ] Log levels are appropriate
- [ ] Sensitive data is not logged
- [ ] Logs are properly formatted
- [ ] Log rotation is configured

### Telemetry

- [ ] User consent is respected
- [ ] Data is anonymized
- [ ] Only necessary data is collected
- [ ] Telemetry is opt-in
- [ ] Data retention is limited

### Performance Monitoring

- [ ] Performance metrics are collected
- [ ] Bottlenecks are identified
- [ ] Memory usage is tracked
- [ ] Response times are measured
- [ ] Alerts are configured

## Compliance Checklist

### Legal Compliance

- [ ] License is properly specified
- [ ] Third-party licenses are acknowledged
- [ ] Privacy policy is available
- [ ] Terms of service are clear
- [ ] Copyright notices are present

### Security Compliance

- [ ] Security audit is completed
- [ ] Vulnerabilities are addressed
- [ ] Dependencies are up to date
- [ ] Security best practices are followed
- [ ] Penetration testing is performed

### Platform Compliance

- [ ] VS Code extension guidelines are followed
- [ ] Marketplace requirements are met
- [ ] Platform APIs are used correctly
- [ ] Performance requirements are met
- [ ] Accessibility standards are followed

## Final Release Checklist

### Pre-Release

- [ ] All checklists are completed
- [ ] Final testing is performed
- [ ] Documentation is reviewed
- [ ] Security audit is passed
- [ ] Performance is validated

### Release

- [ ] Version is tagged
- [ ] Release notes are published
- [ ] Marketplace is updated
- [ ] Announcements are made
- [ ] Monitoring is activated

### Post-Release

- [ ] User feedback is monitored
- [ ] Issues are tracked
- [ ] Performance is monitored
- [ ] Updates are planned
- [ ] Support is provided

## Emergency Procedures

### Rollback Plan

- [ ] Previous version is available
- [ ] Rollback procedure is documented
- [ ] Data migration is handled
- [ ] User notification is prepared
- [ ] Recovery time is estimated

### Incident Response

- [ ] Incident response plan exists
- [ ] Escalation procedures are defined
- [ ] Communication channels are established
- [ ] Recovery procedures are tested
- [ ] Post-incident review is planned

## Quality Gates

### Must Pass

- [ ] All tests pass
- [ ] No security vulnerabilities
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Feature design document completed and approved (for new features)

### Should Pass

- [ ] Code coverage > 95%
- [ ] Performance < targets
- [ ] User acceptance testing
- [ ] Accessibility compliance
- [ ] Platform guidelines

### Could Pass

- [ ] Advanced features working
- [ ] Performance optimizations
- [ ] Additional test coverage
- [ ] Enhanced documentation
- [ ] User experience improvements

---

**Note**: This checklist must be completed before any release. Any items marked as "Must Pass" are non-negotiable requirements. Items marked as "Should Pass" are strongly recommended. Items marked as "Could Pass" are nice-to-have improvements.
