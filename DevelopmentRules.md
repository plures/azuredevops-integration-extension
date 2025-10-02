# Development Rules

## Code Quality Standards

### TypeScript Rules

- **Strict Mode**: All TypeScript code must use strict mode
- **ESM First**: Use ES modules (`import`/`export`) instead of CommonJS (`require`/`module.exports`)
- **Type Safety**: All public APIs must have explicit type annotations
- **No `any`**: Avoid `any` type; use proper typing or `unknown`
- **Null Safety**: Use strict null checks and handle null/undefined cases

### Code Style Rules

- **Formatting**: All code must be formatted with Prettier
- **Linting**: All code must pass ESLint checks
- **Naming**: Use descriptive, camelCase names for variables and functions
- **Constants**: Use UPPER_SNAKE_CASE for constants
- **Interfaces**: Prefix interfaces with `I` (e.g., `IWorkItem`)
- **Types**: Use PascalCase for type definitions

### File Organization Rules

- **One class per file**: Each TypeScript file should contain one main class/interface
- **Barrel exports**: Use `index.ts` files for clean exports
- **Directory structure**: Follow the established project structure
- **Naming**: Use kebab-case for file names (e.g., `work-item-normalize.ts`)

## Security Rules

### Authentication & Authorization

- **PAT Storage**: Personal Access Tokens must be stored in VS Code secret store
- **No Hardcoded Secrets**: Never commit API keys, tokens, or passwords
- **Least Privilege**: Request only necessary Azure DevOps scopes
- **Token Rotation**: Support token refresh and rotation

### Input Validation

- **Sanitize Inputs**: All user inputs must be sanitized
- **Validate API Responses**: Validate all external API responses
- **Escape HTML**: Escape HTML content in webviews
- **Rate Limiting**: Implement rate limiting for all API calls

### Content Security Policy

- **Strict CSP**: Use `default-src 'none'` as base policy
- **Nonce-based Scripts**: Use nonces for inline scripts
- **No Remote Resources**: No external resources in webviews
- **Data URLs Only**: Use data URLs for images when necessary

## Performance Rules

### Activation Performance

- **Lazy Loading**: Use activation events to defer heavy operations
- **No Sync Operations**: Avoid synchronous file system operations in activation
- **Memory Management**: Properly dispose of resources
- **Startup Time**: Keep activation time under 100ms

### Runtime Performance

- **Debouncing**: Debounce user input and API calls
- **Caching**: Cache frequently accessed data
- **Pagination**: Use pagination for large datasets
- **Background Processing**: Move heavy operations to background

### Memory Management

- **Disposables**: Use VS Code disposables for cleanup
- **Event Listeners**: Remove event listeners when no longer needed
- **Timers**: Clear timers and intervals
- **Memory Leaks**: Monitor and prevent memory leaks

## Testing Rules

### Test Coverage

- **Unit Tests**: > 90% code coverage for business logic
- **Integration Tests**: Test all major workflows
- **E2E Tests**: Test complete user journeys
- **Edge Cases**: Test error conditions and edge cases

### Test Quality

- **Descriptive Names**: Test names should describe the scenario
- **Arrange-Act-Assert**: Follow AAA pattern for test structure
- **Mocking**: Mock external dependencies appropriately
- **Isolation**: Tests should be independent and isolated

### Test Organization

- **One Test File Per Source File**: Mirror source structure in tests
- **Helper Functions**: Use test utilities for common setup
- **Fixtures**: Use fixtures for test data
- **Cleanup**: Clean up after each test

## Documentation Rules

### Code Documentation

- **JSDoc Comments**: Document all public APIs
- **Inline Comments**: Explain complex logic
- **README Updates**: Update README for new features
- **Changelog**: Document all changes in CHANGELOG.md

### User Documentation

- **Clear Instructions**: Provide clear setup and usage instructions
- **Screenshots**: Include screenshots for UI features
- **Troubleshooting**: Document common issues and solutions
- **Examples**: Provide code examples where applicable

## Git Rules

### Commit Messages

- **Conventional Commits**: Use conventional commit format
- **Descriptive**: Write clear, descriptive commit messages
- **Atomic**: One logical change per commit
- **Reference Issues**: Reference related issues in commits

### Branch Management

- **Feature Branches**: Create feature branches for new work
- **Main Branch**: Keep main branch stable and deployable
- **Pull Requests**: Use PRs for all changes
- **Code Review**: All PRs must be reviewed

### Version Control

- **Semantic Versioning**: Use semantic versioning for releases
- **Tagging**: Tag all releases
- **Changelog**: Update changelog for each release
- **Breaking Changes**: Clearly document breaking changes

## Error Handling Rules

### Error Types

- **User Errors**: Handle user input errors gracefully
- **Network Errors**: Implement retry logic for network failures
- **API Errors**: Handle Azure DevOps API errors appropriately
- **System Errors**: Log and report system errors

### Error Reporting

- **User-Friendly Messages**: Show clear error messages to users
- **Logging**: Log detailed error information for debugging
- **Telemetry**: Report errors to telemetry (with user consent)
- **Recovery**: Provide recovery options when possible

## API Integration Rules

### Azure DevOps API

- **Rate Limiting**: Respect Azure DevOps rate limits
- **Retry Logic**: Implement exponential backoff for retries
- **Error Handling**: Handle all possible API error responses
- **Authentication**: Use secure authentication methods

### External APIs

- **Validation**: Validate all external API responses
- **Timeout**: Set appropriate timeouts for API calls
- **Fallback**: Provide fallback behavior when APIs fail
- **Monitoring**: Monitor API usage and performance

## UI/UX Rules

### Accessibility

- **ARIA Labels**: Use proper ARIA labels for screen readers
- **Keyboard Navigation**: Support keyboard navigation
- **Color Contrast**: Ensure sufficient color contrast
- **Focus Management**: Manage focus appropriately

### User Experience

- **Loading States**: Show loading indicators for async operations
- **Error States**: Display clear error messages
- **Success Feedback**: Provide feedback for successful operations
- **Consistent Design**: Follow VS Code design patterns

### Webview Rules

- **CSP Compliance**: Ensure webview content follows CSP
- **Message Validation**: Validate all webview messages
- **Resource Management**: Manage webview resources efficiently
- **Security**: Implement proper security measures

## Build and Deployment Rules

### Build Process

- **Reproducible Builds**: Ensure builds are reproducible
- **Dependency Management**: Pin dependency versions
- **Build Validation**: Validate builds before deployment
- **Artifact Management**: Properly manage build artifacts

### Deployment

- **Staging**: Test in staging environment first
- **Rollback Plan**: Have rollback plan for deployments
- **Monitoring**: Monitor deployment health
- **Documentation**: Document deployment process

## Monitoring and Observability Rules

### Logging

- **Structured Logging**: Use structured logging format
- **Log Levels**: Use appropriate log levels
- **Sensitive Data**: Never log sensitive information
- **Performance**: Log performance metrics

### Telemetry

- **User Consent**: Respect user privacy settings
- **Data Minimization**: Collect only necessary data
- **Anonymization**: Anonymize user data
- **Retention**: Follow data retention policies

### Error Monitoring

- **Error Tracking**: Track and monitor errors
- **Alerting**: Set up appropriate alerts
- **Root Cause Analysis**: Analyze error patterns
- **Continuous Improvement**: Use error data for improvements








