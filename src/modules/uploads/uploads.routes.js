'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Router } = require('express');
const { AppError } = require('../../utils/errors');

const router = Router();
const uploadRoot = path.resolve(__dirname, '../../../uploads');

function parseDataUrl(value) {
  const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(value || '');
  if (!match) return null;
  const ext = match[1].split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  return { ext, buffer: Buffer.from(match[2], 'base64') };
}

router.post('/image', async (req, res, next) => {
  try {
    const parsed = parseDataUrl(req.body?.image || req.body?.dataUrl || req.body?.file);
    if (!parsed) throw new AppError('Send image as base64 data URL in image, dataUrl or file', 400);
    await fs.promises.mkdir(uploadRoot, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${parsed.ext}`;
    await fs.promises.writeFile(path.join(uploadRoot, filename), parsed.buffer);
    res.status(201).json({ status: 'success', data: { url: `/uploads/${filename}` } });
  } catch (err) { next(err); }
});

module.exports = router;
