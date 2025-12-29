// backend/src/routes/audit.route.js
const express = require('express');
const auditController = require('../controllers/audit.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { authorizeRole } = require('../middlewares/role.middleware');

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  authorizeRole(['HR']),
  auditController.getAuditLogs
);

module.exports = router;
