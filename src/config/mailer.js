'use strict';

const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: true, // SSL on 465
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
});

/**
 * Send an MFA code email to the given address.
 * @param {string} to
 * @param {string} code  Plain-text 6-digit code
 */
async function sendMfaCode(to, code) {
  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Seu código de verificação',
    text: `Seu código de verificação é: ${code}\n\nEle expira em 10 minutos. Nunca compartilhe este código.`,
    html: `<p>Seu código de verificação é: <strong>${code}</strong></p><p>Ele expira em 10 minutos. Nunca compartilhe este código.</p>`,
  });
}

module.exports = { sendMfaCode };
