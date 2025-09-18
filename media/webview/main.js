(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function n(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(i){if(i.ep)return;i.ep=!0;const a=n(i);fetch(i.href,a)}})();const D=(()=>{try{return window.vscode||acquireVsCodeApi()}catch(t){return console.error("[webview] Failed to acquire VS Code API",t),null}})();function g(t){try{if(D&&typeof D.postMessage=="function"){D.postMessage(t);return}if(typeof window<"u"&&window.vscode&&typeof window.vscode.postMessage=="function"){window.vscode.postMessage(t);return}console.warn("[webview] vscode.postMessage not available; message not sent",t)}catch(e){console.error("[webview] Error posting message to extension",e,t)}}let T=[],f=null,b=null,E=!1,v="list";const s={searchInput:null,statusOverview:null,sprintFilter:null,typeFilter:null,assignedToFilter:null,excludeDone:null,excludeClosed:null,excludeRemoved:null,excludeInReview:null,workItemsContainer:null,timerContainer:null,timerDisplay:null,timerTask:null,content:null,timerInfo:null,startTimerBtn:null,pauseTimerBtn:null,stopTimerBtn:null,draftSummary:null,summaryContainer:null,toggleSummaryBtn:null,summaryStatus:null};function H(){s.searchInput=document.getElementById("searchInput"),s.statusOverview=document.getElementById("statusOverview"),s.sprintFilter=document.getElementById("sprintFilter"),s.typeFilter=document.getElementById("typeFilter"),s.assignedToFilter=document.getElementById("assignedToFilter"),s.excludeDone=document.getElementById("excludeDone"),s.excludeClosed=document.getElementById("excludeClosed"),s.excludeRemoved=document.getElementById("excludeRemoved"),s.excludeInReview=document.getElementById("excludeInReview"),s.workItemsContainer=document.getElementById("workItemsContainer"),s.timerContainer=document.getElementById("timerContainer"),s.timerDisplay=document.getElementById("timerDisplay"),s.timerInfo=document.getElementById("timerInfo");const t=document.getElementById("startTimerBtn"),e=document.getElementById("pauseTimerBtn"),n=document.getElementById("stopTimerBtn");if(s.startTimerBtn=t,s.pauseTimerBtn=e,s.stopTimerBtn=n,s.content=document.getElementById("content"),s.draftSummary=document.getElementById("draftSummary"),s.summaryContainer=document.getElementById("summaryContainer"),s.toggleSummaryBtn=document.getElementById("toggleSummaryBtn"),s.summaryStatus=document.getElementById("summaryStatus"),!s.workItemsContainer){console.error("[webview] Critical: workItemsContainer element not found");return}console.log("[webview] Initializing webview..."),Y(),se(),console.log("[webview] Setting timer visibility to false during init"),M(!1),g({type:"webviewReady"}),V()}function Y(){document.addEventListener("click",function(t){const e=t.target.closest(".status-badge");if(e){const r=e.getAttribute("data-status");r&&te(r);return}const n=t.target.closest('[data-action="selectWorkItem"]');if(n&&!t.target.closest("button")){const r=parseInt(n.getAttribute("data-id")||"0");Z(r.toString());return}const o=t.target.closest("button[data-action]");if(!o)return;t.stopPropagation();const i=o.getAttribute("data-action"),a=o.getAttribute("data-id")?parseInt(o.getAttribute("data-id")||"0"):null;switch(console.log("[webview] Button clicked:",i,"id:",a),i){case"refresh":V();break;case"toggleSummary":{const r=s.summaryContainer,c=s.toggleSummaryBtn;if(!r)return;r.hasAttribute("hidden")?(r.removeAttribute("hidden"),c&&c.setAttribute("aria-expanded","true"),c&&(c.textContent="Compose Summary ▴")):(r.setAttribute("hidden",""),c&&c.setAttribute("aria-expanded","false"),c&&(c.textContent="Compose Summary ▾"));break}case"generateCopilotPrompt":{const r=a||(f?f.workItemId:void 0),c=s.draftSummary?s.draftSummary.value:"";if(!r){console.warn("[webview] generateCopilotPrompt: no work item id available"),s.summaryStatus&&(s.summaryStatus.textContent="No work item selected to generate prompt.");return}s.summaryStatus&&(s.summaryStatus.textContent="Preparing Copilot prompt and copying to clipboard..."),g({type:"generateCopilotPrompt",workItemId:r,draftSummary:c});break}case"stopAndApply":{const r=s.draftSummary?s.draftSummary.value:"";s.summaryStatus&&(s.summaryStatus.textContent="Stopping timer and applying updates..."),g({type:"stopAndApply",comment:r});break}case"createWorkItem":g({type:"createWorkItem"});break;case"toggleView":{console.log("[webview] toggleView clicked");const c=t.target.dataset.view;console.log("[webview] View button clicked:",c,"Current view:",v),c&&c!==v&&(v=c,R(),console.log("[webview] Switching to view:",v),v==="kanban"?x():B());break}case"toggleKanban":v=v==="list"?"kanban":"list",R(),v==="kanban"?x():B();break;case"search":{const r=s.searchInput?.value;r&&g({type:"search",query:r});break}case"pauseTimer":g({type:"pauseTimer"});break;case"resumeTimer":g({type:"resumeTimer"});break;case"stopTimer":g({type:"stopTimer"});break;case"startTimer":a&&g({type:"startTimer",workItemId:a});break;case"createBranch":a&&g({type:"createBranch",id:a});break;case"openInBrowser":a&&g({type:"openInBrowser",id:a});break;case"copyId":a&&g({type:"copyId",id:a});break;case"viewDetails":a&&g({type:"viewWorkItem",workItemId:a});break;case"editWorkItem":a&&g({type:"editWorkItemInEditor",workItemId:a});break}}),document.addEventListener("change",function(t){const e=t.target,n=e.closest("select[data-action]");if(n){n.getAttribute("data-action")==="applyFilters"&&A();return}const o=e.closest("input[data-action]");o&&o.type==="checkbox"&&o.getAttribute("data-action")==="applyFilters"&&A()}),s.searchInput?.addEventListener("keypress",t=>{if(t.key==="Enter"){const e=s.searchInput?.value;e&&g({type:"search",query:e})}}),s.sprintFilter?.addEventListener("change",A),s.typeFilter?.addEventListener("change",A),s.assignedToFilter?.addEventListener("change",A)}function d(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function M(t){const e=s.timerContainer;e&&(t?e.removeAttribute("hidden"):e.setAttribute("hidden",""))}function Z(t){const e=parseInt(t,10);if(Number.isFinite(e)){b=e,document.querySelectorAll('[data-action="selectWorkItem"]').forEach(n=>{const o=n;parseInt(o.getAttribute("data-id")||"0",10)===e?o.classList.add("selected"):o.classList.remove("selected")});try{const n=O(e);n!==null&&s.draftSummary&&(s.draftSummary.value=n)}catch{}}}function q(){const t=s.timerDisplay,e=s.timerInfo;if(!t)return;if(!f){t.textContent="00:00:00",e&&(e.textContent=""),M(!1);return}const n=Number(f.elapsedSeconds||0),o=Math.floor(n/3600).toString().padStart(2,"0"),i=Math.floor(n%3600/60).toString().padStart(2,"0"),a=Math.floor(n%60).toString().padStart(2,"0");t.textContent=`${o}:${i}:${a}`,e&&(e.textContent=f.workItemTitle?`#${f.workItemId} · ${f.workItemTitle}`:`#${f.workItemId}`),M(!0)}function z(){const t=s.startTimerBtn,e=s.pauseTimerBtn,n=s.stopTimerBtn,o=!!f&&f.running!==!1;t&&(t.disabled=o),e&&(e.disabled=!o),n&&(n.disabled=!f)}function _(){v=v==="list"?"kanban":"list",R(),v==="kanban"?x():B()}function ee(t){g({type:"selfTestPong",nonce:t})}function L(t){if(!t)return"Unknown";const e=t.state||t.fields?.["System.State"]||t["System.State"]||t.fields?.["System.State.name"],n=typeof e=="string"&&e.trim()?e.trim():"";if(!n)return"Unknown";const o={todo:"To Do","to do":"To Do",new:"New",active:"Active","in progress":"In Progress",doing:"In Progress","doing ":"In Progress","code review":"Code Review",testing:"Testing",done:"Done",resolved:"Resolved",closed:"Closed",removed:"Removed"},i=n.toLowerCase();return o[i]||n}function te(t){const e=T.filter(n=>L(n)===t);s.searchInput&&(s.searchInput.value=""),s.sprintFilter&&(s.sprintFilter.value=""),s.typeFilter&&(s.typeFilter.value=""),s.assignedToFilter&&(s.assignedToFilter.value=""),s.workItemsContainer.innerHTML=e.map(n=>{const o=n.id,i=n.title||`Work Item #${o}`,a=n.state||"Unknown",r=n.type||"Unknown",c=n.assignedTo||"Unassigned",m=n.priority||2,y=n.description||"",p=n.tags||[],w=n.iterationPath||"",k=b===o,I=U(r),l=j(m),u=W(L(n));return`
      <div class="work-item-card ${k?"selected":""} ${u}" 
           data-id="${o}" 
           data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${I.class}">
            ${I.icon}
          </div>
          <div class="work-item-id">#${o}</div>
          <div class="work-item-priority ${l}">
            ${$(m).icon} ${$(m).label}
          </div>
        </div>
        
        <div class="work-item-content">
          <div class="work-item-title" title="${d(i)}">
            ${d(i)}
          </div>
          
          ${y?`
            <div class="work-item-description">
              ${d(y.substring(0,120))}${y.length>120?"...":""}
            </div>
          `:""}
          
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${d(r)}</span>
              <span class="work-item-state state-${a.toLowerCase().replace(/\\s+/g,"-")}">${d(a)}</span>
            </div>
            
            ${c!=="Unassigned"?`
              <div class="work-item-assignee">
                <span class="assignee-icon">👤</span>
                <span>${d(c)}</span>
              </div>
            `:""}
            
            ${w?`
              <div class="work-item-iteration">
                <span class="iteration-icon">🔄</span>
                <span>${d(w.split("\\\\").pop()||w)}</span>
              </div>
            `:""}
            
            ${p.length>0?`
              <div class="work-item-tags">
                ${p.slice(0,3).map(S=>`
                  <span class="tag">${d(S)}</span>
                `).join("")}
                ${p.length>3?`<span class="tag-overflow">+${p.length-3}</span>`:""}
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
    `}).join(""),N(e)}function N(t=T){if(!s.statusOverview)return;const e=t.reduce((n,o)=>{const i=L(o);return n[i]=(n[i]||0)+1,n},{});s.statusOverview.innerHTML=Object.entries(e).map(([n,o])=>`
        <div class="status-badge ${W(String(n))}" data-status="${n}" title="${d(String(n))}">
          <span class="status-name">${n}</span>
          <span class="status-count">${o}</span>
        </div>
      `).join("")}function se(){window.addEventListener("message",t=>{const e=t.data;switch(e.type){case"workItemsLoaded":re(e.workItems||[]);break;case"copilotPromptCopied":{e.workItemId,s.summaryStatus&&(s.summaryStatus.textContent="Copilot prompt copied to clipboard. Paste into Copilot chat to generate a summary."),setTimeout(()=>{s.summaryStatus&&(s.summaryStatus.textContent="")},3500);break}case"stopAndApplyResult":{const n=e.workItemId,o=e.hours;s.summaryStatus&&(s.summaryStatus.textContent=`Applied ${o.toFixed(2)} hours to work item #${n}.`),s.draftSummary&&(s.draftSummary.value="");try{typeof n=="number"&&le(n)}catch(i){console.warn("[webview] Failed to remove persisted draft after apply",i)}setTimeout(()=>{s.summaryStatus&&(s.summaryStatus.textContent="")},4e3);break}case"workItemsError":ie(e.error);break;case"timerUpdate":ae(e.timer);break;case"toggleKanbanView":_();break;case"selfTestPing":ee(e.nonce);break;default:console.log("[webview] Unknown message type:",e.type)}})}function V(){E||(E=!0,ne(),g({type:"getWorkItems"}))}function ne(){s.workItemsContainer&&(s.workItemsContainer.innerHTML=`
    <div class="loading">
      <div>Loading work items...</div>
    </div>
  `)}function oe(){if(s.sprintFilter){const t=new Set;T.forEach(e=>{const n=(e.iterationPath||e.fields?.["System.IterationPath"]||"").toString();if(!n)return;const o=n.split("\\").pop()||n;t.add(o)}),s.sprintFilter.innerHTML='<option value="">All Sprints</option>'+Array.from(t).sort().map(e=>`<option value="${d(e)}">${d(e)}</option>`).join("")}if(s.typeFilter){const t=new Set;T.forEach(e=>{const n=(e.type||e.fields?.["System.WorkItemType"]||"").toString();n&&t.add(n)}),s.typeFilter.innerHTML='<option value="">All Types</option>'+Array.from(t).sort().map(e=>`<option value="${d(e)}">${d(e)}</option>`).join("")}if(s.assignedToFilter){const t=new Set;T.forEach(e=>{let n=e.assignedTo??e.fields?.["System.AssignedTo"];n&&typeof n=="object"&&(n=(n.displayName||n.uniqueName||n.name||"").toString()),n=(n||"").toString(),n&&n!=="Unassigned"&&t.add(n)}),s.assignedToFilter.innerHTML='<option value="">All Assignees</option>'+Array.from(t).sort().map(e=>`<option value="${d(e)}">${d(e)}</option>`).join("")}}function re(t){console.log("[webview] handleWorkItemsLoaded called with",t.length,"items:",t),E=!1,T=t,console.log("[webview] After assignment, workItems.length:",T.length),oe(),B()}function ie(t){console.error("[webview] Work items error:",t),E=!1,s.workItemsContainer&&(s.workItemsContainer.innerHTML=`
    <div class="error">
      <div><strong>Error loading work items:</strong></div>
      <div>${d(t)}</div>
      <button class="btn" onclick="requestWorkItems()" style="margin-top: 0.5rem;">Retry</button>
    </div>
  `)}function U(t){return{Bug:{icon:"🐛",class:"type-bug"},Task:{icon:"📋",class:"type-task"},"User Story":{icon:"📖",class:"type-story"},Feature:{icon:"⭐",class:"type-feature"},Epic:{icon:"🎯",class:"type-epic"},Issue:{icon:"❗",class:"type-issue"},"Test Case":{icon:"🧪",class:"type-test"},"Product Backlog Item":{icon:"📄",class:"type-pbi"}}[t]||{icon:"📝",class:"type-default"}}function j(t){return t===1?"priority-1":t===2?"priority-2":t===3?"priority-3":t===4?"priority-4":"priority-default"}function $(t){return t===0?{icon:"🔴",label:"Critical"}:t===1?{icon:"🟡",label:"High"}:t===2?{icon:"🟢",label:"Medium"}:t===3?{icon:"🔵",label:"Low"}:t===4?{icon:"🟣",label:"Lowest"}:{icon:"🟢",label:"Medium"}}function W(t){return{New:"state-new",Active:"state-active",Resolved:"state-resolved",Closed:"state-closed",Removed:"state-removed",Done:"state-done","To Do":"state-todo",Doing:"state-doing","In Progress":"state-inprogress","Code Review":"state-review",Testing:"state-testing"}[t]||"state-default"}function G(){const t=(s.searchInput?.value||"").trim().toLowerCase(),e=s.sprintFilter?.value||"",n=s.typeFilter?.value||"",o=s.assignedToFilter?.value||"",i=!!s.excludeDone?.checked,a=!!s.excludeClosed?.checked,r=!!s.excludeRemoved?.checked,c=!!s.excludeInReview?.checked,m=new Set([...i?["Done"]:[],...a?["Closed"]:[],...r?["Removed"]:[],...c?["Code Review"]:[]]),y=l=>{if(!t)return!0;const u=String(l.id??l.fields?.["System.Id"]??""),S=String(l.title??l.fields?.["System.Title"]??"").toLowerCase(),h=String(l.tags?Array.isArray(l.tags)?l.tags.join(";"):l.tags:l.fields?.["System.Tags"]||"").toLowerCase();return u.includes(t)||S.includes(t)||h.includes(t)},p=l=>{if(!e)return!0;const u=String(l.iterationPath??l.fields?.["System.IterationPath"]??"");return(u.split("\\").pop()||u)===e},w=l=>n?String(l.type??l.fields?.["System.WorkItemType"]??"")===n:!0,k=l=>{if(!o)return!0;let u=l.assignedTo??l.fields?.["System.AssignedTo"];return u&&typeof u=="object"&&(u=u.displayName||u.uniqueName||u.name),String(u||"")===o},I=l=>{const u=L(l);return!m.has(u)};return T.filter(l=>y(l)&&p(l)&&w(l)&&k(l)&&I(l))}function A(){v==="kanban"?x():B()}function B(){const t=G();if(console.log("[webview] renderWorkItems called, itemsToRender.length:",t.length),!s.workItemsContainer)return;if(t.length===0){s.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
      </div>`;return}const e=(o,i)=>{if(o!=null)switch(i){case"System.Id":return o.id??o.fields?.["System.Id"];case"System.Title":return o.title??o.fields?.["System.Title"];case"System.State":return o.state??o.fields?.["System.State"];case"System.WorkItemType":return o.type??o.fields?.["System.WorkItemType"];case"System.AssignedTo":{const a=o.assignedTo||o.fields?.["System.AssignedTo"];return a&&typeof a=="object"?a.displayName||a.uniqueName||a.name:a}case"System.Tags":return o.tags?Array.isArray(o.tags)?o.tags.join(";"):o.tags:o.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return o.priority??o.fields?.["Microsoft.VSTS.Common.Priority"];default:return o[i]??o.fields?.[i]}},n=t.map(o=>{const i=e(o,"System.Id"),a=e(o,"System.Title")||`Work Item #${i}`,r=e(o,"System.State")||"Unknown",c=e(o,"System.WorkItemType")||"Unknown",y=e(o,"System.AssignedTo")||"Unassigned",p=e(o,"Microsoft.VSTS.Common.Priority")||2,w=e(o,"System.Tags"),k=typeof w=="string"?w.split(";").filter(Boolean):Array.isArray(w)?w:[],I=e(o,"System.IterationPath")||"",l=o.description||o.fields?.["System.Description"]||"",u=b===i,S=U(String(c)),h=j(Number(p)),P=W(String(r));return`
      <div class="work-item-card ${u?"selected":""} ${P}" data-id="${i}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${S.class}">${S.icon}</div>
          <div class="work-item-id">#${i}</div>
          <div class="work-item-priority ${h}">${$(Number(p)).icon} ${$(Number(p)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${d(String(a))}">${d(String(a))}</div>
          ${l?`<div class="work-item-description">${d(String(l).substring(0,120))}${String(l).length>120?"...":""}</div>`:""}
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${d(String(c))}</span>
              <span class="work-item-state state-${String(r).toLowerCase().replace(/\s+/g,"-")}">${d(String(r))}</span>
            </div>
            ${y!=="Unassigned"?`<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${d(String(y))}</span></div>`:""}
            ${I?`<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${d(String(I).split("\\").pop()||String(I))}</span></div>`:""}
            ${k.length?`<div class="work-item-tags">${k.slice(0,3).map(F=>`<span class="work-item-tag">${d(String(F).trim())}</span>`).join("")}${k.length>3?`<span class="tag-overflow">+${k.length-3}</span>`:""}</div>`:""}
          </div>
        </div>
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${i}" title="Start Timer">⏱️</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${i}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${i}" title="Edit">✏️</button>
        </div>
      </div>`}).join("");s.workItemsContainer.innerHTML=n,N(t)}function R(){console.log("[webview] updateViewToggle called, currentView:",v);const t=document.querySelectorAll(".view-toggle-btn");if(console.log("[webview] Found",t.length,"view toggle buttons"),t.length===0){console.log("[webview] No view toggle buttons found, relying on sidebar controls");return}t.forEach(e=>{const n=e.dataset.view;n===v?(e.classList.add("active"),console.log("[webview] Set active:",n)):e.classList.remove("active")})}function x(){const t=G();if(console.log("[webview] renderKanbanView called, itemsToRender.length:",t.length),!s.workItemsContainer)return;if(t.length===0){s.workItemsContainer.innerHTML=`
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">
          Use the refresh button (🔄) in the header to reload work items
        </div>
      </div>
    `;return}const e=(r,c)=>{if(r!=null)switch(c){case"System.Id":return r.id??r.fields?.["System.Id"];case"System.Title":return r.title??r.fields?.["System.Title"];case"System.State":return r.state??r.fields?.["System.State"];case"System.WorkItemType":return r.type??r.fields?.["System.WorkItemType"];case"System.AssignedTo":{const m=r.assignedTo||r.fields?.["System.AssignedTo"];return m&&typeof m=="object"?m.displayName||m.uniqueName||m.name:m}case"System.Tags":return r.tags?Array.isArray(r.tags)?r.tags.join(";"):r.tags:r.fields?.["System.Tags"];case"Microsoft.VSTS.Common.Priority":return r.priority??r.fields?.["Microsoft.VSTS.Common.Priority"];default:return r[c]??r.fields?.[c]}},n=t.reduce((r,c)=>{let m=e(c,"System.State")||"Unknown";return typeof m!="string"&&(m=String(m??"Unknown")),r[m]||(r[m]=[]),r[m].push(c),r},{}),i=["New","To Do","Active","In Progress","Doing","Code Review","Testing","Resolved","Done","Closed"].filter(r=>n[r]);Object.keys(n).forEach(r=>{i.includes(r)||i.push(r)});const a=`
    <div class="kanban-board">
      ${i.map(r=>{const c=n[r];return`
          <div class="kanban-column">
            <div class="kanban-column-header ${W(r)}">
              <h3>${r}</h3>
              <span class="item-count">${c.length}</span>
            </div>
            <div class="kanban-column-content">
              ${c.map(y=>{const p=e(y,"System.Id"),w=e(y,"System.Title")||`Work Item #${p}`,k=e(y,"System.WorkItemType")||"Unknown",l=e(y,"System.AssignedTo")||"Unassigned",u=e(y,"Microsoft.VSTS.Common.Priority")||2,S=e(y,"System.Tags"),h=typeof S=="string"?S.split(";").filter(Boolean):Array.isArray(S)?S:[],P=b===p,F=U(k),J=j(Number(u));let C=l;return typeof C=="string"&&C.includes(" ")&&(C=C.split(" ")[0]),`
                  <div class="kanban-card ${P?"selected":""}" data-id="${p}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${F.class}">${F.icon}</div>
                      <div class="work-item-id">#${p}</div>
                      <div class="work-item-priority ${J}">${$(Number(u)).icon} ${$(Number(u)).label}</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${d(String(w))}">${d(String(w))}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${d(String(k))}</span>
                        ${l!=="Unassigned"?`<span class="work-item-assignee"><span class="assignee-icon">👤</span>${d(String(C))}</span>`:""}
                      </div>
                      ${h.length?`<div class="work-item-tags">${h.slice(0,2).map(X=>`<span class="work-item-tag">${d(String(X).trim())}</span>`).join("")}${h.length>2?`<span class="tag-overflow">+${h.length-2}</span>`:""}</div>`:""}
                    </div>
                    <div class="kanban-card-actions">
                      <button class="action-btn timer-btn" data-action="startTimer" data-id="${p}" title="Start Timer">⏱️</button>
                      <button class="action-btn view-btn" data-action="viewDetails" data-id="${p}" title="View Details">👁️</button>
                    </div>
                  </div>`}).join("")}
            </div>
          </div>
        `}).join("")}
    </div>
  `;s.workItemsContainer.innerHTML=a,N(t)}function ae(t){if(f=t,t){q(),z();try{const e=t.workItemId,n=e?O(e):null;if(n&&n.length>0)s.draftSummary&&(s.draftSummary.value=n);else if(s.draftSummary&&s.draftSummary.value.trim()===""){const i=(t.elapsedSeconds||0)/3600||0,a=t.workItemTitle||`#${t.workItemId}`;s.draftSummary.value=`Worked approximately ${i.toFixed(2)} hours on ${a}. Provide a short summary of what you accomplished.`}}catch(e){console.warn("[webview] Failed to prefill summary",e)}}else q(),z()}function K(t,e){try{localStorage.setItem(`azuredevops.draft.${t}`,e||""),console.log("[webview] Saved draft for work item",t)}catch(n){console.warn("[webview] Failed to save draft to localStorage",n)}}function O(t){try{return localStorage.getItem(`azuredevops.draft.${t}`)}catch(e){return console.warn("[webview] Failed to load draft from localStorage",e),null}}function le(t){try{localStorage.removeItem(`azuredevops.draft.${t}`),console.log("[webview] Removed draft for work item",t)}catch(e){console.warn("[webview] Failed to remove draft from localStorage",e)}}(function(){const e=()=>{if(!s.draftSummary)return!1;const n=s.draftSummary;return n.addEventListener("input",()=>{const o=f?f.workItemId:b;o&&K(o,n.value)}),n.addEventListener("blur",()=>{const o=f?f.workItemId:b;o&&K(o,n.value)}),!0};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(e,0)):setTimeout(e,0)})();(function(){let e=null;setInterval(()=>{if(b&&b!==e){e=b;try{const n=O(b);n!==null&&s.draftSummary&&(s.draftSummary.value=n)}catch{}}},500)})();window.requestWorkItems=V;const Q=document.createElement("style");Q.textContent=`
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;document.head.appendChild(Q);function ce(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",H):H()}ce();
