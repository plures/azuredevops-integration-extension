# Work Items Not Showing Troubleshooting Guide

If you're experiencing issues where no work items are found despite having valid work items in your Azure DevOps project, follow this troubleshooting guide:

## Quick Diagnosis

1. **Run the Built-in Diagnostic**
   - Open VS Code Command Palette (`Ctrl+Shift+P`)
   - Run: `Azure DevOps Int: Diagnose Work Items Issue`
   - Check the output in the "Azure DevOps Integration" output channel
   - This will test your connection, authentication, and queries

## Common Issues and Solutions

### 1. Personal Access Token (PAT) Issues

**Symptoms:**

- Authentication failures
- "No work items found" despite having work items
- Permission errors in logs

**Solutions:**

- Verify your PAT has these scopes:
  - ✅ **Work Items (Read & Write)** - Required
  - ✅ **Project and Team (Read)** - Required
  - ✅ **Build (Read)** - Optional but recommended
  - ✅ **Code (Read)** - Optional for Git integration
- Check if your PAT has expired
- Try creating a new PAT with "Full access" temporarily to test
- Re-run the setup wizard: `Azure DevOps Int: Setup Wizard`

### 2. Query Scope Issues

**Symptoms:**

- Some queries return results, others don't
- "My Activity" returns 0 items but "All Active" works

**Solutions:**

- **"My Activity" returns nothing:** This query looks for work items you created, are assigned to, or recently modified. If you haven't interacted with work items recently, this is normal.
- **Try different queries:**
  - `All Active` - Shows all non-closed work items
  - `Assigned to me` - Shows work items assigned to you
  - Custom WIQL queries
- **Check your user identity:** Make sure you're logged in with the correct Microsoft account

### 3. Project/Organization Configuration

**Symptoms:**

- Connection established but no work items found
- Authentication works but queries fail

**Solutions:**

- Verify your organization and project names are exact (case-sensitive)
- Check if you have access to the specific project
- Try accessing the project in your browser: `https://dev.azure.com/{organization}/{project}`
- For on-premises Azure DevOps Server, ensure you're using the correct `baseUrl`

### 4. Team Configuration

**Symptoms:**

- "Current Sprint" queries fail
- Team-specific queries return no results

**Solutions:**

- Check if you're a member of the team
- Verify team name spelling in settings
- Try clearing the team setting to use project-level queries
- Go to VS Code settings and search for "Azure DevOps Integration" → clear the team field

### 5. State Category vs Legacy State Filters

**Symptoms:**

- Queries work in Azure DevOps web interface but not in VS Code
- "StateCategory" errors in logs

**Solutions:**

- The extension automatically falls back to legacy state filters if `StateCategory` is not supported
- Check the logs for fallback messages
- For older Azure DevOps Server instances, this is expected behavior

## Manual Testing Steps

If the diagnostic doesn't identify the issue:

### Step 1: Test Basic Connectivity

```powershell
# Set environment variables (replace with your values)
$env:AZURE_DEVOPS_ORG = "your-org-name"
$env:AZURE_DEVOPS_PROJECT = "your-project-name"
$env:AZURE_DEVOPS_PAT = "your-pat-token"

# Run the diagnostic script
node scripts/diagnose-workitems.mjs
```

### Step 2: Test in Browser

1. Go to `https://dev.azure.com/{organization}/{project}/_workitems`
2. Verify you can see work items
3. Try the queries the extension uses:
   - Click "Queries" in the left sidebar
   - Try "Assigned to me", "My Activity", etc.

### Step 3: Check PAT Scopes in Browser

1. Go to `https://dev.azure.com/{organization}/_usersSettings/tokens`
2. Find your PAT and check its scopes
3. Ensure it has at least "Work Items (Read)" permission

## Advanced Troubleshooting

### Enable Debug Logging

1. Open VS Code settings
2. Search for "Azure DevOps Integration"
3. Enable "Debug Logging"
4. Refresh work items
5. Check the "Azure DevOps Integration" output channel for detailed logs

### Clear Cache and Reset

1. Run: `Azure DevOps Int: Open Logs`
2. Run: `Azure DevOps Int: Copy Logs to Clipboard`
3. Close VS Code completely
4. Reopen and try again

### Check Network/Proxy Issues

- If behind a corporate firewall, ensure `dev.azure.com` is accessible
- Test with a personal Azure DevOps organization to isolate network issues
- Check if proxy settings are interfering

## Getting Help

If none of these solutions work:

1. **Run the diagnostic command** and copy the output
2. **Copy logs to clipboard** using the command palette
3. **Create an issue** with:
   - The diagnostic output
   - The logs (remove any sensitive information)
   - Your VS Code version
   - Your Azure DevOps setup (cloud/server, organization type, etc.)

## Quick Fixes Summary

✅ **Most Common Fix:** Re-create your PAT with proper scopes
✅ **Second Most Common:** Change query from "My Activity" to "All Active"  
✅ **Third Most Common:** Verify exact organization/project names
✅ **Fourth Most Common:** Run the diagnostic command to identify the specific issue

The diagnostic command (`Azure DevOps Int: Diagnose Work Items Issue`) will test all these scenarios automatically and provide specific guidance for your situation.
