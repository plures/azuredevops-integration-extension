# Action Buttons - Implementation TODO

Current Status: Partial Implementation
Date: 2025-10-27

## Current State

**Open in Browser** ✅ - Working correctly

**Timer** ⏳ - Calls timer.start() but needs UI element  
**Edit** ❌ - Opens browser instead of in-VSCode editing  
**Branch** ⏳ - Creates branch but doesn't link to work item

## Required Functionality

### 1. Timer Button ▶
**Expected**: 
- Start timer on work item
- Display timer control/element IN the work item card or status bar
- Show elapsed time
- Allow stop/pause

**Current**: Starts timer silently via handleMessage

**TODO**: Add timer UI element to work item card when timer is active

### 2. Edit Button ✎
**Expected**:
- Edit work item FROM WITHIN VS Code
- Quick pick to select field (Title, State, Assigned To, Tags, Description)
- Input box to enter new value
- Update via Azure DevOps API
- Refresh to show changes

**Current**: Opens in browser

**TODO**: Implement in-VSCode editing with quick pick

### 3. Branch Button ⎇
**Expected**:
- Get git username from config
- Format: `{username}-{workitemID}-{short-desc}`
- Show input with suggested name
- Create git branch
- **Link branch to work item** (add comment or update field)
- Show success message

**Current**: Shows input, creates branch, but doesn't link

**TODO**: Add work item linking (comment or Development Links field)

## Implementation Notes

All logic should be in `dispatchApplicationEvent` in activation.ts where:
- `timer`, `client`, `provider` are available
- `vscode` API is accessible
- Can call `handleMessage` for legacy functions

FSM actions track state, activation.ts executes functionality.

## Next Session

Focus on completing these 3 action button implementations to match
the functionality from previous tagged versions.

