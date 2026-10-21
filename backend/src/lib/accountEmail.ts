function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

/** Self-contained email: inline styles, a visible action, and a plain-link fallback. */
export function accountEmailHtml(purpose: "verify" | "reset", link: string) {
  const verify = purpose === "verify";
  const title = verify
    ? "One last step. Your next journey awaits."
    : "Let’s get you back on the road.";
  const action = verify ? "Verify email" : "Reset password";
  const description = verify
    ? "Confirm your email address to start managing your vehicles, appointments and service history."
    : "Choose a new password to securely access your Verifi Auto account.";
  const expiry = verify ? "24 hours" : "30 minutes";
  const url = escapeHtml(link);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${action} · Verifi Auto</title></head>
<body style="margin:0;background:#f4f0fa;font-family:Arial,Helvetica,sans-serif;color:#292034">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d8c4f2;border-radius:24px"><tr><td style="padding:36px 28px;text-align:center">
<p style="margin:0 0 28px;font-size:25px;font-weight:bold;letter-spacing:-1px">verifi<span style="color:#7941ca">auto.</span></p>
<h1 style="font-size:28px;line-height:1.25;margin:0 0 18px">${title}</h1>
<p style="font-size:16px;line-height:1.65;color:#655a70;margin:0 0 28px">${description}</p>
<a href="${url}" style="display:inline-block;background:#7941ca;color:#ffffff;padding:16px 30px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:bold">${action}</a>
<p style="font-size:14px;line-height:1.6;color:#655a70;margin:24px 0">This link expires in ${expiry}.${verify ? " After verification, you’ll be taken to sign in." : ""}</p>
<hr style="border:0;border-top:1px solid #e9dff4;margin:28px 0">
<p style="font-size:12px;line-height:1.6;color:#766b80">Button not working? Open this link:<br><a href="${url}" style="color:#7941ca;word-break:break-all">${url}</a></p>
<p style="font-size:12px;line-height:1.6;color:#766b80">If you did not request this, you can ignore this email.</p>
</td></tr></table><p style="font-size:12px;color:#766b80">Verifi Auto · Good care. For every journey.</p>
</td></tr></table></body></html>`;
}
