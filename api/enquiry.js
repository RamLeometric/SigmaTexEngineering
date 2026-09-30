// Sigma Tex Engineering — contact form handler (Vercel serverless function)
// POST /api/enquiry  { name, company, phone, email, city, service, message, ts, website }
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   SMTP_USER      Gmail address used to send, e.g. sigmatex2018@gmail.com   (required)
//   SMTP_PASS      16-character Gmail App Password                          (required)
//   MAIL_TO        where enquiries go (comma-separated)   default: SMTP_USER
//   SMTP_HOST      default smtp.gmail.com
//   SMTP_PORT      default 465
//   SEND_AUTOREPLY "false" to disable the acknowledgement email to the customer

const nodemailer = require('nodemailer');
const SERVICES = require('./_services.json');
const COMPANY = require('./_company.json');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (s, max) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

function validate(body) {
  const d = {
    name: oneLine(body.name, 80),
    company: oneLine(body.company, 120),
    phone: oneLine(body.phone, 18),
    email: oneLine(body.email, 120),
    city: oneLine(body.city, 80),
    service: oneLine(body.service, 120),
    message: String(body.message ?? '').trim(),
  };
  const errors = {};
  if (d.name.length < 2) errors.name = 'Please enter your name.';
  const digits = d.phone.replace(/\D+/g, '');
  if (!d.phone) errors.phone = 'Please enter your phone number.';
  else if (digits.length < 10 || digits.length > 13) errors.phone = 'Please enter a valid 10-digit mobile number.';
  if (!d.email) errors.email = 'Please enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.email = 'Please enter a valid email address.';
  if (d.message.length < 10) errors.message = 'Please tell us a little about your requirement (at least 10 characters).';
  else if (d.message.length > 3000) errors.message = 'Message is too long (max 3000 characters).';
  if (d.service && !SERVICES.includes(d.service) && d.service !== 'Other') d.service = '';
  return { d, errors };
}

function enquiryHtml(rows) {
  const tr = rows.map(([k, v]) =>
    `<tr><td style="padding:10px 14px;background:#FBF7F7;border:1px solid #F1E9EB;font-weight:600;width:150px;vertical-align:top">${esc(k)}</td>` +
    `<td style="padding:10px 14px;border:1px solid #F1E9EB">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1F1417;max-width:640px">
<div style="background:#2A0D15;color:#fff;padding:18px 22px;border-bottom:5px solid #FE0000">
<div style="font-size:20px;font-weight:bold">New website enquiry</div>
<div style="font-size:13px;color:#E4D8DB">${esc(COMPANY.name)} — Contact Us form</div></div>
<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin:18px 0;font-size:14px">${tr}</table>
<p style="font-size:13px;color:#5A4C50">Reply directly to this email to respond to the customer.</p></div>`;
}

function autoreplyHtml(d) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1F1417;max-width:600px">
<div style="background:#2A0D15;color:#fff;padding:18px 22px;border-bottom:5px solid #FE0000;font-size:20px;font-weight:bold">${esc(COMPANY.name)}</div>
<div style="padding:20px 4px;font-size:15px;line-height:1.6">
<p>Dear ${esc(d.name)},</p>
<p>Thank you for contacting ${esc(COMPANY.name)}. We have received your enquiry${d.service ? ` regarding <strong>${esc(d.service)}</strong>` : ''} and our team will get back to you shortly.</p>
<p>For anything urgent, please call us on <strong>${esc(COMPANY.phone)}</strong>.</p>
<p>Regards,<br>${esc(COMPANY.founder)}<br>${esc(COMPANY.name)}</p></div></div>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  // Spam checks: hidden honeypot filled, or form submitted within 3 seconds of loading
  const ts = Number(body.ts || 0);
  const isBot = Boolean(body.website) || (ts > 0 && Date.now() - ts < 3000);

  const { d, errors } = validate(body);
  if (Object.keys(errors).length) {
    return res.status(422).json({ ok: false, errors, message: 'Please correct the highlighted fields below.' });
  }
  if (isBot) return res.status(200).json({ ok: true }); // pretend success, send nothing

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.error('[enquiry] SMTP_USER / SMTP_PASS environment variables are not set');
    return res.status(500).json({ ok: false, message: `Sorry, we could not send your enquiry right now. Please call us on ${COMPANY.phone}.` });
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const submitted = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const rows = [
    ['Name', d.name], ['Company', d.company || '—'], ['Phone', d.phone], ['Email', d.email],
    ['City / Site', d.city || '—'], ['Service', d.service || '—'], ['Message', d.message],
    ['Submitted', submitted], ['IP address', ip || '—'],
  ];

  try {
    await transporter.sendMail({
      from: { name: 'Sigma Tex Website', address: user },
      to: process.env.MAIL_TO || user,
      replyTo: { name: d.name, address: d.email },
      subject: `Website enquiry: ${d.service || 'General'} — ${d.name}`,
      html: enquiryHtml(rows),
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    });
  } catch (err) {
    console.error('[enquiry] send failed:', err && err.message);
    return res.status(502).json({ ok: false, message: `Sorry, we could not send your enquiry right now. Please call us on ${COMPANY.phone} or try again shortly.` });
  }

  if (String(process.env.SEND_AUTOREPLY || 'true') !== 'false') {
    try {
      await transporter.sendMail({
        from: { name: COMPANY.name, address: user },
        to: { name: d.name, address: d.email },
        replyTo: COMPANY.email,
        subject: `We have received your enquiry — ${COMPANY.name}`,
        html: autoreplyHtml(d),
        text: `Dear ${d.name},\n\nThank you for contacting ${COMPANY.name}. We have received your enquiry and will get back to you shortly.\nFor anything urgent, call ${COMPANY.phone}.\n\nRegards,\n${COMPANY.founder}\n${COMPANY.name}`,
      });
    } catch (err) {
      console.warn('[enquiry] auto-reply failed:', err && err.message);
    }
  }

  return res.status(200).json({ ok: true });
};
