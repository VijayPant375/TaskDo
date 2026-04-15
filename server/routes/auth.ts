import express from 'express';
import rateLimit from 'express-rate-limit';
import { checkUsername, login, signup, verifyLoginMfa } from '../controllers/authController.js';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', limiter, signup);
router.post('/login', limiter, login);
router.post('/login/mfa', limiter, verifyLoginMfa);
router.get('/check-username/:username', checkUsername);

export default router;
