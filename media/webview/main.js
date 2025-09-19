(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function s(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(r){if(r.ep)return;r.ep=!0;const a=s(r);fetch(r.href,a)}})();const D=(()=>{try{return window.vscode||acquireVsCodeApi()}catch(t){return console.error("[webview] Failed to acquire VS Code API",t),null}})();function p(t){try{if(D&&typeof D.postMessage=="function"){D.postMessage(t);return}if(typeof window<"u"&&window.vscode&&typeof window.vscode.postMessage=="function"){window.vscode.postMessage(t);return}console.warn("[webview] vscode.postMessage not available; message not sent",t)}catch(e){console.error("[webview] Error posting message to extension",e,t)}}let T=[],f=null,b=null,F=!1,v="list";const n={searchInput:null,statusOverview:null,sprintFilter:null,typeFilter:null,assignedToFilter:null,excludeDone:null,excludeClosed:null,excludeRemoved:null,excludeInReview:null,workItemsContainer:null,timerContainer:null,timerDisplay:null,timerTask:null,content:null,timerInfo:null,startTimerBtn:null,pauseTimerBtn:null,stopTimerBtn:null,draftSummary:null,summaryContainer:null,toggleSummaryBtn:null,summaryStatus:null};function H(){n.searchInput=document.getElementById("searchInput"),n.statusOverview=document.getElementById("statusOverview"),n.sprintFilter=document.getElementById("sprintFilter"),n.typeFilter=document.getElementById("typeFilter"),n.assignedToFilter=document.getElementById("assignedToFilter"),n.excludeDone=document.getElementById("excludeDone"),n.excludeClosed=document.getElementById("excludeClosed"),n.excludeRemoved=document.getElementById("excludeRemoved"),n.excludeInReview=document.getElementById("excludeInReview"),n.workItemsContainer=document.getElementById("workItemsContainer"),n.timerContainer=document.getElementById("timerContainer"),n.timerDisplay=document.getElementById("timerDisplay"),n.timerInfo=document.getElementById("timerInfo");const t=document.getElementById("startTimerBtn"),e=document.getElementById("pauseTimerBtn"),s=document.getElementById("stopTimerBtn");if(n.startTimerBtn=t,n.pauseTimerBtn=e,n.stopTimerBtn=s,n.content=document.getElementById("content"),n.draftSummary=document.getElementById("draftSummary"),n.summaryContainer=document.getElementById("summaryContainer"),n.toggleSummaryBtn=document.getElementById("toggleSummaryBtn"),n.summaryStatus=document.getElementById("summaryStatus"),!n.workItemsContainer){console.error("[webview] Critical: workItemsContainer element not found");return}console.log("[webview] Initializing webview..."),Y(),ne(),console.log("[webview] Setting timer visibility to false during init"),M(!1),p({type:"webviewReady"}),V()}function Y(){document.addEventListener("click",function(t){const e=t.target.closest(".status-badge");if(e){const i=e.getAttribute("data-status");i&&te(i);return}const s=t.target.closest('[data-action="selectWorkItem"]');if(s&&!t.target.closest("button")){const i=parseInt(s.getAttribute("data-id")||"0");Z(i.toString());return}const o=t.target.closest("button[data-action]");if(!o)return;t.stopPropagation();const r=o.getAttribute("data-action"),a=o.getAttribute("data-id")?parseInt(o.getAttribute("data-id")||"0"):null;switch(console.log("[webview] Button clicked:",r,"id:",a),r){case"refresh":V();break;case"toggleSummary":{const i=n.summaryContainer,l=n.toggleSummaryBtn;if(!i)return;i.hasAttribute("hidden")?(i.removeAttribute("hidden"),l&&l.setAttribute("aria-expanded","true"),l&&(l.textContent="Compose Summary ▴")):(i.setAttribute("hidden",""),l&&l.setAttribute("aria-expanded","false"),l&&(l.textContent="Compose Summary ▾"));break}case"generateCopilotPrompt":{const i=a||(f?f.workItemId:void 0),l=n.draftSummary?n.draftSummary.value:"";if(!i){console.warn("[webview] generateCopilotPrompt: no work item id available"),n.summaryStatus&&(n.summaryStatus.textContent="No work item selected to generate prompt.");return}n.summaryStatus&&(n.summaryStatus.textContent="Preparing Copilot prompt and copying to clipboard..."),p({type:"generateCopilotPrompt",workItemId:i,draftSummary:l});break}case"stopAndApply":{const i=n.draftSummary?n.draftSummary.value:"";n.summaryStatus&&(n.summaryStatus.textContent="Stopping timer and applying updates..."),p({type:"stopAndApply",comment:i});break}case"createWorkItem":p({type:"createWorkItem"});break;case"toggleView":{console.log("[webview] toggleView clicked");const l=t.target.dataset.view;console.log("[webview] View button clicked:",l,"Current view:",v),l&&l!==v&&(v=l,R(),console.log("[webview] Switching to view:",v),v==="kanban"?x():B());break}case"toggleKanban":v=v==="list"?"kanban":"list",R(),v==="kanban"?x():B();break;case"search":{const i=n.searchInput?.value;i&&p({type:"search",query:i});break}case"pauseTimer":p({type:"pauseTimer"});break;case"resumeTimer":p({type:"resumeTimer"});break;case"stopTimer":p({type:"stopTimer"});break;case"startTimer":a&&p({type:"startTimer",workItemId:a});break;case"createBranch":a&&p({type:"createBranch",id:a});break;case"openInBrowser":a&&p({type:"openInBrowser",id:a});break;case"copyId":a&&p({type:"copyId",id:a});break;case"viewDetails":a&&p({type:"viewWorkItem",workItemId:a});break;case"editWorkItem":a&&p({type:"editWorkItemInEditor",workItemId:a});break}}),document.addEventListener("change",function(t){const e=t.target,s=e.closest("select[data-action]");if(s){s.getAttribute("data-action")==="applyFilters"&&A();return}const o=e.closest("input[data-action]");o&&o.type==="checkbox"&&o.getAttribute("data-action")==="applyFilters"&&A()}),n.searchInput?.addEventListener("keypress",t=>{if(t.key==="Enter"){const e=n.searchInput?.value;e&&p({type:"search",query:e})}}),n.sprintFilter?.addEventListener("change",A),n.typeFilter?.addEventListener("change",A),n.assignedToFilter?.addEventListener("change",A)}function d(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function M(t){const e=n.timerContainer;e&&(t?e.removeAttribute("hidden"):e.setAttribute("hidden",""))}function Z(t){const e=parseInt(t,10);if(Number.isFinite(e)){b=e,document.querySelectorAll('[data-action="selectWorkItem"]').forEach(s=>{const o=s;parseInt(o.getAttribute("data-id")||"0",10)===e?o.classList.add("selected"):o.classList.remove("selected")});try{const s=O(e);s!==null&&n.draftSummary&&(n.draftSummary.value=s)}catch{}}}function q(){const t=n.timerDisplay,e=n.timerInfo;if(!t)return;if(!f){t.textContent="00:00:00",e&&(e.textContent=""),M(!1);return}const s=Number(f.elapsedSeconds||0),o=Math.floor(s/3600).toString().padStart(2,"0"),r=Math.floor(s%3600/60).toString().padStart(2,"0"),a=Math.floor(s%60).toString().padStart(2,"0");t.textContent=`${o}:${r}:${a}`,e&&(e.textContent=f.workItemTitle?`#${f.workItemId} · ${f.workItemTitle}`:`#${f.workItemId}`),M(!0)}function z(){const t=n.startTimerBtn,e=n.pauseTimerBtn,s=n.stopTimerBtn,o=!!f&&f.running!==!1;t&&(t.disabled=o),e&&(e.disabled=!o),s&&(s.disabled=!f)}function _(){v=v==="list"?"kanban":"list",R(),v==="kanban"?x():B()}function ee(t){p({type:"selfTestPong",nonce:t})}function L(t){if(!t)return"Unknown";const e=t.state||t.fields?.["System.State"]||t["System.State"]||t.fields?.["System.State.name"],s=typeof e=="string"&&e.trim()?e.trim():"";if(!s)return"Unknown";const o={todo:"To Do","to do":"To Do",new:"New",active:"Active","in progress":"In Progress",doing:"In Progress","doing ":"In Progress","code review":"Code Review",testing:"Testing",done:"Done",resolved:"Resolved",closed:"Closed",removed:"Removed"},r=s.toLowerCase();return o[r]||s}function te(t){const e=T.filter(s=>L(s)===t);n.searchInput&&(n.searchInput.value=""),n.sprintFilter&&(n.sprintFilter.value=""),n.typeFilter&&(n.typeFilter.value=""),n.assignedToFilter&&(n.assignedToFilter.value=""),n.workItemsContainer.innerHTML=e.map(s=>{const o=s.id,r=s.title||`Work Item #${o}`,a=s.state||"Unknown",i=s.type||"Unknown",l=s.assignedTo||"Unassigned",m=s.priority||2,y=s.description||"",g=s.tags||[],w=s.iterationPath||"",k=b===o,I=U(i),c=j(m),u=W(L(s));return`
      <div class="work-item-card ${k?"selected":""} ${u}" 
           data-id="${o}" 
           data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${I.class}">
            ${I.icon}
          </div>
          <div class="work-item-id">#${o}</div>
          <div class="work-item-priority ${c}">
            ${$(m).icon} ${$(m).label}
          </div>
        </div>
        
        <div class="work-item-content">
          <div class="work-item-title" title="${d(r)}">
            ${d(r)}
          </div>
          
          ${y?`
            <div class="work-item-description">
              ${d(y.substring(0,120))}${y.length>120?"...":""}
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
    `}).join(""),N(e)}function N(t=T){if(!n.statusOverview)return;const e=t.reduce((s,o)=>{const r=L(o);return s[r]=(s[r]||0)+1,s},{});n.statusOverview.innerHTML=Object.entries(e).map(([s,o])=>`
        <div class="status-badge ${W(String(s))}" data-status="${s}" title="${d(String(s))}">
          <span class="status-name">${s}</span>
          <span class="status-count">${o}</span>
        </div>
      `).join("")}function ne(){window.addEventListener("message",t=>{const e=t.data;switch(e.type){case"workItemsLoaded":ie(e.workItems||[]);break;case"copilotPromptCopied":{e.workItemId,n.summaryStatus&&(n.summaryStatus.textContent="Copilot prompt copied to clipboard. Paste into Copilot chat to generate a summary."),setTimeout(()=>{n.summaryStatus&&(n.summaryStatus.textContent="")},3500);break}case"stopAndApplyResult":{const s=e.workItemId,o=e.hours;n.summaryStatus&&(n.summaryStatus.textContent=`Applied ${o.toFixed(2)} hours to work item #${s}.`),n.draftSummary&&(n.draftSummary.value="");try{typeof s=="number"&&ce(s)}catch(r){console.warn("[webview] Failed to remove persisted draft after apply",r)}setTimeout(()=>{n.summaryStatus&&(n.summaryStatus.textContent="")},4e3);break}case"workItemsError":re(e.error);break;case"timerUpdate":ae(e.timer);break;case"toggleKanbanView":_();break;case"selfTestPing":ee(e.nonce);break;default:console.log("[webview] Unknown message type:",e.type)}})}function V(){F||(F=!0,se(),p({type:"getWorkItems"}))}function se(){n.workItemsContainer&&(n.workItemsContainer.innerHTML=`
    <div class="loading">
      <div>Loading work items...</div>
    </div>
  `)}function oe(){if(n.sprintFilter){const t=new Set;T.forEach(e=>{const s=(e.iterationPath||e.fields?.["System.IterationPath"]||"").toString();if(!s)return;const o=s.split("\\").pop()||s;t.add(o)}),n.sprintFilter.innerHTML='<option value="">All Sprints</option>'+Array.from(t).sort().map(e=>`<option value="${d(e)}">${d(e)}</option>`).join("")}if(n.typeFilter){const t=new Set;T.forEach(e=>{const s=(e.type||e.fields?.["System.WorkItemType"]||"").toString();s&&t.add(s)}),n.typeFilter.innerHTML='<option value="">All Types</option>'+Array.from(t).sort().map(e=>`<option value="${d(e)}">${d(e)}</option>`).join("")}if(n.assignedToFilter){const t=new Set;T.forEach(e=>{let s=e.assignedTo??e.fields?.["System.AssignedTo"];s&&typeof s=="object"&&(s=(s.displayName||s.uniqueName||s.name||"").toString()),s=(s||"").toString(),s&&s!=="Unassigned"&&t.add(s)}),n.assignedToFilter.innerHTML='<option value="">All Assignees</option>'+Array.from(t).sort().map(e=>`<option value="${d(e)}">${d(e)}</option>`).join("")}}function ie(t){console.log("[webview] handleWorkItemsLoaded called with",t.length,"items:",t),F=!1,T=t,console.log("[webview] After assignment, workItems.length:",T.length),oe(),B()}function re(t){console.error("[webview] Work items error:",t),F=!1,n.workItemsContainer&&(n.workItemsContainer.innerHTML=`
    <div class="error">
      <div><strong>Error loading work items:</strong></div>
      <div>${d(t)}</div>
      <button class="btn" onclick="requestWorkItems()" style="margin-top: 0.5rem;">Retry</button>
    </div>
  `)}function U(t){return{Bug:{icon:"🐛",class:"type-bug"},Task:{icon:"📋",class:"type-task"},"User Story":{icon:"📖",class:"type-story"},Feature:{icon:"⭐",class:"type-feature"},Epic:{icon:"🎯",class:"type-epic"},Issue:{icon:"❗",class:"type-issue"},"Test Case":{icon:"🧪",class:"type-test"},"Product Backlog Item":{icon:"📄",class:"type-pbi"}}[t]||{icon:"📝",class:"type-default"}}function j(t){return t===1?"priority-1":t===2?"priority-2":t===3?"priority-3":t===4?"priority-4":"priority-default"}function $(t){return t===0?{icon:"🔴",label:"Critical"}:t===1?{icon:"🟡",label:"High"}:t===2?{icon:"🟢",label:"Medium"}:t===3?{icon:"🔵",label:"Low"}:t===4?{icon:"🟣",label:"Lowest"}:{icon:"🟢",label:"Medium"}}function W(t){return{New:"state-new",Active:"state-active",Resolved:"state-resolved",Closed:"state-closed",Removed:"state-removed",Done:"state-done","To Do":"state-todo",Doing:"state-doing","In Progress":"state-inprogress","Code Review":"state-review",Testing:"state-testing"}[t]||"state-default"}function G(){const t=(n.searchInput?.value||"").trim().toLowerCase(),e=n.sprintFilter?.value||"",s=n.typeFilter?.value||"",o=n.assignedToFilter?.value||"",r=!!n.excludeDone?.checked,a=!!n.excludeClosed?.checked,i=!!n.excludeRemoved?.checked,l=!!n.excludeInReview?.checked,m=new Set([...r?["Done"]:[],...a?["Closed"]:[],...i?["Removed"]:[],...l?["Code Review"]:[]]),y=c=>{if(!t)return!0;const u=String(c.id??c.fields?.["System.Id"]??""),S=String(c.title??c.fields?.["System.Title"]??"").toLowerCase(),h=String(c.tags?Array.isArray(c.tags)?c.tags.join(";"):c.tags:c.fields?.["System.Tags"]||"").toLowerCase();return u.includes(t)||S.includes(t)||h.includes(t)},g=c=>{if(!e)return!0;const u=String(c.iterationPath??c.fields?.["System.IterationPath"]??"");return(u.split("\\").pop()||u)===e},w=c=>s?String(c.type??c.fields?.["System.WorkItemType"]??"")===s:!0,k=c=>{if(!o)return!0;let u=c.assignedTo??c.fields?.["System.AssignedTo"];return u&&typeof u=="object"&&(u=u.displayName||u.uniqueName||u.name),String(u||"")===o},I=c=>{const u=L(c);return!m.has(u)};return T.filter(c=>y(c)&&g(c)&&w(c)&&k(c)&&I(c))}function A(){v==="kanban"?x():B()}function B(){const t=G();if(console.log("[webview] renderWorkItems called, itemsToRender.length:",t.length),!n.workItemsContainer)return;if(t.length===0){n.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
      </div>`;return}const e=(o,r)=>{if(o!=null)switch(r){case"System.Id":return o.id??o.fields?.["System.Id"];case"System.Title":return o.title??o.fields?.["System.Title"];case"System.State":return o.state??o.fields?.["System.State"];case"System.WorkItemType":return o.type??o.fields?.["System.WorkItemType"];case"System.AssignedTo":{const a=o.assignedTo||o.fields?.["System.AssignedTo"];return a&&typeof a=="object"?a.displayName||a.uniqueName||a.name:a}case"System.Tags":return o.tags?Array.isArray(o.tags)?o.tags.join(";"):o.tags:o.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return o.priority??o.fields?.["Microsoft.VSTS.Common.Priority"];default:return o[r]??o.fields?.[r]}},s=t.map(o=>{const r=e(o,"System.Id"),a=e(o,"System.Title")||`Work Item #${r}`,i=e(o,"System.State")||"Unknown",l=e(o,"System.WorkItemType")||"Unknown",y=e(o,"System.AssignedTo")||"Unassigned",g=e(o,"Microsoft.VSTS.Common.Priority")||2,w=e(o,"System.Tags"),k=typeof w=="string"?w.split(";").filter(Boolean):Array.isArray(w)?w:[],I=e(o,"System.IterationPath")||"",c=o.description||o.fields?.["System.Description"]||"",u=b===r,S=U(String(l)),h=j(Number(g)),P=W(String(i));return`
      <div class="work-item-card ${u?"selected":""} ${P}" data-id="${r}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${S.class}">${S.icon}</div>
          <div class="work-item-id">#${r}</div>
          <div class="work-item-priority ${h}">${$(Number(g)).icon} ${$(Number(g)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${d(String(a))}">${d(String(a))}</div>
          ${c?`<div class="work-item-description">${d(String(c).substring(0,120))}${String(c).length>120?"...":""}</div>`:""}
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${d(String(l))}</span>
              <span class="work-item-state state-${String(i).toLowerCase().replace(/\s+/g,"-")}">${d(String(i))}</span>
            </div>
            ${y!=="Unassigned"?`<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${d(String(y))}</span></div>`:""}
            ${I?`<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${d(String(I).split("\\").pop()||String(I))}</span></div>`:""}
            ${k.length?`<div class="work-item-tags">${k.slice(0,3).map(E=>`<span class="work-item-tag">${d(String(E).trim())}</span>`).join("")}${k.length>3?`<span class="tag-overflow">+${k.length-3}</span>`:""}</div>`:""}
          </div>
        </div>
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${r}" title="Start Timer">⏱️</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${r}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${r}" title="Edit">✏️</button>
        </div>
      </div>`}).join("");n.workItemsContainer.innerHTML=s,N(t)}function R(){console.log("[webview] updateViewToggle called, currentView:",v);const t=document.querySelectorAll(".view-toggle-btn");if(console.log("[webview] Found",t.length,"view toggle buttons"),t.length===0){console.log("[webview] No view toggle buttons found, relying on sidebar controls");return}t.forEach(e=>{const s=e.dataset.view;s===v?(e.classList.add("active"),console.log("[webview] Set active:",s)):e.classList.remove("active")})}function x(){const t=G();if(console.log("[webview] renderKanbanView called, itemsToRender.length:",t.length),!n.workItemsContainer)return;if(t.length===0){n.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">
          Use the refresh button (🔄) in the header to reload work items
        </div>
      </div>
    `;return}const e=(i,l)=>{if(i!=null)switch(l){case"System.Id":return i.id??i.fields?.["System.Id"];case"System.Title":return i.title??i.fields?.["System.Title"];case"System.State":return i.state??i.fields?.["System.State"];case"System.WorkItemType":return i.type??i.fields?.["System.WorkItemType"];case"System.AssignedTo":{const m=i.assignedTo||i.fields?.["System.AssignedTo"];return m&&typeof m=="object"?m.displayName||m.uniqueName||m.name:m}case"System.Tags":return i.tags?Array.isArray(i.tags)?i.tags.join(";"):i.tags:i.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return i.priority??i.fields?.["Microsoft.VSTS.Common.Priority"];default:return i[l]??i.fields?.[l]}},s=t.reduce((i,l)=>{let m=e(l,"System.State")||"Unknown";return typeof m!="string"&&(m=String(m??"Unknown")),i[m]||(i[m]=[]),i[m].push(l),i},{}),r=["New","To Do","Active","In Progress","Doing","Code Review","Testing","Resolved","Done","Closed"].filter(i=>s[i]);Object.keys(s).forEach(i=>{r.includes(i)||r.push(i)});const a=`
    <div class="kanban-board">
      ${r.map(i=>{const l=s[i];return`
          <div class="kanban-column">
            <div class="kanban-column-header ${W(i)}">
              <h3>${i}</h3>
              <span class="item-count">${l.length}</span>
            </div>
            <div class="kanban-column-content">
              ${l.map(y=>{const g=e(y,"System.Id"),w=e(y,"System.Title")||`Work Item #${g}`,k=e(y,"System.WorkItemType")||"Unknown",c=e(y,"System.AssignedTo")||"Unassigned",u=e(y,"Microsoft.VSTS.Common.Priority")||2,S=e(y,"System.Tags"),h=typeof S=="string"?S.split(";").filter(Boolean):Array.isArray(S)?S:[],P=b===g,E=U(k),J=j(Number(u));let C=c;return typeof C=="string"&&C.includes(" ")&&(C=C.split(" ")[0]),`
                  <div class="kanban-card ${P?"selected":""}" data-id="${g}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${E.class}">${E.icon}</div>
                      <div class="work-item-id">#${g}</div>
                      <div class="work-item-priority ${J}">${$(Number(u)).icon} ${$(Number(u)).label}</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${d(String(w))}">${d(String(w))}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${d(String(k))}</span>
                        ${c!=="Unassigned"?`<span class="work-item-assignee"><span class="assignee-icon">👤</span>${d(String(C))}</span>`:""}
                      </div>
                      ${h.length?`<div class="work-item-tags">${h.slice(0,2).map(X=>`<span class="work-item-tag">${d(String(X).trim())}</span>`).join("")}${h.length>2?`<span class="tag-overflow">+${h.length-2}</span>`:""}</div>`:""}
                    </div>
                    <div class="kanban-card-actions">
                      <button class="action-btn timer-btn" data-action="startTimer" data-id="${g}" title="Start Timer">⏱️</button>
                      <button class="action-btn view-btn" data-action="viewDetails" data-id="${g}" title="View Details">👁️</button>
                    </div>
                  </div>`}).join("")}
            </div>
          </div>
        `}).join("")}
    </div>
  `;n.workItemsContainer.innerHTML=a,N(t)}function ae(t){if(f=t,t){q(),z();try{const e=t.workItemId,s=e?O(e):null;if(s&&s.length>0)n.draftSummary&&(n.draftSummary.value=s);else if(n.draftSummary&&n.draftSummary.value.trim()===""){const r=(t.elapsedSeconds||0)/3600||0,a=t.workItemTitle||`#${t.workItemId}`;n.draftSummary.value=`Worked approximately ${r.toFixed(2)} hours on ${a}. Provide a short summary of what you accomplished.`}}catch(e){console.warn("[webview] Failed to prefill summary",e)}}else q(),z()}function K(t,e){try{localStorage.setItem(`azuredevops.draft.${t}`,e||""),console.log("[webview] Saved draft for work item",t)}catch(s){console.warn("[webview] Failed to save draft to localStorage",s)}}function O(t){try{return localStorage.getItem(`azuredevops.draft.${t}`)}catch(e){return console.warn("[webview] Failed to load draft from localStorage",e),null}}function ce(t){try{localStorage.removeItem(`azuredevops.draft.${t}`),console.log("[webview] Removed draft for work item",t)}catch(e){console.warn("[webview] Failed to remove draft from localStorage",e)}}(function(){const e=()=>{if(!n.draftSummary)return!1;const s=n.draftSummary;return s.addEventListener("input",()=>{const o=f?f.workItemId:b;o&&K(o,s.value)}),s.addEventListener("blur",()=>{const o=f?f.workItemId:b;o&&K(o,s.value)}),!0};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(e,0)):setTimeout(e,0)})();(function(){let e=null;setInterval(()=>{if(b&&b!==e){e=b;try{const s=O(b);s!==null&&n.draftSummary&&(n.draftSummary.value=s)}catch{}}},500)})();window.requestWorkItems=V;const Q=document.createElement("style");Q.textContent=`
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;document.head.appendChild(Q);function le(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",H):H()}(function(){let e=Date.now(),s;function o(){s||(s=setTimeout(()=>{p({type:"activity"}),s=void 0},500))}["click","keydown","scroll","mousemove","touchstart","focus"].forEach(a=>{document.addEventListener(a,()=>{const i=Date.now();i-e>1e3&&(e=i,o())},{passive:!0})}),document.addEventListener("visibilitychange",()=>{document.hidden||o()}),o()})();le();
