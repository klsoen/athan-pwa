import { writable, derived } from 'svelte/store';

// --- Persisted stores ---

function createPersistedStore(key, defaultValue) {
  const initial = typeof localStorage !== 'undefined'
    ? localStorage.getItem(key) ?? defaultValue
    : defaultValue;
  const store = writable(initial);
  store.subscribe(val => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  });
  return store;
}

/** 'en' | 'ar' */
export const language = createPersistedStore('azan-language', 'en');

/** Explicit user override: 'western' | 'arabic' | '' (empty = follow language) */
export const numeralOverride = createPersistedStore('azan-numeral-override', '');

/** 'western' (123) | 'arabic' (١٢٣) — auto-follows language unless user overrides */
export const numeralStyle = derived([language, numeralOverride], ([$lang, $override]) => {
  if ($override) return $override;
  return $lang === 'ar' ? 'arabic' : 'western';
});

// --- Arabic numeral mapping ---

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicNumerals(str) {
  return String(str).replace(/\d/g, d => arabicDigits[d]);
}

/** Format a number/string respecting the current numeral style */
export const formatNum = derived(numeralStyle, ($style) => {
  return (val) => $style === 'arabic' ? toArabicNumerals(val) : String(val);
});

// --- Translations ---

const translations = {
  // General
  settings: { en: 'Settings', ar: 'الإعدادات' },
  theme: { en: 'Theme', ar: 'المظهر' },
  dark: { en: 'Dark', ar: 'داكن' },
  light: { en: 'Light', ar: 'فاتح' },
  clockIndicators: { en: 'Clock Indicators', ar: 'مؤشرات الساعة' },
  clockLabelSize: { en: 'Clock Label Size', ar: 'حجم تسمية الساعة' },
  small: { en: 'Small', ar: 'صغير' },
  medium: { en: 'Medium', ar: 'متوسط' },
  large: { en: 'Large', ar: 'كبير' },
  calculationMethod: { en: 'Calculation Method', ar: 'طريقة الحساب' },
  customAngles: { en: 'Custom Angles', ar: 'زوايا مخصصة' },
  degrees: { en: 'degrees', ar: 'درجة' },
  degreesHint: { en: 'Degrees below horizon for twilight calculation', ar: 'درجات تحت الأفق لحساب الشفق' },
  yourAngles: { en: 'Your angles', ar: 'زواياك' },
  tapToClose: { en: 'tap anywhere to close', ar: 'انقر في أي مكان للإغلاق' },
  closeSettings: { en: 'Close settings', ar: 'إغلاق الإعدادات' },
  beautifulPrayerTimes: { en: 'Beautiful Islamic prayer times', ar: 'مواقيت صلاة إسلامية جميلة' },
  language: { en: 'Language', ar: 'اللغة' },
  numerals: { en: 'Numerals', ar: 'الأرقام' },
  english: { en: 'English', ar: 'English' },
  arabic: { en: 'العربية', ar: 'العربية' },
  westernNumerals: { en: '123', ar: '123' },
  arabicNumerals: { en: '١٢٣', ar: '١٢٣' },
  auto: { en: 'Auto', ar: 'تلقائي' },

  // Prayer names
  fajr: { en: 'Fajr', ar: 'الفجر' },
  sunrise: { en: 'Sunrise', ar: 'الشروق' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },

  // Clock center
  until: { en: 'until', ar: 'حتى' },
  next: { en: 'Next', ar: 'التالي' },
  tapForFullClock: { en: 'tap for full clock', ar: 'انقر للساعة الكاملة' },

  // Date
  today: { en: 'Today', ar: 'اليوم' },
  tomorrow: { en: 'Tomorrow', ar: 'غداً' },
  yesterday: { en: 'Yesterday', ar: 'أمس' },
  daysAhead: { en: 'days ahead', ar: 'أيام قادمة' },
  daysBack: { en: 'days back', ar: 'أيام سابقة' },
  ah: { en: 'AH', ar: 'هـ' },

  // Indicators
  qibla: { en: 'Qibla', ar: 'القبلة' },
  compassNeedle: { en: 'Compass needle', ar: 'إبرة البوصلة' },
  lastThird: { en: 'Last Third', ar: 'الثلث الأخير' },
  bestTimeForDua: { en: 'Best time for dua', ar: 'أفضل وقت للدعاء' },
  firstThirdEnd: { en: '1st Third End', ar: 'نهاية الثلث الأول' },
  ishaPreferredEnd: { en: 'Isha preferred end', ar: 'نهاية العشاء المفضلة' },
  jumahDua: { en: "Jumu'ah Dua", ar: 'دعاء الجمعة' },
  asrToMaghrib: { en: 'Asr to Maghrib', ar: 'العصر إلى المغرب' },
  duha: { en: 'Duha', ar: 'الضحى' },
  morningPrayer: { en: 'Morning prayer', ar: 'صلاة الصباح' },
  qaylula: { en: 'Qaylula', ar: 'القيلولة' },
  middayRest: { en: 'Mid-day rest', ar: 'راحة منتصف النهار' },
  qiblaNote: {
    en: 'Qibla is based on your selected city—we never track your live location. May be inaccurate within Makkah or while travelling.',
    ar: 'القبلة مبنية على مدينتك المختارة — لا نتتبع موقعك الحي أبداً. قد تكون غير دقيقة داخل مكة أو أثناء السفر.'
  },
  compassDenied: {
    en: 'Compass permission was denied. Enable it in Safari settings to use Qibla.',
    ar: 'تم رفض إذن البوصلة. فعّله من إعدادات Safari لاستخدام القبلة.'
  },
  compassError: {
    en: 'Could not request compass permission right now.',
    ar: 'تعذر طلب إذن البوصلة حالياً.'
  },
  rotateToCalibrate: { en: 'Rotate device to calibrate...', ar: 'أدر الجهاز للمعايرة...' },
  compassPermissionDenied: { en: 'Compass permission denied', ar: 'تم رفض إذن البوصلة' },

  // Special time labels (active indicators)
  duhaUntil: { en: 'Duha until', ar: 'الضحى حتى' },
  qaylulaUntil: { en: 'Qaylula until', ar: 'القيلولة حتى' },
  jumahDuaUntilMaghrib: { en: "Jumu'ah Dua until Maghrib", ar: 'دعاء الجمعة حتى المغرب' },
  firstThirdUntil: { en: '1st Third until', ar: 'الثلث الأول حتى' },
  lastThirdUntilFajr: { en: 'Last Third until Fajr', ar: 'الثلث الأخير حتى الفجر' },

  // City selector
  searchCity: { en: 'Search for your city...', ar: 'ابحث عن مدينتك...' },
  searchHint: { en: 'type your city name above to find it', ar: 'اكتب اسم مدينتك أعلاه للعثور عليها' },
  useMyLocation: { en: 'Use my location', ar: 'استخدم موقعي' },
  locationDisclaimer: {
    en: 'Your browser will ask for location permission. We only use it to find your nearest city — your exact position is never stored or tracked.',
    ar: 'سيطلب متصفحك إذن الموقع. نستخدمه فقط لإيجاد أقرب مدينة — لا يتم تخزين أو تتبع موقعك الدقيق أبداً.'
  },
  allow: { en: 'Allow', ar: 'السماح' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  detectingCity: { en: 'Detecting your city...', ar: 'جارٍ تحديد مدينتك...' },
  noCitiesFound: { en: 'No cities found', ar: 'لم يتم العثور على مدن' },
  geoUnsupported: { en: 'Geolocation is not supported by your browser.', ar: 'تحديد الموقع غير مدعوم في متصفحك.' },
  geoDenied: { en: 'Location permission denied. Enable it in your browser settings.', ar: 'تم رفض إذن الموقع. فعّله من إعدادات المتصفح.' },
  geoTimeout: { en: 'Location request timed out. Try again.', ar: 'انتهت مهلة طلب الموقع. حاول مرة أخرى.' },
  geoError: { en: 'Could not detect your location.', ar: 'تعذر تحديد موقعك.' },

  // Calculation methods
  MuslimWorldLeague: { en: 'Muslim World League', ar: 'رابطة العالم الإسلامي' },
  Egyptian: { en: 'Egyptian General Authority of Survey', ar: 'الهيئة المصرية العامة للمساحة' },
  Karachi: { en: 'University of Islamic Sciences, Karachi', ar: 'جامعة العلوم الإسلامية، كراتشي' },
  UmmAlQura: { en: 'Umm al-Qura University, Makkah', ar: 'جامعة أم القرى، مكة' },
  Dubai: { en: 'UAE General Authority of Islamic Affairs', ar: 'الهيئة العامة للشؤون الإسلامية، الإمارات' },
  Kuwait: { en: 'Ministry of Awqaf, Kuwait', ar: 'وزارة الأوقاف، الكويت' },
  Qatar: { en: 'Qatar Calendar House', ar: 'دار التقويم القطري' },
  NorthAmerica: { en: 'Islamic Society of North America', ar: 'الجمعية الإسلامية لأمريكا الشمالية' },
  MoonsightingCommittee: { en: 'Moonsighting Committee Worldwide', ar: 'لجنة رؤية الهلال العالمية' },
  Turkey: { en: 'Diyanet Isleri Baskanligi, Turkey', ar: 'رئاسة الشؤون الدينية، تركيا' },
  Tehran: { en: 'Institute of Geophysics, Tehran', ar: 'معهد الجيوفيزياء، طهران' },
  Singapore: { en: 'Islamic Religious Council of Singapore', ar: 'المجلس الديني الإسلامي، سنغافورة' },
  Custom: { en: 'Custom', ar: 'مخصص' },

  // Hijri months
  hijriMonths: {
    en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'],
    ar: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة']
  },

  backToToday: { en: 'Back To Today', ar: 'العودة لليوم' },
  newBadge: { en: 'NEW', ar: 'جديد' },

  // Notifications
  newIslamicMonth: { en: 'New Islamic Month', ar: 'بداية الشهر الهجري' },
  notifications: { en: 'Notifications', ar: 'الإشعارات' },
  notificationsEnabled: { en: 'Notifications Enabled', ar: 'الإشعارات مفعّلة' },
  enableNotifications: { en: 'Enable Notifications', ar: 'تفعيل الإشعارات' },
  updatingReminders: { en: 'Updating reminders...', ar: 'جارٍ تحديث التذكيرات...' },
  remindersUpdateAuto: { en: 'Prayer reminders update automatically', ar: 'تتحدث تذكيرات الصلاة تلقائياً' },
  remindersPrompt: { en: 'Get gentle reminders for each prayer', ar: 'احصل على تذكيرات لطيفة لكل صلاة' },
  prayerAlert: { en: 'Prayer alert', ar: 'تنبيه صلاة' },
  specialReminder: { en: 'Special reminder', ar: 'تذكير خاص' },
};

/**
 * Derived store: returns a function t(key) that gives the translated string.
 */
export const t = derived(language, ($lang) => {
  return (key) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[$lang] ?? entry.en ?? key;
  };
});

/**
 * Derived store: returns true when language is Arabic (for RTL/style adjustments).
 */
export const isArabic = derived(language, ($lang) => $lang === 'ar');
