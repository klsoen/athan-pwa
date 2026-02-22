<script>
  import { location, citySelectorOpen, fetchTimezone, calculationMethod } from '$lib/stores/prayer.js';
  import { onMount } from 'svelte';

  // Calculation methods with display names
  const methods = [
    { id: 'MuslimWorldLeague', name: 'MWL', full: 'Muslim World League' },
    { id: 'Egyptian', name: 'Egypt', full: 'Egyptian' },
    { id: 'Karachi', name: 'Karachi', full: 'Karachi' },
    { id: 'UmmAlQura', name: 'Umm al-Qura', full: 'Umm al-Qura' },
    { id: 'Dubai', name: 'Dubai', full: 'Dubai' },
    { id: 'NorthAmerica', name: 'ISNA', full: 'North America (ISNA)' },
    { id: 'MoonsightingCommittee', name: 'Moonsighting', full: 'Moonsighting Committee' },
    { id: 'Turkey', name: 'Turkey', full: 'Turkey' },
    { id: 'Tehran', name: 'Tehran', full: 'Tehran' },
    { id: 'Singapore', name: 'Singapore', full: 'Singapore' },
  ];

  let selectedMethod = 'MuslimWorldLeague';

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
  let inputRef;
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      const data = await response.json();

      searchResults = data
        .map(place => {
          // Extract the best name for the place
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
            lng: parseFloat(place.lon)
          };
        })
        .filter(city => city.name) // Must have a name
        .filter((city, index, self) =>
          // Remove duplicates by name + country
          index === self.findIndex(c => c.name === city.name && c.country === city.country)
        )
        .slice(0, 6);
    } catch (error) {
      console.error('City search failed:', error);
      searchResults = [];
    }
    isSearching = false;
  }

  // Debounce search input
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

    // Fetch timezone for the city
    const timezone = await fetchTimezone(city.lat, city.lng);

    const cityData = {
      latitude: city.lat,
      longitude: city.lng,
      name: city.name,
      timezone: timezone
    };

    location.set(cityData);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('athan-city', JSON.stringify({ ...city, timezone }));
    }
  }

  function selectMethod(method) {
    selectedMethod = method.id;
    calculationMethod.set(method.id);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('athan-method', method.id);
    }
  }

  function open() {
    isOpen = true;
    citySelectorOpen.set(true);
    searchResults = [];
    setTimeout(() => inputRef?.focus(), 100);
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
      // Load saved calculation method
      const savedMethod = localStorage.getItem('athan-method');
      if (savedMethod) {
        selectedMethod = savedMethod;
        calculationMethod.set(savedMethod);
      }

      const saved = localStorage.getItem('athan-city');
      if (saved) {
        const city = JSON.parse(saved);
        selectedCity = city;

        // If timezone is missing, fetch it
        let timezone = city.timezone;
        if (!timezone) {
          timezone = await fetchTimezone(city.lat, city.lng);
          // Update localStorage with timezone
          localStorage.setItem('athan-city', JSON.stringify({ ...city, timezone }));
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
  <button class="spotlight-backdrop" on:click|stopPropagation={close} type="button" aria-label="Close"></button>

  <div class="spotlight" role="dialog" aria-modal="true" on:click|stopPropagation>
    <div class="spotlight-search">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        bind:this={inputRef}
        type="text"
        bind:value={searchQuery}
        on:input={handleSearchInput}
        placeholder="Search any city..."
        class="search-input"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if isSearching}
        <div class="search-spinner"></div>
      {/if}
    </div>

    {#if searchQuery.length > 0 && searchQuery.length < 2}
      <div class="search-hint">Type at least 2 characters to search</div>
    {/if}

    <ul class="city-list" role="listbox">
      {#each displayCities as city (`${city.name}-${city.lat}`)}
        <li>
          <button
            class="city-item"
            class:selected={selectedCity.name === city.name && selectedCity.country === city.country}
            on:click={() => selectCity(city)}
            type="button"
            role="option"
            aria-selected={selectedCity.name === city.name}
          >
            <span class="city-name">{city.name}</span>
            <span class="city-country">{city.country}</span>
          </button>
        </li>
      {/each}

      {#if searchQuery.length >= 2 && displayCities.length === 0 && !isSearching}
        <li class="no-results">No cities found</li>
      {/if}
    </ul>

    <!-- Calculation Method Selector -->
    <div class="method-section">
      <span class="method-label">Calculation</span>
      <div class="method-scroll">
        {#each methods as method}
          <button
            class="method-pill"
            class:active={selectedMethod === method.id}
            on:click|stopPropagation={() => selectMethod(method)}
            type="button"
            title={method.full}
          >
            {method.name}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .location-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.85rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 2rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .location-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .location-icon {
    width: 1rem;
    height: 1rem;
  }

  /* Backdrop */
  .spotlight-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1000;
    border: none;
    cursor: default;
    animation: backdropIn 0.3s ease-out;
  }

  @keyframes backdropIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Spotlight */
  .spotlight {
    position: fixed;
    top: 12vh;
    left: 50%;
    transform: translateX(-50%);
    width: 90vw;
    max-width: 360px;
    background: #1c1c1e;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 14px;
    overflow: hidden;
    z-index: 1001;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: spotlightIn 0.2s ease-out;
  }

  @keyframes spotlightIn {
    from {
      opacity: 0;
      transform: translateX(-50%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
  }

  /* Search */
  .spotlight-search {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.9rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .search-icon {
    width: 1.2rem;
    height: 1.2rem;
    color: rgba(255, 255, 255, 0.4);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: white;
    font-size: 1rem;
    outline: none;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  .search-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(212, 175, 55, 0.2);
    border-top-color: rgba(212, 175, 55, 0.8);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .search-hint {
    padding: 0.6rem 1rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  /* City list */
  .city-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem 0;
    max-height: 280px;
    overflow-y: auto;
  }

  .city-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .city-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .city-item.selected {
    background: rgba(212, 175, 55, 0.15);
  }

  .city-name {
    font-size: 0.95rem;
    color: white;
  }

  .city-country {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .city-item.selected .city-name {
    color: #d4af37;
  }

  .no-results {
    padding: 1.5rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.35);
    font-size: 0.9rem;
  }

  /* Calculation Method Selector */
  .method-section {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.75rem 1rem;
  }

  .method-label {
    display: block;
    font-size: 0.7rem;
    color: rgba(212, 175, 55, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.6rem;
    font-family: 'Outfit', sans-serif;
  }

  .method-scroll {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .method-scroll::-webkit-scrollbar {
    display: none;
  }

  .method-pill {
    flex-shrink: 0;
    padding: 0.4rem 0.7rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: 'Outfit', sans-serif;
    white-space: nowrap;
  }

  .method-pill:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  .method-pill.active {
    background: rgba(212, 175, 55, 0.2);
    border-color: rgba(212, 175, 55, 0.4);
    color: #d4af37;
  }
</style>
