import express from 'express';
import { disableMFA, enableMFA, generateMFASetup, verifyMFA } from '../controllers/mfaController.js';

const router = express.Router();

router.post('/setup', generateMFASetup);
router.post('/enable', enableMFA);
router.post('/verify', verifyMFA);
router.post('/disable', disableMFA);

export default router;
