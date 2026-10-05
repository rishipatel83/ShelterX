import express from 'express';
import { createRateLimit } from '../middleware/rateLimit.js';
import { verifyToken } from '../middleware/auth.js';
import { signup, login, demoLogin, getProfile } from '../controllers/authController.js';

const router = express.Router();

const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'auth'
});

router.use(authLimiter);

router.post('/signup', signup);
router.post('/login', login);
router.post('/demo', demoLogin);
router.get('/profile', verifyToken, getProfile);

export default router;
