<!--
Module: src/webview/components/MinimalApp.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: fsmEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<h1>Hello from Minimal Svelte!</h1>

<style>
  h1 {
    color: white;
    font-family: sans-serif;
    text-align: center;
    margin-top: 2rem;
  }
</style>
