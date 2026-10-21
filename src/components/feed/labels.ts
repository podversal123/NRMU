import type { Dict } from "@/lib/i18n";
import type { FeedLabels } from "./FeedActions";
import type { CardText } from "./FeedCard";
import type { ComposerText } from "./Composer";

/** Error keys the feed actions can return, with their wording, for the browser side. */
const errors = (ui: Dict) => ({
  fdSignInToAct: ui.fdSignInToAct,
  fdErrBody: ui.fdErrBody,
  fdErrTopic: ui.fdErrTopic,
  fdErrFile: ui.fdErrFile,
  fdErrTooMany: ui.fdErrTooMany,
  fdErrGeneric: ui.fdErrGeneric,
  errLimit: ui.errLimit,
});

export const feedLabels = (ui: Dict): FeedLabels => ({
  like: ui.fdLike,
  unlike: ui.fdUnlike,
  likesCount: ui.fdLikesCount,
  comment: ui.fdComment,
  commentsCount: ui.fdCommentsCount,
  suggestion: ui.fdSuggestion,
  writeComment: ui.fdWriteComment,
  writeSuggestion: ui.fdWriteSuggestion,
  send: ui.fdSend,
  noComments: ui.fdNoComments,
  report: ui.fdReport,
  reportReason: ui.fdReportReason,
  reportSend: ui.fdReportSend,
  reported: ui.fdReported,
  remove: ui.fdDelete,
  cancel: ui.fdCancel,
  share: ui.fdShareBtn,
  copied: ui.copied,
  signInToAct: ui.fdSignInToAct,
  signIn: ui.memLoginButton,
  errors: errors(ui),
});

export const cardText = (ui: Dict, org: string): CardText => ({
  org,
  official: ui.fdOfficial,
  anonName: ui.fdAnonName,
  anonNoDiv: ui.fdAnonNoDiv,
  openOrder: ui.fdOpenOrder,
  viewPost: ui.fdViewPost,
  pdf: ui.pdf,
  download: ui.download,
});

export const composerText = (ui: Dict): ComposerText => ({
  start: ui.fdStart,
  share: ui.fdShare,
  placeholder: ui.fdPlaceholder,
  topic: ui.fdTopic,
  topicPick: ui.fdTopicPick,
  addMedia: ui.fdAddMedia,
  mediaHint: ui.fdMediaHint,
  anonymous: ui.fdAnonymous,
  submit: ui.fdSubmit,
  submitting: ui.submitting,
  sent: ui.fdSent,
  uploading: ui.fdUploading,
  remove: ui.fdRemove,
  errors: errors(ui),
});
