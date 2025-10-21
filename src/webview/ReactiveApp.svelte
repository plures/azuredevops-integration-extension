<!-- ReactiveApp.svelte - Fixed Version Without Problematic Imports -->
<script>
  // Add debug logging to check if ReactiveApp is being instantiated
  console.log('🟢 [ReactiveApp] Component is being instantiated - script block executing');

  import { onMount } from 'svelte';

  // Comment out problematic imports for now - these were causing the initialization error
  // import Toasts from './Toasts.svelte';
  // import { addToast } from './toastStore';

  // Simple toast replacement for now
  function showToast(message, type = 'info') {
    console.log(`🍞 [Toast-${type}] ${message}`);
  }

  // Store imports - proven to work from step-by-step testing
  import {
    fsm,
    connections,
    activeConnection,
    workItems,
    isDataLoading,
    isInitializing,
    isActivated,
    actions as fsmActions,
    selectors,
    globalConnectionsArray,
    globalConnectionsCount,
    handleExtensionMessage,
  } from './fsm-webview.svelte.ts';

  import {
    ui,
    filteredWorkItems,
    hasConnections,
    canShowWorkItems,
    uiActions,
    integrationActions,
    initializeStoreEffects,
  } from './store.svelte.ts';

  // Props using Svelte 5 syntax (no export needed for props) - simplified for debugging
  let {
    // Action handlers (still passed as props for backward compatibility)
    onConnectionSelect = () => {},
    onTimerStart = () => {},
    onTimerStop = () => {},
    onTimerPause = () => {},
    onWorkItemMove = () => {},
    onWorkItemCreate = () => {},
    onRefreshData = () => {},
    onAuthResolve = (connectionId) => {
      console.log('🔐 [ReactiveApp] Starting authentication for connection:', connectionId);
    },
    onRetry = () => {},
    onDebugState = () => console.log('Debug state: simplified mode'),
  } = $props();

  // Local reactive state using runes
  let loading = $state(false);
  let errorMsg = $state('');
  let selectedItems = $state(new Set());
  let focusedIndex = $state(0);

  // Mock UI state for debugging
  let kanbanView = $state(false);
  let filterText = $state('');
  let typeFilter = $state('');
  let stateFilter = $state('all');
  let sortKey = $state('title-asc');
  let selectedQuery = $state('My Activity');
  let queryDescription = $state('');

  // Timer state from reactive stores (simplified for now)
  let timerActive = $derived(false);
  let timerRunning = $derived(false);
  let timerElapsedLabel = $derived('00:00:00');
  let activeWorkItemId = $derived(0);
  let activeWorkItemTitle = $derived('');

  function formatElapsedTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Reactive derived values from stores (no naming conflicts)
  let authReminders = $state([]);
  let authenticatedConnections = $state(new Set());
  let connectionStateSummaries = $state([]);
  let workItemCount = $derived(filteredWorkItems().length);
  let hasItems = $derived(workItemCount > 0);
  let initStatus = $derived({
    phase: isInitializing() ? 'initializing' : isActivated() ? 'active' : 'inactive',
    progress: isActivated() ? 100 : isInitializing() ? 50 : 0,
  });
  let currentConnection = $derived(activeConnection());

  // Store-based reactive values (using proper derived syntax)
  let connectionsList = $derived(connections());
  let dataLoading = $derived(isDataLoading());
  let isAppInitializing = $derived(isInitializing());
  let isAppActivated = $derived(isActivated());
  let activeConnectionId = $derived(currentConnection?.id ?? null);
  let activeConnectionStatus = $derived(
    activeConnectionId
      ? (connectionStateSummaries.find((summary) => summary.id === activeConnectionId) ?? null)
      : null
  );
  let isActiveConnectionAuthenticated = $derived(
    activeConnectionStatus
      ? activeConnectionStatus.isConnected
      : activeConnectionId
        ? authenticatedConnections.has(activeConnectionId)
        : false
  );
  let shouldShowManualSignIn = $derived(
    authReminders.length === 0 &&
      (connectionsList?.length || 0) > 0 &&
      !dataLoading &&
      !hasItems &&
      !!activeConnectionId &&
      !isActiveConnectionAuthenticated &&
      !(activeConnectionStatus?.reauthInProgress ?? false)
  );

  function markConnectionAuthenticated(connectionId) {
    if (!connectionId) return;
    if (authenticatedConnections.has(connectionId)) return;
    const updated = new Set(authenticatedConnections);
    updated.add(connectionId);
    authenticatedConnections = updated;
  }

  function markConnectionRequiresAuth(connectionId) {
    if (!connectionId) return;
    if (!authenticatedConnections.has(connectionId)) return;
    const updated = new Set(authenticatedConnections);
    updated.delete(connectionId);
    authenticatedConnections = updated;
  }

  function upsertAuthReminder(reminder) {
    authReminders = [
      ...authReminders.filter((r) => r.connectionId !== reminder.connectionId),
      reminder,
    ];
  }

  function clearAuthReminder(connectionId) {
    authReminders = authReminders.filter((r) => r.connectionId !== connectionId);
  }

  function applyAuthReminderPayload(reminders, connectionOverride) {
    const normalizedReminders = Array.isArray(reminders)
      ? reminders
          .map((reminder) => {
            const connectionId =
              typeof reminder?.connectionId === 'string' ? reminder.connectionId.trim() : '';
            if (!connectionId) {
              return null;
            }

            const connectionLabel =
              connectionsList?.find((conn) => conn.id === connectionId)?.label ?? connectionId;
            const reason =
              typeof reminder?.reason === 'string' && reminder.reason.trim().length > 0
                ? reminder.reason.trim()
                : 'authRequired';
            const detail = typeof reminder?.detail === 'string' ? reminder.detail : undefined;

            return {
              connectionId,
              label: connectionLabel,
              message:
                reason === 'authFailed'
                  ? `Sign in failed for ${connectionLabel}. Try again.`
                  : `Sign in required for ${connectionLabel}.`,
              detail,
            };
          })
          .filter(Boolean)
      : [];

    authReminders = normalizedReminders;

    const reminderIds = new Set(normalizedReminders.map((entry) => entry.connectionId));
    let updatedAuthenticated = new Set(authenticatedConnections);
    let changed = false;

    reminderIds.forEach((connectionId) => {
      if (updatedAuthenticated.delete(connectionId)) {
        changed = true;
      }
    });

    const activeConnectionIdCandidate = connectionOverride || activeConnectionId;
    if (reminderIds.size === 0 && activeConnectionIdCandidate) {
      updatedAuthenticated.add(activeConnectionIdCandidate);
      changed = true;
    }

    if (changed) {
      authenticatedConnections = updatedAuthenticated;
    }
  }

  // Query options
  const queryOptions = [
    {
      value: 'My Activity',
      label: 'My Activity',
      description: "Work items I've created, assigned to, or recently changed",
    },
    {
      value: 'My Work Items',
      label: 'My Work Items',
      description: 'Work items currently assigned to me',
    },
    {
      value: 'Assigned to me',
      label: 'Assigned to me',
      description: 'Work items currently assigned to me',
    },
    {
      value: 'Current Sprint',
      label: 'Current Sprint',
      description: 'Work items in the current iteration',
    },
    {
      value: 'All Active',
      label: 'All Active',
      description: 'All active work items in the project',
    },
    {
      value: 'Recently Updated',
      label: 'Recently Updated',
      description: 'Work items updated in the last 14 days',
    },
    { value: 'Following', label: 'Following', description: "Work items I'm following" },
    { value: 'Mentioned', label: 'Mentioned', description: "Work items where I've been mentioned" },
  ];

  // Handle messages from extension
  function handleVSCodeMessage(event) {
    const message = event.data;

    switch (message.type) {
      case 'contextUpdate': {
        if (typeof handleExtensionMessage === 'function') {
          handleExtensionMessage(message);
        }

        const payload = message.context;
        if (!payload || typeof payload !== 'object') {
          break;
        }

        if (Array.isArray(payload.connectionStateSummaries)) {
          connectionStateSummaries = payload.connectionStateSummaries.map((entry) => ({
            id: entry.id,
            isConnected: Boolean(entry.isConnected),
            hasClient: Boolean(entry.hasClient),
            hasProvider: Boolean(entry.hasProvider),
            reauthInProgress: Boolean(entry.reauthInProgress),
          }));

          const connectedIds = connectionStateSummaries
            .filter((entry) => entry.isConnected)
            .map((entry) => entry.id);
          authenticatedConnections = new Set(connectedIds);
        }

        const nextActiveId =
          typeof payload.activeConnectionId === 'string' ? payload.activeConnectionId : null;
        const activeSummary = nextActiveId
          ? connectionStateSummaries.find((entry) => entry.id === nextActiveId)
          : undefined;

        if (activeSummary) {
          if (activeSummary.isConnected) {
            markConnectionAuthenticated(nextActiveId);
          } else if (!activeSummary.reauthInProgress) {
            markConnectionRequiresAuth(nextActiveId);
          }
        } else if (nextActiveId) {
          markConnectionAuthenticated(nextActiveId);
        }

        applyAuthReminderPayload(payload.authReminders, nextActiveId);

        loading = Boolean(payload.isLoading);
        if (!loading) {
          errorMsg = '';
        }

        break;
      }
      case 'workItemsLoaded':
        // Work items are now updated via reactive FSM, but we can still show toast
        loading = false;
        errorMsg = '';
        showToast(`Loaded ${workItemCount} work items`, 'success');
        break;

      case 'timerState':
        // Timer state is now handled by reactive FSM
        // No manual state updates needed - reactive system handles this
        break;

      case 'queryChanged':
        queryDescription = message.description || '';
        // Update selected query if provided
        if (message.query && typeof message.query === 'string') {
          selectedQuery = message.query;
          console.log('🔄 [Webview] Query updated from backend:', {
            newQuery: selectedQuery,
            description: queryDescription,
            connectionId: message.connectionId,
          });
        }
        break;

      case 'work-items-update': {
        if (typeof handleExtensionMessage === 'function') {
          handleExtensionMessage(message);
        }
        loading = false;
        errorMsg = '';
        const connectionId =
          typeof message.connectionId === 'string'
            ? message.connectionId
            : typeof message.metadata?.connectionId === 'string'
              ? message.metadata.connectionId
              : currentConnection?.id;
        if (connectionId) {
          markConnectionAuthenticated(connectionId);
          clearAuthReminder(connectionId);
        }
        break;
      }

      case 'auth-reminders-update': {
        applyAuthReminderPayload(message.authReminders);
        break;
      }

      case 'error':
        errorMsg = message.error || 'An error occurred';
        loading = false;
        showToast(errorMsg, 'error');
        break;

      case 'loading':
        loading = message.loading ?? false;
        if (loading) {
          errorMsg = '';
        }
        break;

      case 'authReminder': {
        const connectionId =
          typeof message.connectionId === 'string' ? message.connectionId.trim() : '';
        if (!connectionId) {
          console.warn('⚠️ [ReactiveApp] authReminder missing connectionId', message);
          break;
        }
        upsertAuthReminder({
          connectionId,
          label: message.connectionLabel || connectionId,
          message:
            message.message ||
            `Microsoft Entra sign-in required for ${message.connectionLabel || connectionId}`,
          detail: message.detail,
        });
        markConnectionRequiresAuth(connectionId);
        showToast(`Sign in required for ${message.connectionLabel || connectionId}`, 'warning');
        break;
      }

      case 'authReminderClear': {
        const connectionId =
          typeof message.connectionId === 'string' ? message.connectionId.trim() : '';
        if (!connectionId) break;
        clearAuthReminder(connectionId);
        markConnectionAuthenticated(connectionId);
        break;
      }

      case 'connections-update':
        console.log('🔄 [ReactiveApp] Received connections-update message', message);

        // Use the FSM webview store's message handler for proper processing
        if (typeof handleExtensionMessage === 'function') {
          handleExtensionMessage(message);
          console.log('✅ [ReactiveApp] Delegated connections-update to FSM message handler');
        } else {
          console.warn(
            '⚠️ [ReactiveApp] handleExtensionMessage function not available, falling back to manual processing'
          );

          // Fallback manual processing
          if (Array.isArray(message.connections)) {
            const processedConnections = message.connections
              .map((entry) => {
                const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
                if (!id) return null;

                const label =
                  typeof entry?.label === 'string' && entry.label.trim().length > 0
                    ? entry.label.trim()
                    : typeof entry?.project === 'string' && entry.project.trim().length > 0
                      ? entry.project.trim()
                      : id;

                return {
                  id,
                  label,
                  url: entry?.url || '',
                  project: entry?.project || '',
                  isDefault: entry?.isDefault === true,
                  ...entry,
                };
              })
              .filter(Boolean);

            // Update the global store with processed connections
            globalConnectionsArray.set(processedConnections);
            globalConnectionsCount.set(processedConnections.length);
            console.log('✅ [ReactiveApp] Fallback: Updated global connections stores');
          }
        }
        break;
    }
  }

  // Event handlers - now use reactive actions
  function handleConnectionChange(e) {
    const connectionId = e.target.value;
    integrationActions.switchToConnection(connectionId);
  }

  function handleQueryChange(e) {
    selectedQuery = e.target.value;
    integrationActions.loadWorkItems();
  }

  function handleStartTimer(workItemId) {
    integrationActions.startTimerForWorkItem(workItemId);
  }

  function handleStopTimer() {
    fsmActions.stopTimer();
  }

  function handleItemAction(action, item) {
    switch (action) {
      case 'start':
        handleStartTimer(item.id);
        break;
      case 'view':
        const connection = currentConnection;
        if (connection?.url && connection?.project) {
          const baseUrl = connection.url.replace(/\/$/, '');
          window.open(`${baseUrl}/${connection.project}/_workitems/edit/${item.id}`, '_blank');
        }
        break;
      case 'edit':
        // This would trigger edit mode or open external editor
        showToast(`Edit work item #${item.id} - feature coming soon`, 'info');
        break;
      case 'comment':
        showToast(`Add comment to #${item.id} - feature coming soon`, 'info');
        break;
    }
  }

  function handleAuthReminderAction(connectionId, action) {
    console.log('🔐 [ReactiveApp] handleAuthReminderAction called:', { connectionId, action });

    // Send message to extension using VS Code webview API
    if (typeof window !== 'undefined' && window.vscode?.postMessage) {
      console.log('🔐 [ReactiveApp] Sending authReminderAction message via VS Code API');
      window.vscode.postMessage({
        type: 'authReminderAction',
        connectionId: connectionId,
        action: action,
      });
    } else if (typeof window !== 'undefined' && window.parent?.postMessage) {
      console.log(
        '🔐 [ReactiveApp] Fallback: Sending authReminderAction message via parent postMessage'
      );
      window.parent.postMessage(
        {
          type: 'authReminderAction',
          connectionId: connectionId,
          action: action,
        },
        '*'
      );
    } else {
      console.error('🔴 [ReactiveApp] Unable to send message - no communication method available');
    }

    if (action === 'signIn') {
      // Note: No need to call onAuthResolve as we're sending the message directly
      console.log(
        '🔐 [ReactiveApp] Authentication sign-in initiated for connection:',
        connectionId
      );
    } else if (action === 'dismiss') {
      showToast('Authentication reminder dismissed', 'info');
    }
  }

  function triggerManualSignIn() {
    console.log('🔐 [ReactiveApp] triggerManualSignIn called');

    // Get the active connection from current state
    const activeConnectionData = currentConnection;

    if (!activeConnectionData?.id) {
      console.warn('🔐 [ReactiveApp] No active connection available for manual sign-in');
      showToast('No connection available for sign-in', 'error');
      return;
    }

    console.log(
      '🔐 [ReactiveApp] Triggering manual sign-in for connection:',
      activeConnectionData.id
    );

    // Send message to extension using VS Code webview API to require authentication
    if (typeof window !== 'undefined' && window.vscode?.postMessage) {
      console.log('🔐 [ReactiveApp] Sending requireAuthentication message via VS Code API');
      window.vscode.postMessage({
        type: 'requireAuthentication',
        connectionId: activeConnectionData.id,
      });
    } else if (typeof window !== 'undefined' && window.parent?.postMessage) {
      console.log(
        '🔐 [ReactiveApp] Fallback: Sending requireAuthentication message via parent postMessage'
      );
      window.parent.postMessage(
        {
          type: 'requireAuthentication',
          connectionId: activeConnectionData.id,
        },
        '*'
      );
    } else {
      console.error('🔴 [ReactiveApp] Unable to send message - no communication method available');
    }

    const connectionName = activeConnectionData?.name || 'Unknown';
    showToast(`Starting authentication for ${connectionName}...`, 'info');
  }

  function toggleKanbanView() {
    kanbanView = !kanbanView;
    addToast(`Switched to ${kanbanView ? 'Kanban' : 'List'} view`, { type: 'info' });
  }

  function toggleItemSelection(id) {
    if (selectedItems.has(id)) {
      selectedItems.delete(id);
    } else {
      selectedItems.add(id);
    }
    selectedItems = new Set(selectedItems); // Trigger reactivity
  }

  function clearSelection() {
    selectedItems.clear();
    selectedItems = new Set();
  }

  function selectAll() {
    filteredWorkItems().forEach((item) => {
      const id = Number(item.id || item.fields?.['System.Id']);
      if (id) selectedItems.add(id);
    });
    selectedItems = new Set(selectedItems);
  }

  // Kanban helpers
  function normalizeState(raw) {
    if (!raw) return 'new';
    const s = String(raw).toLowerCase().trim().replace(/\s+/g, '-');
    if (s === 'new' || s === 'to-do' || s === 'todo' || s === 'proposed') return 'new';
    if (s === 'approved') return 'approved';
    if (s === 'committed') return 'committed';
    if (s === 'active') return 'active';
    if (s === 'in-progress' || s === 'inprogress' || s === 'doing') return 'inprogress';
    if (s === 'review' || s === 'code-review' || s === 'testing') return 'review';
    if (s === 'resolved') return 'resolved';
    if (s === 'done') return 'done';
    if (s === 'closed' || s === 'completed') return 'closed';
    if (s === 'removed') return 'removed';
    return 'new';
  }

  function getWorkItemTypeIcon(type) {
    const t = String(type || '').toLowerCase();
    if (t.includes('bug')) return '\uf41d';
    if (t.includes('task')) return '\uf0f7';
    if (t.includes('story') || t.includes('user story')) return '\uf413';
    if (t.includes('feature')) return '\uf0e7';
    if (t.includes('epic')) return '\uf0f2';
    return '\uf0c5';
  }

  function getPriorityClass(priority) {
    const p = Number(priority) || 3;
    if (p === 1) return 'priority-1';
    if (p === 2) return 'priority-2';
    if (p === 3) return 'priority-3';
    if (p === 4) return 'priority-4';
    return 'priority-3';
  }

  // Lifecycle
  onMount(() => {
    console.log('🟢 [ReactiveApp] Component mounted - initializing store effects');
    console.log('🔍 [ReactiveApp] Store import check:', {
      fsm: typeof fsm,
      connections: typeof connections,
      ui: typeof ui,
      initializeStoreEffects: typeof initializeStoreEffects,
    });

    // Initialize store effects (critical for proper FSM operation)
    try {
      console.log('🔄 [ReactiveApp] Calling initializeStoreEffects...');
      initializeStoreEffects();
      console.log('✅ [ReactiveApp] Store effects initialized successfully');
    } catch (error) {
      console.error('❌ [ReactiveApp] Failed to initialize store effects:', error);
      console.error('❌ [ReactiveApp] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    // Listen for VS Code messages
    window.addEventListener('message', handleVSCodeMessage);

    // Request initial data
    onRefreshData();

    console.log('🟢 [ReactiveApp] Component mount complete with store integration');

    return () => {
      window.removeEventListener('message', handleVSCodeMessage);
    };
  });
</script>

<div class="pane">
  <!-- Connection Tabs (only show if multiple connections) -->
  {#if connectionsList && connectionsList.length > 1}
    <div class="connection-tabs" role="tablist" aria-label="Project connections">
      {#each connectionsList as connection}
        <button
          class="connection-tab"
          class:active={connection.id === currentConnection?.id}
          onclick={() => onConnectionSelect(connection.id)}
          role="tab"
          aria-selected={connection.id === currentConnection?.id}
          aria-label={`Switch to ${connection.label}`}
          title={`${connection.organization}/${connection.project}`}
        >
          {connection.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Auth Reminders -->
  {#if authReminders.length > 0}
    <div class="auth-reminders" role="region" aria-label="Authentication reminders">
      {#each authReminders as reminder (reminder.connectionId)}
        <div class="auth-reminder" role="alert">
          <div class="auth-reminder-icon" aria-hidden="true">⚠️</div>
          <div class="auth-reminder-body">
            <div class="auth-reminder-title">
              {reminder.message || `Microsoft Entra sign-in required for ${reminder.label}`}
            </div>
            <div class="auth-reminder-detail">
              {reminder.detail ||
                `Sign in to refresh ${reminder.label} and resume work item syncing.`}
            </div>
          </div>
          <div class="auth-reminder-actions">
            <button
              class="primary"
              onclick={() => handleAuthReminderAction(reminder.connectionId, 'signIn')}
            >
              Sign In
            </button>
            <button
              class="secondary"
              onclick={() => handleAuthReminderAction(reminder.connectionId, 'dismiss')}
            >
              Dismiss
            </button>
          </div>
        </div>
      {/each}
    </div>
  {:else if shouldShowManualSignIn}
    <!-- Manual Sign-In section when no auth reminders but connections exist -->
    <div class="manual-signin" role="region" aria-label="Manual sign-in">
      <div class="manual-signin-card">
        <div class="manual-signin-icon" aria-hidden="true">🔐</div>
        <div class="manual-signin-content">
          <div class="manual-signin-title">Sign In Required</div>
          <div class="manual-signin-message">
            {#if currentConnection?.label}
              Sign in to {currentConnection.label} to load work items and start using the extension.
            {:else}
              Sign in to your Azure DevOps account to load work items and start using the extension.
            {/if}
          </div>
        </div>
        <div class="manual-signin-actions">
          <button
            class="primary"
            onclick={() => triggerManualSignIn()}
            title="Sign in to the active connection"
          >
            Start Sign In
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Initialization Status -->
  {#if initStatus.phase === 'initializing'}
    <div class="init-status">
      <div class="init-progress">
        <div class="init-progress-bar" style="width: {initStatus.progress}%"></div>
      </div>
      <div class="init-message">
        {#if initStatus.phase === 'activating'}
          Activating extension...
        {:else if initStatus.phase === 'ui-setup'}
          Setting up interface...
        {:else if initStatus.phase === 'loading-data'}
          Loading work items...
        {:else}
          Initializing...
        {/if}
      </div>
    </div>
  {/if}

  <!-- Query Header -->
  <div class="query-header" role="toolbar" aria-label="Query selection">
    <div class="query-selector-container">
      <label for="querySelect" class="query-selector-label">Query</label>
      <select
        id="querySelect"
        class="query-selector"
        bind:value={selectedQuery}
        onchange={handleQueryChange}
        title="Select a query to filter work items"
        aria-label="Select query"
      >
        {#each queryOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if queryDescription}
        <div class="query-description">{queryDescription}</div>
      {/if}
    </div>
  </div>

  <!-- Main Header -->
  <div class="pane-header" role="toolbar" aria-label="Work Items actions">
    <span style="font-weight:600;">Work Items</span>
    {#if loading}
      <span class="spinner" role="status" aria-label="Loading" title="Loading"></span>
    {/if}
    <span class="count">{workItemCount}</span>
    {#if timerActive}
      <span class="muted">
        • {timerRunning ? 'Running' : 'Paused'}
        {#if timerElapsedLabel}({timerElapsedLabel}){/if}
      </span>
      {#if activeWorkItemId}
        <button
          onclick={() => handleItemAction('view', { id: activeWorkItemId })}
          title={activeWorkItemTitle || 'Open active work item'}
          aria-label={`Open active work item #${activeWorkItemId}`}
        >
          #{activeWorkItemId}
        </button>
      {/if}
    {/if}

    <span class="actions" style="margin-left:auto;">
      <button onclick={onRefreshData} title="Refresh work items (R)" aria-label="Refresh">
        <span class="codicon codicon-refresh"></span>
      </button>
      <button onclick={toggleKanbanView} title="Toggle view (V)" aria-label="Toggle Kanban view">
        <span class="codicon codicon-{kanbanView ? 'list-unordered' : 'organization'}"></span>
      </button>
      <button onclick={onWorkItemCreate} title="Create work item" aria-label="Create new work item">
        <span class="codicon codicon-add"></span>
      </button>
      {#if selectedItems.size > 0}
        <button onclick={clearSelection} title="Clear selection (Esc)" aria-label="Clear selection">
          <span class="codicon codicon-close"></span>
          {selectedItems.size}
        </button>
      {/if}
    </span>
  </div>

  <!-- Work Items Content -->
  <div class="pane-body">
    {#if errorMsg}
      <div class="error-banner" role="alert">
        <div style="font-weight: 600; margin-bottom: 4px;">⚠️ Error Loading Work Items</div>
        <div>{errorMsg}</div>
        <button onclick={onRetry} style="margin-top: 8px;">Retry</button>
      </div>
    {:else if loading}
      <div class="loading">
        <span class="spinner" role="status" aria-label="Loading"></span> Loading work items…
      </div>
    {:else if filteredWorkItems().length === 0}
      <div class="empty">
        <div style="margin-bottom: 16px;">No work items to display.</div>
        <button onclick={onRefreshData}>Refresh</button>
      </div>
    {:else if kanbanView}
      <!-- Kanban Board View -->
      <div class="kanban-board" aria-label="Kanban board">
        <div class="kanban-column">
          <div class="kanban-column-header">
            <h3>Work Items</h3>
            <span class="item-count">{filteredWorkItems().length}</span>
          </div>
          <div class="kanban-column-content">
            {#each filteredWorkItems().slice(0, 20) as item}
              <div
                class="work-item-card kanban-card {timerActive &&
                activeWorkItemId === Number(item.id)
                  ? 'has-active-timer'
                  : ''} {selectedItems.has(Number(item.id)) ? 'selected' : ''}"
              >
                <div class="work-item-header">
                  <input
                    type="checkbox"
                    class="work-item-checkbox"
                    checked={selectedItems.has(Number(item.id))}
                    onclick={() => toggleItemSelection(Number(item.id))}
                    aria-label="Select work item #{item.id}"
                  />
                  <span class="work-item-type-icon"
                    >{getWorkItemTypeIcon(item.fields?.['System.WorkItemType'])}</span
                  >
                  <span class="work-item-id">#{item.id}</span>
                  {#if timerActive && activeWorkItemId === Number(item.id)}
                    <span class="timer-indicator">
                      <span class="codicon codicon-clock" aria-hidden="true"></span>
                      {timerElapsedLabel}
                    </span>
                  {/if}
                </div>

                <div class="work-item-content">
                  <div class="work-item-title">
                    {item.fields?.['System.Title'] || `Work Item #${item.id}`}
                  </div>
                  <div class="work-item-meta">
                    <span class="work-item-type"
                      >{item.fields?.['System.WorkItemType'] || 'Task'}</span
                    >
                    <span
                      class="work-item-state state-{normalizeState(item.fields?.['System.State'])}"
                    >
                      {item.fields?.['System.State'] || 'New'}
                    </span>
                  </div>
                </div>

                <div class="work-item-actions">
                  {#if timerActive && activeWorkItemId === Number(item.id)}
                    <button
                      class="action-btn stop compact"
                      onclick={() => handleStopTimer()}
                      title="Stop timer"
                      aria-label={`Stop timer for #${item.id}`}
                    >
                      <span class="codicon codicon-debug-stop" aria-hidden="true"></span>
                    </button>
                  {:else}
                    <button
                      class="action-btn start compact"
                      onclick={() => handleItemAction('start', item)}
                      title="Start timer"
                      aria-label={`Start timer for #${item.id}`}
                      disabled={timerActive}
                    >
                      <span class="codicon codicon-play" aria-hidden="true"></span>
                    </button>
                  {/if}
                  <button
                    class="action-btn view compact"
                    onclick={() => handleItemAction('view', item)}
                    title="View"
                    aria-label={`View work item #${item.id}`}
                  >
                    <span class="codicon codicon-eye" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <!-- List View -->
      <div class="items" aria-label="Work items">
        {#each filteredWorkItems().slice(0, 50) as item, index}
          <div
            class="work-item-card {timerActive && activeWorkItemId === Number(item.id)
              ? 'has-active-timer'
              : ''} {focusedIndex === index ? 'focused' : ''} {selectedItems.has(Number(item.id))
              ? 'selected'
              : ''}"
            tabindex="0"
            role="button"
            data-index={index}
            aria-label={`Work item #${item.id}: ${item.fields?.['System.Title']} - use action buttons to interact`}
          >
            <div class="work-item-header">
              <input
                type="checkbox"
                class="work-item-checkbox"
                checked={selectedItems.has(Number(item.id))}
                onclick={() => toggleItemSelection(Number(item.id))}
                aria-label="Select work item #{item.id}"
              />
              <span class="work-item-type-icon"
                >{getWorkItemTypeIcon(item.fields?.['System.WorkItemType'])}</span
              >
              <span class="work-item-id">#{item.id}</span>
              {#if timerActive && activeWorkItemId === Number(item.id)}
                <span class="timer-indicator">
                  <span class="codicon codicon-clock" aria-hidden="true"></span>
                  {timerElapsedLabel}
                </span>
              {/if}
              <span
                class="work-item-priority {getPriorityClass(
                  item.fields?.['Microsoft.VSTS.Common.Priority']
                )}"
              >
                {item.fields?.['Microsoft.VSTS.Common.Priority'] || '3'}
              </span>
            </div>

            <div class="work-item-content">
              <div class="work-item-title">
                {item.fields?.['System.Title'] || `Work Item #${item.id}`}
              </div>
              <div class="work-item-meta">
                <span class="work-item-type">{item.fields?.['System.WorkItemType'] || 'Task'}</span>
                <span class="work-item-state state-{normalizeState(item.fields?.['System.State'])}">
                  {item.fields?.['System.State'] || 'New'}
                </span>
                <span class="work-item-assignee">
                  {#if item.fields?.['System.AssignedTo']}
                    <span class="codicon codicon-account" aria-hidden="true"></span>
                    {item.fields['System.AssignedTo'].displayName ||
                      item.fields['System.AssignedTo']}
                  {:else}
                    <span class="codicon codicon-account" aria-hidden="true"></span> Unassigned
                  {/if}
                </span>
              </div>
            </div>

            <div class="work-item-actions">
              {#if timerActive && activeWorkItemId === Number(item.id)}
                <button
                  class="action-btn stop"
                  onclick={() => handleStopTimer()}
                  title="Stop timer"
                  aria-label={`Stop timer for #${item.id}`}
                >
                  <span class="codicon codicon-debug-stop" aria-hidden="true"></span> Stop
                </button>
              {:else}
                <button
                  class="action-btn start"
                  onclick={() => handleItemAction('start', item)}
                  title="Start timer"
                  aria-label={`Start timer for #${item.id}`}
                  disabled={timerActive}
                >
                  <span class="codicon codicon-play" aria-hidden="true"></span> Start
                </button>
              {/if}
              <button
                class="action-btn view"
                onclick={() => handleItemAction('view', item)}
                title="View in browser"
                aria-label={`View work item #${item.id}`}
              >
                <span class="codicon codicon-eye" aria-hidden="true"></span> View
              </button>
              <button
                class="action-btn edit"
                onclick={() => handleItemAction('edit', item)}
                title="Edit work item"
                aria-label={`Edit work item #${item.id}`}
              >
                <span class="codicon codicon-edit" aria-hidden="true"></span> Edit
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Debug Panel (temporarily disabled to avoid import.meta issues) -->
  <!-- 
  <div class="debug-panel">
  <button onclick={onDebugState} title="Log FSM state to console"> Debug State </button>
    <span class="debug-info">
      Phase: {initStatus.phase} | Progress: {initStatus.progress}%
    </span>
  </div>
  -->

  <!-- <Toasts ariaLabel="Work item notifications" /> -->
</div>

<style>
  /* Import existing styles from App.svelte but adapt for Svelte 5 */
  .pane {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
  }

  .connection-tabs {
    display: flex;
    background: var(--vscode-tab-inactiveBackground);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    overflow-x: auto;
    flex-shrink: 0;
  }

  .connection-tab {
    padding: 8px 16px;
    background: var(--vscode-tab-inactiveBackground);
    color: var(--vscode-tab-inactiveForeground);
    border: none;
    border-right: 1px solid var(--vscode-editorWidget-border);
    cursor: pointer;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .connection-tab:hover {
    background: var(--vscode-tab-hoverBackground);
    color: var(--vscode-tab-hoverForeground);
  }

  .connection-tab.active {
    background: var(--vscode-tab-activeBackground);
    color: var(--vscode-tab-activeForeground);
    border-bottom: 2px solid var(--vscode-tab-activeBorder, #0078d4);
  }

  .auth-reminders {
    margin: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .auth-reminder {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 14px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
    background: var(--vscode-editorWidget-background);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .auth-reminder-icon {
    font-size: 20px;
    line-height: 1;
    margin-top: 2px;
  }

  .auth-reminder-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .auth-reminder-title {
    font-weight: 600;
    font-size: 13px;
  }

  .auth-reminder-detail {
    font-size: 12px;
    line-height: 1.4;
    color: var(--vscode-editor-foreground);
    opacity: 0.9;
  }

  .auth-reminder-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .manual-signin {
    margin: 12px;
  }

  .manual-signin-card {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 16px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
    background: var(--vscode-editorWidget-background);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .manual-signin-icon {
    font-size: 24px;
    line-height: 1;
    opacity: 0.8;
  }

  .manual-signin-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .manual-signin-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--vscode-editor-foreground);
  }

  .manual-signin-message {
    font-size: 12px;
    line-height: 1.4;
    color: var(--vscode-editor-foreground);
    opacity: 0.8;
  }

  .manual-signin-actions {
    display: flex;
    align-items: center;
  }

  .init-status {
    padding: 12px;
    background: var(--vscode-editorWidget-background);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
  }

  .init-progress {
    width: 100%;
    height: 4px;
    background: var(--vscode-editorWidget-border);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .init-progress-bar {
    height: 100%;
    background: #0078d4;
    transition: width 0.3s ease;
  }

  .init-message {
    font-size: 12px;
    color: var(--vscode-foreground);
  }

  .query-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
  }

  .query-selector-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 300px;
    max-width: 500px;
    width: 100%;
  }

  .query-selector-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .query-selector {
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid var(--vscode-input-border);
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border-radius: 3px;
  }

  .query-description {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.3;
    opacity: 0.8;
  }

  .pane-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
    color: var(--vscode-editor-foreground);
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--vscode-editorWidget-border);
    border-top-color: #0078d4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-left: 6px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .muted {
    opacity: 0.7;
  }

  .count {
    margin-left: auto;
    opacity: 0.85;
  }

  .actions {
    display: inline-flex;
    gap: 6px;
  }

  button {
    font-size: 11px;
    padding: 4px 8px;
    color: var(--vscode-button-foreground);
    background: #0078d4;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--vscode-font-family);
  }

  button:hover {
    background: #106ebe;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: default;
  }

  .pane-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .error-banner {
    margin: 8px;
    padding: 12px;
    border: 2px solid #d13438;
    border-radius: 4px;
    background: rgba(209, 52, 56, 0.15);
    color: #d13438;
    font-weight: 500;
    font-size: 12px;
  }

  .loading {
    padding: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }

  .empty {
    padding: 20px;
    font-size: 14px;
    opacity: 0.7;
    text-align: center;
  }

  .items {
    padding: 8px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .kanban-board {
    padding: 8px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    gap: 12px;
  }

  .kanban-column {
    min-width: 300px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    max-height: 100%;
  }

  .kanban-column-header {
    padding: 12px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .kanban-column-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .item-count {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
  }

  .kanban-column-content {
    padding: 8px;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .work-item-card {
    display: flex;
    flex-direction: column;
    padding: 12px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .work-item-card:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: #0078d4;
    box-shadow: 0 2px 8px rgba(0, 120, 212, 0.1);
  }

  .work-item-card.has-active-timer {
    border-left: 3px solid #ff8c00;
  }

  .work-item-card.focused {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
    background: var(--vscode-list-activeSelectionBackground);
    border-color: var(--vscode-focusBorder);
  }

  .work-item-card.selected {
    background: var(--vscode-list-selectionBackground);
    border-color: var(--vscode-list-selectionBackground);
  }

  .work-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .work-item-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #0078d4;
  }

  .work-item-type-icon {
    font-family: 'codicon';
    font-size: 16px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
    color: #0078d4;
  }

  .work-item-id {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
  }

  .work-item-priority {
    margin-left: auto;
    font-size: 14px;
    font-weight: 600;
  }

  .priority-1 {
    color: #d13438;
  }
  .priority-2 {
    color: #ff8c00;
  }
  .priority-3 {
    color: #0078d4;
  }
  .priority-4 {
    color: #666;
  }

  .timer-indicator {
    background: rgba(255, 140, 0, 0.2);
    color: #ff8c00;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    border: 1px solid rgba(255, 140, 0, 0.3);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .work-item-content {
    flex: 1;
    margin-bottom: 8px;
  }

  .work-item-title {
    font-weight: 600;
    font-size: 14px;
    line-height: 1.3;
    margin-bottom: 6px;
    color: var(--vscode-editor-foreground);
  }

  .work-item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    margin-bottom: 8px;
  }

  .work-item-type {
    padding: 2px 6px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
  }

  .work-item-state {
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .state-new {
    background: rgba(0, 120, 212, 0.2);
    color: #0078d4;
  }
  .state-active,
  .state-inprogress {
    background: rgba(255, 140, 0, 0.2);
    color: #ff8c00;
  }
  .state-resolved,
  .state-done,
  .state-closed {
    background: rgba(16, 124, 16, 0.2);
    color: #107c10;
  }
  .state-removed {
    background: rgba(209, 52, 56, 0.2);
    color: #d13438;
  }

  .work-item-actions {
    display: flex;
    gap: 4px;
    align-items: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .work-item-card:hover .work-item-actions {
    opacity: 1;
  }

  .action-btn {
    padding: 6px 8px;
    background: var(--vscode-button-secondaryBackground);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.1s ease;
    color: var(--vscode-button-secondaryForeground);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .action-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
    border-color: #0078d4;
  }

  .action-btn.start {
    background: #107c10;
    color: white;
    border-color: #107c10;
  }

  .action-btn.stop {
    background: #d13438;
    color: white;
    border-color: #d13438;
  }

  .action-btn.compact {
    padding: 4px 6px;
  }

  .debug-panel {
    padding: 8px 12px;
    background: var(--vscode-editorWidget-background);
    border-top: 1px solid var(--vscode-editorWidget-border);
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 11px;
  }

  .debug-info {
    opacity: 0.7;
    font-family: monospace;
  }

  /* Responsive adjustments */
  @media (max-width: 600px) {
    .connection-tabs {
      flex-wrap: wrap;
    }

    .kanban-board {
      flex-direction: column;
    }

    .kanban-column {
      min-width: unset;
      width: 100%;
    }
  }
</style>
