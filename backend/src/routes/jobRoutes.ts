import express from 'express';
import fetchAndCacheJobs, { matchJobs } from '../controllers/jobController';

const router = express.Router();

// Route for fetching all jobs and caching them to a JSON file
router.get('/fetchAndCacheJobs', fetchAndCacheJobs);

// Route for job matching
router.post('/matchJobs', matchJobs);

export default router;