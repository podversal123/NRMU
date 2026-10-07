export const divisions = [
  { slug: "headquarter-division", en: "Headquarter", hi: "मुख्यालय" },
  { slug: "delhi-division", en: "Delhi", hi: "दिल्ली" },
  { slug: "ambala-division", en: "Ambala", hi: "अंबाला" },
  { slug: "firozpur-division", en: "Firozpur", hi: "फिरोज़पुर" },
  { slug: "lukcnow-division-nrmu", en: "Lucknow", hi: "लखनऊ" },
  { slug: "moradabad-division", en: "Moradabad", hi: "मुरादाबाद" },
  { slug: "workshop-division", en: "Workshop", hi: "कार्यशाला" },
  { slug: "bridge-division", en: "Bridge", hi: "ब्रिज" },
  { slug: "accounts-division", en: "Accounts", hi: "लेखा" },
] as const;

export const leaders = [
  { name: "Sh. S.G. Mishra", nameHi: "श्री एस.जी. मिश्रा", role: "gensec" },
  { name: "Sh. S.K. Tyagi", nameHi: "श्री एस.के. त्यागी", role: "president" },
] as const;

export const quickLinks = [
  { key: "board", en: "Railway Board Orders", hi: "रेलवे बोर्ड आदेश", cat: "railway-board-orders", icon: "doc" },
  { key: "pay", en: "Pay Commission", hi: "वेतन आयोग", cat: "pay-commission", icon: "rupee" },
  { key: "pension", en: "Pension & NPS", hi: "पेंशन एवं एन.पी.एस.", cat: "new-pension-scheme", icon: "shield" },
  { key: "dopt", en: "DOPT & Finance", hi: "DOPT एवं वित्त", cat: "other-ministeries", icon: "building" },
  { key: "forum", en: "Negotiating Forums", hi: "वार्ता मंच (NC-JCM)", cat: "negotiating-forums", icon: "people" },
  { key: "airf", en: "AIRF Letters", hi: "AIRF पत्र", cat: "airf", icon: "mail" },
] as const;
