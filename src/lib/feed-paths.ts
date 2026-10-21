/** Every member's feed files live under their own folder, so a member can only ever attach or remove their own uploads. */
export const memberFolder = (memberId: number) => `members/${memberId}/`;

/** The storage path of a Blob address ("members/12/2026/10/photo-AbC.jpg"). */
export const blobPath = (url: string) => {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
};
