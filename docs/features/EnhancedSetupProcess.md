# Feature: Enhanced Setup Process for Azure DevOps Online and OnPrem

**Status**: Draft  
**Created**: 2025-11-01  
**Priority**: Must Have  
**Related Issues**: Setup process improvement

---

## 1. Feature Overview

The Enhanced Setup Process provides intelligent, environment-aware connection setup that automatically detects whether a user is connecting to Azure DevOps Services (Online) or Azure DevOps Server (OnPremises), derives values where possible to minimize manual input, and presents appropriate authentication options based on the detected environment. The process defaults to the most secure and convenient authentication method while allowing full manual configuration for edge cases.

### Impact

- **Reduces setup time** from 5-10 minutes to 1-2 minutes for typical users
- **Eliminates common setup errors** by auto-detecting and validating values
- **Improves security** by defaulting to Entra ID for Online environments
- **Supports all authentication methods** for both Online and OnPremises
- **Allows full customization** for users with special requirements

---

## 2. Problem Statement

### Current State

- Users must manually enter many connection details even when a work item URL is provided
- Setup doesn't differentiate authentication options between Online and OnPremises
- OnPremises setup requires manual entry of username/domain without defaults
- No clear indication of which auth methods are valid for which environment
- Setup flow is the same regardless of environment type
- Users often get errors due to incorrect format or missing fields

### Pain Points

1. **OnPremises Users**: Must manually type domain\username format without hints
2. **Online Users**: Not guided toward preferred Entra ID authentication
3. **Identity Resolution**: OnPremises often requires explicit identityName but it's optional in UI
4. **URL Detection**: While parsing works, the setup flow doesn't leverage this knowledge
5. **Auth Method Selection**: All methods shown regardless of environment compatibility

### Desired State

- Single URL input auto-configures 90% of connection details
- Environment type clearly identified and shown to user
- Appropriate auth methods presented based on environment
- Default values pre-filled using system detection where possible
- Manual override available for every setting
- Clear validation and helpful error messages
- Minimal clicks to complete standard setup

---

## 3. Goals & Success Metrics (MoSCoW)

| Priority   | Goal                                           | Metric / KPI                       | Target                       | How Measured                  |
| ---------- | ---------------------------------------------- | ---------------------------------- | ---------------------------- | ----------------------------- |
| **Must**   | Auto-detect Online vs OnPremises from URL      | Detection accuracy                 | 100%                         | Test with various URL formats |
| **Must**   | Default to Entra ID for Online                 | Default auth method selection rate | >80%                         | Telemetry                     |
| **Must**   | Auto-detect Windows user for OnPremises        | Detection success rate             | >90% on Windows              | Test on Windows systems       |
| **Must**   | Support all valid auth methods per environment | Auth method coverage               | 100%                         | Manual testing                |
| **Must**   | Minimize required user input                   | Average setup steps                | <5 clicks for standard setup | User testing                  |
| **Should** | Provide manual override for all settings       | Override availability              | 100% of fields               | Code review                   |
| **Should** | Validate connection before saving              | Validation success rate            | >95%                         | Telemetry                     |
| **Could**  | Save setup preferences                         | Preference persistence             | 50% adoption                 | Feature usage                 |
| **Won't**  | Support Kerberos/Integrated auth (future)      | N/A                                | Deferred                     | Future feature                |

---

## 4. User Stories & Personas

### Primary Persona: Developer Devin (Online User)

**Persona**: Full-stack developer using Azure DevOps Services  
**Context**: Needs to connect quickly to start working with work items

### User Stories

```gherkin
Feature: Quick Setup for Azure DevOps Online
  As an Azure DevOps Services user
  I want to paste my work item URL and connect with one click
  So that I can start working immediately

  Scenario: Quick Online Setup with Entra ID (Happy Path)
    Given I am using Azure DevOps Services (dev.azure.com)
    When I paste a work item URL: "https://dev.azure.com/myorg/myproject/_workitems/edit/123"
    Then the setup detects "Online (Azure DevOps Services)"
    And Entra ID authentication is pre-selected (recommended)
    And I can complete setup by clicking "Connect with Entra ID"
    And no manual input is required beyond URL and auth consent

  Scenario: Online Setup with PAT Alternative
    Given I prefer to use PAT for Online
    When I see Entra ID is recommended
    Then I can choose "Use Personal Access Token instead"
    And I can enter my PAT
    And the connection is validated before saving

  Scenario: Manual Override for Online Setup
    Given I need custom settings for Online
    When I click "Advanced Options"
    Then I can manually edit:
      - Organization name
      - Project name
      - Base URL
      - API base URL
      - Team name
    And my overrides are validated
```

