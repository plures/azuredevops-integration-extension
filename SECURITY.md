# Security & Trust Notice

Thank you for choosing the Azure DevOps Integration extension. We take your security and privacy seriously. This document explains how the extension handles authentication, data access, and runtime security.

---

## 1. Authentication

- We use the Microsoft Authentication Library (MSAL) to authenticate via **device code flow** or **interactive login**.
- No secrets or passwords are ever stored in plain text.
- All tokens are stored securely using VS Code’s SecretStorage API.
- You will be prompted before any authentication or token refresh operation.

## 2. Permissions & Least Privilege

- The extension requests **only the minimal scopes** required to:
  - Read and list work items
  - Trigger or monitor pipelines
  - Access basic project metadata
- You can review and consent to these scopes during the login prompt.

## 3. Data Access & Usage

- We only access the data you explicitly authorize:
  - Work item titles, descriptions, and state
  - Pipeline definitions and statuses
  - Project and repository metadata
- No personal files, local workspace contents, or telemetry beyond “success/failure” events are collected.

## 4. Token Storage & Revocation

- Access tokens and refresh tokens are encrypted in VS Code’s SecretStorage.
- To **sign out** and delete cached credentials, run the **Azure DevOps: Sign Out** command from the Command Palette.
- Tokens are automatically refreshed by MSAL; at no point do we store long-lived secrets.

## 5. User Controls & Transparency

- Before performing any sensitive action (e.g., creating builds, modifying work items), the extension will prompt for your approval.
- A dedicated **Output Channel** (`Azure DevOps Integration`) logs each significant step (authentication, API calls, errors).
- You can enable **Privacy Mode** to restrict the extension to read-only operations.

## 6. Runtime Security & Marketplace Protections

- VS Code enforces runtime security through:
  - Publisher trust prompts
  - Extension permission transparency
  - Marketplace protections against malicious updates
- This extension’s source code is fully published on GitHub for your review:
  https://github.com/plures/azuredevops-integration-extension

## 7. Third-Party Audits & Documentation

- We plan to publish our security audit results as they become available.
- For more details on VS Code extension security best practices, see:
  https://code.visualstudio.com/api/advanced-topics/extension-security

---

_Last updated: 2025-10-02_
