'use strict';

const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
});

const analysisTransporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtpAnalysis.user,
    pass: env.smtpAnalysis.pass,
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function temperatureLabel(value) {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'hot') return 'Quente';
  if (normalized === 'warm') return 'Morno';
  if (normalized === 'cold') return 'Frio';
  return value || 'Não informado';
}

function flattenDiagnosis(diagnosis) {
  if (!diagnosis || typeof diagnosis !== 'object' || Array.isArray(diagnosis)) return [];

  return Object.entries(diagnosis)
    .flatMap(([sectionKey, sectionValue]) => {
      if (!sectionValue || typeof sectionValue !== 'object' || Array.isArray(sectionValue)) {
        return [{ label: sectionKey, value: sectionValue }];
      }

      return Object.entries(sectionValue).map(([questionKey, answer]) => ({
        label: questionKey,
        value: Array.isArray(answer) ? answer.join(', ') : answer,
      }));
    })
    .filter(({ value }) => String(value ?? '').trim().length > 0)
    .slice(0, 8);
}

function renderMfaEmail(code) {
  const digits = String(code).split('').join(' ');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica&ccedil;&atilde;o de dois fatores</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111318;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;margin:0;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #eceff3;box-shadow:0 10px 30px rgba(17,19,24,0.06);">
            <tr>
              <td style="height:4px;background:#eb001a;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:34px 32px 30px;">
                <p style="margin:0 0 8px;color:#eb001a;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;">Seguran&ccedil;a do painel</p>
                <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#111318;font-weight:800;">Verifica&ccedil;&atilde;o de dois fatores</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#3f4652;">Use o c&oacute;digo abaixo para concluir seu login no painel administrativo da Evidence.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 28px;">
                  <tr>
                    <td align="center">
                      <div style="display:inline-block;padding:22px 34px;border:2px dashed #eb001a;border-radius:10px;background:#fff5f6;color:#eb001a;font-size:34px;line-height:1;font-weight:900;letter-spacing:0.26em;box-shadow:inset 0 0 0 1px rgba(235,0,26,0.05);">${digits}</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#5f6672;">Este c&oacute;digo expira em <strong style="color:#111318;">10 minutos</strong>.</p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#5f6672;">Se voc&ecirc; n&atilde;o solicitou este c&oacute;digo, ignore este e-mail.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <div style="height:1px;background:#eceff3;margin-bottom:20px;"></div>
                <p style="margin:0;text-align:center;font-size:12px;line-height:1.6;color:#9aa3af;">Ag&ecirc;ncia Evidence &mdash; Marketing, vendas e crescimento empresarial</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderAnalysisEmail(lead) {
  const rows = [
    ['Nome', lead.name],
    ['Empresa', lead.companyName],
    ['E-mail', lead.email],
    ['Telefone', lead.phone],
    ['Cidade/UF', [lead.city, lead.state].filter(Boolean).join(' / ')],
    ['Formulário', lead.formType],
    ['Segmento', lead.segment],
    ['Porte/operação', lead.operationSize],
    ['Tempo de mercado', lead.marketTime],
    ['Desafio principal', lead.mainChallenge],
    ['Desafio de crescimento', lead.growthChallenge],
  ].filter(([, value]) => String(value ?? '').trim().length > 0);

  const answers = flattenDiagnosis(lead.diagnosis);
  const score = Number.isFinite(Number(lead.score)) ? Number(lead.score) : 0;
  const createdAt = lead.createdAt
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(lead.createdAt))
    : 'Agora';

  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #f0f2f5;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;color:#111318;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #f0f2f5;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  const answerRows = answers
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:12px;border-bottom:1px solid #f0f2f5;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#111318;font-size:12px;text-align:right;border-bottom:1px solid #f0f2f5;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova an&aacute;lise recebida</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111318;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;margin:0;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #eceff3;box-shadow:0 10px 30px rgba(17,19,24,0.06);">
            <tr>
              <td style="height:4px;background:#eb001a;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:34px 32px 26px;">
                <p style="margin:0 0 8px;color:#eb001a;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;">Nova an&aacute;lise no site</p>
                <h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;color:#111318;font-weight:900;">${escapeHtml(lead.companyName)} solicitou uma an&aacute;lise</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#3f4652;">Um novo lead respondeu ao diagn&oacute;stico da Evidence em ${escapeHtml(createdAt)}.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td width="50%" style="padding:18px;border:1px solid #ffd1d7;background:#fff5f6;border-radius:10px;">
                      <p style="margin:0 0 6px;color:#eb001a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;">Score</p>
                      <p style="margin:0;color:#111318;font-size:30px;font-weight:900;">${escapeHtml(score)}%</p>
                    </td>
                    <td width="14">&nbsp;</td>
                    <td width="50%" style="padding:18px;border:1px solid #eceff3;background:#ffffff;border-radius:10px;">
                      <p style="margin:0 0 6px;color:#eb001a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;">Temperatura</p>
                      <p style="margin:0;color:#111318;font-size:24px;font-weight:900;">${escapeHtml(temperatureLabel(lead.leadTemperature))}</p>
                    </td>
                  </tr>
                </table>

                <h2 style="margin:0 0 12px;color:#111318;font-size:16px;font-weight:900;">Dados do contato</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">${detailRows}</table>

                ${
                  answerRows
                    ? `<h2 style="margin:0 0 12px;color:#111318;font-size:16px;font-weight:900;">Resumo das respostas</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">${answerRows}</table>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <div style="height:1px;background:#eceff3;margin-bottom:20px;"></div>
                <p style="margin:0;text-align:center;font-size:12px;line-height:1.6;color:#9aa3af;">Ag&ecirc;ncia Evidence &mdash; Marketing, vendas e crescimento empresarial</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Send an MFA code email to the given address.
 * @param {string} to
 * @param {string} code  Plain-text 6-digit code
 */
async function sendMfaCode(to, code) {
  if (env.smtp.logMfaCode) {
    console.log(`[MFA] ${to}: ${code}`);
  }

  if (env.smtp.skipSend) {
    return;
  }

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Seu codigo de verificacao Evidence',
    text: `Seu codigo de verificacao Evidence e: ${code}\n\nEle expira em 10 minutos. Nunca compartilhe este codigo.`,
    html: renderMfaEmail(code),
  });
}

async function sendNewAnalysisNotification(lead) {
  if (!env.smtpAnalysis.to) {
    console.warn('[ANALISE_EMAIL] SMTP_ANALISE_TO não configurado; aviso de nova análise não enviado.');
    return;
  }

  if (env.smtp.skipSend) {
    return;
  }

  const subject = `Nova análise recebida - ${lead.companyName || lead.name || 'Evidence'}`;

  await analysisTransporter.sendMail({
    from: env.smtpAnalysis.from,
    to: env.smtpAnalysis.to,
    subject,
    text: [
      'Nova análise recebida no site Evidence.',
      '',
      `Nome: ${lead.name || '-'}`,
      `Empresa: ${lead.companyName || '-'}`,
      `E-mail: ${lead.email || '-'}`,
      `Telefone: ${lead.phone || '-'}`,
      `Cidade/UF: ${[lead.city, lead.state].filter(Boolean).join(' / ') || '-'}`,
      `Score: ${lead.score ?? 0}%`,
      `Temperatura: ${temperatureLabel(lead.leadTemperature)}`,
    ].join('\n'),
    html: renderAnalysisEmail(lead),
  });
}

module.exports = { sendMfaCode, renderMfaEmail, sendNewAnalysisNotification, renderAnalysisEmail };
