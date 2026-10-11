import type { CommunityAlert, RiskLevel } from '../types';

export type AlertLanguage = 'en' | 'hi' | 'as';

export interface MultilingualAlertDetails {
  lang: AlertLanguage;
  langLabel: string;
  langNative: string;
  flag: string;
  title: string;
  severity: string;
  hazardType: string;
  message: string;
  shelter: string;
  route: string;
  travelAdvisory: string;
  speechScript: string;
  langCode: string;
}

export const ALERT_LANGUAGES: Array<{ id: AlertLanguage; label: string; native: string; flag: string }> = [
  { id: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { id: 'as', label: 'Assamese', native: 'অসমীয়া', flag: '🌾' },
];

export function getMultilingualAlertDetails(
  alert: CommunityAlert,
  lang: AlertLanguage
): MultilingualAlertDetails {
  const loc = alert.affectedArea || alert.area || alert.location || 'Assam Sector';
  const rawSev = (alert.severity || 'HIGH').toUpperCase() as RiskLevel;
  const rawHazard = (alert.hazardType || alert.title || '').toLowerCase();

  const isMulti = rawHazard.includes('flood') && (rawHazard.includes('landslide') || rawHazard.includes('mud'));
  const isFlood = !isMulti && (rawHazard.includes('flood') || rawHazard.includes('inundation') || rawHazard.includes('rain'));
  const isLandslide = !isMulti && (rawHazard.includes('landslide') || rawHazard.includes('slope') || rawHazard.includes('mud'));

  if (lang === 'hi') {
    const sevLabel =
      rawSev === 'CRITICAL'
        ? 'अत्यधिक गंभीर (रेड अलर्ट)'
        : rawSev === 'HIGH'
        ? 'उच्च जोखिम (ऑरेंज अलर्ट)'
        : rawSev === 'MODERATE'
        ? 'मध्यम जोखिम (येलो अलर्ट)'
        : 'सामान्य परामर्श (ग्रीन अलर्ट)';

    const hazardLabel = isMulti
      ? 'बाढ़ एवं पहाड़ी भूस्खलन आपदा'
      : isFlood
      ? 'अचानक बाढ़ और नदी का जलभराव'
      : isLandslide
      ? 'पहाड़ी भूस्खलन एवं मलबा प्रवाह'
      : 'आपदा आपातकालीन चेतावनी';

    const title = `${rawSev} आपातकालीन चेतावनी: ${hazardLabel}`;

    const message =
      alert.messageHi && alert.messageHi.trim().length > 0
        ? alert.messageHi
        : `असम राज्य आपदा प्रबंधन प्राधिकरण द्वारा ${loc} क्षेत्र में ${sevLabel} जारी किया गया है। सभी नागरिक सतर्क रहें और तुरंत सुरक्षित और ऊंचे स्थानों पर जाएं। जलमग्न रास्तों और नदी किनारों से दूर रहें।`;

    const shelter = alert.shelterRecommendation
      ? `${alert.shelterRecommendation} (कामरूप एवं स्थानीय राहत केंद्र)`
      : 'कामरूप जिला बहुउद्देशीय बाढ़ एवं आपदा राहत आश्रय केंद्र';

    const route = alert.routeAdvice
      ? `${alert.routeAdvice} (सुरक्षित निकासी मार्ग)`
      : 'राज्य राजमार्ग 12 हाईलैंड बाईपास सुरक्षित मार्ग (जलभराव मुक्त)';

    const travelAdvisory = alert.travelAdvisory
      ? `यात्रा परामर्श: ${alert.travelAdvisory}`
      : 'निचले और जलमग्न रास्तों पर सभी नागरिक आवागमन पर तत्काल रोक।';

    const speechScript = `असम राज्य आपदा प्रबंधन प्राधिकरण द्वारा आधिकारिक आपातकालीन चेतावनी। सतर्कता स्तर: ${sevLabel}। आपदा प्रकार: ${hazardLabel}। प्रभावित क्षेत्र: ${loc}। सभी नागरिकों से अपील: ${message}। नामित सुरक्षित आश्रय केंद्र: ${shelter}। सुरक्षित निकासी मार्ग: ${route}। कृपया तुरंत सुरक्षित और ऊंचे स्थानों पर जाएं। सहायता हेतु आपातकालीन हेल्पलाइन 108 या 112 पर संपर्क करें।`;

    return {
      lang: 'hi',
      langLabel: 'Hindi',
      langNative: 'हिन्दी',
      flag: '🇮🇳',
      title,
      severity: sevLabel,
      hazardType: hazardLabel,
      message,
      shelter,
      route,
      travelAdvisory,
      speechScript,
      langCode: 'hi-IN',
    };
  }

  if (lang === 'as') {
    const sevLabel =
      rawSev === 'CRITICAL'
        ? 'চৰম সংকটজনক (ৰেড এলাৰ্ট)'
        : rawSev === 'HIGH'
        ? 'উচ্চ সতৰ্কতা (অৰেঞ্জ এলাৰ্ট)'
        : rawSev === 'MODERATE'
        ? 'মধ্যমীয়া সতৰ্কতা (হালধীয়া এলাৰ্ট)'
        : 'সাধাৰণ নিৰীক্ষণ (সেউজীয়া এলাৰ্ট)';

    const hazardLabel = isMulti
      ? 'বানপানী আৰু ভূমিস্খলন দুৰ্যোগ'
      : isFlood
      ? 'হঠাত্ বান আৰু নদীৰ জলস্তৰ বৃদ্ধি'
      : isLandslide
      ? 'পাহাৰীয়া ভূমিস্খলন আৰু বোকাময় স্খলন'
      : 'জৰুৰীকালীন প্ৰাকৃতিক দুৰ্যোগ';

    const title = `${rawSev} জৰুৰী সতৰ্কবাৰ্তা: ${hazardLabel}`;

    const message =
      alert.messageLocal && alert.messageLocal.trim().length > 0
        ? alert.messageLocal
        : `অসম ৰাজ্যিক দুৰ্যোগ ব্যৱস্থাপনা প্ৰাধিকৰণৰ দ্বাৰা ${loc} অঞ্চলত ${sevLabel} জাৰি কৰা হৈছে। সকলো নাগৰিক সতৰ্ক থাকক আৰু প্ৰশাসনৰ নিৰ্দেশনা অনুসৰণ কৰক। প্লাবিত পথ আৰু নদীৰ পাৰৰ পৰা আঁতৰি ওখ স্থানত আশ্ৰয় লওক।`;

    const shelter = alert.shelterRecommendation
      ? `${alert.shelterRecommendation} (সুৰক্ষিত আশ্ৰয় শিবিৰ)`
      : 'কামৰূপ জিলা বহুমুখী বান আৰু দুৰ্যোগ সাহায্য আশ্ৰয় শিবিৰ';

    const route = alert.routeAdvice
      ? `${alert.routeAdvice} (নিৰাপদ যাতায়ত কৰিডৰ)`
      : 'ৰাজ্যিক ঘাইপথ ১২ উচ্চভূমি বাইপাছ সুৰক্ষিত কৰিডৰ (প্লাৱন মুক্ত)';

    const travelAdvisory = alert.travelAdvisory
      ? `যাতায়ত নিৰ্দেশনা: ${alert.travelAdvisory}`
      : 'সকলো নাগৰিকক প্লাবিত আৰু নিম্ন অঞ্চলৰ পথ ত্যাগ কৰিবলৈ অনুৰোধ জনোৱা হৈছে।';

    const speechScript = `অসম ৰাজ্যিক দুৰ্যোগ ব্যৱস্থাপনা প্ৰাধিকৰণৰ চৰকাৰী জৰুৰী সতৰ্কবাৰ্তা। সতৰ্কতাৰ মাত্ৰা: ${sevLabel}। বিপদৰ প্ৰকৃতি: ${hazardLabel}। স্থান: ${loc}। সকলো নাগৰিকলৈ জৰুৰী অনুৰোধ: ${message}। নিৰ্ধাৰিত সুৰক্ষিত আশ্ৰয় শিবিৰ: ${shelter}। নিৰাপদ উদ্ধাৰ পথ: ${route}। অনুগ্ৰহ কৰি শীঘ্ৰে ওখ আৰু সুৰক্ষিত স্থানলৈ আশ্ৰয় লওক। জৰুৰীকালীন সাহাৰ্যৰ বাবে ১০৮ বা ১১২ নম্বৰত যোগাযোগ কৰক।`;

    return {
      lang: 'as',
      langLabel: 'Assamese',
      langNative: 'অসমীয়া',
      flag: '🌾',
      title,
      severity: sevLabel,
      hazardType: hazardLabel,
      message,
      shelter,
      route,
      travelAdvisory,
      speechScript,
      langCode: 'as-IN',
    };
  }

  // English fallback
  const sevLabel = `${rawSev} RISK`;
  const hazardLabel = isMulti
    ? 'Flood & Landslide Hazard'
    : isFlood
    ? 'Flash Flood & River Inundation'
    : isLandslide
    ? 'Severe Mountain Landslide Risk'
    : alert.hazardType || 'Disaster Warning';

  const title = alert.title?.replace('undefined', 'Flood & Landslide') || `${rawSev} Emergency Alert: ${hazardLabel}`;
  const message =
    alert.messageEn ||
    alert.safetyInstructions ||
    `High environmental risk identified for ${loc} following expert review. Please remain alert and follow instructions issued by local authorities.`;
  const shelter = alert.shelterRecommendation || 'Kamrup District Multi-Purpose Flood & Disaster Relief Center';
  const route = alert.routeAdvice || 'SH-12 Highland Transit Bypass Corridor (Clear of waterlogging)';
  const travelAdvisory = alert.travelAdvisory || 'Immediate travel advisory in effect. Avoid waterlogged transit corridors.';

  const speechScript = `Official Emergency Broadcast from Assam Disaster Management Authority. Severity: ${rawSev}. Hazard: ${hazardLabel}. Target Sector: ${loc}. Attention all residents: ${message}. Designated safe shelter is ${shelter}. Safe evacuation corridor is ${route}. Follow official advisories and move to higher ground immediately. In emergency, call 108 or 112.`;

  return {
    lang: 'en',
    langLabel: 'English',
    langNative: 'English',
    flag: '🇬🇧',
    title,
    severity: sevLabel,
    hazardType: hazardLabel,
    message,
    shelter,
    route,
    travelAdvisory,
    speechScript,
    langCode: 'en-IN',
  };
}

export function playAlertSpeechBroadcast(
  alert: CommunityAlert,
  lang: AlertLanguage,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('Audio speech broadcast is not supported in this browser.');
    }
    return false;
  }

  // Stop any active utterance first
  window.speechSynthesis.cancel();

  const details = getMultilingualAlertDetails(alert, lang);
  const utterance = new SpeechSynthesisUtterance(details.speechScript);
  utterance.rate = lang === 'hi' ? 0.9 : lang === 'as' ? 0.88 : 0.95;
  utterance.pitch = 1.02;

  const voices = window.speechSynthesis.getVoices();

  if (lang === 'hi') {
    utterance.lang = 'hi-IN';
    const hiVoice = voices.find(
      v => v.lang === 'hi-IN' || v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
    );
    if (hiVoice) utterance.voice = hiVoice;
  } else if (lang === 'as') {
    utterance.lang = 'as-IN';
    // Native Assamese voice if available; otherwise Bengali (identical Eastern Nagari script phonetics) or Hindi fallback
    const asVoice = voices.find(
      v => v.lang.startsWith('as') || v.name.toLowerCase().includes('assamese')
    );
    const bnVoice = voices.find(
      v =>
        v.lang === 'bn-IN' ||
        v.lang.startsWith('bn') ||
        v.name.toLowerCase().includes('bengali') ||
        v.name.toLowerCase().includes('bangla')
    );
    const hiVoice = voices.find(
      v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
    );

    if (asVoice) {
      utterance.voice = asVoice;
    } else if (bnVoice) {
      utterance.voice = bnVoice;
      utterance.lang = 'bn-IN';
    } else if (hiVoice) {
      utterance.voice = hiVoice;
    }
  } else {
    utterance.lang = 'en-IN';
    const enVoice = voices.find(
      v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india') || v.lang.startsWith('en')
    );
    if (enVoice) utterance.voice = enVoice;
  }

  utterance.onstart = () => {
    callbacks?.onStart?.();
  };

  utterance.onend = () => {
    callbacks?.onEnd?.();
  };

  utterance.onerror = () => {
    callbacks?.onError ? callbacks.onError() : callbacks?.onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopAlertSpeechBroadcast(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
