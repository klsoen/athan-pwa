<script>
  import { currentPrayer, prayerNames } from '$lib/stores/prayer.js';

  export let prayer;
  export let time;
  export let notificationEnabled = false;

  $: isActive = $currentPrayer.current === prayer;

  function formatTime(date) {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
</script>

<button class="prayer-card" class:active={isActive}>
  <span class="prayer-name">{prayerNames[prayer]?.en || prayer}</span>

  <div class="right-side">
    <span class="prayer-time">{formatTime(time)}</span>

    <div class="notification-icon" class:enabled={notificationEnabled}>
      {#if notificationEnabled}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
          <path d="M3.27 3L2 4.27l2.92 2.92C4.34 8.16 4 9.52 4 11v5l-2 2v1h14.73l2 2L20 19.73 3.27 3z" opacity="0.3"/>
        </svg>
      {/if}
    </div>
  </div>
</button>

<style>
  .prayer-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 1.125rem 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .prayer-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .prayer-card.active {
    background: rgba(232, 168, 124, 0.08);
    border-color: rgba(232, 168, 124, 0.25);
  }

  .prayer-name {
    font-size: 1.0625rem;
    font-weight: 400;
    color: white;
    letter-spacing: 0.01em;
  }

  .prayer-card.active .prayer-name {
    color: #E8DCC4;
  }

  .right-side {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .prayer-time {
    font-size: 1.0625rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.9);
    font-variant-numeric: tabular-nums;
  }

  .notification-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.3);
    transition: color 0.2s ease;
  }

  .notification-icon.enabled {
    color: #E8A87C;
  }

  .notification-icon svg {
    width: 100%;
    height: 100%;
  }
</style>
