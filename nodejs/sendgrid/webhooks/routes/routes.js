import express from 'express';
import { webhook } from '../controllers/controller.js';

const router = express.Router();

// Webhook endpoint for SendGrid events
router.post('/', webhook);

export default router; 