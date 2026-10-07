export const locales = ["en", "hi"] as const;
export type Lang = (typeof locales)[number];
export const isLang = (v: string): v is Lang => (locales as readonly string[]).includes(v);

type Dict = {
  skip: string; textSize: string; contrast: string; org: string; orgShort: string; tagline: string;
  nav: { home: string; orders: string; officials: string; divisions: string; women: string; youth: string; gallery: string; contact: string };
  join: string; search: string; heroKicker: string; heroTitleA: string; heroTitleB: string; heroSub: string;
  searchPlaceholder: string; popular: string; board: string; boardSub: string; viewAll: string;
  latestHeading: string; latestSub: string; services: string; servicesSub: string;
  statsDivisions: string; statsArchive: string; statsSince: string;
  divisionsHeading: string; divisionsSub: string; leadersHeading: string; leadersSub: string;
  president: string; gensec: string; allOfficials: string; ctaTitle: string; ctaText: string;
  footerAbout: string; footerExplore: string; footerSections: string; footerContact: string;
  copyright: string; readMore: string; pdf: string; update: string;
};

const en: Dict = {
  skip: "Skip to main content",
  textSize: "Text size",
  contrast: "High contrast",
  org: "Northern Railway Men's Union",
  orgShort: "NRMU",
  tagline: "For the Railwaymen of India",
  nav: {
    home: "Home", orders: "Orders & Circulars", officials: "Office Bearers",
    divisions: "Divisions", women: "Women Wing", youth: "Youth NRMU",
    gallery: "Gallery", contact: "Contact",
  },
  join: "Join NRMU",
  search: "Search",
  heroKicker: "Northern Railway Men's Union · New Delhi",
  heroTitleA: "For the Railwaymen",
  heroTitleB: "of India.",
  heroSub: "Every Railway Board order, circular and union update that matters to you — in one place, searchable, in Hindi and English.",
  searchPlaceholder: "Search orders, circulars, DOPT, pay commission, pension…",
  popular: "Popular",
  board: "Latest Orders",
  boardSub: "Live from the NRMU archive",
  viewAll: "View all",
  latestHeading: "Latest Orders & Updates",
  latestSub: "Fresh from Railway Board, DOPT, Ministry of Finance and AIRF.",
  services: "Find what you need",
  servicesSub: "The most-used sections, one tap away.",
  statsDivisions: "Divisions",
  statsArchive: "Orders & updates archived",
  statsSince: "Archive since",
  divisionsHeading: "Our Divisions",
  divisionsSub: "NRMU stands in every division of Northern Railway.",
  leadersHeading: "Leadership",
  leadersSub: "Central office bearers of the union.",
  president: "President",
  gensec: "General Secretary",
  allOfficials: "All office bearers",
  ctaTitle: "Stronger together.",
  ctaText: "Become a member, raise your concern, stay informed — NRMU is your union.",
  footerAbout: "Northern Railway Men's Union is a trade union of railway employees, affiliated to the All India Railwaymen's Federation (AIRF).",
  footerExplore: "Explore",
  footerSections: "Sections",
  footerContact: "Contact",
  copyright: "All rights reserved.",
  readMore: "Read",
  pdf: "PDF",
  update: "Update",
};

const hi: Dict = {
  skip: "मुख्य सामग्री पर जाएँ",
  textSize: "अक्षर आकार",
  contrast: "उच्च कंट्रास्ट",
  org: "उत्तर रेलवे मेन्स यूनियन",
  orgShort: "एन.आर.एम.यू.",
  tagline: "भारत के रेलकर्मियों के लिए",
  nav: {
    home: "मुख्य पृष्ठ", orders: "आदेश एवं परिपत्र", officials: "पदाधिकारी",
    divisions: "मंडल", women: "महिला प्रकोष्ठ", youth: "युवा एन.आर.एम.यू.",
    gallery: "चित्र दीर्घा", contact: "संपर्क",
  },
  join: "सदस्य बनें",
  search: "खोजें",
  heroKicker: "उत्तर रेलवे मेन्स यूनियन · नई दिल्ली",
  heroTitleA: "भारत के",
  heroTitleB: "रेलकर्मियों के लिए।",
  heroSub: "रेलवे बोर्ड के हर आदेश, परिपत्र और यूनियन की हर सूचना — एक ही जगह, खोजने योग्य, हिंदी और अंग्रेज़ी में।",
  searchPlaceholder: "आदेश, परिपत्र, DOPT, वेतन आयोग, पेंशन खोजें…",
  popular: "लोकप्रिय",
  board: "नवीनतम आदेश",
  boardSub: "एन.आर.एम.यू. संग्रह से सीधे",
  viewAll: "सभी देखें",
  latestHeading: "नवीनतम आदेश एवं सूचनाएँ",
  latestSub: "रेलवे बोर्ड, DOPT, वित्त मंत्रालय और AIRF से ताज़ा।",
  services: "अपनी ज़रूरत की जानकारी पाएँ",
  servicesSub: "सबसे ज़्यादा इस्तेमाल होने वाले अनुभाग, बस एक टैप दूर।",
  statsDivisions: "मंडल",
  statsArchive: "संग्रहीत आदेश एवं सूचनाएँ",
  statsSince: "संग्रह का आरंभ",
  divisionsHeading: "हमारे मंडल",
  divisionsSub: "उत्तर रेलवे के हर मंडल में एन.आर.एम.यू. आपके साथ है।",
  leadersHeading: "नेतृत्व",
  leadersSub: "यूनियन के केंद्रीय पदाधिकारी।",
  president: "अध्यक्ष",
  gensec: "महामंत्री",
  allOfficials: "सभी पदाधिकारी",
  ctaTitle: "एकजुट, तो मज़बूत।",
  ctaText: "सदस्य बनें, अपनी बात रखें, जानकारी से जुड़े रहें — एन.आर.एम.यू. आपकी अपनी यूनियन है।",
  footerAbout: "उत्तर रेलवे मेन्स यूनियन रेलवे कर्मचारियों की ट्रेड यूनियन है, जो अखिल भारतीय रेलवे कर्मचारी महासंघ (AIRF) से संबद्ध है।",
  footerExplore: "देखें",
  footerSections: "अनुभाग",
  footerContact: "संपर्क",
  copyright: "सर्वाधिकार सुरक्षित।",
  readMore: "पढ़ें",
  pdf: "पीडीएफ",
  update: "सूचना",
};

export const dictionaries: Record<Lang, Dict> = { en, hi };
export const getDict = (lang: Lang) => dictionaries[lang];
