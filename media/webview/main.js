(function () {
  const n = document.createElement('link').relList;
  if (n && n.supports && n.supports('modulepreload')) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) a(r);
  new MutationObserver((r) => {
    for (const o of r)
      if (o.type === 'childList')
        for (const i of o.addedNodes) i.tagName === 'LINK' && i.rel === 'modulepreload' && a(i);
  }).observe(document, { childList: !0, subtree: !0 });
  function t(r) {
    const o = {};
    return (
      r.integrity && (o.integrity = r.integrity),
      r.referrerPolicy && (o.referrerPolicy = r.referrerPolicy),
      r.crossOrigin === 'use-credentials'
        ? (o.credentials = 'include')
        : r.crossOrigin === 'anonymous'
        ? (o.credentials = 'omit')
        : (o.credentials = 'same-origin'),
      o
    );
  }
  function a(r) {
    if (r.ep) return;
    r.ep = !0;
    const o = t(r);
    fetch(r.href, o);
  }
})();
(() => {
  try {
    return window.vscode || acquireVsCodeApi();
  } catch (e) {
    return console.error('[webview] Failed to acquire VS Code API', e), null;
  }
})();
let m = [],
  k = null,
  h = null,
  $ = !1,
  g = 'list';
const s = {
  searchInput: null,
  statusOverview: null,
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
  draftSummary: null,
  summaryContainer: null,
  toggleSummaryBtn: null,
  summaryStatus: null,
};
function W() {
  (s.searchInput = document.getElementById('searchInput')),
    (s.statusOverview = document.getElementById('statusOverview')),
    (s.sprintFilter = document.getElementById('sprintFilter')),
    (s.typeFilter = document.getElementById('typeFilter')),
    (s.assignedToFilter = document.getElementById('assignedToFilter')),
    (s.excludeDone = document.getElementById('excludeDone')),
    (s.excludeClosed = document.getElementById('excludeClosed')),
    (s.excludeRemoved = document.getElementById('excludeRemoved')),
    (s.excludeInReview = document.getElementById('excludeInReview')),
    (s.workItemsContainer = document.getElementById('workItemsContainer')),
    (s.timerContainer = document.getElementById('timerContainer')),
    (s.timerDisplay = document.getElementById('timerDisplay')),
    (s.timerInfo = document.getElementById('timerInfo'));
  const e = document.getElementById('startTimerBtn'),
    n = document.getElementById('pauseTimerBtn'),
    t = document.getElementById('stopTimerBtn');
  if (
    ((s.startTimerBtn = e),
    (s.pauseTimerBtn = n),
    (s.stopTimerBtn = t),
    (s.content = document.getElementById('content')),
    (s.draftSummary = document.getElementById('draftSummary')),
    (s.summaryContainer = document.getElementById('summaryContainer')),
    (s.toggleSummaryBtn = document.getElementById('toggleSummaryBtn')),
    (s.summaryStatus = document.getElementById('summaryStatus')),
    !s.workItemsContainer)
  ) {
    console.error('[webview] Critical: workItemsContainer element not found');
    return;
  }
  console.log('[webview] Initializing webview...'),
    U(),
    j(),
    console.log('[webview] Setting timer visibility to false during init'),
    updateTimerVisibility(!1),
    postMessage({ type: 'webviewReady' }),
    H();
}
function U() {
  document.addEventListener('click', function (e) {
    const n = e.target.closest('.status-badge');
    if (n) {
      const i = n.getAttribute('data-status');
      i && O(i);
      return;
    }
    const t = e.target.closest('[data-action="selectWorkItem"]');
    if (t && !e.target.closest('button')) {
      const i = parseInt(t.getAttribute('data-id') || '0');
      selectWorkItem(i.toString());
      return;
    }
    const a = e.target.closest('button[data-action]');
    if (!a) return;
    e.stopPropagation();
    const r = a.getAttribute('data-action'),
      o = a.getAttribute('data-id') ? parseInt(a.getAttribute('data-id') || '0') : null;
    switch ((console.log('[webview] Button clicked:', r, 'id:', o), r)) {
      case 'refresh':
        H();
        break;
      case 'toggleSummary': {
        const i = s.summaryContainer,
          l = s.toggleSummaryBtn;
        if (!i) return;
        i.hasAttribute('hidden')
          ? (i.removeAttribute('hidden'),
            l && l.setAttribute('aria-expanded', 'true'),
            l && (l.textContent = 'Compose Summary ▴'))
          : (i.setAttribute('hidden', ''),
            l && l.setAttribute('aria-expanded', 'false'),
            l && (l.textContent = 'Compose Summary ▾'));
        break;
      }
      case 'generateCopilotPrompt': {
        const i = o || (k ? k.workItemId : void 0),
          l = s.draftSummary ? s.draftSummary.value : '';
        if (!i) {
          console.warn('[webview] generateCopilotPrompt: no work item id available'),
            s.summaryStatus &&
              (s.summaryStatus.textContent = 'No work item selected to generate prompt.');
          return;
        }
        s.summaryStatus &&
          (s.summaryStatus.textContent = 'Preparing Copilot prompt and copying to clipboard...'),
          postMessage({ type: 'generateCopilotPrompt', workItemId: i, draftSummary: l });
        break;
      }
      case 'stopAndApply': {
        const i = s.draftSummary ? s.draftSummary.value : '';
        s.summaryStatus && (s.summaryStatus.textContent = 'Stopping timer and applying updates...'),
          postMessage({ type: 'stopAndApply', comment: i });
        break;
      }
      case 'createWorkItem':
        postMessage({ type: 'createWorkItem' });
        break;
      case 'toggleView': {
        console.log('[webview] toggleView clicked');
        const l = e.target.dataset.view;
        console.log('[webview] View button clicked:', l, 'Current view:', g),
          l &&
            l !== g &&
            ((g = l),
            P(),
            console.log('[webview] Switching to view:', g),
            g === 'kanban' ? D() : F());
        break;
      }
      case 'toggleKanban':
        (g = g === 'list' ? 'kanban' : 'list'), P(), g === 'kanban' ? D() : F();
        break;
      case 'search': {
        const i = s.searchInput?.value;
        i && postMessage({ type: 'search', query: i });
        break;
      }
      case 'pauseTimer':
        postMessage({ type: 'pauseTimer' });
        break;
      case 'resumeTimer':
        postMessage({ type: 'resumeTimer' });
        break;
      case 'stopTimer':
        postMessage({ type: 'stopTimer' });
        break;
      case 'startTimer':
        o && postMessage({ type: 'startTimer', workItemId: o });
        break;
      case 'createBranch':
        o && postMessage({ type: 'createBranch', id: o });
        break;
      case 'openInBrowser':
        o && postMessage({ type: 'openInBrowser', id: o });
        break;
      case 'copyId':
        o && postMessage({ type: 'copyId', id: o });
        break;
      case 'viewDetails':
        o && postMessage({ type: 'viewWorkItem', workItemId: o });
        break;
      case 'editWorkItem':
        o && postMessage({ type: 'editWorkItemInEditor', workItemId: o });
        break;
    }
  }),
    document.addEventListener('change', function (e) {
      const n = e.target,
        t = n.closest('select[data-action]');
      if (t) {
        t.getAttribute('data-action') === 'applyFilters' && applyFilters();
        return;
      }
      const a = n.closest('input[data-action]');
      a &&
        a.type === 'checkbox' &&
        a.getAttribute('data-action') === 'applyFilters' &&
        applyFilters();
    }),
    s.searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const n = s.searchInput?.value;
        n && postMessage({ type: 'search', query: n });
      }
    });
}
function A(e) {
  if (!e) return 'Unknown';
  const n =
      e.state || e.fields?.['System.State'] || e['System.State'] || e.fields?.['System.State.name'],
    t = typeof n == 'string' && n.trim() ? n.trim() : '';
  if (!t) return 'Unknown';
  const a = {
      todo: 'To Do',
      'to do': 'To Do',
      new: 'New',
      active: 'Active',
      'in progress': 'In Progress',
      doing: 'In Progress',
      'doing ': 'In Progress',
      'code review': 'Code Review',
      testing: 'Testing',
      done: 'Done',
      resolved: 'Resolved',
      closed: 'Closed',
      removed: 'Removed',
    },
    r = t.toLowerCase();
  return a[r] || t;
}
function O(e) {
  const n = m.filter((t) => A(t) === e);
  s.searchInput && (s.searchInput.value = ''),
    s.sprintFilter && (s.sprintFilter.value = ''),
    s.typeFilter && (s.typeFilter.value = ''),
    s.assignedToFilter && (s.assignedToFilter.value = ''),
    (s.workItemsContainer.innerHTML = n
      .map((t) => {
        const a = t.id,
          r = t.title || `Work Item #${a}`,
          o = t.state || 'Unknown',
          i = t.type || 'Unknown',
          l = t.assignedTo || 'Unassigned',
          c = t.priority || 2,
          d = t.description || '',
          u = t.tags || [],
          p = t.iterationPath || '',
          b = h === a,
          y = M(i),
          w = L(c),
          v = C(A(t));
        return `
      <div class="work-item-card ${b ? 'selected' : ''} ${v}" 
           data-id="${a}" 
           data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${y.class}">
            ${y.icon}
          </div>
          <div class="work-item-id">#${a}</div>
          <div class="work-item-priority ${w}">
            ${S(c).icon} ${S(c).label}
          </div>
        </div>
        
        <div class="work-item-content">
          <div class="work-item-title" title="${escapeHtml(r)}">
            ${escapeHtml(r)}
          </div>
          
          ${
            d
              ? `
            <div class="work-item-description">
              ${escapeHtml(d.substring(0, 120))}${d.length > 120 ? '...' : ''}
            </div>
          `
              : ''
          }
          
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${escapeHtml(i)}</span>
              <span class="work-item-state state-${o
                .toLowerCase()
                .replace(/\\s+/g, '-')}">${escapeHtml(o)}</span>
            </div>
            
            ${
              l !== 'Unassigned'
                ? `
              <div class="work-item-assignee">
                <span class="assignee-icon">👤</span>
                <span>${escapeHtml(l)}</span>
              </div>
            `
                : ''
            }
            
            ${
              p
                ? `
              <div class="work-item-iteration">
                <span class="iteration-icon">🔄</span>
                <span>${escapeHtml(p.split('\\\\').pop() || p)}</span>
              </div>
            `
                : ''
            }
            
            ${
              u.length > 0
                ? `
              <div class="work-item-tags">
                ${u
                  .slice(0, 3)
                  .map(
                    (f) => `
                  <span class="tag">${escapeHtml(f)}</span>
                `
                  )
                  .join('')}
                ${u.length > 3 ? `<span class="tag-overflow">+${u.length - 3}</span>` : ''}
              </div>
            `
                : ''
            }
          </div>
        </div>
        
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${a}" title="Start Timer">
            ⏱️
          </button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${a}" title="View Details">
            👁️
          </button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${a}" title="Edit">
            ✏️
          </button>
        </div>
      </div>
    `;
      })
      .join('')),
    E(n);
}
function E(e = m) {
  if (!s.statusOverview) return;
  const n = e.reduce((t, a) => {
    const r = A(a);
    return (t[r] = (t[r] || 0) + 1), t;
  }, {});
  s.statusOverview.innerHTML = Object.entries(n)
    .map(([t, a]) => {
      const r = C(String(t)),
        o = t;
      return `
        <div class="status-badge ${r}" data-status="${t}" title="${escapeHtml(String(o))}">
          <span class="status-name">${t}</span>
          <span class="status-count">${a}</span>
        </div>
      `;
    })
    .join('');
}
function j() {
  window.addEventListener('message', (e) => {
    const n = e.data;
    switch (n.type) {
      case 'workItemsLoaded':
        K(n.workItems || []);
        break;
      case 'copilotPromptCopied': {
        n.workItemId,
          s.summaryStatus &&
            (s.summaryStatus.textContent =
              'Copilot prompt copied to clipboard. Paste into Copilot chat to generate a summary.'),
          setTimeout(() => {
            s.summaryStatus && (s.summaryStatus.textContent = '');
          }, 3500);
        break;
      }
      case 'stopAndApplyResult': {
        const t = n.workItemId,
          a = n.hours;
        s.summaryStatus &&
          (s.summaryStatus.textContent = `Applied ${a.toFixed(2)} hours to work item #${t}.`),
          s.draftSummary && (s.draftSummary.value = '');
        try {
          typeof t == 'number' && X(t);
        } catch (r) {
          console.warn('[webview] Failed to remove persisted draft after apply', r);
        }
        setTimeout(() => {
          s.summaryStatus && (s.summaryStatus.textContent = '');
        }, 4e3);
        break;
      }
      case 'workItemsError':
        G(n.error);
        break;
      case 'timerUpdate':
        J(n.timer);
        break;
      case 'toggleKanbanView':
        handleToggleKanbanView();
        break;
      case 'selfTestPing':
        handleSelfTestPing(n.nonce);
        break;
      default:
        console.log('[webview] Unknown message type:', n.type);
    }
  });
}
function H() {
  $ || (($ = !0), q(), postMessage({ type: 'getWorkItems' }));
}
function q() {
  s.workItemsContainer &&
    (s.workItemsContainer.innerHTML = `
    <div class="loading">
      <div>Loading work items...</div>
    </div>
  `);
}
function z() {
  if (s.sprintFilter) {
    const e = new Set();
    m.forEach((n) => {
      if (n.iterationPath) {
        const t = n.iterationPath.split('\\').pop() || n.iterationPath;
        e.add(t);
      }
    }),
      (s.sprintFilter.innerHTML =
        '<option value="">All Sprints</option>' +
        Array.from(e)
          .sort()
          .map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`)
          .join(''));
  }
  if (s.typeFilter) {
    const e = new Set();
    m.forEach((n) => {
      n.type && e.add(n.type);
    }),
      (s.typeFilter.innerHTML =
        '<option value="">All Types</option>' +
        Array.from(e)
          .sort()
          .map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`)
          .join(''));
  }
  if (s.assignedToFilter) {
    const e = new Set();
    m.forEach((n) => {
      n.assignedTo && n.assignedTo !== 'Unassigned' && e.add(n.assignedTo);
    }),
      (s.assignedToFilter.innerHTML =
        '<option value="">All Assignees</option>' +
        Array.from(e)
          .sort()
          .map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`)
          .join(''));
  }
}
function K(e) {
  console.log('[webview] handleWorkItemsLoaded called with', e.length, 'items:', e),
    ($ = !1),
    (m = e),
    console.log('[webview] After assignment, workItems.length:', m.length),
    z(),
    F();
}
function G(e) {
  console.error('[webview] Work items error:', e),
    ($ = !1),
    s.workItemsContainer &&
      (s.workItemsContainer.innerHTML = `
    <div class="error">
      <div><strong>Error loading work items:</strong></div>
      <div>${escapeHtml(e)}</div>
      <button class="btn" onclick="requestWorkItems()" style="margin-top: 0.5rem;">Retry</button>
    </div>
  `);
}
function M(e) {
  return (
    {
      Bug: { icon: '🐛', class: 'type-bug' },
      Task: { icon: '📋', class: 'type-task' },
      'User Story': { icon: '📖', class: 'type-story' },
      Feature: { icon: '⭐', class: 'type-feature' },
      Epic: { icon: '🎯', class: 'type-epic' },
      Issue: { icon: '❗', class: 'type-issue' },
      'Test Case': { icon: '🧪', class: 'type-test' },
      'Product Backlog Item': { icon: '📄', class: 'type-pbi' },
    }[e] || { icon: '📝', class: 'type-default' }
  );
}
function L(e) {
  return e === 1
    ? 'priority-1'
    : e === 2
    ? 'priority-2'
    : e === 3
    ? 'priority-3'
    : e === 4
    ? 'priority-4'
    : 'priority-default';
}
function S(e) {
  return e === 0
    ? { icon: '🔴', label: 'Critical' }
    : e === 1
    ? { icon: '🟡', label: 'High' }
    : e === 2
    ? { icon: '🟢', label: 'Medium' }
    : e === 3
    ? { icon: '🔵', label: 'Low' }
    : e === 4
    ? { icon: '🟣', label: 'Lowest' }
    : { icon: '🟢', label: 'Medium' };
}
function C(e) {
  return (
    {
      New: 'state-new',
      Active: 'state-active',
      Resolved: 'state-resolved',
      Closed: 'state-closed',
      Removed: 'state-removed',
      Done: 'state-done',
      'To Do': 'state-todo',
      Doing: 'state-doing',
      'In Progress': 'state-inprogress',
      'Code Review': 'state-review',
      Testing: 'state-testing',
    }[e] || 'state-default'
  );
}
function F() {
  if (
    (console.log(
      '[webview] renderWorkItems called, workItems.length:',
      m.length,
      'workItems sample:',
      m[0]
    ),
    !s.workItemsContainer)
  )
    return;
  if (m.length === 0) {
    s.workItemsContainer.innerHTML = `
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
      </div>`;
    return;
  }
  const e = (t, a) => {
      if (t != null)
        switch (a) {
          case 'System.Id':
            return t.id ?? t.fields?.['System.Id'];
          case 'System.Title':
            return t.title ?? t.fields?.['System.Title'];
          case 'System.State':
            return t.state ?? t.fields?.['System.State'];
          case 'System.WorkItemType':
            return t.type ?? t.fields?.['System.WorkItemType'];
          case 'System.AssignedTo': {
            const r = t.assignedTo || t.fields?.['System.AssignedTo'];
            return r && typeof r == 'object' ? r.displayName || r.uniqueName || r.name : r;
          }
          case 'System.Tags':
            return t.tags
              ? Array.isArray(t.tags)
                ? t.tags.join(';')
                : t.tags
              : t.fields?.['System.Tags'];
          case 'Microsoft.VSTS.Common.Priority':
            return t.priority ?? t.fields?.['Microsoft.VSTS.Common.Priority'];
          default:
            return t[a] ?? t.fields?.[a];
        }
    },
    n = m
      .map((t) => {
        const a = e(t, 'System.Id'),
          r = e(t, 'System.Title') || `Work Item #${a}`,
          o = e(t, 'System.State') || 'Unknown',
          i = e(t, 'System.WorkItemType') || 'Unknown',
          c = e(t, 'System.AssignedTo') || 'Unassigned',
          d = e(t, 'Microsoft.VSTS.Common.Priority') || 2,
          u = e(t, 'System.Tags'),
          p = typeof u == 'string' ? u.split(';').filter(Boolean) : Array.isArray(u) ? u : [],
          b = e(t, 'System.IterationPath') || '',
          y = t.description || t.fields?.['System.Description'] || '',
          w = h === a,
          v = M(String(i)),
          f = L(Number(d)),
          B = C(String(o));
        return `
      <div class="work-item-card ${
        w ? 'selected' : ''
      } ${B}" data-id="${a}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${v.class}">${v.icon}</div>
          <div class="work-item-id">#${a}</div>
          <div class="work-item-priority ${f}">${S(Number(d)).icon} ${S(Number(d)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${escapeHtml(String(r))}">${escapeHtml(
          String(r)
        )}</div>
          ${
            y
              ? `<div class="work-item-description">${escapeHtml(String(y).substring(0, 120))}${
                  String(y).length > 120 ? '...' : ''
                }</div>`
              : ''
          }
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${escapeHtml(String(i))}</span>
              <span class="work-item-state state-${String(o)
                .toLowerCase()
                .replace(/\s+/g, '-')}">${escapeHtml(String(o))}</span>
            </div>
            ${
              c !== 'Unassigned'
                ? `<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${escapeHtml(
                    String(c)
                  )}</span></div>`
                : ''
            }
            ${
              b
                ? `<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${escapeHtml(
                    String(b).split('\\').pop() || String(b)
                  )}</span></div>`
                : ''
            }
            ${
              p.length
                ? `<div class="work-item-tags">${p
                    .slice(0, 3)
                    .map(
                      (T) => `<span class="work-item-tag">${escapeHtml(String(T).trim())}</span>`
                    )
                    .join('')}${
                    p.length > 3 ? `<span class="tag-overflow">+${p.length - 3}</span>` : ''
                  }</div>`
                : ''
            }
          </div>
        </div>
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${a}" title="Start Timer">⏱️</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${a}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${a}" title="Edit">✏️</button>
        </div>
      </div>`;
      })
      .join('');
  (s.workItemsContainer.innerHTML = n), E();
}
function P() {
  console.log('[webview] updateViewToggle called, currentView:', g);
  const e = document.querySelectorAll('.view-toggle-btn');
  if ((console.log('[webview] Found', e.length, 'view toggle buttons'), e.length === 0)) {
    console.log('[webview] No view toggle buttons found, relying on sidebar controls');
    return;
  }
  e.forEach((n) => {
    const t = n.dataset.view;
    t === g
      ? (n.classList.add('active'), console.log('[webview] Set active:', t))
      : n.classList.remove('active');
  });
}
function D() {
  if (
    (console.log('[webview] renderKanbanView called, workItems.length:', m.length),
    !s.workItemsContainer)
  )
    return;
  if (m.length === 0) {
    s.workItemsContainer.innerHTML = `
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">
          Use the refresh button (🔄) in the header to reload work items
        </div>
      </div>
    `;
    return;
  }
  const e = (o, i) => {
      if (o != null)
        switch (i) {
          case 'System.Id':
            return o.id ?? o.fields?.['System.Id'];
          case 'System.Title':
            return o.title ?? o.fields?.['System.Title'];
          case 'System.State':
            return o.state ?? o.fields?.['System.State'];
          case 'System.WorkItemType':
            return o.type ?? o.fields?.['System.WorkItemType'];
          case 'System.AssignedTo': {
            const l = o.assignedTo || o.fields?.['System.AssignedTo'];
            return l && typeof l == 'object' ? l.displayName || l.uniqueName || l.name : l;
          }
          case 'System.Tags':
            return o.tags
              ? Array.isArray(o.tags)
                ? o.tags.join(';')
                : o.tags
              : o.fields?.['System.Tags'];
          case 'Microsoft.VSTS.Common.Priority':
            return o.priority ?? o.fields?.['Microsoft.VSTS.Common.Priority'];
          default:
            return o[i] ?? o.fields?.[i];
        }
    },
    n = m.reduce((o, i) => {
      let l = e(i, 'System.State') || 'Unknown';
      return (
        typeof l != 'string' && (l = String(l ?? 'Unknown')), o[l] || (o[l] = []), o[l].push(i), o
      );
    }, {}),
    a = [
      'New',
      'To Do',
      'Active',
      'In Progress',
      'Doing',
      'Code Review',
      'Testing',
      'Resolved',
      'Done',
      'Closed',
    ].filter((o) => n[o]);
  Object.keys(n).forEach((o) => {
    a.includes(o) || a.push(o);
  });
  const r = `
    <div class="kanban-board">
      ${a
        .map((o) => {
          const i = n[o];
          return `
          <div class="kanban-column">
            <div class="kanban-column-header ${C(o)}">
              <h3>${o}</h3>
              <span class="item-count">${i.length}</span>
            </div>
            <div class="kanban-column-content">
              ${i
                .map((c) => {
                  const d = e(c, 'System.Id'),
                    u = e(c, 'System.Title') || `Work Item #${d}`,
                    p = e(c, 'System.WorkItemType') || 'Unknown',
                    y = e(c, 'System.AssignedTo') || 'Unassigned',
                    w = e(c, 'Microsoft.VSTS.Common.Priority') || 2,
                    v = e(c, 'System.Tags'),
                    f =
                      typeof v == 'string'
                        ? v.split(';').filter(Boolean)
                        : Array.isArray(v)
                        ? v
                        : [],
                    B = h === d,
                    T = M(p),
                    N = L(Number(w));
                  let I = y;
                  return (
                    typeof I == 'string' && I.includes(' ') && (I = I.split(' ')[0]),
                    `
                  <div class="kanban-card ${
                    B ? 'selected' : ''
                  }" data-id="${d}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${T.class}">${T.icon}</div>
                      <div class="work-item-id">#${d}</div>
                      <div class="work-item-priority ${N}">${S(Number(w)).icon} ${
                      S(Number(w)).label
                    }</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${escapeHtml(String(u))}">${escapeHtml(
                      String(u)
                    )}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${escapeHtml(String(p))}</span>
                        ${
                          y !== 'Unassigned'
                            ? `<span class="work-item-assignee"><span class="assignee-icon">👤</span>${escapeHtml(
                                String(I)
                              )}</span>`
                            : ''
                        }
                      </div>
                      ${
                        f.length
                          ? `<div class="work-item-tags">${f
                              .slice(0, 2)
                              .map(
                                (R) =>
                                  `<span class="work-item-tag">${escapeHtml(
                                    String(R).trim()
                                  )}</span>`
                              )
                              .join('')}${
                              f.length > 2
                                ? `<span class="tag-overflow">+${f.length - 2}</span>`
                                : ''
                            }</div>`
                          : ''
                      }
                    </div>
                    <div class="kanban-card-actions">
                      <button class="action-btn timer-btn" data-action="startTimer" data-id="${d}" title="Start Timer">⏱️</button>
                      <button class="action-btn view-btn" data-action="viewDetails" data-id="${d}" title="View Details">👁️</button>
                    </div>
                  </div>`
                  );
                })
                .join('')}
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
  (s.workItemsContainer.innerHTML = r), E();
}
function J(e) {
  if (((k = e), e)) {
    updateTimerDisplay(), updateTimerButtonStates();
    try {
      const n = e.workItemId,
        t = n ? Q(n) : null;
      if (t && t.length > 0) s.draftSummary && (s.draftSummary.value = t);
      else if (s.draftSummary && s.draftSummary.value.trim() === '') {
        const r = (e.elapsedSeconds || 0) / 3600 || 0,
          o = e.workItemTitle || `#${e.workItemId}`;
        s.draftSummary.value = `Worked approximately ${r.toFixed(
          2
        )} hours on ${o}. Provide a short summary of what you accomplished.`;
      }
    } catch (n) {
      console.warn('[webview] Failed to prefill summary', n);
    }
  } else updateTimerDisplay(), updateTimerButtonStates();
}
function x(e, n) {
  try {
    localStorage.setItem(`azuredevops.draft.${e}`, n || ''),
      console.log('[webview] Saved draft for work item', e);
  } catch (t) {
    console.warn('[webview] Failed to save draft to localStorage', t);
  }
}
function Q(e) {
  try {
    return localStorage.getItem(`azuredevops.draft.${e}`);
  } catch (n) {
    return console.warn('[webview] Failed to load draft from localStorage', n), null;
  }
}
function X(e) {
  try {
    localStorage.removeItem(`azuredevops.draft.${e}`),
      console.log('[webview] Removed draft for work item', e);
  } catch (n) {
    console.warn('[webview] Failed to remove draft from localStorage', n);
  }
}
(function () {
  const n = () => {
    if (!s.draftSummary) return !1;
    const t = s.draftSummary;
    return (
      t.addEventListener('input', () => {
        const a = k ? k.workItemId : h;
        a && x(a, t.value);
      }),
      t.addEventListener('blur', () => {
        const a = k ? k.workItemId : h;
        a && x(a, t.value);
      }),
      !0
    );
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => setTimeout(n, 0))
    : setTimeout(n, 0);
})();
(function () {
  setInterval(() => {}, 500);
})();
window.requestWorkItems = H;
const V = document.createElement('style');
V.textContent = `
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;
document.head.appendChild(V);
function Y() {
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', W) : W();
}
Y();
