export const UPDATE_DOWNLOAD_FEEDBACK_MS = 1000;

export function canDismissUpdate(mandatory: boolean | undefined): boolean {
  return mandatory !== true;
}
