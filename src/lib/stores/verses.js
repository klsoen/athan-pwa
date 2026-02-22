import { writable } from 'svelte/store';

// Curated VERY SHORT verses only - one line max
const verseReferences = [
  '94:5',    // For indeed, with hardship comes ease
  '94:6',    // Indeed, with hardship comes ease
  '55:13',   // So which of the favors of your Lord would you deny?
  '94:8',    // And to your Lord direct your longing
  '51:21',   // And in yourselves. Will you not then see?
  '20:14',   // Indeed, I am Allah. Worship Me
  '89:28',   // Return to your Lord, well-pleased and pleasing
  '112:1',   // Say, He is Allah, the One
  '112:2',   // Allah, the Eternal Refuge
  '2:152',   // Remember Me; I will remember you
  '73:8',    // And devote yourself to Him with complete devotion
  '93:3',    // Your Lord has not forsaken you, nor has He detested
  '94:1',    // Did We not expand for you your breast?
  '108:1',   // Indeed, We have granted you al-Kawthar
  '93:4',    // And the Hereafter is better for you than the first
];

// Current verse store
export const currentVerse = writable(null);
export const verseLoading = writable(false);

// Cache for fetched verses
const verseCache = new Map();

// Fetch a verse from the API
async function fetchVerse(reference) {
  if (verseCache.has(reference)) {
    return verseCache.get(reference);
  }

  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${reference}/editions/quran-uthmani,en.sahih`
    );
    const data = await response.json();

    if (data.code === 200 && data.data) {
      const arabicData = data.data[0];
      const englishData = data.data[1];

      const verse = {
        arabic: arabicData.text,
        english: englishData.text,
        surah: englishData.surah.englishName,
        surahArabic: arabicData.surah.name,
        ayah: englishData.numberInSurah,
        reference: reference
      };

      verseCache.set(reference, verse);
      return verse;
    }
  } catch (e) {
    console.error('Failed to fetch verse:', e);
  }

  return null;
}

// Get a random verse
export async function getRandomVerse() {
  verseLoading.set(true);

  const randomIndex = Math.floor(Math.random() * verseReferences.length);
  const reference = verseReferences[randomIndex];

  const verse = await fetchVerse(reference);

  if (verse) {
    currentVerse.set(verse);
  }

  verseLoading.set(false);
  return verse;
}

// Cycle to next verse
let currentIndex = Math.floor(Math.random() * verseReferences.length);

export async function getNextVerse() {
  verseLoading.set(true);

  currentIndex = (currentIndex + 1) % verseReferences.length;
  const reference = verseReferences[currentIndex];

  const verse = await fetchVerse(reference);

  if (verse) {
    currentVerse.set(verse);
  }

  verseLoading.set(false);
  return verse;
}

// Initialize with a random verse
export function initVerses() {
  getRandomVerse();
}
