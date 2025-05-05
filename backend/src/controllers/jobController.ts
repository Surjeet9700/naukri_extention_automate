import { Request, Response } from 'express';
import Job from '../models/Job';

// Function to match jobs based on user profile
export const matchJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { skills, experience, location, jobTitle } = req.body;
    
    // Log the received request data for debugging
    console.log('Received match request with data:', { skills, experience, location, jobTitle });
    
    // First, let's check what collections exist and get a sample document
    // This will help us understand the actual structure
    const collections = await Job.db.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Try to retrieve all jobs first to see what's available
    const allJobs = await Job.db.db.collection('jobs').find({}).limit(5).toArray();
    console.log('Sample job documents:', JSON.stringify(allJobs, null, 2));
    
    // Build a more lenient query - we'll start very broad and then refine if needed
    let query: any = {};
    
    // Start with a very simple query - just get some jobs
    const jobsCollection = await Job.db.db.collection('jobs');
    const jobs = await jobsCollection.find({}).limit(10).toArray();
    
    console.log(`Found ${jobs.length} jobs from direct collection access`);
    
    // Transform the jobs to the expected format for the frontend
    const formattedJobs = jobs.map(job => {
      return {
        title: job["Job Title"] || job.title || job["job_title"] || "Unknown Title",
        company: job["Company Name"] || job.company || job["company_name"] || "Company Not Specified",
        location: job["Location"] || job.location || "Location Not Specified",
        jobUrl: job["Job URL"] || job.jobUrl || job["job_url"] || `https://www.naukri.com/job/${job._id}`,
        postedDate: job["Scraped Date"] || job["scraped_date"] || job.postedDate || new Date(),
        skills: job["Skills"] || job.skills || ""
      };
    });
    
    // Log the result count for debugging
    console.log(`Found ${formattedJobs.length} formatted jobs to return`);
    
    // Send the response
    res.status(200).json({
      success: true,
      count: formattedJobs.length,
      jobs: formattedJobs
    });
  } catch (error) {
    console.error('Error in matchJobs controller:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};