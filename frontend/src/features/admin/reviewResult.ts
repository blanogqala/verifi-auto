import { afterSave } from '../demo/commitUpdate';

/** Close a review only after the save is confirmed. A rejected save leaves the form open. */
export function finishApplicationReview(
  saved: boolean | void | Promise<boolean | void>,
  options: {
    live: boolean;
    status: string;
    notify: (message: string) => void;
    close: () => void;
  },
) {
  afterSave(saved, (ok) => {
    if (!ok) return;
    options.close();
    options.notify(
      options.live ? 'Application updated.' : 'Demo application ' + options.status.toLowerCase(),
    );
  });
}
