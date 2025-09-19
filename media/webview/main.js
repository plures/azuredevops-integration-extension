(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function s(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(i){if(i.ep)return;i.ep=!0;const a=s(i);fetch(i.href,a)}})();const R=(()=>{try{return window.vscode||acquireVsCodeApi()}catch(e){return console.error("[webview] Failed to acquire VS Code API",e),null}})();function f(e){try{if(R&&typeof R.postMessage=="function"){R.postMessage(e);return}if(typeof window<"u"&&window.vscode&&typeof window.vscode.postMessage=="function"){window.vscode.postMessage(e);return}console.warn("[webview] vscode.postMessage not available; message not sent",e)}catch(t){console.error("[webview] Error posting message to extension",t,e)}}let T=[],p=null,b=null,W=!1,y="list";const n={searchInput:null,statusOverview:null,sprintFilter:null,typeFilter:null,assignedToFilter:null,excludeDone:null,excludeClosed:null,excludeRemoved:null,excludeInReview:null,workItemsContainer:null,timerContainer:null,timerDisplay:null,timerTask:null,content:null,timerInfo:null,startTimerBtn:null,pauseTimerBtn:null,stopTimerBtn:null,draftSummary:null,summaryContainer:null,toggleSummaryBtn:null,summaryStatus:null};function K(){n.searchInput=document.getElementById("searchInput"),n.statusOverview=document.getElementById("statusOverview"),n.sprintFilter=document.getElementById("sprintFilter"),n.typeFilter=document.getElementById("typeFilter"),n.assignedToFilter=document.getElementById("assignedToFilter"),n.excludeDone=document.getElementById("excludeDone"),n.excludeClosed=document.getElementById("excludeClosed"),n.excludeRemoved=document.getElementById("excludeRemoved"),n.excludeInReview=document.getElementById("excludeInReview"),n.workItemsContainer=document.getElementById("workItemsContainer"),n.timerContainer=document.getElementById("timerContainer"),n.timerDisplay=document.getElementById("timerDisplay"),n.timerInfo=document.getElementById("timerInfo");const e=document.getElementById("startTimerBtn"),t=document.getElementById("pauseTimerBtn"),s=document.getElementById("stopTimerBtn");if(n.startTimerBtn=e,n.pauseTimerBtn=t,n.stopTimerBtn=s,n.content=document.getElementById("content"),n.draftSummary=document.getElementById("draftSummary"),n.summaryContainer=document.getElementById("summaryContainer"),n.toggleSummaryBtn=document.getElementById("toggleSummaryBtn"),n.summaryStatus=document.getElementById("summaryStatus"),!n.workItemsContainer){console.error("[webview] Critical: workItemsContainer element not found");return}console.log("[webview] Initializing webview..."),tt(),it(),console.log("[webview] Setting timer visibility to false during init"),N(!1),f({type:"webviewReady"}),j()}function tt(){document.addEventListener("click",function(e){const t=e.target.closest(".status-badge");if(t){const r=t.getAttribute("data-status");r&&rt(r);return}const s=e.target.closest('[data-action="selectWorkItem"]');if(s&&!e.target.closest("button")){const r=parseInt(s.getAttribute("data-id")||"0");et(r.toString());return}const o=e.target.closest("button[data-action]");if(!o)return;e.stopPropagation();const i=o.getAttribute("data-action"),a=o.getAttribute("data-id")?parseInt(o.getAttribute("data-id")||"0"):null;switch(console.log("[webview] Button clicked:",i,"id:",a),i){case"refresh":j();break;case"toggleSummary":{const r=n.summaryContainer,l=n.toggleSummaryBtn;if(!r)return;r.hasAttribute("hidden")?(r.removeAttribute("hidden"),l&&l.setAttribute("aria-expanded","true"),l&&(l.textContent="Compose Summary ▴")):(r.setAttribute("hidden",""),l&&l.setAttribute("aria-expanded","false"),l&&(l.textContent="Compose Summary ▾"));break}case"generateCopilotPrompt":{const r=a||(p?p.workItemId:void 0),l=n.draftSummary?n.draftSummary.value:"";if(!r){console.warn("[webview] generateCopilotPrompt: no work item id available"),n.summaryStatus&&(n.summaryStatus.textContent="No work item selected to generate prompt.");return}n.summaryStatus&&(n.summaryStatus.textContent="Preparing Copilot prompt and copying to clipboard..."),f({type:"generateCopilotPrompt",workItemId:r,draftSummary:l});break}case"stopAndApply":{const r=n.draftSummary?n.draftSummary.value:"";n.summaryStatus&&(n.summaryStatus.textContent="Stopping timer and applying updates..."),f({type:"stopAndApply",comment:r});break}case"createWorkItem":f({type:"createWorkItem"});break;case"toggleView":{console.log("[webview] toggleView clicked");const l=e.target.dataset.view;console.log("[webview] View button clicked:",l,"Current view:",y),l&&l!==y&&(y=l,V(),console.log("[webview] Switching to view:",y),y==="kanban"?B():$());break}case"toggleKanban":y=y==="list"?"kanban":"list",V(),y==="kanban"?B():$();break;case"search":{const r=n.searchInput?.value;r&&f({type:"search",query:r});break}case"pauseTimer":f({type:"pauseTimer"});break;case"resumeTimer":f({type:"resumeTimer"});break;case"stopTimer":f({type:"stopTimer"});break;case"startTimer":a&&f({type:"startTimer",workItemId:a});break;case"createBranch":a&&f({type:"createBranch",id:a});break;case"openInBrowser":a&&f({type:"openInBrowser",id:a});break;case"copyId":a&&f({type:"copyId",id:a});break;case"viewDetails":a&&f({type:"viewWorkItem",workItemId:a});break;case"editWorkItem":a&&f({type:"editWorkItemInEditor",workItemId:a});break;case"addComment":a&&nt(a);break}}),document.addEventListener("change",function(e){const t=e.target,s=t.closest("select[data-action]");if(s){s.getAttribute("data-action")==="applyFilters"&&L();return}const o=t.closest("input[data-action]");o&&o.type==="checkbox"&&o.getAttribute("data-action")==="applyFilters"&&L()}),n.searchInput?.addEventListener("keypress",e=>{if(e.key==="Enter"){const t=n.searchInput?.value;t&&f({type:"search",query:t})}}),n.sprintFilter?.addEventListener("change",L),n.typeFilter?.addEventListener("change",L),n.assignedToFilter?.addEventListener("change",L)}function d(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function N(e){const t=n.timerContainer;t&&(e?t.removeAttribute("hidden"):t.setAttribute("hidden",""))}function et(e){const t=parseInt(e,10);if(Number.isFinite(t)){b=t,document.querySelectorAll('[data-action="selectWorkItem"]').forEach(s=>{const o=s;parseInt(o.getAttribute("data-id")||"0",10)===t?o.classList.add("selected"):o.classList.remove("selected")});try{const s=q(t);s!==null&&n.draftSummary&&(n.draftSummary.value=s)}catch{}}}function nt(e){const t=prompt("Enter your comment for work item #"+e+":");t&&t.trim()&&f({type:"addComment",workItemId:e,comment:t.trim()})}function X(e){const t=Math.floor(e/3600),s=Math.floor(e%3600/60);return t>0?`${t}:${s.toString().padStart(2,"0")}`:`${s}:${Math.floor(e%60).toString().padStart(2,"0")}`}function G(){const e=n.timerDisplay,t=n.timerInfo;if(!e)return;if(!p){e.textContent="00:00:00",t&&(t.textContent=""),N(!1);return}const s=Number(p.elapsedSeconds||0),o=Math.floor(s/3600).toString().padStart(2,"0"),i=Math.floor(s%3600/60).toString().padStart(2,"0"),a=Math.floor(s%60).toString().padStart(2,"0");e.textContent=`${o}:${i}:${a}`,t&&(t.textContent=p.workItemTitle?`#${p.workItemId} · ${p.workItemTitle}`:`#${p.workItemId}`),N(!0)}function Q(){const e=n.startTimerBtn,t=n.pauseTimerBtn,s=n.stopTimerBtn,o=!!p&&p.running!==!1;e&&(e.disabled=o),t&&(t.disabled=!o),s&&(s.disabled=!p)}function st(){y=y==="list"?"kanban":"list",V(),y==="kanban"?B():$()}function ot(e){f({type:"selfTestPong",nonce:e})}function D(e){if(!e)return"Unknown";const t=e.state||e.fields?.["System.State"]||e["System.State"]||e.fields?.["System.State.name"],s=typeof t=="string"&&t.trim()?t.trim():"";if(!s)return"Unknown";const o={todo:"To Do","to do":"To Do",new:"New",active:"Active","in progress":"In Progress",doing:"In Progress","doing ":"In Progress","code review":"Code Review",testing:"Testing",done:"Done",resolved:"Resolved",closed:"Closed",removed:"Removed"},i=s.toLowerCase();return o[i]||s}function rt(e){const t=T.filter(s=>D(s)===e);n.searchInput&&(n.searchInput.value=""),n.sprintFilter&&(n.sprintFilter.value=""),n.typeFilter&&(n.typeFilter.value=""),n.assignedToFilter&&(n.assignedToFilter.value=""),n.workItemsContainer.innerHTML=t.map(s=>{const o=s.id,i=s.title||`Work Item #${o}`,a=s.state||"Unknown",r=s.type||"Unknown",l=s.assignedTo||"Unassigned",m=s.priority||2,v=s.description||"",g=s.tags||[],w=s.iterationPath||"",k=b===o,I=O(r),c=H(m),u=M(D(s));return`
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
          <div class="work-item-title" title="${d(i)}">
            ${d(i)}
          </div>
          
          ${v?`
            <div class="work-item-description">
              ${d(v.substring(0,120))}${v.length>120?"...":""}
            </div>
          `:""}
          
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${d(r)}</span>
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
    `}).join(""),U(t)}function U(e=T){if(!n.statusOverview)return;const t=e.reduce((s,o)=>{const i=D(o);return s[i]=(s[i]||0)+1,s},{});n.statusOverview.innerHTML=Object.entries(t).map(([s,o])=>`
        <div class="status-badge ${M(String(s))}" data-status="${s}" title="${d(String(s))}">
          <span class="status-name">${s}</span>
          <span class="status-count">${o}</span>
        </div>
      `).join("")}function it(){window.addEventListener("message",e=>{const t=e.data;switch(t.type){case"workItemsLoaded":lt(t.workItems||[]);break;case"copilotPromptCopied":{t.workItemId,n.summaryStatus&&(n.summaryStatus.textContent="Copilot prompt copied to clipboard. Paste into Copilot chat to generate a summary."),setTimeout(()=>{n.summaryStatus&&(n.summaryStatus.textContent="")},3500);break}case"stopAndApplyResult":{const s=t.workItemId,o=t.hours;n.summaryStatus&&(n.summaryStatus.textContent=`Applied ${o.toFixed(2)} hours to work item #${s}.`),n.draftSummary&&(n.draftSummary.value="");try{typeof s=="number"&&mt(s)}catch(i){console.warn("[webview] Failed to remove persisted draft after apply",i)}setTimeout(()=>{n.summaryStatus&&(n.summaryStatus.textContent="")},4e3);break}case"workItemsError":dt(t.error);break;case"timerUpdate":ut(t.timer);break;case"toggleKanbanView":st();break;case"selfTestPing":ot(t.nonce);break;default:console.log("[webview] Unknown message type:",t.type)}})}function j(){W||(W=!0,at(),f({type:"getWorkItems"}))}function at(){n.workItemsContainer&&(n.workItemsContainer.innerHTML=`
    <div class="loading">
      <div>Loading work items...</div>
    </div>
  `)}function ct(){if(n.sprintFilter){const e=new Set;T.forEach(t=>{const s=(t.iterationPath||t.fields?.["System.IterationPath"]||"").toString();if(!s)return;const o=s.split("\\").pop()||s;e.add(o)}),n.sprintFilter.innerHTML='<option value="">All Sprints</option>'+Array.from(e).sort().map(t=>`<option value="${d(t)}">${d(t)}</option>`).join("")}if(n.typeFilter){const e=new Set;T.forEach(t=>{const s=(t.type||t.fields?.["System.WorkItemType"]||"").toString();s&&e.add(s)}),n.typeFilter.innerHTML='<option value="">All Types</option>'+Array.from(e).sort().map(t=>`<option value="${d(t)}">${d(t)}</option>`).join("")}if(n.assignedToFilter){const e=new Set;T.forEach(t=>{let s=t.assignedTo??t.fields?.["System.AssignedTo"];s&&typeof s=="object"&&(s=(s.displayName||s.uniqueName||s.name||"").toString()),s=(s||"").toString(),s&&s!=="Unassigned"&&e.add(s)}),n.assignedToFilter.innerHTML='<option value="">All Assignees</option>'+Array.from(e).sort().map(t=>`<option value="${d(t)}">${d(t)}</option>`).join("")}}function lt(e){console.log("[webview] handleWorkItemsLoaded called with",e.length,"items:",e),W=!1,T=e,console.log("[webview] After assignment, workItems.length:",T.length),ct(),$()}function dt(e){console.error("[webview] Work items error:",e),W=!1,n.workItemsContainer&&(n.workItemsContainer.innerHTML=`
    <div class="error">
      <div><strong>Error loading work items:</strong></div>
      <div>${d(e)}</div>
      <button class="btn" onclick="requestWorkItems()" style="margin-top: 0.5rem;">Retry</button>
    </div>
  `)}function O(e){return{Bug:{icon:"🐛",class:"type-bug"},Task:{icon:"📋",class:"type-task"},"User Story":{icon:"📖",class:"type-story"},Feature:{icon:"⭐",class:"type-feature"},Epic:{icon:"🎯",class:"type-epic"},Issue:{icon:"❗",class:"type-issue"},"Test Case":{icon:"🧪",class:"type-test"},"Product Backlog Item":{icon:"📄",class:"type-pbi"}}[e]||{icon:"📝",class:"type-default"}}function H(e){return e===1?"priority-1":e===2?"priority-2":e===3?"priority-3":e===4?"priority-4":"priority-default"}function A(e){return e===0?{icon:"🔴",label:"Critical"}:e===1?{icon:"🟡",label:"High"}:e===2?{icon:"🟢",label:"Medium"}:e===3?{icon:"🔵",label:"Low"}:e===4?{icon:"🟣",label:"Lowest"}:{icon:"🟢",label:"Medium"}}function M(e){return{New:"state-new",Active:"state-active",Resolved:"state-resolved",Closed:"state-closed",Removed:"state-removed",Done:"state-done","To Do":"state-todo",Doing:"state-doing","In Progress":"state-inprogress","Code Review":"state-review",Testing:"state-testing"}[e]||"state-default"}function Y(){const e=(n.searchInput?.value||"").trim().toLowerCase(),t=n.sprintFilter?.value||"",s=n.typeFilter?.value||"",o=n.assignedToFilter?.value||"",i=!!n.excludeDone?.checked,a=!!n.excludeClosed?.checked,r=!!n.excludeRemoved?.checked,l=!!n.excludeInReview?.checked,m=new Set([...i?["Done"]:[],...a?["Closed"]:[],...r?["Removed"]:[],...l?["Code Review"]:[]]),v=c=>{if(!e)return!0;const u=String(c.id??c.fields?.["System.Id"]??""),S=String(c.title??c.fields?.["System.Title"]??"").toLowerCase(),h=String(c.tags?Array.isArray(c.tags)?c.tags.join(";"):c.tags:c.fields?.["System.Tags"]||"").toLowerCase();return u.includes(e)||S.includes(e)||h.includes(e)},g=c=>{if(!t)return!0;const u=String(c.iterationPath??c.fields?.["System.IterationPath"]??"");return(u.split("\\").pop()||u)===t},w=c=>s?String(c.type??c.fields?.["System.WorkItemType"]??"")===s:!0,k=c=>{if(!o)return!0;let u=c.assignedTo??c.fields?.["System.AssignedTo"];return u&&typeof u=="object"&&(u=u.displayName||u.uniqueName||u.name),String(u||"")===o},I=c=>{const u=D(c);return!m.has(u)};return T.filter(c=>v(c)&&g(c)&&w(c)&&k(c)&&I(c))}function L(){y==="kanban"?B():$()}function $(){const e=Y();if(console.log("[webview] renderWorkItems called, itemsToRender.length:",e.length),!n.workItemsContainer)return;if(e.length===0){n.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
      </div>`;return}const t=(o,i)=>{if(o!=null)switch(i){case"System.Id":return o.id??o.fields?.["System.Id"];case"System.Title":return o.title??o.fields?.["System.Title"];case"System.State":return o.state??o.fields?.["System.State"];case"System.WorkItemType":return o.type??o.fields?.["System.WorkItemType"];case"System.AssignedTo":{const a=o.assignedTo||o.fields?.["System.AssignedTo"];return a&&typeof a=="object"?a.displayName||a.uniqueName||a.name:a}case"System.Tags":return o.tags?Array.isArray(o.tags)?o.tags.join(";"):o.tags:o.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return o.priority??o.fields?.["Microsoft.VSTS.Common.Priority"];default:return o[i]??o.fields?.[i]}},s=e.map(o=>{const i=t(o,"System.Id"),a=t(o,"System.Title")||`Work Item #${i}`,r=t(o,"System.State")||"Unknown",l=t(o,"System.WorkItemType")||"Unknown",v=t(o,"System.AssignedTo")||"Unassigned",g=t(o,"Microsoft.VSTS.Common.Priority")||2,w=t(o,"System.Tags"),k=typeof w=="string"?w.split(";").filter(Boolean):Array.isArray(w)?w:[],I=t(o,"System.IterationPath")||"",c=o.description||o.fields?.["System.Description"]||"",u=b===i,S=O(String(l)),h=H(Number(g)),P=M(String(r)),C=p&&p.workItemId===i,x=C?X(p.elapsedSeconds||0):"";return`
      <div class="work-item-card ${u?"selected":""} ${P} ${C?"has-active-timer":""}" data-id="${i}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${S.class}">${S.icon}</div>
          <div class="work-item-id">#${i}</div>
          ${C?`<div class="timer-indicator" title="Timer running: ${x}">⏱️ ${x}</div>`:""}
          <div class="work-item-priority ${h}">${A(Number(g)).icon} ${A(Number(g)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${d(String(a))}">${d(String(a))}</div>
          ${c?`<div class="work-item-description">${d(String(c).substring(0,120))}${String(c).length>120?"...":""}</div>`:""}
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${d(String(l))}</span>
              <span class="work-item-state state-${String(r).toLowerCase().replace(/\s+/g,"-")}">${d(String(r))}</span>
            </div>
            ${v!=="Unassigned"?`<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${d(String(v))}</span></div>`:""}
            ${I?`<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${d(String(I).split("\\").pop()||String(I))}</span></div>`:""}
            ${k.length?`<div class="work-item-tags">${k.slice(0,3).map(F=>`<span class="work-item-tag">${d(String(F).trim())}</span>`).join("")}${k.length>3?`<span class="tag-overflow">+${k.length-3}</span>`:""}</div>`:""}
          </div>
        </div>
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${i}" title="Start Timer">⏱️</button>
          <button class="action-btn comment-btn" data-action="addComment" data-id="${i}" title="Add Comment">💬</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${i}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${i}" title="Edit">✏️</button>
        </div>
      </div>`}).join("");n.workItemsContainer.innerHTML=s,U(e)}function V(){console.log("[webview] updateViewToggle called, currentView:",y);const e=document.querySelectorAll(".view-toggle-btn");if(console.log("[webview] Found",e.length,"view toggle buttons"),e.length===0){console.log("[webview] No view toggle buttons found, relying on sidebar controls");return}e.forEach(t=>{const s=t.dataset.view;s===y?(t.classList.add("active"),console.log("[webview] Set active:",s)):t.classList.remove("active")})}function B(){const e=Y();if(console.log("[webview] renderKanbanView called, itemsToRender.length:",e.length),!n.workItemsContainer)return;if(e.length===0){n.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">
          Use the refresh button (🔄) in the header to reload work items
        </div>
      </div>
    `;return}const t=(r,l)=>{if(r!=null)switch(l){case"System.Id":return r.id??r.fields?.["System.Id"];case"System.Title":return r.title??r.fields?.["System.Title"];case"System.State":return r.state??r.fields?.["System.State"];case"System.WorkItemType":return r.type??r.fields?.["System.WorkItemType"];case"System.AssignedTo":{const m=r.assignedTo||r.fields?.["System.AssignedTo"];return m&&typeof m=="object"?m.displayName||m.uniqueName||m.name:m}case"System.Tags":return r.tags?Array.isArray(r.tags)?r.tags.join(";"):r.tags:r.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return r.priority??r.fields?.["Microsoft.VSTS.Common.Priority"];default:return r[l]??r.fields?.[l]}},s=e.reduce((r,l)=>{let m=t(l,"System.State")||"Unknown";return typeof m!="string"&&(m=String(m??"Unknown")),r[m]||(r[m]=[]),r[m].push(l),r},{}),i=["New","To Do","Active","In Progress","Doing","Code Review","Testing","Resolved","Done","Closed"].filter(r=>s[r]);Object.keys(s).forEach(r=>{i.includes(r)||i.push(r)});const a=`
    <div class="kanban-board">
      ${i.map(r=>{const l=s[r];return`
          <div class="kanban-column">
            <div class="kanban-column-header ${M(r)}">
              <h3>${r}</h3>
              <span class="item-count">${l.length}</span>
            </div>
            <div class="kanban-column-content">
              ${l.map(v=>{const g=t(v,"System.Id"),w=t(v,"System.Title")||`Work Item #${g}`,k=t(v,"System.WorkItemType")||"Unknown",c=t(v,"System.AssignedTo")||"Unassigned",u=t(v,"Microsoft.VSTS.Common.Priority")||2,S=t(v,"System.Tags"),h=typeof S=="string"?S.split(";").filter(Boolean):Array.isArray(S)?S:[],P=b===g,C=O(k),x=H(Number(u)),F=p&&p.workItemId===g,z=F?X(p.elapsedSeconds||0):"";let E=c;return typeof E=="string"&&E.includes(" ")&&(E=E.split(" ")[0]),`
                  <div class="kanban-card ${P?"selected":""} ${F?"has-active-timer":""}" data-id="${g}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${C.class}">${C.icon}</div>
                      <div class="work-item-id">#${g}</div>
                      ${F?`<div class="timer-indicator" title="Timer running: ${z}">⏱️ ${z}</div>`:""}
                      <div class="work-item-priority ${x}">${A(Number(u)).icon} ${A(Number(u)).label}</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${d(String(w))}">${d(String(w))}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${d(String(k))}</span>
                        ${c!=="Unassigned"?`<span class="work-item-assignee"><span class="assignee-icon">👤</span>${d(String(E))}</span>`:""}
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
  `;n.workItemsContainer.innerHTML=a,U(e)}function ut(e){if(p=e,e){G(),Q(),y==="kanban"?B():$();try{const t=e.workItemId,s=t?q(t):null;if(s&&s.length>0)n.draftSummary&&(n.draftSummary.value=s);else if(n.draftSummary&&n.draftSummary.value.trim()===""){const i=(e.elapsedSeconds||0)/3600||0,a=e.workItemTitle||`#${e.workItemId}`;n.draftSummary.value=`Worked approximately ${i.toFixed(2)} hours on ${a}. Provide a short summary of what you accomplished.`}}catch(t){console.warn("[webview] Failed to prefill summary",t)}}else G(),Q(),y==="kanban"?B():$()}function J(e,t){try{localStorage.setItem(`azuredevops.draft.${e}`,t||""),console.log("[webview] Saved draft for work item",e)}catch(s){console.warn("[webview] Failed to save draft to localStorage",s)}}function q(e){try{return localStorage.getItem(`azuredevops.draft.${e}`)}catch(t){return console.warn("[webview] Failed to load draft from localStorage",t),null}}function mt(e){try{localStorage.removeItem(`azuredevops.draft.${e}`),console.log("[webview] Removed draft for work item",e)}catch(t){console.warn("[webview] Failed to remove draft from localStorage",t)}}(function(){const t=()=>{if(!n.draftSummary)return!1;const s=n.draftSummary;return s.addEventListener("input",()=>{const o=p?p.workItemId:b;o&&J(o,s.value)}),s.addEventListener("blur",()=>{const o=p?p.workItemId:b;o&&J(o,s.value)}),!0};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(t,0)):setTimeout(t,0)})();(function(){let t=null;setInterval(()=>{if(b&&b!==t){t=b;try{const s=q(b);s!==null&&n.draftSummary&&(n.draftSummary.value=s)}catch{}}},500)})();window.requestWorkItems=j;const Z=document.createElement("style");Z.textContent=`
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;document.head.appendChild(Z);function pt(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",K):K()}pt();
