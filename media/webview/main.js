// src/webview/main.ts
var vscode = (() => {
  try {
    return window.vscode || acquireVsCodeApi();
  } catch (e) {
    console.error("[webview] Failed to acquire VS Code API", e);
    return null;
  }
})();
function postMessage(msg) {
  try {
    if (vscode && typeof vscode.postMessage === "function") {
      vscode.postMessage(msg);
      return;
    }
    if (typeof window !== "undefined" && window.vscode && typeof window.vscode.postMessage === "function") {
      window.vscode.postMessage(msg);
      return;
    }
    console.warn("[webview] vscode.postMessage not available; message not sent", msg);
  } catch (err) {
    console.error("[webview] Error posting message to extension", err, msg);
  }
}
var connections = [];
var activeConnectionId = null;
var workItemsByConnection = /* @__PURE__ */ new Map();
var workItems = [];
var currentTimer = null;
var selectedWorkItemId = null;
var isLoading = false;
var currentView = "list";
var fallbackNotice = null;
var fallbackNotices = /* @__PURE__ */ new Map();
var typeOptionsByConnection = /* @__PURE__ */ new Map();
var searchHaystackCache = /* @__PURE__ */ new WeakMap();
var filterStateByConnection = /* @__PURE__ */ new Map();
function normalizeConnectionId(raw) {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}
function getDefaultFilterState() {
  return {
    search: "",
    sprint: "",
    type: "",
    assignedTo: "",
    excludeDone: false,
    excludeClosed: false,
    excludeRemoved: false,
    excludeInReview: false
  };
}
function getFilterStateForConnection(connectionId) {
  if (!filterStateByConnection.has(connectionId)) {
    filterStateByConnection.set(connectionId, getDefaultFilterState());
  }
  return filterStateByConnection.get(connectionId);
}
function setTypeOptionsForConnection(connectionId, values, options = {}) {
  const base = options.merge ? new Set(typeOptionsByConnection.get(connectionId) ?? []) : /* @__PURE__ */ new Set();
  values.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    base.add(trimmed);
  });
  typeOptionsByConnection.set(
    connectionId,
    Array.from(base).sort((a, b) => a.localeCompare(b))
  );
}
function getTypeOptionsForConnection(connectionId) {
  if (!connectionId) return [];
  return typeOptionsByConnection.get(connectionId) ?? [];
}
function extractWorkItemTypes(items) {
  if (!Array.isArray(items)) return [];
  const set = /* @__PURE__ */ new Set();
  items.forEach((item) => {
    const flattened = typeof item?.type === "string" ? item.type : void 0;
    const fromFields = typeof item?.fields?.["System.WorkItemType"] === "string" ? item.fields["System.WorkItemType"] : void 0;
    const value = flattened ?? fromFields;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) set.add(trimmed);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
function persistCurrentFilterState() {
  const connectionId = activeConnectionId;
  if (!connectionId) return;
  const state = getFilterStateForConnection(connectionId);
  state.search = elements.searchInput?.value ?? "";
  state.sprint = elements.sprintFilter?.value ?? "";
  state.type = elements.typeFilter?.value ?? "";
  state.assignedTo = elements.assignedToFilter?.value ?? "";
  state.excludeDone = !!elements.excludeDone?.checked;
  state.excludeClosed = !!elements.excludeClosed?.checked;
  state.excludeRemoved = !!elements.excludeRemoved?.checked;
  state.excludeInReview = !!elements.excludeInReview?.checked;
}
function applyFilterStateToUi(connectionId) {
  const state = getFilterStateForConnection(connectionId);
  if (elements.searchInput) {
    elements.searchInput.value = state.search;
  }
  const ensureSelectValue = (select, desired) => {
    if (!select) return "";
    const options = Array.from(select.options).map((option) => option.value);
    const value = desired && options.includes(desired) ? desired : "";
    select.value = value;
    return value;
  };
  state.sprint = ensureSelectValue(elements.sprintFilter, state.sprint);
  state.type = ensureSelectValue(elements.typeFilter, state.type);
  state.assignedTo = ensureSelectValue(elements.assignedToFilter, state.assignedTo);
  if (elements.excludeDone) elements.excludeDone.checked = state.excludeDone;
  if (elements.excludeClosed) elements.excludeClosed.checked = state.excludeClosed;
  if (elements.excludeRemoved) elements.excludeRemoved.checked = state.excludeRemoved;
  if (elements.excludeInReview) elements.excludeInReview.checked = state.excludeInReview;
}
var composeState = null;
var lastTimerSnapshot = null;
var elements = {
  searchInput: null,
  statusOverview: null,
  connectionTabs: null,
  sprintFilter: null,
  typeFilter: null,
  assignedToFilter: null,
  excludeDone: null,
  excludeClosed: null,
  excludeRemoved: null,
  excludeInReview: null,
  workItemsContainer: null,
  timerContainer: null,
  timerDisplay: null,
  timerTask: null,
  content: null,
  timerInfo: null,
  startTimerBtn: null,
  pauseTimerBtn: null,
  stopTimerBtn: null,
  // New summary editor elements
  draftSummary: null,
  summarySection: null,
  summaryContainer: null,
  toggleSummaryBtn: null,
  summaryStatus: null,
  submitComposeBtn: null
};
function init() {
  elements.searchInput = document.getElementById("searchInput");
  elements.statusOverview = document.getElementById("statusOverview");
  elements.connectionTabs = document.getElementById("connectionTabs");
  elements.sprintFilter = document.getElementById("sprintFilter");
  elements.typeFilter = document.getElementById("typeFilter");
  elements.assignedToFilter = document.getElementById("assignedToFilter");
  elements.excludeDone = document.getElementById("excludeDone");
  elements.excludeClosed = document.getElementById("excludeClosed");
  elements.excludeRemoved = document.getElementById("excludeRemoved");
  elements.excludeInReview = document.getElementById("excludeInReview");
  elements.workItemsContainer = document.getElementById("workItemsContainer");
  elements.timerContainer = document.getElementById("timerContainer");
  elements.timerDisplay = document.getElementById("timerDisplay");
  elements.timerInfo = document.getElementById("timerInfo");
  const startTimerBtn = document.getElementById("startTimerBtn");
  const pauseTimerBtn = document.getElementById("pauseTimerBtn");
  const stopTimerBtn = document.getElementById("stopTimerBtn");
  elements.startTimerBtn = startTimerBtn;
  elements.pauseTimerBtn = pauseTimerBtn;
  elements.stopTimerBtn = stopTimerBtn;
  elements.content = document.getElementById("content");
  elements.draftSummary = document.getElementById("draftSummary");
  elements.summarySection = document.getElementById("summarySection");
  elements.summaryContainer = document.getElementById("summaryContainer");
  elements.toggleSummaryBtn = document.getElementById(
    "toggleSummaryBtn"
  );
  elements.summaryStatus = document.getElementById("summaryStatus");
  elements.submitComposeBtn = document.getElementById("submitComposeBtn");
  if (elements.summarySection) elements.summarySection.setAttribute("hidden", "");
  if (elements.summaryContainer) elements.summaryContainer.setAttribute("hidden", "");
  const toggleBtn = elements.toggleSummaryBtn;
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.textContent = "Compose Comment \u25BE";
  }
  if (elements.connectionTabs) {
    elements.connectionTabs.setAttribute("hidden", "");
  }
  if (!elements.workItemsContainer) {
    console.error("[webview] Critical: workItemsContainer element not found");
    return;
  }
  console.log("[webview] Initializing webview...");
  setupEventListeners();
  setupMessageHandling();
  console.log("[webview] Setting timer visibility to false during init");
  updateTimerVisibility(false);
  postMessage({ type: "webviewReady" });
  requestWorkItems();
}
function setupEventListeners() {
  document.addEventListener("click", function(e) {
    const statusBadge = e.target.closest(".status-badge");
    if (statusBadge) {
      const status = statusBadge.getAttribute("data-status");
      if (status) {
        filterByStatus(status);
      }
      return;
    }
    const connectionTab = e.target.closest(".connection-tab");
    if (connectionTab) {
      const id2 = connectionTab.getAttribute("data-connection-id");
      if (id2) selectConnection(id2);
      return;
    }
    const workItemCard = e.target.closest('[data-action="selectWorkItem"]');
    if (workItemCard && !e.target.closest("button")) {
      const id2 = parseInt(workItemCard.getAttribute("data-id") || "0");
      selectWorkItem(id2.toString());
      return;
    }
    const button = e.target.closest("button[data-action]");
    if (!button) return;
    e.stopPropagation();
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id") ? parseInt(button.getAttribute("data-id") || "0") : null;
    console.log("[webview] Button clicked:", action, "id:", id);
    switch (action) {
      case "refresh":
        requestWorkItems();
        break;
      case "toggleSummary": {
        if (!composeState) return;
        const container = elements.summaryContainer;
        if (!container) return;
        const isHidden = container.hasAttribute("hidden");
        if (isHidden) {
          container.removeAttribute("hidden");
          updateComposeToggle(true);
        } else {
          container.setAttribute("hidden", "");
          updateComposeToggle(false);
        }
        break;
      }
      case "generateCopilotPrompt": {
        const workItemId = id ?? composeState?.workItemId ?? (currentTimer ? currentTimer.workItemId : void 0);
        const draft = elements.draftSummary ? elements.draftSummary.value : "";
        if (!workItemId) {
          console.warn("[webview] generateCopilotPrompt: no work item id available");
          setComposeStatus("No work item selected to generate prompt.");
          return;
        }
        setComposeStatus("Preparing Copilot prompt and copying to clipboard...");
        postMessage({ type: "generateCopilotPrompt", workItemId, draftSummary: draft });
        break;
      }
      case "submitCompose": {
        const draft = elements.draftSummary ? elements.draftSummary.value : "";
        const mode = composeState?.mode ?? (currentTimer ? "timerStop" : null);
        if (mode === "addComment") {
          const targetId = composeState?.workItemId;
          if (!targetId) {
            setComposeStatus("No work item selected to add a comment.");
            return;
          }
          if (!draft.trim()) {
            setComposeStatus("Write a comment before submitting.");
            if (elements.draftSummary) {
              requestAnimationFrame(() => elements.draftSummary?.focus());
            }
            return;
          }
          setComposeStatus(`Adding a comment to work item #${targetId}...`);
          postMessage({ type: "addComment", workItemId: targetId, comment: draft });
        } else {
          setComposeStatus("Stopping timer and applying updates...");
          postMessage({ type: "stopAndApply", comment: draft });
        }
        break;
      }
      case "createWorkItem":
        postMessage({ type: "createWorkItem" });
        break;
      case "toggleView": {
        console.log("[webview] toggleView clicked");
        const viewBtn = e.target;
        const view = viewBtn.dataset.view;
        console.log("[webview] View button clicked:", view, "Current view:", currentView);
        if (view && view !== currentView) {
          currentView = view;
          updateViewToggle();
          console.log("[webview] Switching to view:", currentView);
          if (currentView === "kanban") {
            renderKanbanView();
          } else {
            renderWorkItems();
          }
        }
        break;
      }
      case "toggleKanban":
        currentView = currentView === "list" ? "kanban" : "list";
        updateViewToggle();
        if (currentView === "kanban") {
          renderKanbanView();
        } else {
          renderWorkItems();
        }
        break;
      case "search": {
        const query = elements.searchInput?.value;
        if (query) {
          postMessage({ type: "search", query });
        }
        break;
      }
      case "pauseTimer":
        postMessage({ type: "pauseTimer" });
        break;
      case "resumeTimer":
        postMessage({ type: "resumeTimer" });
        break;
      case "stopTimer":
        postMessage({ type: "stopTimer" });
        break;
      case "startTimer": {
        const targetId = id ?? selectedWorkItemId ?? (currentTimer ? Number(currentTimer.workItemId) : null);
        if (targetId) {
          if (currentTimer && Number(currentTimer.workItemId) === Number(targetId)) {
            postMessage({ type: "stopTimer" });
          } else {
            postMessage({ type: "startTimer", workItemId: Number(targetId) });
          }
        } else {
          console.warn(
            "[webview] startTimer requested but no work item is selected and no active timer"
          );
        }
        break;
      }
      case "createBranch":
        if (id) postMessage({ type: "createBranch", id });
        break;
      case "openInBrowser":
        if (id) postMessage({ type: "openInBrowser", id });
        break;
      case "copyId":
        if (id) postMessage({ type: "copyId", id });
        break;
      case "viewDetails":
        if (id) postMessage({ type: "viewWorkItem", workItemId: id });
        break;
      case "editWorkItem":
        if (id) postMessage({ type: "editWorkItemInEditor", workItemId: id });
        break;
      case "addComment":
        if (id) handleAddComment(id);
        break;
    }
  });
  document.addEventListener("change", function(e) {
    const target = e.target;
    const select = target.closest("select[data-action]");
    if (select) {
      const action = select.getAttribute("data-action");
      if (action === "applyFilters") {
        applyFilters();
      }
      return;
    }
    const checkbox = target.closest("input[data-action]");
    if (checkbox && checkbox.type === "checkbox") {
      const action = checkbox.getAttribute("data-action");
      if (action === "applyFilters") {
        applyFilters();
      }
    }
  });
  elements.searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const query = elements.searchInput?.value;
      if (query) {
        postMessage({ type: "search", query });
      }
    }
  });
  elements.sprintFilter?.addEventListener("change", applyFilters);
  elements.typeFilter?.addEventListener("change", applyFilters);
  elements.assignedToFilter?.addEventListener("change", applyFilters);
}
function escapeHtml(input) {
  const str = String(input ?? "");
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function updateTimerVisibility(visible) {
  const el = elements.timerContainer;
  if (!el) return;
  if (visible) {
    el.removeAttribute("hidden");
  } else {
    el.setAttribute("hidden", "");
  }
}
function preserveScroll(axis, render, container = elements.workItemsContainer) {
  const el = container;
  if (!el) {
    render();
    return;
  }
  const prevLeft = el.scrollLeft;
  const prevTop = el.scrollTop;
  render();
  try {
    requestAnimationFrame(() => {
      if (axis === "x" || axis === "both") el.scrollLeft = prevLeft;
      if (axis === "y" || axis === "both") el.scrollTop = prevTop;
    });
  } catch {
    if (axis === "x" || axis === "both") el.scrollLeft = prevLeft;
    if (axis === "y" || axis === "both") el.scrollTop = prevTop;
  }
}
function selectWorkItem(id) {
  const num = parseInt(id, 10);
  if (!Number.isFinite(num)) return;
  selectedWorkItemId = num;
  document.querySelectorAll('[data-action="selectWorkItem"]').forEach((node) => {
    const el = node;
    const nid = parseInt(el.getAttribute("data-id") || "0", 10);
    if (nid === num) el.classList.add("selected");
    else el.classList.remove("selected");
  });
  try {
    const persisted = loadDraftForWorkItem(num);
    if (persisted !== null && elements.draftSummary) {
      elements.draftSummary.value = persisted;
    }
  } catch {
  }
}
function handleAddComment(workItemId) {
  const id = Number(workItemId);
  if (!Number.isFinite(id) || id <= 0) return;
  showComposePanel({
    mode: "addComment",
    workItemId: id,
    message: `Compose a comment for work item #${id}.`
  });
}
function formatTimerDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}`;
  }
  return `${m}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}