### Secondary Persona: Enterprise Engineer Emma (OnPremises User)

**Persona**: Enterprise developer using Azure DevOps Server on-premises  
**Context**: Needs to connect to corporate DevOps server with domain authentication

```gherkin
Feature: Intelligent OnPremises Setup
  As an OnPremises Azure DevOps Server user
  I want setup to detect my domain credentials automatically
  So that I don't have to type complex domain\username formats

  Scenario: OnPremises Setup with Auto-detected Credentials
    Given I am on a Windows domain-joined machine
    And I paste an OnPremises work item URL
    When setup detects "Azure DevOps Server (OnPremises)"
    Then my Windows username is pre-filled (e.g., "CORP\emma")
    And domain is auto-detected from my current session
    And PAT is recommended as the primary auth method
    And I can adjust username format if needed

  Scenario: OnPremises Setup with Custom Domain
    Given I need to use a different domain than my Windows domain
    When setup auto-detects my Windows domain
    Then I can edit the domain field
    And I can enter custom username in DOMAIN\user format
    And the format is validated before proceeding

  Scenario: OnPremises Auth Method Selection
    Given I am setting up OnPremises connection
    When I see available auth methods
    Then I see:
      - Personal Access Token (PAT) - Recommended
      - NTLM Authentication (if supported)
      - Basic Authentication (if supported)
    And Entra ID is NOT shown (not available for OnPremises)

  Scenario: OnPremises Identity Resolution
    Given OnPremises servers may not resolve @Me
    When I complete setup
    Then I'm prompted for identityName if not provided
    And format suggestions are shown (email, DOMAIN\user, etc.)
    And the identityName is validated against the server
```

### Acceptance Criteria Checklist

- [ ] URL parsing correctly identifies Online vs OnPremises environments
- [ ] Environment type is clearly displayed to user during setup
- [ ] Entra ID is default selection for Online, PAT is default for OnPremises
- [ ] Windows username and domain are auto-detected on Windows systems
- [ ] Username format is validated (supports DOMAIN\user, user@domain, user)
- [ ] All valid auth methods are shown per environment
- [ ] Invalid auth methods are hidden per environment
- [ ] Connection validation runs before saving
- [ ] Manual override available for all auto-detected values
- [ ] Clear error messages guide users to fix issues
- [ ] Setup completes in minimal steps for standard cases

---

## 5. Assumptions & Constraints

### Business Assumptions

- Users are either on Windows domain-joined machines (OnPremises) or have internet access (Online)
- OnPremises servers typically require explicit identityName for @Me queries
- Entra ID is preferred over PAT for Online environments due to security and convenience
- Users have access to generate PATs or have Entra ID access
- Most users prefer minimal input with ability to customize

### Technical Constraints

- Node.js `os.userInfo()` provides username but limited domain info on Windows
- Cross-platform: Windows, macOS, Linux - domain detection only works on Windows
- VS Code API limitations for system information access
- Azure DevOps REST API authentication requirements vary by environment
- Cannot use NTLM/Kerberos integrated auth directly from Node.js (requires external tools)

### Platform Constraints

- Windows: Can detect domain via `process.env.USERDOMAIN` or `process.env.USERDOMAIN_ROAMINGPROFILE`
- macOS/Linux: Domain detection not available (show generic prompt)
- VS Code Extension Host: Limited system API access for security

### Dependencies

- **URL Parser**: `parseAzureDevOpsUrl()` - already implemented
- **Azure DevOps Client**: `AzureDevOpsIntClient` - supports all auth methods
- **VS Code Secrets**: For secure credential storage
- **OS Detection**: Node.js `os` module for platform detection

### Azure DevOps Authentication Methods

#### Online (Azure DevOps Services)

