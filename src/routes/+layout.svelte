<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { destroyNotifications, initializeNotifications } from '$lib/stores/notifications.js';

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
    initializeNotifications();
    window.addEventListener('resize', setScreenDimensions);
    window.addEventListener('orientationchange', () => setTimeout(setScreenDimensions, 100));

    return () => {
      window.removeEventListener('resize', setScreenDimensions);
      destroyNotifications();
    };
  });
</script>

<div class="app-root">
  <slot />
</div>

<style>
  .app-root {
    width: 100%;
    height: 100%;
    position: relative;
    z-index: 2;
  }
</style>
