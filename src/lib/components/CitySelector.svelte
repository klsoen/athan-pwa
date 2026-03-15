<script>
  import { location, citySelectorOpen, fetchTimezone } from '$lib/stores/prayer.js';
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';

  // Popular cities shown when no search query
  const popularCities = [
    { name: 'Mecca', country: 'Saudi Arabia', lat: 21.4225, lng: 39.8262 },
    { name: 'Medina', country: 'Saudi Arabia', lat: 24.5247, lng: 39.5692 },
    { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
    { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
    { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
    { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  ];

  let isOpen = false;
  let searchQuery = '';
  let selectedCity = popularCities[0];
  let searchResults = [];
  let isSearching = false;
  let searchTimeout;

  // Debounced search using Nominatim API
  async function searchCities(query) {
    if (!query || query.length < 2) {
      searchResults = [];
      return;
    }

    isSearching = true;
    try {
      // Search with both original query and "city" appended, merge results
      const [response1, response2] = await Promise.all([
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        ),
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' city')}&format=json&limit=10&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
      ]);

      const [data1, data2] = await Promise.all([response1.json(), response2.json()]);
      const data = [...data2, ...data1]; // Prioritize "city" results

      searchResults = data
        .map(place => {
          // Determine if this is a city-level result
          const placeType = place.type;
          const hasCity = place.address?.city || place.address?.town || place.address?.village;
          const isRegion = placeType === 'administrative' || placeType === 'state' || placeType === 'region';

          const name = place.address?.city
            || place.address?.town
            || place.address?.village
            || place.address?.municipality
            || place.name?.split(',')[0]
            || place.display_name?.split(',')[0];

          return {
            name: name,
            country: place.address?.country || '',
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            priority: hasCity ? 0 : (isRegion ? 2 : 1),
            type: placeType
          };
        })
        .filter(city => city.name)
        .sort((a, b) => a.priority - b.priority) // Cities first, regions last
        .filter((city, index, self) =>
          index === self.findIndex(c => c.name === city.name && c.country === city.country)
        )
        .slice(0, 6);
    } catch (error) {
      console.error('City search failed:', error);
      searchResults = [];
    }
    isSearching = false;
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchCities(searchQuery);
    }, 300);
  }

  $: displayCities = searchQuery.length >= 2 ? searchResults : popularCities;

  async function selectCity(city) {
    selectedCity = city;
    close();

    const timezone = await fetchTimezone(city.lat, city.lng);

    const cityData = {
      latitude: city.lat,
      longitude: city.lng,
      name: city.name,
      timezone: timezone
    };

    location.set(cityData);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('azan-city', JSON.stringify({ ...city, timezone }));
    }
  }

  function open() {
    isOpen = true;
    citySelectorOpen.set(true);
    searchResults = [];
  }

  function close() {
    isOpen = false;
    citySelectorOpen.set(false);
    searchQuery = '';
    searchResults = [];
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      close();
    }
  }

  onMount(async () => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('azan-city');
      if (saved) {
        const city = JSON.parse(saved);
        selectedCity = city;

        let timezone = city.timezone;
        if (!timezone) {
          timezone = await fetchTimezone(city.lat, city.lng);
          localStorage.setItem('azan-city', JSON.stringify({ ...city, timezone }));
        }

        location.set({
          latitude: city.lat,
          longitude: city.lng,
          name: city.name,
          timezone: timezone
        });
      } else {
        selectCity(selectedCity);
      }
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<button class="location-btn" on:click|stopPropagation={open} type="button">
  <svg class="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
  <span>{selectedCity.name}</span>
</button>

{#if isOpen}
  <!-- Invisible backdrop for closing -->
  <button
    class="backdrop"
    on:click|stopPropagation={close}
    type="button"
    aria-label="Close"
    transition:fade={{ duration: 200 }}
  ></button>

  <!-- Floating content - no visible container -->
  <div class="selector-content" on:click|stopPropagation role="dialog" aria-modal="true">

    <!-- Search bar -->
    <div class="search-bar" in:fly={{ y: -20, duration: 400, delay: 50, easing: cubicOut }}>
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        on:input={handleSearchInput}
        placeholder="Search city..."
        class="search-input"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if isSearching}
        <div class="search-spinner"></div>
      {/if}
    </div>

    <!-- City chips -->
    <div class="city-chips" in:fade={{ duration: 300, delay: 100 }}>
      {#each displayCities as city, i (`${city.name}-${city.lat}`)}
        <button
          class="city-chip"
          class:selected={selectedCity.name === city.name && selectedCity.country === city.country}
          on:click={() => selectCity(city)}
          type="button"
          in:scale={{ duration: 300, delay: 120 + i * 40, start: 0.8, easing: backOut }}
        >
          <span class="chip-name">{city.name}</span>
          <span class="chip-country">{city.country}</span>
        </button>
      {/each}

      {#if searchQuery.length >= 2 && displayCities.length === 0 && !isSearching}
        <div class="no-results" in:fade={{ duration: 200 }}>No cities found</div>
      {/if}
    </div>

    <!-- Close hint -->
    <div class="close-hint" in:fade={{ duration: 300, delay: 350 }}>
      tap anywhere to close
    </div>
  </div>
{/if}

<style>
  .location-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.85rem;
    background: rgba(var(--theme-text-rgb), 0.06);
    border: 1px solid rgba(var(--theme-text-rgb), 0.1);
    border-radius: 2rem;
    color: rgba(var(--theme-text-rgb), 0.6);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .location-btn:hover {
    background: rgba(var(--theme-text-rgb), 0.1);
    color: rgba(var(--theme-text-rgb), 0.9);
  }

  .location-icon {
    width: 1rem;
    height: 1rem;
  }

  /* Invisible backdrop */
  .backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 1000;
    border: none;
    cursor: default;
  }

  /* Floating content - centered, no container */
  .selector-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 1rem;
    width: 90vw;
    max-width: 400px;
  }

  /* Search bar - floating pill */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.9rem 1.25rem;
    background: rgba(var(--theme-text-rgb), 0.08);
    border: 1px solid rgba(var(--theme-text-rgb), 0.12);
    border-radius: 3rem;
    width: 100%;
    max-width: 320px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .search-icon {
    width: 1.1rem;
    height: 1.1rem;
    color: rgba(var(--theme-accent-rgb), 0.6);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: white;
    font-size: 0.95rem;
    font-family: 'Outfit', sans-serif;
    outline: none;
  }

  .search-input::placeholder {
    color: rgba(var(--theme-text-rgb), 0.35);
  }

  .search-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(var(--theme-accent-rgb), 0.2);
    border-top-color: rgba(var(--theme-accent-rgb), 0.8);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* City chips - flowing layout */
  .city-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6rem;
    max-width: 360px;
  }

  .city-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.8rem 1.2rem;
    background: rgba(var(--theme-text-rgb), 0.05);
    border: 1px solid rgba(var(--theme-text-rgb), 0.1);
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .city-chip:hover {
    background: rgba(var(--theme-text-rgb), 0.1);
    border-color: rgba(var(--theme-text-rgb), 0.2);
    transform: translateY(-2px);
  }

  .city-chip.selected {
    background: rgba(var(--theme-accent-rgb), 0.15);
    border-color: rgba(var(--theme-accent-rgb), 0.4);
  }

  .chip-name {
    font-family: 'Outfit', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(var(--theme-text-rgb), 0.9);
  }

  .city-chip.selected .chip-name {
    color: var(--theme-accent);
  }

  .chip-country {
    font-family: 'Outfit', sans-serif;
    font-size: 0.7rem;
    color: rgba(var(--theme-text-rgb), 0.4);
    margin-top: 0.15rem;
  }

  .no-results {
    color: rgba(var(--theme-text-rgb), 0.4);
    font-size: 0.9rem;
    font-family: 'Outfit', sans-serif;
    padding: 1rem;
  }

  /* Close hint */
  .close-hint {
    font-family: 'Outfit', sans-serif;
    font-size: 0.6rem;
    color: rgba(var(--theme-text-rgb), 0.2);
    letter-spacing: 0.1em;
    margin-top: 0.5rem;
  }
</style>
