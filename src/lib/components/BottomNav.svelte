<script>
  export let activeTab = 'prayer';
</script>

<nav class="bottom-nav">
  <button
    class="nav-item"
    class:active={activeTab === 'prayer'}
    on:click={() => activeTab = 'prayer'}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 10 12 6.16-1.26 10-6.45 10-12V7l-10-5z" />
      <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
    </svg>
    <span>Prayer</span>
  </button>

  <button
    class="nav-item"
    class:active={activeTab === 'qibla'}
    on:click={() => activeTab = 'qibla'}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
    <span>Qibla</span>
  </button>

  <button
    class="nav-item"
    class:active={activeTab === 'tracker'}
    on:click={() => activeTab = 'tracker'}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span>Tracker</span>
  </button>

  <button
    class="nav-item"
    class:active={activeTab === 'settings'}
    on:click={() => activeTab = 'settings'}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
    <span>Settings</span>
  </button>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.75rem 1rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0));
    background: #1f3044;
    border-top: 1px solid rgba(var(--theme-text-rgb), 0.08);
    z-index: 100;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    color: rgba(var(--theme-text-rgb), 0.4);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-item svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .nav-item span {
    font-size: 0.625rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  .nav-item.active {
    color: #E8A87C;
  }

  .nav-item:not(.active):hover {
    color: rgba(var(--theme-text-rgb), 0.7);
  }
</style>