function updateTimerDisplay() {
  const d = elements.timerDisplay;
  const info = elements.timerInfo;
  if (!d) return;
  if (!currentTimer) {
    d.textContent = "00:00:00";
    if (info) info.textContent = "";
    updateTimerVisibility(false);
    return;
  }
  const secs = Number(currentTimer.elapsedSeconds || 0);
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor(secs % 3600 / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  d.textContent = `${h}:${m}:${s}`;
  if (info)
    info.textContent = currentTimer.workItemTitle ? `#${currentTimer.workItemId} \xB7 ${currentTimer.workItemTitle}` : `#${currentTimer.workItemId}`;
  updateTimerVisibility(true);
}
function updateTimerButtonStates() {
  const startBtn = elements.startTimerBtn;
  const pauseBtn = elements.pauseTimerBtn;
  const stopBtn = elements.stopTimerBtn;
  const active = !!currentTimer && currentTimer.running !== false;
  if (startBtn) startBtn.disabled = active;
  if (pauseBtn) pauseBtn.disabled = !active;
  if (stopBtn) stopBtn.disabled = !currentTimer;
}
function handleToggleKanbanView() {
  currentView = currentView === "list" ? "kanban" : "list";
  updateViewToggle();
  if (currentView === "kanban") renderKanbanView();
  else renderWorkItems();
}
function handleSelfTestPing(nonce) {
  postMessage({ type: "selfTestPong", nonce });
}
function getNormalizedState(item) {
  if (!item) return "Unknown";
  const raw = item.state || item.fields?.["System.State"] || item["System.State"] || item.fields?.["System.State.name"];
  const rawStr = typeof raw === "string" && raw.trim() ? raw.trim() : "";
  if (!rawStr) return "Unknown";
  const map = {
    todo: "To Do",
    "to do": "To Do",
    new: "New",
    active: "Active",
    "in progress": "In Progress",
    doing: "In Progress",
    "doing ": "In Progress",
    "code review": "Code Review",
    testing: "Testing",
    done: "Done",
    resolved: "Resolved",
    closed: "Closed",
    removed: "Removed"
  };
  const key = rawStr.toLowerCase();
  return map[key] || rawStr;
}
function filterByStatus(status) {
  const filteredItems = workItems.filter((item) => {
    const s = getNormalizedState(item);
    return s === status;
  });
  if (elements.searchInput) elements.searchInput.value = "";
  if (elements.sprintFilter) elements.sprintFilter.value = "";
  if (elements.typeFilter) elements.typeFilter.value = "";
  if (elements.assignedToFilter) elements.assignedToFilter.value = "";
  persistCurrentFilterState();
  elements.workItemsContainer.innerHTML = filteredItems.map((item) => {
    const id = item.id;
    const title = item.title || `Work Item #${id}`;
    const state = item.state || "Unknown";
    const type = item.type || "Unknown";
    const assignedTo = item.assignedTo || "Unassigned";
    const priority = item.priority || 2;
    const description = item.description || "";
    const tags = item.tags || [];
    const iterationPath = item.iterationPath || "";
    const isSelected = selectedWorkItemId === id;
    const typeIcon = getWorkItemTypeIcon(type);
    const priorityClass = getPriorityClass(priority);
    const stateClass = getStateClass(getNormalizedState(item));
    return `
      <div class="work-item-card ${isSelected ? "selected" : ""} ${stateClass}" 
           data-id="${id}" 
           data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${typeIcon.class}">
            ${typeIcon.icon}
          </div>
          <div class="work-item-id">#${id}</div>
          <div class="work-item-priority ${priorityClass}">
            ${getPriorityIcon(priority).icon} ${getPriorityIcon(priority).label}
          </div>
        </div>
        
        <div class="work-item-content">
          <div class="work-item-title" title="${escapeHtml(title)}">
            ${escapeHtml(title)}
          </div>
          
          ${description ? `
            <div class="work-item-description">
              ${escapeHtml(description.substring(0, 120))}${description.length > 120 ? "..." : ""}
            </div>
          ` : ""}
          
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${escapeHtml(type)}</span>
              <span class="work-item-state state-${state.toLowerCase().replace(/\\s+/g, "-")}">${escapeHtml(state)}</span>
            </div>
            
            ${assignedTo !== "Unassigned" ? `
              <div class="work-item-assignee">
                <span class="assignee-icon">\u{1F464}</span>
                <span>${escapeHtml(assignedTo)}</span>
              </div>
            ` : ""}
            
            ${iterationPath ? `
              <div class="work-item-iteration">
                <span class="iteration-icon">\u{1F504}</span>
                <span>${escapeHtml(iterationPath.split("\\\\").pop() || iterationPath)}</span>
              </div>
            ` : ""}
            
            ${tags.length > 0 ? `
              <div class="work-item-tags">
                ${tags.slice(0, 3).map(
      (tag) => `
                  <span class="tag">${escapeHtml(tag)}</span>
                `
    ).join("")}
                ${tags.length > 3 ? `<span class="tag-overflow">+${tags.length - 3}</span>` : ""}
              </div>
            ` : ""}
          </div>
        </div>
        
        <div class="work-item-actions">
          ${currentTimer && Number(currentTimer.workItemId) === Number(id) ? `<button class="action-btn timer-btn" data-action="stopTimer" data-id="${id}" title="Start/Stop Timer">\u23F9\uFE0F</button>` : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">\u23F1\uFE0F</button>`}
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">\u{1F441}\uFE0F</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">\u270F\uFE0F</button>
        </div>
      </div>
    `;
  }).join("");
  updateStatusOverview(filteredItems);
}
function updateStatusOverview(items = workItems) {
  if (!elements.statusOverview) return;
  const statusCounts = items.reduce((acc, item) => {
    const status = getNormalizedState(item);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  elements.statusOverview.innerHTML = Object.entries(statusCounts).map(([status, count]) => {
    const stateClass = getStateClass(String(status));
    const rawTitle = status;
    return `
        <div class="status-badge ${stateClass}" data-status="${status}" title="${escapeHtml(
      String(rawTitle)
    )}">
          <span class="status-name">${status}</span>
          <span class="status-count">${count}</span>
        </div>
      `;
  }).join("");
}
function renderConnectionTabs() {
  const container = elements.connectionTabs;
  if (!container) return;
  if (!connections.length) {
    container.innerHTML = "";
    container.setAttribute("hidden", "");
    return;
  }
  container.removeAttribute("hidden");
  const activeId = activeConnectionId;
  container.innerHTML = connections.map((conn) => {
    const id = conn.id;
    const label = escapeHtml(conn.label || conn.project || conn.organization || id);
    const isActive = id === activeId;
    const metaParts = [];
    if (conn.organization) metaParts.push(conn.organization);
    if (conn.project && conn.project !== conn.label) metaParts.push(conn.project);
    const metaText = metaParts.length ? escapeHtml(metaParts.join(" / ")) : "";
    const ariaSelected = isActive ? "true" : "false";
    const tabIndex = isActive ? "0" : "-1";
    return `
        <button
          class="connection-tab${isActive ? " active" : ""}"
          role="tab"
          aria-selected="${ariaSelected}"
          tabindex="${tabIndex}"
          data-connection-id="${escapeHtml(id)}"
        >
          <span>${label}</span>
          ${metaText ? `<span class="connection-meta">${metaText}</span>` : ""}
        </button>
      `;
  }).join("");
}
function selectConnection(connectionId, options = {}) {
  if (!connectionId || typeof connectionId !== "string") return;
  const trimmed = connectionId.trim();
  if (!trimmed) return;
  const previousConnectionId = activeConnectionId;
  const changed = previousConnectionId !== trimmed;
  if (changed && previousConnectionId) {
    persistCurrentFilterState();
  }
  activeConnectionId = trimmed;
  getFilterStateForConnection(trimmed);
  renderConnectionTabs();
  const cachedItems = workItemsByConnection.get(trimmed);
  const cachedFallback = fallbackNotices.get(trimmed) || null;
  fallbackNotice = cachedFallback;
  if (cachedItems) {
    isLoading = false;
    handleWorkItemsLoaded(cachedItems, trimmed, { fromCache: true });
  } else if (changed) {
    isLoading = true;
    showLoadingState();
  } else if (cachedFallback) {
    isLoading = false;
    renderWorkItems();
  }
  if (!options.fromMessage) {
    postMessage({ type: "setActiveConnection", connectionId: trimmed });
  }
}
function setupMessageHandling() {
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "workItemsLoaded":
        fallbackNotice = null;
        handleWorkItemsLoaded(message.workItems || [], message.connectionId);
        break;
      case "workItemsFallback":
        handleWorkItemsFallback(message);
        break;
      case "copilotPromptCopied": {
        const id = message.workItemId;
        setComposeStatus(
          "Copilot prompt copied to clipboard. Paste into Copilot chat to generate a comment."
        );
        setTimeout(() => {
          setComposeStatus(null);
        }, 3500);
        break;
      }
      case "stopAndApplyResult": {
        const id = message.workItemId;
        const hours = message.hours;
        setComposeStatus(`Applied ${hours.toFixed(2)} hours to work item #${id}.`);
        try {
          if (typeof id === "number") removeDraftForWorkItem(id);
        } catch (e) {
          console.warn("[webview] Failed to remove persisted draft after apply", e);
        }
        setTimeout(() => {
          hideComposePanel({ clearDraft: true });
        }, 3500);
        break;
      }
      case "addCommentResult": {
        const id = typeof message.workItemId === "number" ? message.workItemId : null;
        if (message?.success === false) {
          const errorMessage = typeof message.error === "string" && message.error.trim().length > 0 ? message.error.trim() : "Failed to add comment.";
          setComposeStatus(errorMessage);
          break;
        }
        if (id) {
          try {
            removeDraftForWorkItem(id);
          } catch (e) {
            console.warn("[webview] Failed to clear persisted draft after comment", e);
          }
        }
        setComposeStatus(id ? `Comment added to work item #${id}.` : "Comment added successfully.");
        setTimeout(() => {
          hideComposePanel({ clearDraft: true });
        }, 3e3);
        break;
      }
      case "workItemsError":
        handleWorkItemsError(message.error);
        break;
      case "timerUpdate":
        handleTimerUpdate(message.timer);
        break;
      case "toggleKanbanView":
        handleToggleKanbanView();
        break;
      case "selfTestPing":
        handleSelfTestPing(message.nonce);
        break;
      case "workItemTypeOptions": {
        const connectionId = normalizeConnectionId(message.connectionId) ?? activeConnectionId;
        const incoming = Array.isArray(message.types) ? message.types.map((value) => typeof value === "string" ? value.trim() : "").filter((value) => value.length > 0) : [];
        if (!connectionId) {
          break;
        }
        setTypeOptionsForConnection(connectionId, incoming, { merge: true });
        if (connectionId === activeConnectionId) {
          populateFilterDropdowns(connectionId);
          applyFilterStateToUi(connectionId);
          applyFilters();
        }
        break;
      }
      case "connectionsUpdate": {
        const list = Array.isArray(message.connections) ? message.connections.map((entry) => {
          const id = typeof entry?.id === "string" ? entry.id.trim() : "";
          if (!id) return null;
          const labelCandidate = typeof entry?.label === "string" && entry.label.trim().length > 0 ? entry.label.trim() : typeof entry?.project === "string" && entry.project.trim().length > 0 ? entry.project.trim() : id;
          return {
            id,
            label: labelCandidate,
            organization: typeof entry?.organization === "string" && entry.organization.trim().length > 0 ? entry.organization.trim() : void 0,
            project: typeof entry?.project === "string" && entry.project.trim().length > 0 ? entry.project.trim() : void 0
          };
        }).filter((entry) => entry !== null) : [];
        connections = list;
        const validIds = new Set(list.map((conn) => conn.id));
        Array.from(workItemsByConnection.keys()).forEach((id) => {
          if (!validIds.has(id)) {
            workItemsByConnection.delete(id);
            fallbackNotices.delete(id);
            typeOptionsByConnection.delete(id);
            filterStateByConnection.delete(id);
          }
        });
        const nextActiveId = typeof message.activeConnectionId === "string" && message.activeConnectionId.trim().length > 0 ? message.activeConnectionId.trim() : list.length > 0 ? list[0].id : null;
        if (nextActiveId) {
          selectConnection(nextActiveId, { fromMessage: true });
        } else {
          activeConnectionId = null;
          workItems = [];
          fallbackNotice = null;
          renderConnectionTabs();
          renderWorkItems();
        }
        break;
      }
      default:
        console.log("[webview] Unknown message type:", message.type);
    }
  });
}
function getComposeSubmitLabel(mode) {
  return mode === "addComment" ? "Add Comment" : "Stop & Apply";
}
function updateComposeToggle(expanded) {
  const toggleBtn = elements.toggleSummaryBtn;
  if (!toggleBtn) return;
  toggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
  toggleBtn.textContent = expanded ? "Compose Comment \u25B4" : "Compose Comment \u25BE";
}
function updateComposeSubmitLabel() {
  if (elements.submitComposeBtn) {
    elements.submitComposeBtn.textContent = getComposeSubmitLabel(composeState?.mode ?? null);
  }
}
function setComposeStatus(message) {
  if (!elements.summaryStatus) return;
  if (typeof message === "string" && message.trim().length > 0) {
    elements.summaryStatus.textContent = message;
  } else {
    elements.summaryStatus.textContent = "";
  }
}
function showComposePanel(options) {
  composeState = {
    mode: options.mode,
    workItemId: typeof options.workItemId === "number" && Number.isFinite(options.workItemId) ? options.workItemId : null
  };
  if (elements.summarySection) {
    elements.summarySection.removeAttribute("hidden");
    elements.summarySection.dataset.mode = options.mode;
    if (composeState?.workItemId) {
      elements.summarySection.dataset.workItemId = String(composeState.workItemId);
    } else {
      delete elements.summarySection.dataset.workItemId;
    }
  }
  const expand = options.expand !== false;
  if (elements.summaryContainer) {
    if (expand) {
      elements.summaryContainer.removeAttribute("hidden");
    }
  }
  updateComposeToggle(expand);
  updateComposeSubmitLabel();
  const workItemId = composeState.workItemId;
  if (typeof workItemId === "number" && Number.isFinite(workItemId)) {
    selectWorkItem(String(workItemId));
  }
  const textarea = elements.draftSummary;
  if (textarea) {
    let draftValue = null;
    if (typeof options.presetText === "string") {
      draftValue = options.presetText;
    } else if (workItemId) {
      const persisted = loadDraftForWorkItem(workItemId);
      if (persisted !== null) {
        draftValue = persisted;
      }
    }
    textarea.value = draftValue ?? "";
    if (options.focus !== false) {
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      });
    }
  }
  setComposeStatus(options.message);
}
function hideComposePanel(options) {
  composeState = null;
  if (elements.summaryContainer) {
    elements.summaryContainer.setAttribute("hidden", "");
  }
  if (elements.summarySection) {
    elements.summarySection.setAttribute("hidden", "");
    delete elements.summarySection.dataset.mode;
    delete elements.summarySection.dataset.workItemId;
  }
  updateComposeToggle(false);
  updateComposeSubmitLabel();
  setComposeStatus(null);
  if (options?.clearDraft && elements.draftSummary) {
    elements.draftSummary.value = "";
  }
}
function requestWorkItems() {
  if (isLoading) return;
  isLoading = true;
  showLoadingState();
  postMessage({ type: "getWorkItems" });
}
function showLoadingState() {
  if (!elements.workItemsContainer) return;
  preserveScroll("both", () => {
    elements.workItemsContainer.innerHTML = `
      <div class="loading">
        <div>Loading work items...</div>
      </div>
    `;
  });
}
function populateFilterDropdowns(connectionId) {
  const targetConnectionId = connectionId ?? activeConnectionId;
  const itemsSource = targetConnectionId && targetConnectionId !== activeConnectionId ? workItemsByConnection.get(targetConnectionId) ?? [] : workItems;
  if (elements.sprintFilter) {
    const sprints = /* @__PURE__ */ new Set();
    itemsSource.forEach((item) => {
      const path = (item.iterationPath || item.fields?.["System.IterationPath"] || "").toString();
      if (!path) return;
      const sprintName = path.split("\\").pop() || path;
      sprints.add(sprintName);
    });
    elements.sprintFilter.innerHTML = '<option value="">All Sprints</option>' + Array.from(sprints).sort((a, b) => a.localeCompare(b)).map((sprint) => `<option value="${escapeHtml(sprint)}">${escapeHtml(sprint)}</option>`).join("");
  }
  if (elements.typeFilter) {
    const types = /* @__PURE__ */ new Set();
    getTypeOptionsForConnection(targetConnectionId).forEach((type) => {
      if (typeof type === "string" && type.trim().length > 0) types.add(type.trim());
    });
    itemsSource.forEach((item) => {
      const t = (item.type || item.fields?.["System.WorkItemType"] || "").toString();
      if (t.trim()) types.add(t.trim());
    });
    elements.typeFilter.innerHTML = '<option value="">All Types</option>' + Array.from(types).sort((a, b) => a.localeCompare(b)).map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("");
  }
  if (elements.assignedToFilter) {
    const assignees = /* @__PURE__ */ new Set();
    itemsSource.forEach((item) => {
      let a = item.assignedTo ?? item.fields?.["System.AssignedTo"];
      if (a && typeof a === "object") {
        a = (a.displayName || a.uniqueName || a.name || "").toString();
      }
      a = (a || "").toString();
      if (a && a !== "Unassigned") assignees.add(a);
    });
    elements.assignedToFilter.innerHTML = '<option value="">All Assignees</option>' + Array.from(assignees).sort((a, b) => a.localeCompare(b)).map(
      (assignee) => `<option value="${escapeHtml(assignee)}">${escapeHtml(assignee)}</option>`
    ).join("");
  }
}
function handleWorkItemsLoaded(items, connectionId, options = {}) {
  const trimmedId = typeof connectionId === "string" ? connectionId.trim() : "";
  const fromCache = options.fromCache === true;
  if (trimmedId) {
    workItemsByConnection.set(trimmedId, items);
    if (!fromCache) {
      fallbackNotices.delete(trimmedId);
    }
  }
  if (!activeConnectionId && trimmedId) {
    activeConnectionId = trimmedId;
    renderConnectionTabs();
  }
  const targetId = trimmedId || activeConnectionId || null;
  const connectionKey = trimmedId || activeConnectionId || null;
  if (connectionKey) {
    setTypeOptionsForConnection(connectionKey, extractWorkItemTypes(items));
  }
  const shouldUpdateUi = !trimmedId || targetId === activeConnectionId || !activeConnectionId;
  if (shouldUpdateUi) {
    if (!activeConnectionId && targetId) {
      activeConnectionId = targetId;
      renderConnectionTabs();
    }
    searchHaystackCache = /* @__PURE__ */ new WeakMap();
    workItems = items;
    isLoading = false;
    if (activeConnectionId) {
      fallbackNotice = fallbackNotices.get(activeConnectionId) || null;
    }
    populateFilterDropdowns(activeConnectionId ?? void 0);
    if (activeConnectionId) {
      applyFilterStateToUi(activeConnectionId);
    }
    renderWorkItems();
  }
}
function handleWorkItemsFallback(message) {
  const original = message?.originalQuery ? String(message.originalQuery) : "Configured Query";
  const fallback = message?.fallbackQuery ? String(message.fallbackQuery) : "My Work Items";
  const defaultQuery = message?.defaultQuery ? String(message.defaultQuery) : void 0;
  const fetchedCount = typeof message?.fetchedCount === "number" ? Number(message.fetchedCount) : void 0;
  const identityMeta = message?.fallbackIdentity;
  let identity;
  if (identityMeta && typeof identityMeta === "object") {
    identity = {
      id: typeof identityMeta.id === "string" ? identityMeta.id : void 0,
      displayName: typeof identityMeta.displayName === "string" ? identityMeta.displayName : void 0,
      uniqueName: typeof identityMeta.uniqueName === "string" ? identityMeta.uniqueName : void 0
    };
  }
  const assignees = Array.isArray(message?.assignees) ? message.assignees.map((value) => typeof value === "string" ? value.trim() : "").filter((value) => value.length > 0) : void 0;
  const notice = {
    originalQuery: original,
    fallbackQuery: fallback,
    defaultQuery,
    fetchedCount,
    fallbackIdentity: identity,
    assignees
  };
  const connectionId = typeof message?.connectionId === "string" ? message.connectionId.trim() : "";
  if (connectionId) {
    fallbackNotices.set(connectionId, notice);
    if (!activeConnectionId) {
      activeConnectionId = connectionId;
      renderConnectionTabs();
    }
    if (connectionId === activeConnectionId) {
      fallbackNotice = notice;
      renderWorkItems();
    }
  } else {
    fallbackNotice = notice;
    renderWorkItems();
  }
}
function handleWorkItemsError(error) {
  console.error("[webview] Work items error:", error);
  isLoading = false;
  if (!elements.workItemsContainer) return;
  elements.workItemsContainer.innerHTML = `
    <div class="error">
      <div><strong>Error loading work items:</strong></div>
      <div>${escapeHtml(error)}</div>
      <button class="btn" onclick="requestWorkItems()" style="margin-top: 0.5rem;">Retry</button>
    </div>
  `;
}
function getWorkItemTypeIcon(type) {
  const typeMap = {
    Bug: { icon: "\u{1F41B}", class: "type-bug" },
    Task: { icon: "\u{1F4CB}", class: "type-task" },
    "User Story": { icon: "\u{1F4D6}", class: "type-story" },
    Feature: { icon: "\u2B50", class: "type-feature" },
    Epic: { icon: "\u{1F3AF}", class: "type-epic" },
    Issue: { icon: "\u2757", class: "type-issue" },
    "Test Case": { icon: "\u{1F9EA}", class: "type-test" },
    "Product Backlog Item": { icon: "\u{1F4C4}", class: "type-pbi" }
  };
  return typeMap[type] || { icon: "\u{1F4DD}", class: "type-default" };
}
function getPriorityClass(priority) {
  if (priority === 1) return "priority-1";
  if (priority === 2) return "priority-2";
  if (priority === 3) return "priority-3";
  if (priority === 4) return "priority-4";
  return "priority-default";
}
function getPriorityIcon(priority) {
  if (priority === 0) return { icon: "\u{1F534}", label: "Critical" };
  if (priority === 1) return { icon: "\u{1F7E1}", label: "High" };
  if (priority === 2) return { icon: "\u{1F7E2}", label: "Medium" };
  if (priority === 3) return { icon: "\u{1F535}", label: "Low" };
  if (priority === 4) return { icon: "\u{1F7E3}", label: "Lowest" };
  return { icon: "\u{1F7E2}", label: "Medium" };
}
function getStateClass(state) {
  const stateClassMap = {
    New: "state-new",
    Active: "state-active",
    Resolved: "state-resolved",
    Closed: "state-closed",
    Removed: "state-removed",
    Done: "state-done",
    "To Do": "state-todo",
    Doing: "state-doing",
    "In Progress": "state-inprogress",
    "Code Review": "state-review",
    Testing: "state-testing"
  };
  return stateClassMap[state] || "state-default";
}
function buildSearchHaystack(item) {
  const parts = [];
  const seenObjects = /* @__PURE__ */ new WeakSet();
  const maxDepth = 5;
  const pushString = (value) => {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      parts.push(trimmed.toLowerCase());
    }
  };
  const visit = (value, depth = 0) => {
    if (value === null || value === void 0) return;
    if (typeof value === "string") {
      pushString(value);
      return;
    }
    if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
      pushString(String(value));
      return;
    }
    if (value instanceof Date) {
      pushString(value.toISOString());
      return;
    }
    if (typeof value === "symbol") {
      pushString(value.toString());
      return;
    }
    if (typeof value === "object") {
      if (seenObjects.has(value)) return;
      seenObjects.add(value);
      if (depth >= maxDepth) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => visit(entry, depth + 1));
        return;
      }
      const identityKeys = [
        "displayName",
        "uniqueName",
        "name",
        "fullName",
        "mailAddress",
        "email",
        "userPrincipalName",
        "upn",
        "descriptor",
        "text",
        "value",
        "title"
      ];
      identityKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          visit(value[key], depth + 1);
        }
      });
      Object.keys(value).forEach((key) => {
        if (key === "__proto__") return;
        visit(value[key], depth + 1);
      });
      return;
    }
  };
  visit(item);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
