import type { ApplicationState } from '../fsm/types.js';

function createAppState() {
  let state = $state<ApplicationState>({
    fsmState: 'uninitialized',
    context: {
      user: null,
      error: null,
      activeTab: 'WID',
      settings: {},
      organizations: [],
      projects: [],
      teams: [],
      repositories: [],
      branches: [],
      pullRequests: [],
      workItems: [],
      drafts: {},
      currentDraft: null,
      currentOrganization: null,
      currentProject: null,
      currentTeam: null,
      currentRepository: null,
      currentBranch: null,
      currentPullRequest: null,
      currentWorkItem: null,
      currentWorkItemType: null,
      currentWorkItemState: null,
      currentWorkItemAssignedTo: null,
      currentWorkItemIterationPath: null,
      currentWorkItemAreaPath: null,
      currentWorkItemTitle: null,
      currentWorkItemDescription: null,
      currentWorkItemReproSteps: null,
      currentWorkItemSystemInfo: null,
      currentWorkItemAcceptanceCriteria: null,
    },
  });

  return {
    get state() {
      return state;
    },
    set(newState: ApplicationState) {
      state = newState;
    },
  };
}

export const appState = createAppState();