- **Microsoft Entra ID (OAuth 2.0)**: ✅ Supported - Device code flow
- **Personal Access Token (PAT)**: ✅ Supported - Full REST API
- **NTLM**: ❌ Not supported (Windows-only, not available for Online)
- **Basic Auth**: ❌ Not supported (deprecated, insecure)

#### OnPremises (Azure DevOps Server)

- **Personal Access Token (PAT)**: ✅ Supported - Recommended method
- **NTLM Authentication**: ⚠️ Supported by server but requires special client setup (not directly from extension)
- **Basic Authentication**: ⚠️ Supported by server but insecure (not recommended)
- **Microsoft Entra ID**: ❌ Not available (on-premises servers use local AD or no AD)

---

## 6. Technical Approach

### Architecture Overview

```
User enters work item URL
  ↓
parseAzureDevOpsUrl() detects environment type
  ↓
Environment-specific setup flow:
  ├─ Online: Entra ID (default) or PAT
  └─ OnPremises: PAT (default), with username/domain prompt
  ↓
Auto-detect values where possible:
  ├─ Organization (from URL)
  ├─ Project (from URL)
  ├─ Base URL (from URL)
  ├─ API Base URL (derived)
  ├─ Username (Windows: os.userInfo() + env vars)
  └─ Domain (Windows: process.env.USERDOMAIN)
  ↓
Present values to user for confirmation/override
  ↓
Validate connection before saving
  ↓
Save connection and credentials
```

### Component Design

#### 1. Environment Detection Function

```typescript
/**
 * Determines if a parsed Azure DevOps URL is for Online or OnPremises
 */
export function detectEnvironmentType(parsedUrl: ParsedAzureDevOpsUrl): 'online' | 'onpremises' {
  const host = new URL(parsedUrl.baseUrl).hostname.toLowerCase();

  if (
    host === 'dev.azure.com' ||
    host.endsWith('.dev.azure.com') ||
    host.endsWith('.visualstudio.com') ||
    host.endsWith('.vsrm.visualstudio.com')
  ) {
    return 'online';
  }

  return 'onpremises';
}
```

#### 2. Windows User Detection Function

```typescript
/**
 * Detects current Windows user and domain for OnPremises setup
 * Returns formatted username in DOMAIN\user format
 */
export function detectWindowsUser(): {
  username: string;
  domain: string;
  formatted: string; // DOMAIN\user format
} | null {
  if (process.platform !== 'win32') {
    return null; // Not Windows
  }

  const username = os.userInfo().username;
  const domain =
    process.env.USERDOMAIN_ROAMINGPROFILE ||
    process.env.USERDOMAIN ||
    process.env.COMPUTERNAME ||
    '';

  if (!domain) {
    return { username, domain: '', formatted: username };
  }

  return {
    username,
    domain,
    formatted: `${domain}\\${username}`.toUpperCase(),
  };
}
```

#### 3. Auth Method Provider

```typescript
/**
 * Returns available authentication methods for a given environment
 */
export function getAvailableAuthMethods(environment: 'online' | 'onpremises'): Array<{
  id: 'entra' | 'pat' | 'ntlm' | 'basic';
  label: string;
  description: string;
  recommended: boolean;
  available: boolean;
}> {
  if (environment === 'online') {
    return [
      {
        id: 'entra',
        label: 'Microsoft Entra ID (OAuth)',
        description: 'Recommended: Secure, no token management',
        recommended: true,
        available: true,
      },
      {
        id: 'pat',
        label: 'Personal Access Token',
        description: 'Traditional PAT authentication',
        recommended: false,
        available: true,
      },
    ];
  }

  // OnPremises
  return [
    {
      id: 'pat',
      label: 'Personal Access Token',
      description: 'Recommended: Works with all OnPremises configurations',
      recommended: true,
      available: true,
    },
    // Note: NTLM and Basic are technically supported by servers
    // but require special client configuration, so we don't expose them
    // unless explicitly requested via manual configuration
  ];
}
```

#### 4. Enhanced Setup Flow Function