function getSearchHaystack(item) {
  if (!item || typeof item !== "object" && typeof item !== "function") {
    return typeof item === "string" ? item.toLowerCase() : String(item ?? "").toLowerCase();
  }
  const cached = searchHaystackCache.get(item);
  if (cached) return cached;
  const haystack = buildSearchHaystack(item);
  searchHaystackCache.set(item, haystack);
  return haystack;
}
function getVisibleItems() {
  const q = (elements.searchInput?.value || "").trim().toLowerCase();
  const sprint = elements.sprintFilter?.value || "";
  const type = elements.typeFilter?.value || "";
  const assignee = elements.assignedToFilter?.value || "";
  const exDone = !!elements.excludeDone?.checked;
  const exClosed = !!elements.excludeClosed?.checked;
  const exRemoved = !!elements.excludeRemoved?.checked;
  const exReview = !!elements.excludeInReview?.checked;
  const excludedStates = /* @__PURE__ */ new Set([
    ...exDone ? ["Done"] : [],
    ...exClosed ? ["Closed"] : [],
    ...exRemoved ? ["Removed"] : [],
    ...exReview ? ["Code Review"] : []
  ]);
  const byQuery = (item) => {
    if (!q) return true;
    const haystack = getSearchHaystack(item);
    return haystack.includes(q);
  };
  const bySprint = (item) => {
    if (!sprint) return true;
    const path = String(item.iterationPath ?? item.fields?.["System.IterationPath"] ?? "");
    const name = path.split("\\").pop() || path;
    return name === sprint;
  };
  const byType = (item) => {
    if (!type) return true;
    const t = String(item.type ?? item.fields?.["System.WorkItemType"] ?? "");
    return t === type;
  };
  const byAssignee = (item) => {
    if (!assignee) return true;
    let a = item.assignedTo ?? item.fields?.["System.AssignedTo"];
    if (a && typeof a === "object") a = a.displayName || a.uniqueName || a.name;
    return String(a || "") === assignee;
  };
  const byState = (item) => {
    const s = getNormalizedState(item);
    return !excludedStates.has(s);
  };
  return workItems.filter(
    (it) => byQuery(it) && bySprint(it) && byType(it) && byAssignee(it) && byState(it)
  );
}
function applyFilters() {
  persistCurrentFilterState();
  if (currentView === "kanban") renderKanbanView();
  else renderWorkItems();
}
function renderWorkItems() {
  const itemsToRender = getVisibleItems();
  console.log("[webview] renderWorkItems called, itemsToRender.length:", itemsToRender.length);
  if (!elements.workItemsContainer) return;
  const notice = fallbackNotice;
  let bannerHtml = "";
  if (notice) {
    const original = escapeHtml(String(notice.originalQuery || "Configured Query"));
    const fallback = escapeHtml(String(notice.fallbackQuery || "My Work Items"));
    const defaultQueryText = notice.defaultQuery ? ` (default query: ${escapeHtml(String(notice.defaultQuery))})` : "";
    const fetchedSnippet = typeof notice.fetchedCount === "number" ? ` ${notice.fetchedCount} work items loaded.` : "";
    const identity = notice.fallbackIdentity;
    const assignees = Array.isArray(notice.assignees) ? notice.assignees.filter((value) => typeof value === "string" && value.trim().length > 0) : [];
    let identityHtml = "";
    if (identity && (identity.displayName || identity.uniqueName || identity.id)) {
      const label = escapeHtml(
        identity.displayName || identity.uniqueName || identity.id || "the PAT owner"
      );
      identityHtml = `
        <div style="margin-top: 0.5rem; font-size: 0.85em; color: var(--vscode-descriptionForeground);">
          Results were loaded using the saved Personal Access Token for <strong>${label}</strong>.
          If this isn't you, update the PAT under Azure DevOps Integration settings.
        </div>`;
    } else if (assignees.length > 0) {
      const preview = assignees.slice(0, 3).map((value) => escapeHtml(value)).join(", ");
      const overflow = assignees.length > 3 ? ", \u2026" : "";
      identityHtml = `
        <div style="margin-top: 0.5rem; font-size: 0.85em; color: var(--vscode-descriptionForeground);">
          Work items in these fallback results are assigned to: ${preview}${overflow}
        </div>`;
    }
    bannerHtml = `
      <div class="info-banner" style="margin: 0 0 0.75rem 0; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--vscode-inputValidationInfoBorder, rgba(0, 122, 204, 0.6)); background: var(--vscode-inputValidationInfoBackground, rgba(0, 122, 204, 0.1));">
        <div style="font-weight: 600;">Showing fallback results</div>
        <div style="margin-top: 0.25rem;">No work items matched <code>${original}</code>. Loaded <code>${fallback}</code> instead.${defaultQueryText}${fetchedSnippet}</div>
        <div style="margin-top: 0.5rem; font-size: 0.85em; color: var(--vscode-descriptionForeground);">
          Update <strong>Azure DevOps Integration \u203A Default Query</strong> in settings to customize the default list.
        </div>
        ${identityHtml}
      </div>`;
  }
  if (itemsToRender.length === 0) {
    preserveScroll("y", () => {
      elements.workItemsContainer.innerHTML = `
        ${bannerHtml}
        <div class="status-message">
          <div>No work items found</div>
          <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (\u{1F504}) in the header to reload work items</div>
        </div>`;
    });
    return;
  }
  const getField = (item, field) => {
    if (item == null) return void 0;
    switch (field) {
      case "System.Id":
        return item.id ?? item.fields?.["System.Id"];
      case "System.Title":
        return item.title ?? item.fields?.["System.Title"];
      case "System.State":
        return item.state ?? item.fields?.["System.State"];
      case "System.WorkItemType":
        return item.type ?? item.fields?.["System.WorkItemType"];
      case "System.AssignedTo": {
        const a = item.assignedTo || item.fields?.["System.AssignedTo"];
        if (a && typeof a === "object") return a.displayName || a.uniqueName || a.name;
        return a;
      }
      case "System.Tags":
        return item.tags ? Array.isArray(item.tags) ? item.tags.join(";") : item.tags : item.fields?.["System.Tags"];
      case "Microsoft.VSTS.Common.Priority":
        return item.priority ?? item.fields?.["Microsoft.VSTS.Common.Priority"];
      default:
        return item[field] ?? item.fields?.[field];
    }
  };
  const html = itemsToRender.map((item) => {
    const idRaw = getField(item, "System.Id");
    const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
    const title = getField(item, "System.Title") || `Work Item #${id}`;
    const state = getField(item, "System.State") || "Unknown";
    const type = getField(item, "System.WorkItemType") || "Unknown";
    const assignedRaw = getField(item, "System.AssignedTo");
    const assignedTo = assignedRaw || "Unassigned";
    const priority = getField(item, "Microsoft.VSTS.Common.Priority") || 2;
    const tagsField = getField(item, "System.Tags");
    const tags = typeof tagsField === "string" ? tagsField.split(";").filter(Boolean) : Array.isArray(tagsField) ? tagsField : [];
    const iterationPath = getField(item, "System.IterationPath") || "";
    const description = item.description || item.fields?.["System.Description"] || "";
    const isSelected = selectedWorkItemId === id;
    const typeIcon = getWorkItemTypeIcon(String(type));
    const priorityClass = getPriorityClass(Number(priority));
    const stateClass = getStateClass(String(state));
    const hasActiveTimer = !!currentTimer && Number(currentTimer.workItemId) === Number(id);
    const timerDisplay = hasActiveTimer ? formatTimerDuration(currentTimer.elapsedSeconds || 0) : "";
    return `
      <div class="work-item-card ${isSelected ? "selected" : ""} ${stateClass} ${hasActiveTimer ? "has-active-timer" : ""}" data-id="${id}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
          <div class="work-item-id">#${id}</div>
          ${hasActiveTimer ? `<div class="timer-indicator" title="Timer running: ${timerDisplay}">\u23F1\uFE0F ${timerDisplay}</div>` : ""}
          <div class="work-item-priority ${priorityClass}">${getPriorityIcon(Number(priority)).icon} ${getPriorityIcon(Number(priority)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${escapeHtml(String(title))}">${escapeHtml(
      String(title)
    )}</div>
          ${description ? `<div class="work-item-description">${escapeHtml(
      String(description).substring(0, 120)
    )}${String(description).length > 120 ? "..." : ""}</div>` : ""}
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${escapeHtml(String(type))}</span>
              <span class="work-item-state state-${String(state).toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(String(state))}</span>
            </div>
            ${assignedTo && assignedTo !== "Unassigned" ? `<div class="work-item-assignee"><span class="assignee-icon">\u{1F464}</span><span>${escapeHtml(
      String(assignedTo)
    )}</span></div>` : ""}
            ${iterationPath ? `<div class="work-item-iteration"><span class="iteration-icon">\u{1F504}</span><span>${escapeHtml(
      String(iterationPath).split("\\").pop() || String(iterationPath)
    )}</span></div>` : ""}
            ${tags.length ? `<div class="work-item-tags">${tags.slice(0, 3).map(
      (t) => `<span class="work-item-tag">${escapeHtml(String(t).trim())}</span>`
    ).join("")}${tags.length > 3 ? `<span class="tag-overflow">+${tags.length - 3}</span>` : ""}</div>` : ""}
          </div>
        </div>
        <div class="work-item-actions">
          ${hasActiveTimer ? `<button class="action-btn timer-btn" data-action="stopTimer" data-id="${id}" title="Start/Stop Timer">\u23F9\uFE0F</button>` : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">\u23F1\uFE0F</button>`}
          <button class="action-btn comment-btn" data-action="addComment" data-id="${id}" title="Add Comment">\u{1F4AC}</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">\u{1F441}\uFE0F</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">\u270F\uFE0F</button>
        </div>
      </div>`;
  }).join("");
  preserveScroll("y", () => {
    elements.workItemsContainer.innerHTML = `${bannerHtml}${html}`;
  });
  updateStatusOverview(itemsToRender);
}
function updateViewToggle() {
  console.log("[webview] updateViewToggle called, currentView:", currentView);
  const viewToggleBtns = document.querySelectorAll(".view-toggle-btn");
  console.log("[webview] Found", viewToggleBtns.length, "view toggle buttons");
  if (viewToggleBtns.length === 0) {
    console.log("[webview] No view toggle buttons found, relying on sidebar controls");
    return;
  }
  viewToggleBtns.forEach((btn) => {
    const btnView = btn.dataset.view;
    if (btnView === currentView) {
      btn.classList.add("active");
      console.log("[webview] Set active:", btnView);
    } else {
      btn.classList.remove("active");
    }
  });
}
function renderKanbanView() {
  const itemsToRender = getVisibleItems();
  console.log("[webview] renderKanbanView called, itemsToRender.length:", itemsToRender.length);
  if (!elements.workItemsContainer) return;
  if (itemsToRender.length === 0) {
    elements.workItemsContainer.innerHTML = `
        <div class="status-message">
          <div>No work items found</div>
          <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">
            Use the refresh button (\u{1F504}) in the header to reload work items
          </div>
        </div>
      `;
    return;
  }
  const getField = (item, field) => {
    if (item == null) return void 0;
    switch (field) {
      case "System.Id":
        return item.id ?? item.fields?.["System.Id"];
      case "System.Title":
        return item.title ?? item.fields?.["System.Title"];
      case "System.State":
        return item.state ?? item.fields?.["System.State"];
      case "System.WorkItemType":
        return item.type ?? item.fields?.["System.WorkItemType"];
      case "System.AssignedTo": {
        const a = item.assignedTo || item.fields?.["System.AssignedTo"];
        if (a && typeof a === "object") return a.displayName || a.uniqueName || a.name;
        return a;
      }
      case "System.Tags":
        return item.tags ? Array.isArray(item.tags) ? item.tags.join(";") : item.tags : item.fields?.["System.Tags"];
      case "Microsoft.VSTS.Common.Priority":
        return item.priority ?? item.fields?.["Microsoft.VSTS.Common.Priority"];
      default:
        return item[field] ?? item.fields?.[field];
    }
  };
  const stateGroups = itemsToRender.reduce(
    (groups, item) => {
      let state = getField(item, "System.State") || "Unknown";
      if (typeof state !== "string") state = String(state ?? "Unknown");
      if (!groups[state]) groups[state] = [];
      groups[state].push(item);
      return groups;
    },
    {}
  );
  const stateOrder = [
    "New",
    "To Do",
    "Active",
    "In Progress",
    "Doing",
    "Code Review",
    "Testing",
    "Resolved",
    "Done",
    "Closed"
  ];
  const orderedStates = stateOrder.filter((state) => stateGroups[state]);
  Object.keys(stateGroups).forEach((state) => {
    if (!orderedStates.includes(state)) {
      orderedStates.push(state);
    }
  });
  const kanbanHtml = `
    <div class="kanban-board">
      ${orderedStates.map((state) => {
    const items = stateGroups[state];
    const stateClass = getStateClass(state);
    return `
          <div class="kanban-column">
            <div class="kanban-column-header ${stateClass}">
              <h3>${state}</h3>
              <span class="item-count">${items.length}</span>
            </div>
            <div class="kanban-column-content">
              ${items.map((item) => {
      const idRaw = getField(item, "System.Id");
      const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
      const title = getField(item, "System.Title") || `Work Item #${id}`;
      const type = getField(item, "System.WorkItemType") || "Unknown";
      const assignedRaw = getField(item, "System.AssignedTo");
      const assignedTo = assignedRaw || "Unassigned";
      const priority = getField(item, "Microsoft.VSTS.Common.Priority") || 2;
      const tagsField = getField(item, "System.Tags");
      const tags = typeof tagsField === "string" ? tagsField.split(";").filter(Boolean) : Array.isArray(tagsField) ? tagsField : [];
      const isSelected = selectedWorkItemId === id;
      const typeIcon = getWorkItemTypeIcon(type);
      const priorityClass = getPriorityClass(Number(priority));
      const hasActiveTimer = !!currentTimer && Number(currentTimer.workItemId) === Number(id);
      const timerDisplay = hasActiveTimer ? formatTimerDuration(currentTimer.elapsedSeconds || 0) : "";
      let shortAssigned = assignedTo;
      if (typeof shortAssigned === "string" && shortAssigned.includes(" "))
        shortAssigned = shortAssigned.split(" ")[0];
      return `
                  <div class="kanban-card ${isSelected ? "selected" : ""} ${hasActiveTimer ? "has-active-timer" : ""}" data-id="${id}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
                      <div class="work-item-id">#${id}</div>
                      ${hasActiveTimer ? `<div class="timer-indicator" title="Timer running: ${timerDisplay}">\u23F1\uFE0F ${timerDisplay}</div>` : ""}
                      <div class="work-item-priority ${priorityClass}">${getPriorityIcon(Number(priority)).icon} ${getPriorityIcon(Number(priority)).label}</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${escapeHtml(
        String(title)
      )}">${escapeHtml(String(title))}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${escapeHtml(String(type))}</span>
                        ${assignedTo && assignedTo !== "Unassigned" ? `<span class="work-item-assignee"><span class="assignee-icon">\u{1F464}</span>${escapeHtml(
        String(shortAssigned)
      )}</span>` : ""}
                      </div>
                      ${tags.length ? `<div class="work-item-tags">${tags.slice(0, 2).map(
        (t) => `<span class="work-item-tag">${escapeHtml(
          String(t).trim()
        )}</span>`
      ).join("")}${tags.length > 2 ? `<span class="tag-overflow">+${tags.length - 2}</span>` : ""}</div>` : ""}
                    </div>
                    <div class="kanban-card-actions">
                      ${hasActiveTimer ? `<button class="action-btn timer-btn" data-action="stopTimer" data-id="${id}" title="Start/Stop Timer">\u23F9\uFE0F</button>` : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">\u23F1\uFE0F</button>`}
                      <button class="action-btn comment-btn" data-action="addComment" data-id="${id}" title="Add Comment">\u{1F4AC}</button>
                      <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">\u270F\uFE0F</button>
                      <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">\u{1F441}\uFE0F</button>
                    </div>
                  </div>`;
    }).join("")}
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;
  const prevLeft = elements.workItemsContainer.querySelector(".kanban-board")?.scrollLeft ?? 0;
  elements.workItemsContainer.innerHTML = kanbanHtml;
  try {
    requestAnimationFrame(() => {
      const board = elements.workItemsContainer.querySelector(
        ".kanban-board"
      );
      if (board) board.scrollLeft = prevLeft;
    });
  } catch {
    const board = elements.workItemsContainer.querySelector(".kanban-board");
    if (board) board.scrollLeft = prevLeft;
  }
  updateStatusOverview(itemsToRender);
}
function handleTimerUpdate(timer) {
  const previousTimer = currentTimer;
  currentTimer = timer;
  if (timer) {
    lastTimerSnapshot = timer;
    updateTimerDisplay();
    updateTimerButtonStates();
    if (currentView === "kanban") {
      renderKanbanView();
    } else {
      renderWorkItems();
    }
    try {
      const workItemId = timer.workItemId;
      const persisted = workItemId ? loadDraftForWorkItem(workItemId) : null;
      if (persisted && persisted.length > 0) {
        if (elements.draftSummary) elements.draftSummary.value = persisted;
      } else if (elements.draftSummary && elements.draftSummary.value.trim() === "") {
        const seconds = timer.elapsedSeconds || 0;
        const hours = seconds / 3600 || 0;
        const title = timer.workItemTitle || `#${timer.workItemId}`;
        elements.draftSummary.value = `Worked approximately ${hours.toFixed(
          2
        )} hours on ${title}. Provide a short summary of what you accomplished.`;
      }
    } catch (e) {
      console.warn("[webview] Failed to prefill summary", e);
    }
  } else {
    updateTimerDisplay();
    updateTimerButtonStates();
    if (currentView === "kanban") {
      renderKanbanView();
    } else {
      renderWorkItems();
    }
    const snapshot = previousTimer || lastTimerSnapshot;
    lastTimerSnapshot = null;
    const id = snapshot && snapshot.workItemId ? Number(snapshot.workItemId) : null;
    if (id && Number.isFinite(id)) {
      let presetText;
      try {
        const persisted = loadDraftForWorkItem(id);
        if (persisted !== null) {
          presetText = persisted;
        }
      } catch {
      }
      if (!presetText) {
        const seconds = typeof snapshot?.elapsedSeconds === "number" ? snapshot.elapsedSeconds : typeof snapshot?.duration === "number" ? snapshot.duration : 0;
        const hours = seconds / 3600 || 0;
        const title = snapshot?.workItemTitle || `#${snapshot?.workItemId || id}`;
        presetText = `Worked approximately ${hours.toFixed(
          2
        )} hours on ${title}. Summarize the key updates you completed.`;
      }
      showComposePanel({
        mode: "timerStop",
        workItemId: id,
        presetText,
        message: `Timer stopped for work item #${id}. Review the comment and use Stop & Apply to post updates.`
      });
    } else if (composeState?.mode === "timerStop") {
      hideComposePanel();
    }
  }
}
function saveDraftForWorkItem(workItemId, text) {
  try {
    localStorage.setItem(`azuredevops.draft.${workItemId}`, text || "");
    console.log("[webview] Saved draft for work item", workItemId);
  } catch (e) {
    console.warn("[webview] Failed to save draft to localStorage", e);
  }
}
function loadDraftForWorkItem(workItemId) {
  try {
    const v = localStorage.getItem(`azuredevops.draft.${workItemId}`);
    return v;
  } catch (e) {
    console.warn("[webview] Failed to load draft from localStorage", e);
    return null;
  }
}
function removeDraftForWorkItem(workItemId) {
  try {
    localStorage.removeItem(`azuredevops.draft.${workItemId}`);
    console.log("[webview] Removed draft for work item", workItemId);
  } catch (e) {
    console.warn("[webview] Failed to remove draft from localStorage", e);
  }
}
(function wireDraftAutosave() {
  const attemptWire = () => {
    if (!elements.draftSummary) return false;
    const ta = elements.draftSummary;
    ta.addEventListener("input", () => {
      const workItemId = currentTimer ? currentTimer.workItemId : selectedWorkItemId;
      if (!workItemId) return;
      saveDraftForWorkItem(workItemId, ta.value);
    });
    ta.addEventListener("blur", () => {
      const workItemId = currentTimer ? currentTimer.workItemId : selectedWorkItemId;
      if (!workItemId) return;
      saveDraftForWorkItem(workItemId, ta.value);
    });
    return true;
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(attemptWire, 0));
  } else {
    setTimeout(attemptWire, 0);
  }
})();
(function watchSelectionLoadDraft() {
  let lastSelected = null;
  setInterval(() => {
    if (selectedWorkItemId && selectedWorkItemId !== lastSelected) {
      lastSelected = selectedWorkItemId;
      try {
        const persisted = loadDraftForWorkItem(selectedWorkItemId);
        if (persisted !== null && elements.draftSummary) {
          elements.draftSummary.value = persisted;
        }
      } catch (e) {
      }
    }
  }, 500);
})();
(function hookClearOnApply() {
  const originalHandler = window.addEventListener;
})();
window.requestWorkItems = requestWorkItems;
var style = document.createElement("style");
style.textContent = `
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;
document.head.appendChild(style);
function startApp() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
(function setupActivityDetection() {
  let lastActivityTime = Date.now();
  let activityPingTimer;
  function sendActivityPing() {
    if (activityPingTimer) return;
    activityPingTimer = setTimeout(() => {
      postMessage({ type: "activity" });
      activityPingTimer = void 0;
    }, 500);
  }
  const activityEvents = ["click", "keydown", "scroll", "mousemove", "touchstart", "focus"];
  activityEvents.forEach((eventType) => {
    document.addEventListener(
      eventType,
      () => {
        const now = Date.now();
        if (now - lastActivityTime > 1e3) {
          lastActivityTime = now;
          sendActivityPing();
        }
      },
      { passive: true }
    );
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      sendActivityPing();
    }
  });
  sendActivityPing();
})();
startApp();
//# sourceMappingURL=main.js.map
