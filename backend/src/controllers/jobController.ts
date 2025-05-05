import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs-extra';
import path from 'path';

interface JobDocument {
  _id: mongoose.Types.ObjectId;
  [key: string]: any;
  "Job URL"?: string;
  "Job Title"?: string;
  "Company Name"?: string;
  "Location"?: string;
  "Experience Required"?: string;
  "Job Description"?: string;
  "Skills"?: string;
  "Scraped Date"?: Date;
  "Search Experience"?: string;
  "Search Location"?: string;
  firstScraped?: Date;
}

const CACHE_FILE_PATH = path.join(__dirname, '..', 'jobs_cache.json');

// Fetches all jobs from MongoDB and writes them to the cache file.
export default async function fetchAndCacheJobs(): Promise<JobDocument[]> {
  console.log('Fetching all jobs from MongoDB to build/update cache...');
  try {
    const db = mongoose.connection.db;
    // Use the correct collection name from your MongoDB
    const jobsCollection = db.collection('jobs');

    // Add a query to get only real job postings
    const allJobs = await jobsCollection.find({
      // Basic validation to ensure we get real job entries
      'Job Title': { $exists: true },
      'Company Name': { $exists: true, $ne: 'Sample Tech Co' },
      // Sort by latest first
      'Scraped Date': { $exists: true }
    }).sort({ 'Scraped Date': -1 }).toArray() as JobDocument[];

    console.log(`Fetched ${allJobs.length} total jobs from MongoDB.`);

    if (allJobs.length === 0) {
      console.warn('Warning: No jobs found in MongoDB collection. Please verify the database connection and data.');
    }

    // Write to cache file (overwrite existing)
    await fs.writeJson(CACHE_FILE_PATH, allJobs, { spaces: 2 });
    console.log(`Successfully wrote ${allJobs.length} jobs to cache file: ${CACHE_FILE_PATH}`);
    return allJobs;
  } catch (error) {
    console.error('Error fetching or caching jobs:', error);
    throw error; // Propagate the error to handle it in the route
  }
}

// Matches jobs based on user profile after fetching fresh data from MongoDB.
export const matchJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { skills, experience, location, jobTitle } = req.body;
    console.log('Received match request with data:', { skills, experience, location, jobTitle });

    // Step 1: Always fetch all jobs from MongoDB and update the cache.
    // This ensures we filter against the latest data fetched in this request cycle.
    console.log('Forcing fetch from MongoDB and cache update...');
    const jobsToFilter: JobDocument[] = await fetchAndCacheJobs();

    // Check if fetching/caching resulted in any jobs
    if (jobsToFilter.length === 0) {
      console.log('No jobs found in database to filter.');
      res.status(200).json({ success: true, count: 0, jobs: [] });
      return;
    }

    // Step 2: Filter the freshly fetched jobs based on criteria (in-memory filtering)
    console.log(`Filtering ${jobsToFilter.length} fetched jobs in memory...`);
    const filteredJobs = jobsToFilter.filter(job => {
      let matches = true; 

      // Filter for Internal applications only
      matches = matches && job["Application Type"] === "Internal";

      // Filter by job title (case-insensitive) - This is now the primary filter
      if (jobTitle && typeof jobTitle === 'string' && job["Job Title"]) {
        const searchTitle = jobTitle.trim().toLowerCase();
        const jobTitleLower = job["Job Title"].toLowerCase();
        const searchQueryLower = job["Search Query"]?.toLowerCase() || '';
        
        // Match if either the job title contains the search title OR 
        // if the search query matches what we're looking for
        matches = matches && (
          jobTitleLower.includes(searchTitle) || 
          searchQueryLower.includes(searchTitle) ||
          searchTitle.includes(jobTitleLower) ||
          searchTitle.includes(searchQueryLower)
        );
      }

      // Optional filters - only apply if matches is still true
      if (matches) {
        // Filter by location (case-insensitive) if provided
        if (location && typeof location === 'string' && job.Location) {
          matches = matches && job.Location.toLowerCase().includes(location.trim().toLowerCase());
        }

        // Filter by skills (match any skill, case-insensitive) if provided
        if (matches && skills && typeof skills === 'string' && job.Skills) {
          const skillList = skills.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
          if (skillList.length > 0) {
            const jobSkills = job.Skills.toLowerCase();
            matches = matches && skillList.some((skill: string) => jobSkills.includes(skill));
          }
        }

        // Filter by experience if provided
        if (matches && experience && typeof experience === 'string') {
          const expValue = experience.trim();
          const searchExpMatch = job["Search Experience"] === expValue;
          const expReqMatch = !!(job["Experience Required"] &&
                             typeof job["Experience Required"] === 'string' &&
                             job["Experience Required"].includes(expValue));
          matches = matches && (searchExpMatch || expReqMatch);
        }
      }

      return matches;
    });

    console.log(`Found ${filteredJobs.length} matching jobs after filtering.`);

    // Step 3: Sort and limit results
    const sortedJobs = filteredJobs.sort((a, b) => {
      // Prioritize "Scraped Date", fallback to "firstScraped", then 0 if neither exists/is valid
      const dateA = new Date(a["Scraped Date"] || a.firstScraped || 0);
      const dateB = new Date(b["Scraped Date"] || b.firstScraped || 0);
      // Handle potential invalid dates
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      // Sort descending (newest first)
      return timeB - timeA;
    });

    // Limit to the top 10 results
    const limitedJobs = sortedJobs.slice(0, 10);

    // Step 4: Transform job documents to the desired response format
    const formattedJobs = limitedJobs.map(job => {
      return {
        title: job["Job Title"] || "Unknown Title",
        company: job["Company Name"] || "Company Not Specified",
        location: job["Location"] || "Location Not Specified",
        // Provide a fallback URL structure if "Job URL" is missing
        jobUrl: job["Job URL"] || `https://www.naukri.com/job/${job._id}`,
        // Use "Scraped Date" or "firstScraped" for posted date, fallback to current date
        postedDate: job["Scraped Date"] || job.firstScraped || new Date(),
        skills: job["Skills"] || "" // Return empty string if skills are missing
      };
    });

    // Step 5: Send the response
    res.status(200).json({
      success: true,
      count: formattedJobs.length,
      jobs: formattedJobs
    });

  } catch (error) {
    // Catch any unexpected errors during the process
    console.error('Error in matchJobs controller:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      // Provide error message if available
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};
