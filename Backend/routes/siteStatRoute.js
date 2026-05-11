import express from 'express';
import { getSiteStats, recordVisit } from '../Controllers/siteStatController.js';
import adminAuthMiddleware from '../middleware/adminAuth.js';

const router = express.Router();

router.post('/visit', recordVisit);
router.get('/', adminAuthMiddleware, getSiteStats);

export default router;