```typescript
export async function enhancedAddOrEditConnection(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
  saveFn: (connections: ProjectConnection[]) => Promise<void>,
  ensureActiveFn: (...args: any[]) => Promise<any>,
  connectionToEdit?: ProjectConnection
): Promise<void> {
  // Step 1: Get work item URL
  const url = await promptWorkItemUrl(connectionToEdit);
  if (!url) return;

  // Step 2: Parse URL
  const parsed = parseAzureDevOpsUrl(url);
  if (!parsed.isValid) {
    vscode.window.showErrorMessage(`Invalid URL: ${parsed.error}`);
    return;
  }

  // Step 3: Detect environment
  const environment = detectEnvironmentType(parsed);

  // Step 4: Auto-detect values
  const defaults = await autoDetectConnectionDefaults(parsed, environment);

  // Step 5: Show setup UI with defaults
  const config = await showEnhancedSetupWizard({
    parsed,
    environment,
    defaults,
    connectionToEdit,
  });

  if (!config) return; // User cancelled

  // Step 6: Validate connection
  const validation = await validateConnection(config);
  if (!validation.success) {
    vscode.window.showErrorMessage(`Connection test failed: ${validation.message}`);
    return;
  }

  // Step 7: Save connection
  await saveConnection(config, context, saveFn, ensureActiveFn);
}
```

### UI Flow Design

#### Setup Wizard States

1. **URL Input** → Parse and detect environment
2. **Environment Display** → Show detected type (Online/OnPremises)
3. **Quick Setup** (default path):
   - Online: Pre-select Entra ID, show "Connect" button
   - OnPremises: Pre-fill username/domain, pre-select PAT, show "Connect" button
4. **Advanced Setup** (optional):
   - Show all auto-detected values
   - Allow manual override of any field
   - Show all available auth methods
5. **Connection Validation** → Test before saving
6. **Success** → Confirm and optionally refresh work items

### Data Models

```typescript
interface EnhancedConnectionDefaults {
  organization: string;
  project: string;
  baseUrl: string;
  apiBaseUrl: string;
  username?: string; // For OnPremises
  domain?: string; // For OnPremises
  formattedIdentity?: string; // DOMAIN\user format
}

interface EnhancedConnectionConfig extends ProjectConnection {
  // Inherits from ProjectConnection:
  // - id, organization, project, baseUrl, apiBaseUrl
  // - authMethod, patKey, tenantId, etc.

  // Additional for OnPremises:
  identityName?: string; // Explicit identity for @Me resolution
}
```

### File Structure

```
src/fsm/functions/setup/
  connection.ts (enhanced)
  environment-detection.ts (new)
  user-detection.ts (new)
  auth-methods.ts (new)
  enhanced-setup-wizard.ts (new)

src/utils/
  os-utils.ts (new - Windows user detection)
```

---

## 7. Security Considerations

### Access Control

- **Credentials**: Stored in VS Code secret store (encrypted)
- **PAT Storage**: Connection-specific keys, isolated per connection
- **Entra ID Tokens**: Stored securely, auto-refresh enabled

### Data Protection

- **Username/Domain**: Stored in plain settings (not sensitive, used for @Me queries)
- **No Password Storage**: Never store passwords, only tokens
- **Local Detection**: Windows user detection uses read-only OS APIs (no security risk)

### Input Validation

- **URL Validation**: Strict URL parsing and validation
- **Username Format**: Validate DOMAIN\user format for OnPremises
- **Connection Testing**: Always validate before saving credentials

### Authentication Security

- **Entra ID Preferred**: More secure than PAT (no token management, auto-refresh)
- **PAT Scope Validation**: Ensure minimum required scopes
- **Token Storage**: Encrypted via VS Code secrets API

---

## 8. Testing Strategy

### Testing Layers

| Layer           | Scope                                 | Tools          | Coverage Goal        |
| --------------- | ------------------------------------- | -------------- | -------------------- |
| **Unit**        | Environment detection, user detection | Vitest         | >90%                 |
| **Integration** | Setup flow, connection validation     | Vitest + Mocks | All paths            |
| **Manual**      | End-to-end setup, edge cases          | Manual testing | Happy paths + errors |

### Test Cases

#### Unit Tests

- [ ] `detectEnvironmentType()` correctly identifies Online URLs
- [ ] `detectEnvironmentType()` correctly identifies OnPremises URLs
- [ ] `detectWindowsUser()` returns correct format on Windows
- [ ] `detectWindowsUser()` returns null on non-Windows
- [ ] `getAvailableAuthMethods()` returns correct methods per environment
- [ ] Username format validation (DOMAIN\user, user@domain, user)

