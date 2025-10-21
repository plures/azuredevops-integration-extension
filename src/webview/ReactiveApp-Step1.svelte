<!-- Ultra-Minimal ReactiveApp - Step 1: Just debug info -->
<script>
  console.log('🟢 [ReactiveApp-Minimal] Component is being instantiated');

  import { onMount } from 'svelte';

  onMount(() => {
    console.log('🟢 [ReactiveApp-Minimal] Component mounted successfully');
  });
</script>

<!-- Ultra-minimal template with debug info -->
<div
  style="background: #0066cc; color: #ffffff; padding: 20px; margin: 10px; font-weight: bold; border: 3px solid #ffffff;"
>
  🟢 REACTIVEAPP STEP 1: BASIC MOUNTING WORKS!
  <br />This proves ReactiveApp can mount without complex logic.
  <br />
  <button onclick={() => console.log('🟢 ReactiveApp button clicked!')}>Test Button</button>
</div>
