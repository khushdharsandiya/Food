import nodemailer from 'nodemailer';

export function isMailConfigured() {
    const u = String(process.env.SMTP_USER ?? '').trim();
    const p = String(process.env.SMTP_PASS ?? '').trim();
    return Boolean(u && p);
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export async function sendPasswordResetLink(toEmail, resetUrl, username = '') {
    const transporter = nodemailer.createTransport({
        host: String(process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
        auth: {
            user: String(process.env.SMTP_USER).trim(),
            pass: String(process.env.SMTP_PASS).trim(),
        },
    });

    const from =
        String(process.env.MAIL_FROM || '').trim() ||
        `Foodie Frenzy <${String(process.env.SMTP_USER).trim()}>`;
    const safeName = String(username || '').replace(/[<>]/g, '');
    const safeUrl = escapeHtml(resetUrl);

    await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Foodie Frenzy — Reset your password',
        text: [
            `Hello${safeName ? ` ${safeName}` : ''},`,
            '',
            'We received a request to reset your password. Open this link (valid 1 hour):',
            resetUrl,
            '',
            "If you didn’t ask for this, you can ignore this email.",
        ].join('\n'),
        html: `<div style="font-family:Georgia,'Times New Roman',serif;max-width:520px;margin:0 auto;background:linear-gradient(145deg,#fffbeb,#fde68a);padding:28px;border-radius:16px;border:1px solid #d97706;">
  <h1 style="color:#92400e;font-size:22px;margin:0 0 12px;">Foodie Frenzy</h1>
  <p style="color:#451a03;font-size:15px;line-height:1.6;">Hello${safeName ? ' ' + escapeHtml(safeName) : ''},</p>
  <p style="color:#451a03;font-size:15px;">Tap the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
  <p style="margin:24px 0;text-align:center;"><a href="${safeUrl}" style="display:inline-block;background:#b45309;color:#fffbeb;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;">Reset password</a></p>
  <p style="color:#78716c;font-size:12px;word-break:break-all;">If the button doesn’t work, paste this URL into your browser:<br/>${safeUrl}</p>
  <p style="color:#78716c;font-size:13px;margin-top:24px;">If you didn’t request a reset, you can ignore this message.</p>
</div>`,
    });
}
