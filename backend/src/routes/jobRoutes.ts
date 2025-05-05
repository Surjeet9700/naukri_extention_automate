import express from 'express';
import { matchJobs } from '../controllers/jobController';

const router = express.Router();

// Route for job matching
router.post('/matchJobs', matchJobs);

export default router;