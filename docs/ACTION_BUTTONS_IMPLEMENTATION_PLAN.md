# Action Buttons Implementation Plan

## Feature: Timer UI Enhancement

### Current State
- Timer button sends `START_TIMER_INTERACTIVE` event
- Timer starts via `handleMessage` but has no UI feedback
- Timer state is sent to webview via `timerUpdate` messages

### Implementation Plan
1. **Update WorkItemList.svelte** to receive and display timer state
2. **Show timer indicator** on work item cards when timer is active
3. **Add timer info** showing elapsed time and status

### Files to Modify
- `src/webview/components/WorkItemList.svelte` - Add timer state display
- No backend changes needed (timer state already available)

---

## Feature: In-VSCode Edit Dialog

### Current State
- Edit button opens browser instead of in-VSCode editing
- Need to implement quick pick + input box workflow

### Implementation Plan
1. **Create edit workflow** in `dispatchApplicationEvent`
2. **Show quick pick** for field selection (Title, State, Assigned To, Tags, Description)
3. **Get new value** from input box
4. **Update work item** via Azure DevOps API
5. **Refresh view** to show changes

### Files to Modify
- `src/activation.ts` - Add edit workflow logic
- `src/azureClient.ts` - Add update work item method (if missing)

---

## Feature: Branch Linking

### Current State
- Branch button creates branch but doesn't link it to work item
- Branch is created via Git command

### Implementation Plan
1. **After branch creation**, link to work item
2. **Add Development Link** or comment to work item
3. **Show success message** with branch name

### Files to Modify
- `src/activation.ts` - Add branch linking logic
- `src/azureClient.ts` - Add development link method (if missing)

---

## Implementation Priority
1. Timer UI (easiest, visual feedback)
2. Edit Dialog (moderate complexity)
3. Branch Linking (requires API integration)

---

## Expected Outcomes

### Timer UI
- Work item cards show timer status when active
- Elapsed time displayed
- Visual indicator of active timer

### Edit Dialog
- Users can edit work items without leaving VS Code
- Quick, intuitive workflow
- Changes reflected immediately

### Branch Linking
- Created branches are linked to work items
- Better traceability
- Users can see branches from work items in Azure DevOps

