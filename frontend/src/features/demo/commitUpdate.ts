export const storageFailureMessage =
  'Could not save this change in this browser. Your previous saved data is unchanged.';

/** Apply a demo mutation only when the caller reports that it was stored. */
export function commitUpdate(
  update: (change: (data: any) => any) => boolean | void,
  change: (data: any) => any,
  notify: (message: string) => void,
  success: string,
) {
  try {
    const saved = update(change);
    if (saved === false) {
      notify(storageFailureMessage);
      return false;
    }
    if (success) notify(success);
    return true;
  } catch (error: any) {
    notify(error?.message || storageFailureMessage);
    return false;
  }
}
