export const storageFailureMessage =
  'Could not save this change in this browser. Your previous saved data is unchanged.';

function isPromise(value: unknown): value is Promise<boolean | void> {
  return Boolean(value) && typeof (value as Promise<boolean>).then === 'function';
}

/** Apply a demo mutation only when the caller reports that it was stored. */
export function commitUpdate(
  update: (change: (data: any) => any) => boolean | void | Promise<boolean | void>,
  change: (data: any) => any,
  notify: (message: string) => void,
  success: string,
): boolean | Promise<boolean> {
  try {
    const saved = update(change);
    if (isPromise(saved)) {
      return saved.then(
        (result) => {
          if (result === false) {
            notify(storageFailureMessage);
            return false;
          }
          if (success) notify(success);
          return true;
        },
        (error: any) => {
          notify(error?.message || storageFailureMessage);
          return false;
        },
      );
    }
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

/** Continue after either a stored demo change or a resolved server change. */
export function afterSave(
  saved: boolean | void | Promise<boolean | void>,
  done: (ok: boolean) => void,
) {
  if (isPromise(saved)) {
    void saved.then((ok) => done(ok !== false)).catch(() => done(false));
    return;
  }
  done(saved !== false);
}
