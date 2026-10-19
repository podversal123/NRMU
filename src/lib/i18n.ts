/**
 * Interface wording (buttons, form labels, accessibility labels) is stored in the database
 * (site_settings, keys "ui.*") and edited from the admin panel. This file only lists the keys
 * so that code using them is type-checked.
 */

/**
 * English, Hindi, and the other languages of the Eighth Schedule of the Constitution.
 * English and Hindi have their own database columns; every other language is kept in the `i18n` column
 * of each table. Text missing in a language is shown in English.
 */
export const LANGUAGES = [
  { code: "en", native: "English", name: "English" },
  { code: "hi", native: "हिन्दी", name: "Hindi" },
  { code: "as", native: "অসমীয়া", name: "Assamese" },
  { code: "bn", native: "বাংলা", name: "Bengali" },
  { code: "brx", native: "बड़ो", name: "Bodo" },
  { code: "doi", native: "डोगरी", name: "Dogri" },
  { code: "gu", native: "ગુજરાતી", name: "Gujarati" },
  { code: "kn", native: "ಕನ್ನಡ", name: "Kannada" },
  { code: "ks", native: "کٲشُر", name: "Kashmiri", rtl: true },
  { code: "kok", native: "कोंकणी", name: "Konkani" },
  { code: "mai", native: "मैथिली", name: "Maithili" },
  { code: "ml", native: "മലയാളം", name: "Malayalam" },
  { code: "mni", native: "ꯃꯩꯇꯩꯂꯣꯟ", name: "Manipuri" },
  { code: "mr", native: "मराठी", name: "Marathi" },
  { code: "ne", native: "नेपाली", name: "Nepali" },
  { code: "or", native: "ଓଡ଼ିଆ", name: "Odia" },
  { code: "pa", native: "ਪੰਜਾਬੀ", name: "Punjabi" },
  { code: "sa", native: "संस्कृतम्", name: "Sanskrit" },
  { code: "sat", native: "ᱥᱟᱱᱛᱟᱲᱤ", name: "Santali" },
  { code: "sd", native: "سنڌي", name: "Sindhi", rtl: true },
  { code: "ta", native: "தமிழ்", name: "Tamil" },
  { code: "te", native: "తెలుగు", name: "Telugu" },
  { code: "ur", native: "اردو", name: "Urdu", rtl: true },
] as const;

export const locales = LANGUAGES.map((l) => l.code);
export type Lang = (typeof LANGUAGES)[number]["code"];
export const isLang = (v: string): v is Lang => (locales as readonly string[]).includes(v);

/** Languages kept in the `i18n` column (everything except English and Hindi). */
export type ExtraLang = Exclude<Lang, "en" | "hi">;
export const EXTRA_LANGUAGES = LANGUAGES.filter((l) => l.code !== "en" && l.code !== "hi") as readonly { code: ExtraLang; native: string; name: string }[];

/** Translations of one row: field name, then language code, then text. Stored in the `i18n` column. */
export type I18n = Partial<Record<string, Partial<Record<ExtraLang, string>>>>;

export const isRtl = (lang: Lang) => LANGUAGES.some((l) => l.code === lang && "rtl" in l && l.rtl);

/** Locale for dates and numbers. */
export const intlLocale = (lang: Lang) => `${lang}-IN`;

/** The second language shown next to the visitor's language (organisation name in the header and footer). */
export const altLang = (lang: Lang): Lang => (lang === "en" ? "hi" : "en");

export const UI_KEYS = [
  "skip", "textSize", "textSmaller", "textDefault", "textLarger", "textContrast", "tickerPause", "tickerPlay", "menu", "search", "popular", "viewAll",
  "pdf", "home", "category", "allCategories", "subCategoryPick", "year", "allYears", "clear", "filters", "results", "result",
  "noResults", "noResultsHint", "download", "attachments", "previous", "next", "page", "of", "backToOrders",
  "call", "branches", "branchSecretaries", "noItems", "formName", "formMobile", "formEmail",
  "formDivision", "formDivisionPick", "formDesignation", "formEmployeeId", "formMessage", "submit", "submitting",
  "thanksTitle", "thanksText", "errName", "errMobile", "errEmail", "errDivision", "errLimit", "errGeneric",
  "notFoundTitle", "notFoundText", "goHome", "searchOrders",
  // accessibility / navigation
  "navPrimary", "navMobile", "breadcrumb", "pagination", "langSwitch",
  // events
  "agenda", "minutes", "upcoming", "past", "noUpcoming",
  // grievances
  "gSubject", "gDetails", "gType", "gTypePick", "gSubmit", "gThanksTitle", "gThanksText", "gTicket", "gKeepTicket",
  "gTrackTitle", "gTrackText", "gTrackButton", "gNotFound", "gStatus", "gLevel", "gTimeline", "gOpenForm",
  "gStatus_open", "gStatus_in_progress", "gStatus_resolved", "gStatus_closed", "errSubject", "errDetails", "errTicket",
  "gSecContact", "gSecDetails",
  // portal layout
  "lastUpdated", "visitors", "print", "share", "copied", "sitemapTitle", "backToTop", "newTab",
  // footer contact details
  "cPhone", "cEmail", "cAddress", "cHours",
  // meeting invitation page
  "mInvite", "mInvitedName", "mWhen", "mWhere", "mHeldOnline", "mHeldInPerson", "mHeldHybrid", "mAttend", "mYes", "mMaybe", "mNo", "mYourReply", "mNoReply", "mSaved", "mBadLink", "mBadLinkText", "mCancelled", "mOver", "mLive", "mVideoLater", "mJoin", "mCallNotYet", "mCallLoading", "mCallLeft", "mCallAgain", "mCallBack", "mCallError", "mCalendar", "mYourTime",
  // members
  "memBranch", "memBranchPick", "memDepartment", "memDepartmentPick", "memPassword", "memPasswordHint", "memPassword2", "memConsent", "memConsentLink", "memErrBranch", "memErrDepartment", "memErrPassword", "memErrPassword2", "memErrConsent", "memErrExists", "memThanksTitle", "memThanksText", "memHaveAccount", "memLoginTitle", "memLoginSub", "memLoginPassword", "memLoginButton", "memLoginWrong", "memLoginPending", "memLoginInactive", "memLoginLocked", "memNotMember", "memHeaderLogin", "memForgot", "memAccountTitle", "memJoinNow", "memCardTitle", "memNo", "memStatusLabel", "memActive", "memValid", "memOngoing", "memPrint", "memSignOut", "memChangeTitle", "memCurrent", "memNew", "memChangeButton", "memChanged", "memErrCurrent", "memMustChange",
  "memSecPersonal", "memSecWork", "memSecAccount", "pwShow", "pwHide",
] as const;
export type UiKey = (typeof UI_KEYS)[number];
export type Dict = Record<UiKey, string>;
