export type Language = "en" | "hi" | "as";

export interface TranslationDict {
  // Navigation & Common
  nav: {
    controlTower: string;
    fieldReport: string;
    live: string;
    polling: string;
    online: string;
    offlineMode: string;
    gpsLocked: string;
    gpsReady: string;
    searchPlaceholder: string;
    logout: string;
  };
  // Field Report Page
  fieldReport: {
    title: string;
    subtitle: string;
    languageLabel: string;
    // Outbox & Sync
    outboxActiveTitle: string;
    outboxActiveDesc: string;
    pendingOutboxBadge: string;
    syncNowBtn: string;
    syncingBtn: string;
    allSynced: string;
    // Main Form
    formTitle: string;
    formSubtitle: string;
    // Incident Type
    incidentTypeLabel: string;
    selectTypePrompt: string;
    typeLandslide: string;
    typeFlood: string;
    typeRoadBlockage: string;
    typeRoadDamage: string;
    typeWeatherDisruption: string;
    typeOther: string;
    // Severity
    severityLabel: string;
    sevCritical: string;
    sevHigh: string;
    sevMedium: string;
    sevLow: string;
    // Description
    descriptionLabel: string;
    descriptionPlaceholder: string;
    // Location
    locationLabel: string;
    locationNamePlaceholder: string;
    latitudeLabel: string;
    longitudeLabel: string;
    useGpsBtn: string;
    locatingBtn: string;
    nerPresetsLabel: string;
    presetGuwahati: string;
    presetShillong: string;
    presetTezpur: string;
    presetGangtok: string;
    // Evidence & Photo
    photoLabel: string;
    takePhotoBtn: string;
    photoGalleryBtn: string;
    photoAttachedText: string;
    removePhotoBtn: string;
    // Actions
    submitReportBtn: string;
    submittingBtn: string;
    saveDraftBtn: string;
    savingDraftBtn: string;
    // Alerts & Notifications
    errSelectType: string;
    errInvalidCoords: string;
    errOutsideNer: string;
    draftSavedSuccess: string;
    reportQueuedOffline: string;
    reportSyncingOnline: string;
    reportSyncedSuccess: string;
    reportEnqueuedRetry: string;
    // AI Assistant Card
    aiAssistantTitle: string;
    aiAssistantSubtitle: string;
    aiInputPlaceholder: string;
    aiExtractBtn: string;
    aiExtractingBtn: string;
    aiApplyDraftBtn: string;
    aiDisclaimer: string;
    aiConfidence: string;
    aiProvider: string;
    // Recent Reports Section
    recentReportsTitle: string;
    recentReportsSubtitle: string;
    totalReportsCount: string;
    statusVerified: string;
    statusPendingSync: string;
    statusDraft: string;
    noReportsYet: string;
  };
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    nav: {
      controlTower: "Control Tower",
      fieldReport: "Field Report",
      live: "Live",
      polling: "Polling",
      online: "Online",
      offlineMode: "Offline Mode",
      gpsLocked: "GPS locked",
      gpsReady: "GPS ready",
      searchPlaceholder: "Search...",
      logout: "Sign Out",
    },
    fieldReport: {
      title: "Field Report",
      subtitle: "Submit geo-tagged road and incident reports from the field",
      languageLabel: "Language",
      outboxActiveTitle: "Location & Offline Outbox Active",
      outboxActiveDesc:
        "Reports created in low-network corridors are stored locally in the secure offline SQLite/IDB outbox. They synchronize automatically via POST /sync/batch when connectivity returns.",
      pendingOutboxBadge: "pending in outbox",
      syncNowBtn: "Sync Outbox Now",
      syncingBtn: "Syncing...",
      allSynced: "Outbox clear — all reports synced",
      formTitle: "Incident Details",
      formSubtitle: "Capture real-time road accessibility disruption",
      incidentTypeLabel: "Incident Type",
      selectTypePrompt: "Select incident classification...",
      typeLandslide: "Landslide",
      typeFlood: "Flooding / Waterlogging",
      typeRoadBlockage: "Road Blockage",
      typeRoadDamage: "Road Damage",
      typeWeatherDisruption: "Weather Disruption",
      typeOther: "Other Disruption",
      severityLabel: "Severity Level",
      sevCritical: "Critical",
      sevHigh: "High",
      sevMedium: "Medium",
      sevLow: "Low",
      descriptionLabel: "Field Observations & Details",
      descriptionPlaceholder:
        "Describe road conditions, affected corridor segment, vehicle passability, or estimated clearance...",
      locationLabel: "Location Name / Landmark",
      locationNamePlaceholder: "e.g. NH-27 near Jorabat, KM 42 marker",
      latitudeLabel: "Latitude",
      longitudeLabel: "Longitude",
      useGpsBtn: "Acquire GPS Fix",
      locatingBtn: "Acquiring...",
      nerPresetsLabel: "NER Calibration Presets",
      presetGuwahati: "Guwahati (NH-27)",
      presetShillong: "Shillong (NH-6)",
      presetTezpur: "Tezpur (NH-15)",
      presetGangtok: "Gangtok (NH-10)",
      photoLabel: "Visual Evidence (Optional)",
      takePhotoBtn: "Capture Photo",
      photoGalleryBtn: "Choose from Gallery",
      photoAttachedText: "Photo captured and stored locally in offline evidence vault",
      removePhotoBtn: "Remove Evidence",
      submitReportBtn: "Submit Field Report",
      submittingBtn: "Submitting...",
      saveDraftBtn: "Save Draft Locally",
      savingDraftBtn: "Saving...",
      errSelectType: "Please select an incident type before submitting.",
      errInvalidCoords: "Please provide valid numeric GPS coordinates.",
      errOutsideNer: "Coordinates are outside the North Eastern Region operational bounds [20-30°N, 88-98°E].",
      draftSavedSuccess: "Draft saved locally to offline storage.",
      reportQueuedOffline:
        "Offline — report saved in local outbox (PENDING). Will synchronize automatically when network returns.",
      reportSyncingOnline: "Report enqueued. Synchronizing with Control Tower...",
      reportSyncedSuccess: "Report successfully synchronized with Control Tower.",
      reportEnqueuedRetry: "Report enqueued in outbox. Synchronization will retry automatically.",
      aiAssistantTitle: "AI/NLP Incident Extraction Assistant",
      aiAssistantSubtitle: "Parse unstructured reports into structured draft",
      aiInputPlaceholder:
        "Paste field notes, citizen report, or radio dispatch text (e.g., 'Heavy landslide reported near NH-27 between Guwahati and Tezpur...')...",
      aiExtractBtn: "Extract Incident with AI",
      aiExtractingBtn: "Extracting...",
      aiApplyDraftBtn: "Apply Extracted Draft to Form",
      aiDisclaimer: "AI-extracted candidate — requires field officer verification before submission.",
      aiConfidence: "Confidence",
      aiProvider: "Provider",
      recentReportsTitle: "Recent Field Reports",
      recentReportsSubtitle: "Recently queued and submitted field reports",
      totalReportsCount: "Total",
      statusVerified: "Verified",
      statusPendingSync: "Pending Sync",
      statusDraft: "Local Draft",
      noReportsYet: "No field reports recorded yet.",
    },
  },
  hi: {
    nav: {
      controlTower: "कंट्रोल टावर",
      fieldReport: "फील्ड रिपोर्ट",
      live: "लाइव",
      polling: "पोलिंग",
      online: "ऑनलाइन",
      offlineMode: "ऑफलाइन मोड",
      gpsLocked: "जीपीएस लॉक",
      gpsReady: "जीपीएस तैयार",
      searchPlaceholder: "खोजें...",
      logout: "साइन आउट",
    },
    fieldReport: {
      title: "फील्ड रिपोर्ट",
      subtitle: "क्षेत्र से जियो-टैग्ड सड़क और घटना रिपोर्ट सबमिट करें",
      languageLabel: "भाषा",
      outboxActiveTitle: "स्थान और ऑफलाइन आउटबॉक्स सक्रिय",
      outboxActiveDesc:
        "कम नेटवर्क वाले क्षेत्रों में दर्ज की गई रिपोर्ट सुरक्षित ऑफलाइन SQLite/IDB आउटबॉक्स में सहेजी जाती हैं। नेटवर्क वापस आने पर वे स्वचालित रूप से POST /sync/batch के माध्यम से सिंक होती हैं।",
      pendingOutboxBadge: "आउटबॉक्स में लंबित",
      syncNowBtn: "अभी आउटबॉक्स सिंक करें",
      syncingBtn: "सिंकिंग जारी...",
      allSynced: "आउटबॉक्स खाली — सभी रिपोर्ट सिंक हो चुकी हैं",
      formTitle: "घटना विवरण",
      formSubtitle: "वास्तविक समय में सड़क सुगमता व्यवधान दर्ज करें",
      incidentTypeLabel: "घटना का प्रकार",
      selectTypePrompt: "घटना वर्गीकरण चुनें...",
      typeLandslide: "भूस्खलन",
      typeFlood: "बाढ़ / जलभराव",
      typeRoadBlockage: "सड़क अवरोध",
      typeRoadDamage: "सड़क क्षति",
      typeWeatherDisruption: "मौसम व्यवधान",
      typeOther: "अन्य व्यवधान",
      severityLabel: "गंभीरता स्तर",
      sevCritical: "गंभीर (क्रिटिकल)",
      sevHigh: "उच्च (हाई)",
      sevMedium: "मध्यम (मीडियम)",
      sevLow: "कम (लो)",
      descriptionLabel: "फील्ड अवलोकन और विवरण",
      descriptionPlaceholder:
        "सड़क की स्थिति, प्रभावित खंड, वाहन पारगमन क्षमता या निकासी समय का विवरण दें...",
      locationLabel: "स्थान का नाम / लैंडमार्क",
      locationNamePlaceholder: "उदा. जोरबाट के पास NH-27, 42 किमी मार्कर",
      latitudeLabel: "अक्षांश (Latitude)",
      longitudeLabel: "देशांतर (Longitude)",
      useGpsBtn: "जीपीएस स्थिति प्राप्त करें",
      locatingBtn: "प्राप्त कर रहा है...",
      nerPresetsLabel: "पूर्वोत्तर परीक्षण प्रीसेट",
      presetGuwahati: "गुवाहाटी (NH-27)",
      presetShillong: "शिलांग (NH-6)",
      presetTezpur: "तेजपुर (NH-15)",
      presetGangtok: "गंगटोक (NH-10)",
      photoLabel: "दृश्य साक्ष्य / फोटो (वैकल्पिक)",
      takePhotoBtn: "कैमरे से फोटो लें",
      photoGalleryBtn: "गैलरी से चुनें",
      photoAttachedText: "फोटो ली गई और स्थानीय ऑफलाइन स्टोरेज में सहेजी गई",
      removePhotoBtn: "साक्ष्य हटाएं",
      submitReportBtn: "फील्ड रिपोर्ट सबमिट करें",
      submittingBtn: "सबमिट हो रहा है...",
      saveDraftBtn: "स्थानीय ड्राफ्ट सहेजें",
      savingDraftBtn: "सहेजा जा रहा है...",
      errSelectType: "कृपया सबमिट करने से पहले घटना का प्रकार चुनें।",
      errInvalidCoords: "कृपया वैध संख्यात्मक जीपीएस निर्देशांक प्रदान करें।",
      errOutsideNer: "निर्देशांक पूर्वोत्तर क्षेत्र सीमा [20-30°N, 88-98°E] से बाहर हैं।",
      draftSavedSuccess: "ड्राफ्ट स्थानीय रूप से ऑफलाइन स्टोरेज में सहेजा गया।",
      reportQueuedOffline:
        "ऑफलाइन — रिपोर्ट स्थानीय आउटबॉक्स में सहेजी गई (लंबित)। नेटवर्क लौटने पर स्वचालित रूप से सिंक होगी।",
      reportSyncingOnline: "रिपोर्ट कतारबद्ध। कंट्रोल टावर के साथ सिंक हो रही है...",
      reportSyncedSuccess: "रिपोर्ट कंट्रोल टावर के साथ सफलतापूर्वक सिंक हो गई।",
      reportEnqueuedRetry: "रिपोर्ट आउटबॉक्स में कतारबद्ध। सिंक स्वचालित रूप से पुनः प्रयास करेगा।",
      aiAssistantTitle: "एआई/एनएलपी घटना निष्कर्षण सहायक",
      aiAssistantSubtitle: "असंरचित रिपोर्ट को संरचित ड्राफ्ट में बदलें",
      aiInputPlaceholder:
        "फील्ड नोट्स, नागरिक रिपोर्ट या रेडियो संदेश का पाठ यहां चिपकाएं (उदा. 'गुवाहाटी और तेजपुर के बीच NH-27 पर भारी भूस्खलन की सूचना...')...",
      aiExtractBtn: "एआई से घटना निकालें",
      aiExtractingBtn: "विश्लेषण जारी...",
      aiApplyDraftBtn: "निकाले गए ड्राफ्ट को फॉर्म में लागू करें",
      aiDisclaimer: "एआई-निकाला गया उम्मीदवार — सबमिट करने से पहले फील्ड अधिकारी द्वारा सत्यापन आवश्यक है।",
      aiConfidence: "विश्वास स्तर",
      aiProvider: "प्रदाता",
      recentReportsTitle: "हाल की फील्ड रिपोर्ट",
      recentReportsSubtitle: "हाल ही में कतारबद्ध और सबमिट की गई फील्ड रिपोर्ट",
      totalReportsCount: "कुल",
      statusVerified: "सत्यापित",
      statusPendingSync: "सिंक लंबित",
      statusDraft: "स्थानीय ड्राफ्ट",
      noReportsYet: "अभी तक कोई फील्ड रिपोर्ट दर्ज नहीं की गई है।",
    },
  },
  as: {
    nav: {
      controlTower: "নিয়ন্ত্ৰণ কক্ষ (Control Tower)",
      fieldReport: "ক্ষেত্ৰ প্ৰতিবেদন (Field Report)",
      live: "সক্ৰিয় (Live)",
      polling: "পলিং (Polling)",
      online: "অনলাইন",
      offlineMode: "অফলাইন ম'ড",
      gpsLocked: "GPS স্থিৰ",
      gpsReady: "GPS সাজু",
      searchPlaceholder: "সন্ধান কৰক...",
      logout: "প্ৰস্থান কৰক",
    },
    fieldReport: {
      title: "ক্ষেত্ৰ প্ৰতিবেদন",
      subtitle: "ক্ষেত্ৰৰ পৰা জিঅ'-টেগযুক্ত পথ আৰু দুৰ্ঘটনা প্ৰতিবেদন দাখিল কৰক",
      languageLabel: "ভাষা",
      outboxActiveTitle: "স্থান আৰু অফলাইন আউটবক্স সক্ৰিয়",
      outboxActiveDesc:
        "কম নেটৱৰ্ক থকা অঞ্চলত কৰা প্ৰতিবেদনসমূহ স্থানীয়ভাৱে সুৰক্ষিত অফলাইন SQLite/IDB আউটবক্সত সংৰক্ষিত হয়। নেটৱৰ্ক ঘূৰি আহিলে সেইবোৰ স্বয়ংক্ৰিয়ভাৱে POST /sync/batch যোগে সংমিশ্ৰিত হ'ব।",
      pendingOutboxBadge: "আউটবক্সত বাকী আছে",
      syncNowBtn: "এতিয়াই আউটবক্স সংমিশ্ৰণ কৰক",
      syncingBtn: "সংমিশ্ৰণ চলি আছে...",
      allSynced: "আউটবক্স খালী — সকলো প্ৰতিবেদন সংমিশ্ৰিত হৈছে",
      formTitle: "ঘটনাৰ বিৱৰণ",
      formSubtitle: "বাস্তৱ সময়ৰ পথ চলাচলৰ বিঘিনি লিপিবদ্ধ কৰক",
      incidentTypeLabel: "ঘটনাৰ প্ৰকাৰ",
      selectTypePrompt: "ঘটনাৰ শ্ৰেণীবিভাজন বাছক...",
      typeLandslide: "ভূমিস্খলন",
      typeFlood: "বানপানী / পানী জমা",
      typeRoadBlockage: "পথ অৱৰোধ",
      typeRoadDamage: "পথৰ ক্ষতিসাধন",
      typeWeatherDisruption: "বতৰৰ ব্যাঘাত",
      typeOther: "অন্যান্য ব্যাঘাত",
      severityLabel: "গুৰুত্বৰ মাত্ৰা",
      sevCritical: "সংকটজনক (Critical)",
      sevHigh: "উচ্চ (High)",
      sevMedium: "মধ্যম (Medium)",
      sevLow: "নিম্ন (Low)",
      descriptionLabel: "ক্ষেত্ৰ পৰ্যবেক্ষণ আৰু বিৱৰণ",
      descriptionPlaceholder:
        "পথৰ অৱস্থা, ক্ষতিগ্ৰস্ত অংশ, যান-বাহন চলাচলৰ ক্ষমতা বা সম্ভাৱ্য নিষ্কাষণ সময়ৰ বিৱৰণ দিয়ক...",
      locationLabel: "স্থানৰ নাম / চিহ্ন",
      locationNamePlaceholder: "যেনে যোৰাবাটৰ ওচৰৰ NH-27, ৪২ কিমি চিহ্ন",
      latitudeLabel: "অক্ষৰেখা (Latitude)",
      longitudeLabel: "দ্ৰাঘিমাৰেখা (Longitude)",
      useGpsBtn: "GPS অৱস্থান সংগ্ৰহ কৰক",
      locatingBtn: "সংগ্ৰহ চলি আছে...",
      nerPresetsLabel: "উত্তৰ-পূব প্ৰিচেট",
      presetGuwahati: "গুৱাহাটী (NH-27)",
      presetShillong: "শ্বিলং (NH-6)",
      presetTezpur: "তেজপুৰ (NH-15)",
      presetGangtok: "গেংটক (NH-10)",
      photoLabel: "দৃশ্যমান প্ৰমাণ / ফটো (ঐচ্ছিক)",
      takePhotoBtn: "কেমেৰাৰে ফটো তোলক",
      photoGalleryBtn: "গেলেৰীৰ পৰা বাছক",
      photoAttachedText: "ফটো তোলা হ'ল আৰু স্থানীয় অফলাইন ষ্টোৰেজত সংৰক্ষিত কৰা হ'ল",
      removePhotoBtn: "প্ৰমাণ আঁতৰাওক",
      submitReportBtn: "ক্ষেত্ৰ প্ৰতিবেদন দাখিল কৰক",
      submittingBtn: "দাখিল হৈ আছে...",
      saveDraftBtn: "খচৰা স্থানীয়ভাৱে সাঁচক",
      savingDraftBtn: "সঁচি থকা হৈছে...",
      errSelectType: "অনুগ্ৰহ কৰি দাখিল কৰাৰ আগতে ঘটনাৰ প্ৰকাৰ বাছক।",
      errInvalidCoords: "অনুগ্ৰহ কৰি বৈধ সংখ্যাসূচক GPS স্থানাংক দিয়ক।",
      errOutsideNer: "স্থানাংক উত্তৰ-পূব অঞ্চলৰ সীমা [২০-৩০° উত্তৰ, ৮৮-৯৮° পূব]ৰ বাহিৰত।",
      draftSavedSuccess: "খচৰা স্থানীয়ভাৱে অফলাইন ভঁৰালত সংৰক্ষণ কৰা হ'ল।",
      reportQueuedOffline:
        "অফলাইন — প্ৰতিবেদন স্থানীয় আউটবক্সত সংৰক্ষিত হ'ল (PENDING)। নেটৱৰ্ক পোৱাৰ লগে লগে স্বয়ংক্ৰিয়ভাৱে সংমিশ্ৰিত হ'ব।",
      reportSyncingOnline: "প্ৰতিবেদন ক্ৰমবদ্ধ হ'ল। নিয়ন্ত্ৰণ কক্ষৰ সৈতে সংমিশ্ৰণ চলি আছে...",
      reportSyncedSuccess: "প্ৰতিবেদন নিয়ন্ত্ৰণ কক্ষৰ সৈতে সফলতাৰে সংমিশ্ৰিত হ'ল।",
      reportEnqueuedRetry: "প্ৰতিবেদন আউটবক্সত সংৰক্ষিত। সংমিশ্ৰণ স্বয়ংক্ৰিয়ভাৱে পুনৰ চেষ্টা কৰা হ'ব।",
      aiAssistantTitle: "AI/NLP ঘটনা নিষ্কাশন সহায়ক",
      aiAssistantSubtitle: "অসংগঠিত পাঠৰ পৰা প্ৰতিবেদনৰ খচৰা তৈয়াৰ কৰক",
      aiInputPlaceholder:
        "ক্ষেত্ৰৰ টোকা, নাগৰিকৰ খবৰ বা ৰেডিঅ' বাৰ্তা ইয়াত পেষ্ট কৰক (যেনে 'গুৱাহাটী আৰু তেজপুৰৰ মাজৰ NH-27ত ভূমিস্খলন হোৱাৰ খবৰ...')...",
      aiExtractBtn: "AIৰ দ্বাৰা ঘটনা চিনাক্ত কৰক",
      aiExtractingBtn: "বিশ্লেষণ চলি আছে...",
      aiApplyDraftBtn: "উদ্ধাৰ কৰা খচৰা ফৰ্মত প্ৰয়োগ কৰক",
      aiDisclaimer: "AI-উদ্ধাৰ কৰা খচৰা — দাখিল কৰাৰ আগতে ক্ষেত্ৰ বিষয়াৰ দ্বাৰা সত্যতা নিৰূপণ প্ৰয়োজন।",
      aiConfidence: "বিশ্বাসযোগ্যতা",
      aiProvider: "প্ৰদানকাৰী",
      recentReportsTitle: "শেহতীয়া ক্ষেত্ৰ প্ৰতিবেদন",
      recentReportsSubtitle: "শেহতীয়াকৈ ক্ৰমবদ্ধ আৰু দাখিল কৰা প্ৰতিবেদনসমূহ",
      totalReportsCount: "সৰ্বমুঠ",
      statusVerified: "প্ৰমাণিত",
      statusPendingSync: "সংমিশ্ৰণ বাকী",
      statusDraft: "স্থানীয় খচৰা",
      noReportsYet: "এতিয়ালৈকে কোনো ক্ষেত্ৰ প্ৰতিবেদন নথিভুক্ত হোৱা নাই।",
    },
  },
};
