/**
 * Interface wording (buttons, form labels, accessibility labels) is stored in the database
 * (site_settings, keys "ui.*") and edited from the admin panel. This file only lists the keys
 * so that code using them is type-checked.
 */
export const locales = ["en", "hi"] as const;
export type Lang = (typeof locales)[number];
export const isLang = (v: string): v is Lang => (locales as readonly string[]).includes(v);

export const UI_KEYS = [
  "skip", "textSize", "textSmaller", "textDefault", "textLarger", "menu", "search", "popular", "viewAll",
  "pdf", "home", "category", "allCategories", "year", "allYears", "clear", "filters", "results", "result",
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
  // portal layout
  "lastUpdated", "visitors", "print", "share", "copied", "sitemapTitle",
  // meeting invitation page
  "mInvite", "mInvitedName", "mWhen", "mWhere", "mHeldOnline", "mHeldInPerson", "mHeldHybrid", "mAttend", "mYes", "mMaybe", "mNo", "mYourReply", "mNoReply", "mSaved", "mBadLink", "mBadLinkText", "mCancelled", "mOver", "mLive", "mVideoLater", "mJoin", "mCallNotYet", "mCallLoading", "mCallLeft", "mCallAgain", "mCallBack", "mCallError", "mCalendar", "mYourTime",
] as const;
export type UiKey = (typeof UI_KEYS)[number];
export type Dict = Record<UiKey, string>;
