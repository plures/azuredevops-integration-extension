(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))o(a);new MutationObserver(a=>{for(const n of a)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function s(a){const n={};return a.integrity&&(n.integrity=a.integrity),a.referrerPolicy&&(n.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?n.credentials="include":a.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function o(a){if(a.ep)return;a.ep=!0;const n=s(a);fetch(a.href,n)}})();const U=(()=>{try{return window.vscode||acquireVsCodeApi()}catch(e){return console.error("[webview] Failed to acquire VS Code API",e),null}})();let u=[],f=null,W=null,C=!1,p="list";const i={searchInput:null,statusOverview:null,sprintFilter:null,typeFilter:null,assignedToFilter:null,excludeDone:null,excludeClosed:null,excludeRemoved:null,excludeInReview:null,workItemsContainer:null,timerContainer:null,timerDisplay:null,content:null,timerInfo:null,startTimerBtn:null,pauseTimerBtn:null,stopTimerBtn:null};function R(){i.searchInput=document.getElementById("searchInput"),i.statusOverview=document.getElementById("statusOverview"),i.sprintFilter=document.getElementById("sprintFilter"),i.typeFilter=document.getElementById("typeFilter"),i.assignedToFilter=document.getElementById("assignedToFilter"),i.excludeDone=document.getElementById("excludeDone"),i.excludeClosed=document.getElementById("excludeClosed"),i.excludeRemoved=document.getElementById("excludeRemoved"),i.excludeInReview=document.getElementById("excludeInReview"),i.workItemsContainer=document.getElementById("workItemsContainer"),i.timerContainer=document.getElementById("timerContainer"),i.timerDisplay=document.getElementById("timerDisplay"),i.timerInfo=document.getElementById("timerInfo");const e=document.getElementById("startTimerBtn"),t=document.getElementById("pauseTimerBtn"),s=document.getElementById("stopTimerBtn");if(i.startTimerBtn=e,i.pauseTimerBtn=t,i.stopTimerBtn=s,i.content=document.getElementById("content"),!i.workItemsContainer){console.error("[webview] Critical: workItemsContainer element not found");return}console.log("[webview] Initializing webview..."),z(),J(),console.log("[webview] Setting timer visibility to false during init"),O(!1),d({type:"webviewReady"}),M()}function z(){document.addEventListener("click",function(e){const t=e.target.closest(".status-badge");if(t){const r=t.getAttribute("data-status");r&&G(r);return}const s=e.target.closest('[data-action="selectWorkItem"]');if(s&&!e.target.closest("button")){const r=parseInt(s.getAttribute("data-id")||"0");selectWorkItem(r.toString());return}const o=e.target.closest("button[data-action]");if(!o)return;e.stopPropagation();const a=o.getAttribute("data-action"),n=o.getAttribute("data-id")?parseInt(o.getAttribute("data-id")||"0"):null;switch(console.log("[webview] Button clicked:",a,"id:",n),a){case"refresh":M();break;case"createWorkItem":d({type:"createWorkItem"});break;case"toggleView":{console.log("[webview] toggleView clicked");const c=e.target.dataset.view;console.log("[webview] View button clicked:",c,"Current view:",p),c&&c!==p&&(p=c,F(),console.log("[webview] Switching to view:",p),p==="kanban"?P():B());break}case"toggleKanban":p=p==="list"?"kanban":"list",F(),p==="kanban"?P():B();break;case"search":{const r=i.searchInput?.value;r&&d({type:"search",query:r});break}case"pauseTimer":d({type:"pauseTimer"});break;case"resumeTimer":d({type:"resumeTimer"});break;case"stopTimer":d({type:"stopTimer"});break;case"startTimer":n&&d({type:"startTimer",workItemId:n});break;case"createBranch":n&&d({type:"createBranch",id:n});break;case"openInBrowser":n&&d({type:"openInBrowser",id:n});break;case"copyId":n&&d({type:"copyId",id:n});break;case"viewDetails":n&&d({type:"viewWorkItem",workItemId:n});break;case"editWorkItem":n&&d({type:"editWorkItemInEditor",workItemId:n});break}}),document.addEventListener("change",function(e){const t=e.target,s=t.closest("select[data-action]");if(s){s.getAttribute("data-action")==="applyFilters"&&applyFilters();return}const o=t.closest("input[data-action]");o&&o.type==="checkbox"&&o.getAttribute("data-action")==="applyFilters"&&applyFilters()}),i.searchInput?.addEventListener("keypress",e=>{if(e.key==="Enter"){const t=i.searchInput?.value;t&&d({type:"search",query:t})}})}function E(e){if(!e)return"Unknown";const t=e.state||e.fields?.["System.State"]||e["System.State"]||e.fields?.["System.State.name"],s=typeof t=="string"&&t.trim()?t.trim():"";if(!s)return"Unknown";const o={todo:"To Do","to do":"To Do",new:"New",active:"Active","in progress":"In Progress",doing:"In Progress","doing ":"In Progress","code review":"Code Review",testing:"Testing",done:"Done",resolved:"Resolved",closed:"Closed",removed:"Removed"},a=s.toLowerCase();return o[a]||s}function G(e){const t=u.filter(s=>E(s)===e);i.searchInput&&(i.searchInput.value=""),i.sprintFilter&&(i.sprintFilter.value=""),i.typeFilter&&(i.typeFilter.value=""),i.assignedToFilter&&(i.assignedToFilter.value=""),i.workItemsContainer.innerHTML=t.map(s=>{const o=s.id,a=s.title||`Work Item #${o}`,n=s.state||"Unknown",r=s.type||"Unknown",c=s.assignedTo||"Unassigned",g=s.priority||2,m=s.description||"",v=s.tags||[],w=s.iterationPath||"",T=W===o,y=V(r),I=N(g),k=A(E(s));return`
      <div class="work-item-card ${T?"selected":""} ${k}" 
           data-id="${o}" 
           data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${y.class}">
            ${y.icon}
          </div>
          <div class="work-item-id">#${o}</div>
          <div class="work-item-priority ${I}">
            ${S(g).icon} ${S(g).label}
          </div>
        </div>
        
        <div class="work-item-content">
          <div class="work-item-title" title="${l(a)}">
            ${l(a)}
          </div>
          
          ${m?`
            <div class="work-item-description">
              ${l(m.substring(0,120))}${m.length>120?"...":""}
            </div>
          `:""}
          
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${l(r)}</span>
              <span class="work-item-state state-${n.toLowerCase().replace(/\\s+/g,"-")}">${l(n)}</span>
            </div>
            
            ${c!=="Unassigned"?`
              <div class="work-item-assignee">
                <span class="assignee-icon">👤</span>
                <span>${l(c)}</span>
              </div>
            `:""}
            
            ${w?`
              <div class="work-item-iteration">
                <span class="iteration-icon">🔄</span>
                <span>${l(w.split("\\\\").pop()||w)}</span>
              </div>
            `:""}
            
            ${v.length>0?`
              <div class="work-item-tags">
                ${v.slice(0,3).map(b=>`
                  <span class="tag">${l(b)}</span>
                `).join("")}
                ${v.length>3?`<span class="tag-overflow">+${v.length-3}</span>`:""}
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
    `}).join(""),D(t)}function D(e=u){if(!i.statusOverview)return;const t=e.reduce((s,o)=>{const a=E(o);return s[a]=(s[a]||0)+1,s},{});i.statusOverview.innerHTML=Object.entries(t).map(([s,o])=>`
        <div class="status-badge ${A(String(s))}" data-status="${s}" title="${l(String(s))}">
          <span class="status-name">${s}</span>
          <span class="status-count">${o}</span>
        </div>
      `).join("")}function J(){window.addEventListener("message",e=>{const t=e.data;switch(t.type){case"workItemsLoaded":Y(t.workItems||[]);break;case"workItemsError":Z(t.error);break;case"timerUpdate":_(t.timer);break;case"toggleKanbanView":te();break;case"selfTestPing":ee(t.nonce);break;default:console.log("[webview] Unknown message type:",t.type)}})}function M(){C||(C=!0,Q(),d({type:"getWorkItems"}))}function Q(){i.workItemsContainer&&(i.workItemsContainer.innerHTML=`
    <div class="loading">
      <div>Loading work items...</div>
    </div>
  `)}function X(){if(i.sprintFilter){const e=new Set;u.forEach(t=>{if(t.iterationPath){const s=t.iterationPath.split("\\").pop()||t.iterationPath;e.add(s)}}),i.sprintFilter.innerHTML='<option value="">All Sprints</option>'+Array.from(e).sort().map(t=>`<option value="${l(t)}">${l(t)}</option>`).join("")}if(i.typeFilter){const e=new Set;u.forEach(t=>{t.type&&e.add(t.type)}),i.typeFilter.innerHTML='<option value="">All Types</option>'+Array.from(e).sort().map(t=>`<option value="${l(t)}">${l(t)}</option>`).join("")}if(i.assignedToFilter){const e=new Set;u.forEach(t=>{t.assignedTo&&t.assignedTo!=="Unassigned"&&e.add(t.assignedTo)}),i.assignedToFilter.innerHTML='<option value="">All Assignees</option>'+Array.from(e).sort().map(t=>`<option value="${l(t)}">${l(t)}</option>`).join("")}}function Y(e){console.log("[webview] handleWorkItemsLoaded called with",e.length,"items:",e),C=!1,u=e,console.log("[webview] After assignment, workItems.length:",u.length),X(),B()}function Z(e){console.error("[webview] Work items error:",e),C=!1,i.workItemsContainer&&(i.workItemsContainer.innerHTML=`
    <div class="error">
      <div><strong>Error loading work items:</strong></div>
      <div>${l(e)}</div>
      <button class="btn" onclick="requestWorkItems()" style="margin-top: 0.5rem;">Retry</button>
    </div>
  `)}function V(e){return{Bug:{icon:"🐛",class:"type-bug"},Task:{icon:"📋",class:"type-task"},"User Story":{icon:"📖",class:"type-story"},Feature:{icon:"⭐",class:"type-feature"},Epic:{icon:"🎯",class:"type-epic"},Issue:{icon:"❗",class:"type-issue"},"Test Case":{icon:"🧪",class:"type-test"},"Product Backlog Item":{icon:"📄",class:"type-pbi"}}[e]||{icon:"📝",class:"type-default"}}function N(e){return e===1?"priority-1":e===2?"priority-2":e===3?"priority-3":e===4?"priority-4":"priority-default"}function S(e){return e===0?{icon:"🔴",label:"Critical"}:e===1?{icon:"🟡",label:"High"}:e===2?{icon:"🟢",label:"Medium"}:e===3?{icon:"🔵",label:"Low"}:e===4?{icon:"🟣",label:"Lowest"}:{icon:"🟢",label:"Medium"}}function A(e){return{New:"state-new",Active:"state-active",Resolved:"state-resolved",Closed:"state-closed",Removed:"state-removed",Done:"state-done","To Do":"state-todo",Doing:"state-doing","In Progress":"state-inprogress","Code Review":"state-review",Testing:"state-testing"}[e]||"state-default"}function B(){if(console.log("[webview] renderWorkItems called, workItems.length:",u.length,"workItems sample:",u[0]),!i.workItemsContainer)return;if(u.length===0){i.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
      </div>`;return}const e=(s,o)=>{if(s!=null)switch(o){case"System.Id":return s.id??s.fields?.["System.Id"];case"System.Title":return s.title??s.fields?.["System.Title"];case"System.State":return s.state??s.fields?.["System.State"];case"System.WorkItemType":return s.type??s.fields?.["System.WorkItemType"];case"System.AssignedTo":{const a=s.assignedTo||s.fields?.["System.AssignedTo"];return a&&typeof a=="object"?a.displayName||a.uniqueName||a.name:a}case"System.Tags":return s.tags?Array.isArray(s.tags)?s.tags.join(";"):s.tags:s.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return s.priority??s.fields?.["Microsoft.VSTS.Common.Priority"];default:return s[o]??s.fields?.[o]}},t=u.map(s=>{const o=e(s,"System.Id"),a=e(s,"System.Title")||`Work Item #${o}`,n=e(s,"System.State")||"Unknown",r=e(s,"System.WorkItemType")||"Unknown",g=e(s,"System.AssignedTo")||"Unassigned",m=e(s,"Microsoft.VSTS.Common.Priority")||2,v=e(s,"System.Tags"),w=typeof v=="string"?v.split(";").filter(Boolean):Array.isArray(v)?v:[],T=e(s,"System.IterationPath")||"",y=s.description||s.fields?.["System.Description"]||"",I=W===o,k=V(String(r)),b=N(Number(m)),L=A(String(n));return`
      <div class="work-item-card ${I?"selected":""} ${L}" data-id="${o}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${k.class}">${k.icon}</div>
          <div class="work-item-id">#${o}</div>
          <div class="work-item-priority ${b}">${S(Number(m)).icon} ${S(Number(m)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${l(String(a))}">${l(String(a))}</div>
          ${y?`<div class="work-item-description">${l(String(y).substring(0,120))}${String(y).length>120?"...":""}</div>`:""}
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${l(String(r))}</span>
              <span class="work-item-state state-${String(n).toLowerCase().replace(/\s+/g,"-")}">${l(String(n))}</span>
            </div>
            ${g!=="Unassigned"?`<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${l(String(g))}</span></div>`:""}
            ${T?`<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${l(String(T).split("\\").pop()||String(T))}</span></div>`:""}
            ${w.length?`<div class="work-item-tags">${w.slice(0,3).map($=>`<span class="work-item-tag">${l(String($).trim())}</span>`).join("")}${w.length>3?`<span class="tag-overflow">+${w.length-3}</span>`:""}</div>`:""}
          </div>
        </div>
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${o}" title="Start Timer">⏱️</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${o}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${o}" title="Edit">✏️</button>
        </div>
      </div>`}).join("");i.workItemsContainer.innerHTML=t,D()}function F(){console.log("[webview] updateViewToggle called, currentView:",p);const e=document.querySelectorAll(".view-toggle-btn");if(console.log("[webview] Found",e.length,"view toggle buttons"),e.length===0){console.log("[webview] No view toggle buttons found, relying on sidebar controls");return}e.forEach(t=>{const s=t.dataset.view;s===p?(t.classList.add("active"),console.log("[webview] Set active:",s)):t.classList.remove("active")})}function P(){if(console.log("[webview] renderKanbanView called, workItems.length:",u.length),!i.workItemsContainer)return;if(u.length===0){i.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">
          Use the refresh button (🔄) in the header to reload work items
        </div>
      </div>
    `;return}const e=(n,r)=>{if(n!=null)switch(r){case"System.Id":return n.id??n.fields?.["System.Id"];case"System.Title":return n.title??n.fields?.["System.Title"];case"System.State":return n.state??n.fields?.["System.State"];case"System.WorkItemType":return n.type??n.fields?.["System.WorkItemType"];case"System.AssignedTo":{const c=n.assignedTo||n.fields?.["System.AssignedTo"];return c&&typeof c=="object"?c.displayName||c.uniqueName||c.name:c}case"System.Tags":return n.tags?Array.isArray(n.tags)?n.tags.join(";"):n.tags:n.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return n.priority??n.fields?.["Microsoft.VSTS.Common.Priority"];default:return n[r]??n.fields?.[r]}},t=u.reduce((n,r)=>{let c=e(r,"System.State")||"Unknown";return typeof c!="string"&&(c=String(c??"Unknown")),n[c]||(n[c]=[]),n[c].push(r),n},{}),o=["New","To Do","Active","In Progress","Doing","Code Review","Testing","Resolved","Done","Closed"].filter(n=>t[n]);Object.keys(t).forEach(n=>{o.includes(n)||o.push(n)});const a=`
    <div class="kanban-board">
      ${o.map(n=>{const r=t[n];return`
          <div class="kanban-column">
            <div class="kanban-column-header ${A(n)}">
              <h3>${n}</h3>
              <span class="item-count">${r.length}</span>
            </div>
            <div class="kanban-column-content">
              ${r.map(g=>{const m=e(g,"System.Id"),v=e(g,"System.Title")||`Work Item #${m}`,w=e(g,"System.WorkItemType")||"Unknown",y=e(g,"System.AssignedTo")||"Unassigned",I=e(g,"Microsoft.VSTS.Common.Priority")||2,k=e(g,"System.Tags"),b=typeof k=="string"?k.split(";").filter(Boolean):Array.isArray(k)?k:[],L=W===m,$=V(w),q=N(Number(I));let h=y;return typeof h=="string"&&h.includes(" ")&&(h=h.split(" ")[0]),`
                  <div class="kanban-card ${L?"selected":""}" data-id="${m}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${$.class}">${$.icon}</div>
                      <div class="work-item-id">#${m}</div>
                      <div class="work-item-priority ${q}">${S(Number(I)).icon} ${S(Number(I)).label}</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${l(String(v))}">${l(String(v))}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${l(String(w))}</span>
                        ${y!=="Unassigned"?`<span class="work-item-assignee"><span class="assignee-icon">👤</span>${l(String(h))}</span>`:""}
                      </div>
                      ${b.length?`<div class="work-item-tags">${b.slice(0,2).map(K=>`<span class="work-item-tag">${l(String(K).trim())}</span>`).join("")}${b.length>2?`<span class="tag-overflow">+${b.length-2}</span>`:""}</div>`:""}
                    </div>
                    <div class="kanban-card-actions">
                      <button class="action-btn timer-btn" data-action="startTimer" data-id="${m}" title="Start Timer">⏱️</button>
                      <button class="action-btn view-btn" data-action="viewDetails" data-id="${m}" title="View Details">👁️</button>
                    </div>
                  </div>`}).join("")}
            </div>
          </div>
        `}).join("")}
    </div>
  `;i.workItemsContainer.innerHTML=a,D()}function _(e){f=e,x(),j()}function x(){if(!f){i.timerDisplay&&(i.timerDisplay.textContent="00:00:00"),i.timerInfo&&(i.timerInfo.textContent="No active timer");return}const e=f.elapsedSeconds||0,t=Math.floor(e/3600),s=Math.floor(e%3600/60),o=e%60,a=`${t.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}:${o.toString().padStart(2,"0")}`;i.timerDisplay&&(i.timerDisplay.textContent=a);const n=f.workItemTitle||`#${f.workItemId}`,r=f.isPaused?" (Paused)":"";i.timerInfo&&(i.timerInfo.textContent=`${n}${r}`)}function j(){const e=f!==null,t=e&&!f.isPaused;i.startTimerBtn&&(i.startTimerBtn.disabled=e),i.pauseTimerBtn&&(i.pauseTimerBtn.disabled=!t),i.stopTimerBtn&&(i.stopTimerBtn.disabled=!e),O(e)}function O(e){console.log("[webview] updateTimerVisibility called with show:",e);const t=document.getElementById("timerColumn");if(!t){console.warn("[webview] Timer column not found");return}e?(t.style.display="flex",t.classList.remove("timer-hidden"),t.classList.add("timer-visible"),console.log("[webview] Timer shown - display:",t.style.display)):(t.classList.remove("timer-visible"),t.classList.add("timer-hidden"),setTimeout(()=>{f||(t.style.display="none",t.classList.remove("timer-hidden"),console.log("[webview] Timer hidden - display:",t.style.display))},300))}function ee(e){const t=`items:${u.length};timer:${f?"1":"0"}`;d({type:"selfTestAck",nonce:e,signature:t})}function te(){console.log("[webview] handleToggleKanbanView called, current view:",p),p=p==="list"?"kanban":"list",F(),p==="kanban"?P():B()}function d(e){U?U.postMessage(e):console.warn("[webview] Cannot post message - VS Code API not available")}function l(e){return typeof e!="string"?"":e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}window.requestWorkItems=M;const H=document.createElement("style");H.textContent=`
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;document.head.appendChild(H);function se(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",R):R()}se();