#### Integration Tests

- [ ] Online setup with Entra ID completes successfully
- [ ] Online setup with PAT completes successfully
- [ ] OnPremises setup with auto-detected user completes successfully
- [ ] OnPremises setup with custom username completes successfully
- [ ] Connection validation fails appropriately for invalid credentials
- [ ] Manual override of auto-detected values works

#### Manual Test Scenarios

1. **Online Quick Setup**: Paste URL → Click Connect → Complete
2. **Online PAT Setup**: Paste URL → Choose PAT → Enter token → Complete
3. **OnPremises Auto Setup**: Paste URL → Confirm auto-detected user → Complete
4. **OnPremises Custom Setup**: Paste URL → Edit username → Complete
5. **Manual Override**: Paste URL → Advanced → Edit all fields → Complete
6. **Invalid URL**: Paste invalid URL → See clear error message
7. **Connection Failure**: Enter wrong credentials → See validation error

---

## 9. Performance Considerations

### Performance Targets

| Metric                | Target                | Measurement Method     |
| --------------------- | --------------------- | ---------------------- |
| URL parsing           | <50ms                 | Performance.now()      |
| User detection        | <10ms                 | Performance.now()      |
| Environment detection | <1ms                  | Performance.now()      |
| Connection validation | <2s                   | Network request timing |
| Total setup time      | <30s (including auth) | User-perceived time    |

### Optimization Strategies

- **Caching**: Cache parsed URL results during setup flow
- **Lazy Loading**: Only detect Windows user when OnPremises detected
- **Async Validation**: Don't block UI during connection testing
- **Progress Indicators**: Show progress during validation

---

## 10. UX/UI Design

### User Flow (Happy Path)

```
1. User clicks "Add Connection"
   ↓
2. Paste work item URL prompt appears
   ↓
3. URL is parsed → Environment detected
   ↓
4. Quick Setup dialog shows:
   - Environment type: "Azure DevOps Services (Online)" or "Azure DevOps Server (OnPremises)"
   - Detected values (organization, project)
   - Recommended auth method pre-selected
   - For OnPremises: Auto-detected username shown
   ↓
5. User clicks "Connect" (or adjusts settings)
   ↓
6. Authentication flow (Entra ID) or PAT entry
   ↓
7. Connection validated
   ↓
8. Success message → Connection saved
```

### UI Components

#### Quick Setup Dialog

```typescript
interface QuickSetupDialog {
  environmentType: 'online' | 'onpremises';
  detectedValues: {
    organization: string;
    project: string;
    baseUrl: string;
  };
  recommendedAuth: {
    method: 'entra' | 'pat';
    label: string;
    description: string;
  };
  onPremisesUser?: {
    username: string;
    domain: string;
    formatted: string;
    editable: boolean;
  };
  actions: {
    connect: () => void;
    useAlternativeAuth: () => void;
    advancedOptions: () => void;
    cancel: () => void;
  };
}
```

#### Advanced Options Dialog

- All auto-detected values editable
- All available auth methods selectable
- API base URL override
- Team name optional field
- Connection label editable
- Test connection button

### Accessibility

- [ ] Screen reader announces environment type
- [ ] Keyboard navigation for all options
- [ ] Clear focus indicators
- [ ] Error messages are accessible

---

## 11. Release Strategy

### Deployment Phases

1. **Alpha** (Internal testing)
   - Duration: 1 week
   - Scope: Development team
   - Success criteria: All test cases pass, no critical bugs

2. **Beta** (Limited users)
   - Duration: 1 week
   - Scope: 10-20 users with both Online and OnPremises
   - Success criteria: 90% setup success rate, positive feedback

3. **General Release** (All users)
   - Gradual rollout: 100%
   - Monitor: Setup success rate, error reports
   - Rollback: Feature flag to revert to old setup

### Feature Flags

- `azureDevOpsIntegration.experimental.enhancedSetup`: Enable enhanced setup flow
- `azureDevOpsIntegration.experimental.autoDetectUser`: Enable Windows user auto-detection

### Monitoring

- Setup completion rate (by environment type)
- Auth method selection (Entra ID vs PAT)
- Auto-detection success rate
- Setup abandonment points
- Error frequency (by error type)

