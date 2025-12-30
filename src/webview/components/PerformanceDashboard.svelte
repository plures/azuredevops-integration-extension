<!--
Module: src/webview/components/PerformanceDashboard.svelte
Owner: webview
Purpose: Visual dashboard for analyzing state transition performance
-->

<script lang="ts">
  import { PerformanceProfiler } from '../../debugging/performanceProfiler.js';
  import type { PerformanceProfile } from '../../debugging/performanceProfiler.js';
  
  let profile = $state<PerformanceProfile | null>(null);
  let threshold = $state(100); // ms
  let showSlowOnly = $state(false);
  
  // Update profile periodically
  $effect(() => {
    const interval = setInterval(() => {
      profile = PerformanceProfiler.profileHistory();
    }, 1000);
    
    return () => clearInterval(interval);
  });
  
  function formatDuration(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
  
  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
  
  const displayedTransitions = $derived.by(() => {
    if (!profile) return [];
    
    if (showSlowOnly) {
      return profile.transitions.filter(t => t.duration > threshold);
    }
    
    return profile.transitions;
  });
  
  const slowTransitions = $derived.by(() => {
    if (!profile) return [];
    return PerformanceProfiler.getSlowTransitions(threshold);
  });
</script>

<div class="performance-dashboard">
  <div class="dashboard-header">
    <h3>Performance Dashboard</h3>
    <div class="dashboard-controls">
      <label>
        <input type="checkbox" bind:checked={showSlowOnly} />
        Show slow only (&gt; {threshold}ms)
      </label>
      <input 
        type="range" 
        min="0" 
        max="1000" 
        step="10" 
        bind:value={threshold}
        class="threshold-slider"
      />
      <span class="threshold-value">{threshold}ms</span>
    </div>
  </div>
  
  {#if profile}
    <div class="dashboard-summary">
      <div class="summary-item">
        <span class="summary-label">Total Transitions</span>
        <span class="summary-value">{profile.summary.totalTransitions}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Avg Transition</span>
        <span class="summary-value">{formatDuration(profile.summary.averageTransitionTime)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Duration</span>
        <span class="summary-value">{formatDuration(profile.summary.totalDuration)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Avg Context Size</span>
        <span class="summary-value">{formatSize(profile.summary.averageContextSize)}</span>
      </div>
    </div>
    
    {#if slowTransitions.length > 0}
      <div class="slow-transitions">
        <h4>Slow Transitions (&gt; {threshold}ms)</h4>
        <div class="transitions-list">
          {#each slowTransitions as transition}
            <div class="transition-item slow">
              <div class="transition-header">
                <span class="transition-states">
                  {transition.from} → {transition.to}
                </span>
                <span class="transition-duration slow">
                  {formatDuration(transition.duration)}
                </span>
              </div>
              <div class="transition-details">
                <span>{transition.eventCount} events</span>
                <span>{formatSize(transition.contextSize)}</span>
                {#if transition.label}
                  <span class="transition-label">{transition.label}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <div class="all-transitions">
      <h4>All Transitions</h4>
      <div class="transitions-list">
        {#each displayedTransitions as transition}
          <div class="transition-item" class:slow={transition.duration > threshold}>
            <div class="transition-header">
              <span class="transition-states">
                {transition.from} → {transition.to}
              </span>
              <span class="transition-duration" class:slow={transition.duration > threshold}>
                {formatDuration(transition.duration)}
              </span>
            </div>
            <div class="transition-details">
              <span>{transition.eventCount} events</span>
              <span>{formatSize(transition.contextSize)}</span>
              {#if transition.label}
                <span class="transition-label">{transition.label}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="no-data">
      <p>No performance data available. Perform some actions to see metrics.</p>
    </div>
  {/if}
</div>

<style>
  .performance-dashboard {
    padding: 1rem;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    font-family: var(--vscode-font-family);
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  
  .dashboard-header h3 {
    margin: 0;
    font-size: 1rem;
  }
  
  .dashboard-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .threshold-slider {
    width: 100px;
  }
  
  .threshold-value {
    font-size: 0.875rem;
    color: var(--vscode-descriptionForeground);
    min-width: 50px;
  }
  
  .dashboard-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .summary-item {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    background: var(--vscode-editorWidget-background);
    border-radius: 4px;
  }
  
  .summary-label {
    font-size: 0.75rem;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 0.25rem;
  }
  
  .summary-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--vscode-foreground);
  }
  
  .slow-transitions,
  .all-transitions {
    margin-top: 1.5rem;
  }
  
  .slow-transitions h4,
  .all-transitions h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--vscode-foreground);
  }
  
  .transitions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .transition-item {
    padding: 0.5rem;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    transition: border-color 0.2s;
  }
  
  .transition-item.slow {
    border-color: var(--vscode-errorForeground);
    background: var(--vscode-inputValidation-errorBackground);
  }
  
  .transition-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }
  
  .transition-states {
    font-weight: 600;
    color: var(--vscode-foreground);
  }
  
  .transition-duration {
    font-size: 0.875rem;
    color: var(--vscode-descriptionForeground);
  }
  
  .transition-duration.slow {
    color: var(--vscode-errorForeground);
    font-weight: 600;
  }
  
  .transition-details {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--vscode-descriptionForeground);
  }
  
  .transition-label {
    font-style: italic;
  }
  
  .no-data {
    padding: 2rem;
    text-align: center;
    color: var(--vscode-descriptionForeground);
  }
</style>

