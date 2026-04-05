<script>
  import { location, citySelectorOpen, fetchTimezone } from '$lib/stores/prayer.js';
  import { t } from '$lib/stores/locale.js';
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';

  // Popular cities shown when no search query — global spread
  const popularCities = [
    { name: 'Mecca', country: 'Saudi Arabia', lat: 21.4225, lng: 39.8262 },
    { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
    { name: 'New York City', country: 'United States', lat: 40.7128, lng: -74.0060 },
    { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
    { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
    { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
    { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011 },
    { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456 },
    { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
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
  <div class="selector-content" role="dialog" aria-modal="true">

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
        placeholder={$t('searchCity')}
        class="search-input"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if isSearching}
        <div class="search-spinner"></div>
      {/if}
    </div>

    <!-- Search prompt hint -->
    {#if searchQuery.length < 2}
      <div class="search-hint" in:fade={{ duration: 300, delay: 150 }}>
        {$t('searchHint')}
      </div>
    {/if}

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
        <div class="no-results" in:fade={{ duration: 200 }}>{$t('noCitiesFound')}</div>
      {/if}
    </div>

    <!-- Close hint -->
    <div class="close-hint" in:fade={{ duration: 300, delay: 350 }}>
      {$t('tapToClose')}
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

  /* Search bar - floating pill, prominent */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.4rem;
    background: rgba(var(--theme-text-rgb), 0.1);
    border: 1px solid rgba(var(--theme-accent-rgb), 0.25);
    border-radius: 3rem;
    width: 100%;
    max-width: 340px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 0 20px rgba(var(--theme-accent-rgb), 0.06);
  }

  .search-icon {
    width: 1.2rem;
    height: 1.2rem;
    color: rgba(var(--theme-accent-rgb), 0.7);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: white;
    font-size: 1rem;
    font-family: 'Montserrat', sans-serif;
    outline: none;
  }

  .search-input::placeholder {
    color: rgba(var(--theme-text-rgb), 0.4);
  }

  .search-hint {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.7rem;
    color: rgba(var(--theme-accent-rgb), 0.45);

    margin-top: -1rem;
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
    gap: 0.5rem;
    max-width: 380px;
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
    font-family: 'Montserrat', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(var(--theme-text-rgb), 0.9);
  }

  .city-chip.selected .chip-name {
    color: var(--theme-accent);
  }

  .chip-country {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.7rem;
    color: rgba(var(--theme-text-rgb), 0.4);
    margin-top: 0.15rem;
  }

  .no-results {
    color: rgba(var(--theme-text-rgb), 0.4);
    font-size: 0.9rem;
    font-family: 'Montserrat', sans-serif;
    padding: 1rem;
  }

  /* Close hint */
  .close-hint {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.6rem;
    color: rgba(var(--theme-text-rgb), 0.2);

    margin-top: 0.5rem;
  }
</style>
