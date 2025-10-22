/* Azure DevOps Integration - Webview Bundle */
"use strict";
(() => {
  // src/webview/reactive-main.ts
  window.addEventListener("DOMContentLoaded", () => {
    console.log("[DIAGNOSTIC] DOMContentLoaded event fired.");
    try {
      const root = document.getElementById("svelte-root");
      if (root) {
        console.log("[DIAGNOSTIC] Found #svelte-root element.");
        root.innerHTML = '<h1 style="color: white; font-family: sans-serif;">JavaScript is running!</h1>';
      } else {
        console.error("[DIAGNOSTIC] #svelte-root element not found.");
      }
      document.body.style.backgroundColor = "green";
      console.log("[DIAGNOSTIC] Changed body background to green.");
    } catch (e) {
      console.error("[DIagNOSTIC] Error during diagnostic script:", e);
      document.body.style.backgroundColor = "purple";
    }
  });
  console.log("[DIAGNOSTIC] reactive-main.ts script loaded.");
})();
//# sourceMappingURL=reactive-main.js.map