### Rollback Plan

- Keep legacy setup code path available
- Feature flag allows instant disable
- No data migration needed (same connection format)

---

## 12. Documentation Requirements

### User Documentation

- [ ] Updated README with enhanced setup instructions
- [ ] Screenshots showing Online vs OnPremises setup flows
- [ ] Troubleshooting guide for common setup issues
- [ ] FAQ: "How do I set up OnPremises connection?"

### Developer Documentation

- [ ] Architecture notes for environment detection
- [ ] API documentation for new utility functions
- [ ] Code examples for extending setup flow

---

## 13. Open Questions & Risks

### Open Questions

- [ ] Should we support NTLM/Kerberos via external tools? → **No (future feature)**
- [ ] Should we allow multiple identity formats for OnPremises? → **Yes (DOMAIN\user, user@domain, user)**
- [ ] Should we cache Windows user detection? → **No (setup is one-time)**

### Risks

| Risk                                                       | Probability | Impact | Mitigation                                         |
| ---------------------------------------------------------- | ----------- | ------ | -------------------------------------------------- |
| Windows user detection fails on some domain configurations | Medium      | Medium | Fallback to manual entry, show helpful error       |
| URL parsing fails for edge case OnPremises URL formats     | Low         | High   | Extensive URL format testing, validation           |
| Entra ID flow interrupted (user closes browser)            | Medium      | Low    | Clear instructions, retry option                   |
| Auto-detected values incorrect for complex setups          | Medium      | Medium | Always allow manual override, validate before save |

---

## 14. Review & Approval

### Review Checklist

- [x] All sections completed
- [x] Success metrics are measurable
- [x] User stories have acceptance criteria
- [x] Technical approach is feasible
- [x] Security considerations addressed
- [x] Testing strategy defined
- [x] Performance targets set
- [x] Risks identified and mitigated

### Design Decisions

1. **Default to Entra ID for Online**: More secure, better UX, aligns with Microsoft recommendations
2. **Default to PAT for OnPremises**: Only reliable auth method, Entra ID not available
3. **Auto-detect Windows user**: Reduces friction, but always allow override
4. **Hide NTLM/Basic from UI**: Technically possible but requires special setup, keep simple
5. **Single URL input as primary path**: Minimizes clicks, advanced options available

---

## Appendix: Azure DevOps Authentication Reference

### Online (Azure DevOps Services)

#### Entra ID (OAuth 2.0)

- **Supported**: ✅ Yes
- **Method**: Device code flow
- **Client ID**: `872cd9fa-d31f-45e0-9eab-6e460a02d1f1` (Azure DevOps service principal)
- **Tenant**: Defaults to "organizations" (any work/school account)
- **Storage**: Tokens stored in VS Code secrets
- **Refresh**: Automatic

#### Personal Access Token (PAT)

- **Supported**: ✅ Yes
- **Method**: Bearer token in Authorization header
- **Scopes Required**: Work Items (Read & Write), Code (Read & Write), User Profile (Read)
- **Storage**: Encrypted in VS Code secrets
- **Refresh**: Manual (user generates new PAT)

### OnPremises (Azure DevOps Server)

#### Personal Access Token (PAT)

- **Supported**: ✅ Yes
- **Method**: Bearer token in Authorization header
- **Scopes Required**: Same as Online
- **Storage**: Encrypted in VS Code secrets
- **Identity Resolution**: May require explicit `identityName` if @Me doesn't resolve

#### NTLM Authentication

- **Supported**: ⚠️ Limited (server supports, extension limitations)
- **Method**: NTLM protocol via HTTP client
- **Requires**: Windows domain credentials, special HTTP client configuration
- **Recommendation**: Not exposed in UI (use PAT instead)

#### Basic Authentication

- **Supported**: ⚠️ Limited (server supports, insecure)
- **Method**: Basic auth header
- **Security**: Insecure (passwords in plain text)
- **Recommendation**: Not exposed in UI (use PAT instead)

### Username Formats for OnPremises

- **DOMAIN\user**: Windows domain format (recommended)
- **user@domain.com**: Email format (if server supports)
- **user**: Username only (if server configured for single domain)

---

**Next Steps**: After approval, proceed to implementation following TDD workflow.
