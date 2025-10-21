<!-- Minimal ReactiveApp for debugging -->
<script>
  console.log('🟢 [MinimalReactiveApp] Component instantiated successfully!');

  import { onMount } from 'svelte';

  onMount(() => {
    console.log('🟢 [MinimalReactiveApp] Component mounted successfully!');
  });
</script>

<!-- Minimal debug template -->
<div
  style="background: #00ff00; color: #000000; padding: 20px; margin: 10px; font-weight: bold; border: 3px solid #000000;"
>
  🟢 MINIMAL REACTIVE APP IS WORKING!
  <br />This proves Svelte 5 mounting works.
  <br />
  <button onclick={() => console.log('🟢 Button clicked!')}>Test Button</button>
</div>
