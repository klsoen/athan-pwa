<script>
  import '../app.css';
  import '$lib/stores/theme.js';
  import { onMount } from 'svelte';

  onMount(() => {
    function setScreenDimensions() {
      const root = document.documentElement;
      const innerHeight = window.innerHeight;
      const screenHeight = window.screen.height;
      const availHeight = window.screen.availHeight;
      const maxHeight = Math.max(innerHeight, screenHeight, availHeight);
      root.style.setProperty('--screen-height', `${maxHeight}px`);
    }

    setScreenDimensions();
    window.addEventListener('resize', setScreenDimensions);
    window.addEventListener('orientationchange', () => setTimeout(setScreenDimensions, 100));

    return () => window.removeEventListener('resize', setScreenDimensions);
  });
</script>

<slot />
