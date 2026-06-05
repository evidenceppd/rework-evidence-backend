'use strict';

const { Router } = require('express');
const { requireAuth } = require('../../middlewares/jwt');
const { requireRole } = require('../../middlewares/role');
const controller = require('./analytics.controller');

const router = Router();

router.post('/track', controller.track);
router.get('/stats', controller.stats);
router.get('/views-month', controller.viewsMonth);
router.get('/devices-month', controller.devicesMonth);
router.get('/daily-average', controller.dailyAverage);
router.get('/last-7-days', controller.last7Days);
router.get('/top-pages', controller.topPages);
router.delete('/cleanup', requireAuth, requireRole('MASTER'), controller.cleanup);

module.exports = router;
