import express from 'express';
import fetchAndCacheJobs, { matchJobs } from '../controllers/jobController';
import { parseResume, handleBotQuestion } from '../utils/gemini';
import { AppliedJob } from '../models/Job';

const router = express.Router();

// Route for fetching all jobs and caching them to a JSON file
router.get('/fetchAndCacheJobs', fetchAndCacheJobs);

// Route for job matching
router.post('/matchJobs', matchJobs);

// Route for resume parsing with Gemini AI
router.post('/parseResume', async (req, res) => {
    try {
        const { resumeText } = req.body;
        if (!resumeText) {
            return res.status(400).json({ error: 'Resume text is required' });
        }

        const parsedData = await parseResume(resumeText);
        res.json({ success: true, data: parsedData });
    } catch (error) {
        console.error('Error in resume parsing route:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to parse resume',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Route for handling bot questions
router.post('/handleBotQuestion', async (req, res) => {
    try {
        const { question, resumeText } = req.body;
        if (!question || !resumeText) {
            return res.status(400).json({ error: 'Question and resume text are required' });
        }

        const answer = await handleBotQuestion(question, resumeText);
        res.json({ success: true, answer });
    } catch (error) {
        console.error('Error in bot question handling route:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process bot question'
        });
    }
});

// Route for marking a job as applied
router.post('/markJobApplied', async (req, res) => {
    try {
        const { jobUrl, jobTitle, company } = req.body;
        if (!jobUrl || !jobTitle || !company) {
            return res.status(400).json({ error: 'Job URL, title and company are required' });
        }

        let appliedJob = await AppliedJob.findOne({ jobUrl });
        if (appliedJob) {
            appliedJob.attempts += 1;
            appliedJob.lastAttempt = new Date();
            appliedJob.applicationStatus = 'pending';
            await appliedJob.save();
        } else {
            appliedJob = await AppliedJob.create({
                jobUrl,
                jobTitle,
                company,
                applicationStatus: 'pending'
            });
        }

        res.json({ success: true, appliedJob });
    } catch (error) {
        console.error('Error marking job as applied:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to mark job as applied'
        });
    }
});

// Route for updating application status
router.post('/updateApplicationStatus', async (req, res) => {
    try {
        const { jobUrl, status, error } = req.body;
        if (!jobUrl || !status) {
            return res.status(400).json({ error: 'Job URL and status are required' });
        }

        const appliedJob = await AppliedJob.findOne({ jobUrl });
        if (!appliedJob) {
            return res.status(404).json({ error: 'Applied job not found' });
        }

        appliedJob.applicationStatus = status;
        appliedJob.lastAttempt = new Date();
        if (error) {
            appliedJob.error = error;
        }
        await appliedJob.save();

        res.json({ success: true, appliedJob });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update application status'
        });
    }
});

// Route for checking if jobs are already applied
router.post('/checkAppliedJobs', async (req, res) => {
    try {
        const { jobUrls } = req.body;
        if (!jobUrls || !Array.isArray(jobUrls)) {
            return res.status(400).json({ error: 'Job URLs array is required' });
        }

        const appliedJobs = await AppliedJob.find({
            jobUrl: { $in: jobUrls }
        });

        const appliedJobsMap = appliedJobs.reduce((acc: Record<string, { status: string; attempts: number; lastAttempt: Date | null }>, job) => {
            acc[job.jobUrl] = {
                status: job.applicationStatus,
                attempts: job.attempts,
                lastAttempt: job.lastAttempt
            };
            return acc;
        }, {} as Record<string, { status: string; attempts: number; lastAttempt: Date | null }>);

        res.json({ success: true, appliedJobs: appliedJobsMap });
    } catch (error) {
        console.error('Error checking applied jobs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to check applied jobs'
        });
    }
});

export default router;