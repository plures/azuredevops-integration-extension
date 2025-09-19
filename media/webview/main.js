(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function n(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(r){if(r.ep)return;r.ep=!0;const a=n(r);fetch(r.href,a)}})();const R=(()=>{try{return window.vscode||acquireVsCodeApi()}catch(e){return console.error("[webview] Failed to acquire VS Code API",e),null}})();function f(e){try{if(R&&typeof R.postMessage=="function"){R.postMessage(e);return}if(typeof window<"u"&&window.vscode&&typeof window.vscode.postMessage=="function"){window.vscode.postMessage(e);return}console.warn("[webview] vscode.postMessage not available; message not sent",e)}catch(t){console.error("[webview] Error posting message to extension",t,e)}}let T=[],p=null,b=null,D=!1,y="list";const s={searchInput:null,statusOverview:null,sprintFilter:null,typeFilter:null,assignedToFilter:null,excludeDone:null,excludeClosed:null,excludeRemoved:null,excludeInReview:null,workItemsContainer:null,timerContainer:null,timerDisplay:null,timerTask:null,content:null,timerInfo:null,startTimerBtn:null,pauseTimerBtn:null,stopTimerBtn:null,draftSummary:null,summaryContainer:null,toggleSummaryBtn:null,summaryStatus:null};function K(){s.searchInput=document.getElementById("searchInput"),s.statusOverview=document.getElementById("statusOverview"),s.sprintFilter=document.getElementById("sprintFilter"),s.typeFilter=document.getElementById("typeFilter"),s.assignedToFilter=document.getElementById("assignedToFilter"),s.excludeDone=document.getElementById("excludeDone"),s.excludeClosed=document.getElementById("excludeClosed"),s.excludeRemoved=document.getElementById("excludeRemoved"),s.excludeInReview=document.getElementById("excludeInReview"),s.workItemsContainer=document.getElementById("workItemsContainer"),s.timerContainer=document.getElementById("timerContainer"),s.timerDisplay=document.getElementById("timerDisplay"),s.timerInfo=document.getElementById("timerInfo");const e=document.getElementById("startTimerBtn"),t=document.getElementById("pauseTimerBtn"),n=document.getElementById("stopTimerBtn");if(s.startTimerBtn=e,s.pauseTimerBtn=t,s.stopTimerBtn=n,s.content=document.getElementById("content"),s.draftSummary=document.getElementById("draftSummary"),s.summaryContainer=document.getElementById("summaryContainer"),s.toggleSummaryBtn=document.getElementById("toggleSummaryBtn"),s.summaryStatus=document.getElementById("summaryStatus"),!s.workItemsContainer){console.error("[webview] Critical: workItemsContainer element not found");return}console.log("[webview] Initializing webview..."),tt(),rt(),console.log("[webview] Setting timer visibility to false during init"),N(!1),f({type:"webviewReady"}),j()}function tt(){document.addEventListener("click",function(e){const t=e.target.closest(".status-badge");if(t){const i=t.getAttribute("data-status");i&&it(i);return}const n=e.target.closest('[data-action="selectWorkItem"]');if(n&&!e.target.closest("button")){const i=parseInt(n.getAttribute("data-id")||"0");et(i.toString());return}const o=e.target.closest("button[data-action]");if(!o)return;e.stopPropagation();const r=o.getAttribute("data-action"),a=o.getAttribute("data-id")?parseInt(o.getAttribute("data-id")||"0"):null;switch(console.log("[webview] Button clicked:",r,"id:",a),r){case"refresh":j();break;case"toggleSummary":{const i=s.summaryContainer,l=s.toggleSummaryBtn;if(!i)return;i.hasAttribute("hidden")?(i.removeAttribute("hidden"),l&&l.setAttribute("aria-expanded","true"),l&&(l.textContent="Compose Summary ▴")):(i.setAttribute("hidden",""),l&&l.setAttribute("aria-expanded","false"),l&&(l.textContent="Compose Summary ▾"));break}case"generateCopilotPrompt":{const i=a||(p?p.workItemId:void 0),l=s.draftSummary?s.draftSummary.value:"";if(!i){console.warn("[webview] generateCopilotPrompt: no work item id available"),s.summaryStatus&&(s.summaryStatus.textContent="No work item selected to generate prompt.");return}s.summaryStatus&&(s.summaryStatus.textContent="Preparing Copilot prompt and copying to clipboard..."),f({type:"generateCopilotPrompt",workItemId:i,draftSummary:l});break}case"stopAndApply":{const i=s.draftSummary?s.draftSummary.value:"";s.summaryStatus&&(s.summaryStatus.textContent="Stopping timer and applying updates..."),f({type:"stopAndApply",comment:i});break}case"createWorkItem":f({type:"createWorkItem"});break;case"toggleView":{console.log("[webview] toggleView clicked");const l=e.target.dataset.view;console.log("[webview] View button clicked:",l,"Current view:",y),l&&l!==y&&(y=l,V(),console.log("[webview] Switching to view:",y),y==="kanban"?B():$());break}case"toggleKanban":y=y==="list"?"kanban":"list",V(),y==="kanban"?B():$();break;case"search":{const i=s.searchInput?.value;i&&f({type:"search",query:i});break}case"pauseTimer":f({type:"pauseTimer"});break;case"resumeTimer":f({type:"resumeTimer"});break;case"stopTimer":f({type:"stopTimer"});break;case"startTimer":a&&f({type:"startTimer",workItemId:a});break;case"createBranch":a&&f({type:"createBranch",id:a});break;case"openInBrowser":a&&f({type:"openInBrowser",id:a});break;case"copyId":a&&f({type:"copyId",id:a});break;case"viewDetails":a&&f({type:"viewWorkItem",workItemId:a});break;case"editWorkItem":a&&f({type:"editWorkItemInEditor",workItemId:a});break;case"addComment":a&&nt(a);break}}),document.addEventListener("change",function(e){const t=e.target,n=t.closest("select[data-action]");if(n){n.getAttribute("data-action")==="applyFilters"&&L();return}const o=t.closest("input[data-action]");o&&o.type==="checkbox"&&o.getAttribute("data-action")==="applyFilters"&&L()}),s.searchInput?.addEventListener("keypress",e=>{if(e.key==="Enter"){const t=s.searchInput?.value;t&&f({type:"search",query:t})}}),s.sprintFilter?.addEventListener("change",L),s.typeFilter?.addEventListener("change",L),s.assignedToFilter?.addEventListener("change",L)}function d(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function N(e){const t=s.timerContainer;t&&(e?t.removeAttribute("hidden"):t.setAttribute("hidden",""))}function et(e){const t=parseInt(e,10);if(Number.isFinite(t)){b=t,document.querySelectorAll('[data-action="selectWorkItem"]').forEach(n=>{const o=n;parseInt(o.getAttribute("data-id")||"0",10)===t?o.classList.add("selected"):o.classList.remove("selected")});try{const n=q(t);n!==null&&s.draftSummary&&(s.draftSummary.value=n)}catch{}}}function nt(e){const t=prompt("Enter your comment for work item #"+e+":");t&&t.trim()&&f({type:"addComment",workItemId:e,comment:t.trim()})}function X(e){const t=Math.floor(e/3600),n=Math.floor(e%3600/60);return t>0?`${t}:${n.toString().padStart(2,"0")}`:`${n}:${Math.floor(e%60).toString().padStart(2,"0")}`}function G(){const e=s.timerDisplay,t=s.timerInfo;if(!e)return;if(!p){e.textContent="00:00:00",t&&(t.textContent=""),N(!1);return}const n=Number(p.elapsedSeconds||0),o=Math.floor(n/3600).toString().padStart(2,"0"),r=Math.floor(n%3600/60).toString().padStart(2,"0"),a=Math.floor(n%60).toString().padStart(2,"0");e.textContent=`${o}:${r}:${a}`,t&&(t.textContent=p.workItemTitle?`#${p.workItemId} · ${p.workItemTitle}`:`#${p.workItemId}`),N(!0)}function Q(){const e=s.startTimerBtn,t=s.pauseTimerBtn,n=s.stopTimerBtn,o=!!p&&p.running!==!1;e&&(e.disabled=o),t&&(t.disabled=!o),n&&(n.disabled=!p)}function st(){y=y==="list"?"kanban":"list",V(),y==="kanban"?B():$()}function ot(e){f({type:"selfTestPong",nonce:e})}function W(e){if(!e)return"Unknown";const t=e.state||e.fields?.["System.State"]||e["System.State"]||e.fields?.["System.State.name"],n=typeof t=="string"&&t.trim()?t.trim():"";if(!n)return"Unknown";const o={todo:"To Do","to do":"To Do",new:"New",active:"Active","in progress":"In Progress",doing:"In Progress","doing ":"In Progress","code review":"Code Review",testing:"Testing",done:"Done",resolved:"Resolved",closed:"Closed",removed:"Removed"},r=n.toLowerCase();return o[r]||n}function it(e){const t=T.filter(n=>W(n)===e);s.searchInput&&(s.searchInput.value=""),s.sprintFilter&&(s.sprintFilter.value=""),s.typeFilter&&(s.typeFilter.value=""),s.assignedToFilter&&(s.assignedToFilter.value=""),s.workItemsContainer.innerHTML=t.map(n=>{const o=n.id,r=n.title||`Work Item #${o}`,a=n.state||"Unknown",i=n.type||"Unknown",l=n.assignedTo||"Unassigned",m=n.priority||2,v=n.description||"",g=n.tags||[],w=n.iterationPath||"",k=b===o,I=O(i),c=H(m),u=P(W(n));return`
      <div class="work-item-card ${k?"selected":""} ${u}" 
           data-id="${o}" 
           data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${I.class}">
            ${I.icon}
          </div>
          <div class="work-item-id">#${o}</div>
          <div class="work-item-priority ${c}">
            ${A(m).icon} ${A(m).label}
          </div>
        </div>
        
        <div class="work-item-content">
          <div class="work-item-title" title="${d(r)}">
            ${d(r)}
          </div>
          
          ${v?`
            <div class="work-item-description">
              ${d(v.substring(0,120))}${v.length>120?"...":""}
            </div>
          `:""}
          
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${d(i)}</span>
              <span class="work-item-state state-${a.toLowerCase().replace(/\\s+/g,"-")}">${d(a)}</span>
            </div>
            
            ${l!=="Unassigned"?`
              <div class="work-item-assignee">
                <span class="assignee-icon">👤</span>
                <span>${d(l)}</span>
              </div>
            `:""}
            
            ${w?`
              <div class="work-item-iteration">
                <span class="iteration-icon">🔄</span>
                <span>${d(w.split("\\\\").pop()||w)}</span>
              </div>
            `:""}
            
            ${g.length>0?`
              <div class="work-item-tags">
                ${g.slice(0,3).map(S=>`
                  <span class="tag">${d(S)}</span>
                `).join("")}
                ${g.length>3?`<span class="tag-overflow">+${g.length-3}</span>`:""}
              </div>
            `:""}
          </div>
        </div>
        
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${o}" title="Start Timer">
            ⏱️
          </button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${o}" title="View Details">
            👁️
          </button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${o}" title="Edit">
            ✏️
          </button>
        </div>
      </div>
    `}).join(""),U(t)}function U(e=T){if(!s.statusOverview)return;const t=e.reduce((n,o)=>{const r=W(o);return n[r]=(n[r]||0)+1,n},{});s.statusOverview.innerHTML=Object.entries(t).map(([n,o])=>`
        <div class="status-badge ${P(String(n))}" data-status="${n}" title="${d(String(n))}">
          <span class="status-name">${n}</span>
          <span class="status-count">${o}</span>
        </div>
      `).join("")}function rt(){window.addEventListener("message",e=>{const t=e.data;switch(t.type){case"workItemsLoaded":lt(t.workItems||[]);break;case"copilotPromptCopied":{t.workItemId,s.summaryStatus&&(s.summaryStatus.textContent="Copilot prompt copied to clipboard. Paste into Copilot chat to generate a summary."),setTimeout(()=>{s.summaryStatus&&(s.summaryStatus.textContent="")},3500);break}case"stopAndApplyResult":{const n=t.workItemId,o=t.hours;s.summaryStatus&&(s.summaryStatus.textContent=`Applied ${o.toFixed(2)} hours to work item #${n}.`),s.draftSummary&&(s.draftSummary.value="");try{typeof n=="number"&&mt(n)}catch(r){console.warn("[webview] Failed to remove persisted draft after apply",r)}setTimeout(()=>{s.summaryStatus&&(s.summaryStatus.textContent="")},4e3);break}case"workItemsError":dt(t.error);break;case"timerUpdate":ut(t.timer);break;case"toggleKanbanView":st();break;case"selfTestPing":ot(t.nonce);break;default:console.log("[webview] Unknown message type:",t.type)}})}function j(){D||(D=!0,at(),f({type:"getWorkItems"}))}function at(){s.workItemsContainer&&(s.workItemsContainer.innerHTML=`
    <div class="loading">
      <div>Loading work items...</div>
    </div>
  `)}function ct(){if(s.sprintFilter){const e=new Set;T.forEach(t=>{const n=(t.iterationPath||t.fields?.["System.IterationPath"]||"").toString();if(!n)return;const o=n.split("\\").pop()||n;e.add(o)}),s.sprintFilter.innerHTML='<option value="">All Sprints</option>'+Array.from(e).sort().map(t=>`<option value="${d(t)}">${d(t)}</option>`).join("")}if(s.typeFilter){const e=new Set;T.forEach(t=>{const n=(t.type||t.fields?.["System.WorkItemType"]||"").toString();n&&e.add(n)}),s.typeFilter.innerHTML='<option value="">All Types</option>'+Array.from(e).sort().map(t=>`<option value="${d(t)}">${d(t)}</option>`).join("")}if(s.assignedToFilter){const e=new Set;T.forEach(t=>{let n=t.assignedTo??t.fields?.["System.AssignedTo"];n&&typeof n=="object"&&(n=(n.displayName||n.uniqueName||n.name||"").toString()),n=(n||"").toString(),n&&n!=="Unassigned"&&e.add(n)}),s.assignedToFilter.innerHTML='<option value="">All Assignees</option>'+Array.from(e).sort().map(t=>`<option value="${d(t)}">${d(t)}</option>`).join("")}}function lt(e){console.log("[webview] handleWorkItemsLoaded called with",e.length,"items:",e),D=!1,T=e,console.log("[webview] After assignment, workItems.length:",T.length),ct(),$()}function dt(e){console.error("[webview] Work items error:",e),D=!1,s.workItemsContainer&&(s.workItemsContainer.innerHTML=`
    <div class="error">
      <div><strong>Error loading work items:</strong></div>
      <div>${d(e)}</div>
      <button class="btn" onclick="requestWorkItems()" style="margin-top: 0.5rem;">Retry</button>
    </div>
  `)}function O(e){return{Bug:{icon:"🐛",class:"type-bug"},Task:{icon:"📋",class:"type-task"},"User Story":{icon:"📖",class:"type-story"},Feature:{icon:"⭐",class:"type-feature"},Epic:{icon:"🎯",class:"type-epic"},Issue:{icon:"❗",class:"type-issue"},"Test Case":{icon:"🧪",class:"type-test"},"Product Backlog Item":{icon:"📄",class:"type-pbi"}}[e]||{icon:"📝",class:"type-default"}}function H(e){return e===1?"priority-1":e===2?"priority-2":e===3?"priority-3":e===4?"priority-4":"priority-default"}function A(e){return e===0?{icon:"🔴",label:"Critical"}:e===1?{icon:"🟡",label:"High"}:e===2?{icon:"🟢",label:"Medium"}:e===3?{icon:"🔵",label:"Low"}:e===4?{icon:"🟣",label:"Lowest"}:{icon:"🟢",label:"Medium"}}function P(e){return{New:"state-new",Active:"state-active",Resolved:"state-resolved",Closed:"state-closed",Removed:"state-removed",Done:"state-done","To Do":"state-todo",Doing:"state-doing","In Progress":"state-inprogress","Code Review":"state-review",Testing:"state-testing"}[e]||"state-default"}function Y(){const e=(s.searchInput?.value||"").trim().toLowerCase(),t=s.sprintFilter?.value||"",n=s.typeFilter?.value||"",o=s.assignedToFilter?.value||"",r=!!s.excludeDone?.checked,a=!!s.excludeClosed?.checked,i=!!s.excludeRemoved?.checked,l=!!s.excludeInReview?.checked,m=new Set([...r?["Done"]:[],...a?["Closed"]:[],...i?["Removed"]:[],...l?["Code Review"]:[]]),v=c=>{if(!e)return!0;const u=String(c.id??c.fields?.["System.Id"]??""),S=String(c.title??c.fields?.["System.Title"]??"").toLowerCase(),h=String(c.tags?Array.isArray(c.tags)?c.tags.join(";"):c.tags:c.fields?.["System.Tags"]||"").toLowerCase();return u.includes(e)||S.includes(e)||h.includes(e)},g=c=>{if(!t)return!0;const u=String(c.iterationPath??c.fields?.["System.IterationPath"]??"");return(u.split("\\").pop()||u)===t},w=c=>n?String(c.type??c.fields?.["System.WorkItemType"]??"")===n:!0,k=c=>{if(!o)return!0;let u=c.assignedTo??c.fields?.["System.AssignedTo"];return u&&typeof u=="object"&&(u=u.displayName||u.uniqueName||u.name),String(u||"")===o},I=c=>{const u=W(c);return!m.has(u)};return T.filter(c=>v(c)&&g(c)&&w(c)&&k(c)&&I(c))}function L(){y==="kanban"?B():$()}function $(){const e=Y();if(console.log("[webview] renderWorkItems called, itemsToRender.length:",e.length),!s.workItemsContainer)return;if(e.length===0){s.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
      </div>`;return}const t=(o,r)=>{if(o!=null)switch(r){case"System.Id":return o.id??o.fields?.["System.Id"];case"System.Title":return o.title??o.fields?.["System.Title"];case"System.State":return o.state??o.fields?.["System.State"];case"System.WorkItemType":return o.type??o.fields?.["System.WorkItemType"];case"System.AssignedTo":{const a=o.assignedTo||o.fields?.["System.AssignedTo"];return a&&typeof a=="object"?a.displayName||a.uniqueName||a.name:a}case"System.Tags":return o.tags?Array.isArray(o.tags)?o.tags.join(";"):o.tags:o.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return o.priority??o.fields?.["Microsoft.VSTS.Common.Priority"];default:return o[r]??o.fields?.[r]}},n=e.map(o=>{const r=t(o,"System.Id"),a=t(o,"System.Title")||`Work Item #${r}`,i=t(o,"System.State")||"Unknown",l=t(o,"System.WorkItemType")||"Unknown",v=t(o,"System.AssignedTo")||"Unassigned",g=t(o,"Microsoft.VSTS.Common.Priority")||2,w=t(o,"System.Tags"),k=typeof w=="string"?w.split(";").filter(Boolean):Array.isArray(w)?w:[],I=t(o,"System.IterationPath")||"",c=o.description||o.fields?.["System.Description"]||"",u=b===r,S=O(String(l)),h=H(Number(g)),M=P(String(i)),C=p&&p.workItemId===r,x=C?X(p.elapsedSeconds||0):"";return`
      <div class="work-item-card ${u?"selected":""} ${M} ${C?"has-active-timer":""}" data-id="${r}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${S.class}">${S.icon}</div>
          <div class="work-item-id">#${r}</div>
          ${C?`<div class="timer-indicator" title="Timer running: ${x}">⏱️ ${x}</div>`:""}
          <div class="work-item-priority ${h}">${A(Number(g)).icon} ${A(Number(g)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${d(String(a))}">${d(String(a))}</div>
          ${c?`<div class="work-item-description">${d(String(c).substring(0,120))}${String(c).length>120?"...":""}</div>`:""}
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${d(String(l))}</span>
              <span class="work-item-state state-${String(i).toLowerCase().replace(/\s+/g,"-")}">${d(String(i))}</span>
            </div>
            ${v!=="Unassigned"?`<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${d(String(v))}</span></div>`:""}
            ${I?`<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${d(String(I).split("\\").pop()||String(I))}</span></div>`:""}
            ${k.length?`<div class="work-item-tags">${k.slice(0,3).map(E=>`<span class="work-item-tag">${d(String(E).trim())}</span>`).join("")}${k.length>3?`<span class="tag-overflow">+${k.length-3}</span>`:""}</div>`:""}
          </div>
        </div>
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${r}" title="Start Timer">⏱️</button>
          <button class="action-btn comment-btn" data-action="addComment" data-id="${r}" title="Add Comment">💬</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${r}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${r}" title="Edit">✏️</button>
        </div>
      </div>`}).join("");s.workItemsContainer.innerHTML=n,U(e)}function V(){console.log("[webview] updateViewToggle called, currentView:",y);const e=document.querySelectorAll(".view-toggle-btn");if(console.log("[webview] Found",e.length,"view toggle buttons"),e.length===0){console.log("[webview] No view toggle buttons found, relying on sidebar controls");return}e.forEach(t=>{const n=t.dataset.view;n===y?(t.classList.add("active"),console.log("[webview] Set active:",n)):t.classList.remove("active")})}function B(){const e=Y();if(console.log("[webview] renderKanbanView called, itemsToRender.length:",e.length),!s.workItemsContainer)return;if(e.length===0){s.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">
          Use the refresh button (🔄) in the header to reload work items
        </div>
      </div>
    `;return}const t=(i,l)=>{if(i!=null)switch(l){case"System.Id":return i.id??i.fields?.["System.Id"];case"System.Title":return i.title??i.fields?.["System.Title"];case"System.State":return i.state??i.fields?.["System.State"];case"System.WorkItemType":return i.type??i.fields?.["System.WorkItemType"];case"System.AssignedTo":{const m=i.assignedTo||i.fields?.["System.AssignedTo"];return m&&typeof m=="object"?m.displayName||m.uniqueName||m.name:m}case"System.Tags":return i.tags?Array.isArray(i.tags)?i.tags.join(";"):i.tags:i.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return i.priority??i.fields?.["Microsoft.VSTS.Common.Priority"];default:return i[l]??i.fields?.[l]}},n=e.reduce((i,l)=>{let m=t(l,"System.State")||"Unknown";return typeof m!="string"&&(m=String(m??"Unknown")),i[m]||(i[m]=[]),i[m].push(l),i},{}),r=["New","To Do","Active","In Progress","Doing","Code Review","Testing","Resolved","Done","Closed"].filter(i=>n[i]);Object.keys(n).forEach(i=>{r.includes(i)||r.push(i)});const a=`
    <div class="kanban-board">
      ${r.map(i=>{const l=n[i];return`
          <div class="kanban-column">
            <div class="kanban-column-header ${P(i)}">
              <h3>${i}</h3>
              <span class="item-count">${l.length}</span>
            </div>
            <div class="kanban-column-content">
              ${l.map(v=>{const g=t(v,"System.Id"),w=t(v,"System.Title")||`Work Item #${g}`,k=t(v,"System.WorkItemType")||"Unknown",c=t(v,"System.AssignedTo")||"Unassigned",u=t(v,"Microsoft.VSTS.Common.Priority")||2,S=t(v,"System.Tags"),h=typeof S=="string"?S.split(";").filter(Boolean):Array.isArray(S)?S:[],M=b===g,C=O(k),x=H(Number(u)),E=p&&p.workItemId===g,z=E?X(p.elapsedSeconds||0):"";let F=c;return typeof F=="string"&&F.includes(" ")&&(F=F.split(" ")[0]),`
                  <div class="kanban-card ${M?"selected":""} ${E?"has-active-timer":""}" data-id="${g}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${C.class}">${C.icon}</div>
                      <div class="work-item-id">#${g}</div>
                      ${E?`<div class="timer-indicator" title="Timer running: ${z}">⏱️ ${z}</div>`:""}
                      <div class="work-item-priority ${x}">${A(Number(u)).icon} ${A(Number(u)).label}</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${d(String(w))}">${d(String(w))}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${d(String(k))}</span>
                        ${c!=="Unassigned"?`<span class="work-item-assignee"><span class="assignee-icon">👤</span>${d(String(F))}</span>`:""}
                      </div>
                      ${h.length?`<div class="work-item-tags">${h.slice(0,2).map(_=>`<span class="work-item-tag">${d(String(_).trim())}</span>`).join("")}${h.length>2?`<span class="tag-overflow">+${h.length-2}</span>`:""}</div>`:""}
                    </div>
                    <div class="kanban-card-actions">
                      <button class="action-btn timer-btn" data-action="startTimer" data-id="${g}" title="Start Timer">⏱️</button>
                      <button class="action-btn comment-btn" data-action="addComment" data-id="${g}" title="Add Comment">💬</button>
                      <button class="action-btn view-btn" data-action="viewDetails" data-id="${g}" title="View Details">👁️</button>
                    </div>
                  </div>`}).join("")}
            </div>
          </div>
        `}).join("")}
    </div>
  `;s.workItemsContainer.innerHTML=a,U(e)}function ut(e){if(p=e,e){G(),Q(),y==="kanban"?B():$();try{const t=e.workItemId,n=t?q(t):null;if(n&&n.length>0)s.draftSummary&&(s.draftSummary.value=n);else if(s.draftSummary&&s.draftSummary.value.trim()===""){const r=(e.elapsedSeconds||0)/3600||0,a=e.workItemTitle||`#${e.workItemId}`;s.draftSummary.value=`Worked approximately ${r.toFixed(2)} hours on ${a}. Provide a short summary of what you accomplished.`}}catch(t){console.warn("[webview] Failed to prefill summary",t)}}else G(),Q(),y==="kanban"?B():$()}function J(e,t){try{localStorage.setItem(`azuredevops.draft.${e}`,t||""),console.log("[webview] Saved draft for work item",e)}catch(n){console.warn("[webview] Failed to save draft to localStorage",n)}}function q(e){try{return localStorage.getItem(`azuredevops.draft.${e}`)}catch(t){return console.warn("[webview] Failed to load draft from localStorage",t),null}}function mt(e){try{localStorage.removeItem(`azuredevops.draft.${e}`),console.log("[webview] Removed draft for work item",e)}catch(t){console.warn("[webview] Failed to remove draft from localStorage",t)}}(function(){const t=()=>{if(!s.draftSummary)return!1;const n=s.draftSummary;return n.addEventListener("input",()=>{const o=p?p.workItemId:b;o&&J(o,n.value)}),n.addEventListener("blur",()=>{const o=p?p.workItemId:b;o&&J(o,n.value)}),!0};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(t,0)):setTimeout(t,0)})();(function(){let t=null;setInterval(()=>{if(b&&b!==t){t=b;try{const n=q(b);n!==null&&s.draftSummary&&(s.draftSummary.value=n)}catch{}}},500)})();window.requestWorkItems=j;const Z=document.createElement("style");Z.textContent=`
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;document.head.appendChild(Z);function pt(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",K):K()}(function(){let t=Date.now(),n;function o(){n||(n=setTimeout(()=>{f({type:"activity"}),n=void 0},500))}["click","keydown","scroll","mousemove","touchstart","focus"].forEach(a=>{document.addEventListener(a,()=>{const i=Date.now();i-t>1e3&&(t=i,o())},{passive:!0})}),document.addEventListener("visibilitychange",()=>{document.hidden||o()}),o()})();pt();
