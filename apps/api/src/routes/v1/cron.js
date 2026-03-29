import { Router } from 'express';
import { runAutoVerification } from '../../services/autoVerify.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

router.post('/auto-verify', async (req, res, next) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers['x-cron-secret'];
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin && (!cronSecret || authHeader !== cronSecret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await runAutoVerification();
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/auto-verify/admin', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const result = await runAutoVerification();
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
