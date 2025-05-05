import mongoose, { Document, Schema } from 'mongoose';

// Define a custom type for Job documents that allows string indexing
interface IJobDocument extends Document {
  [key: string]: any; // This allows accessing fields like doc["Job Title"]
}

// Define interface for Job document with proper typing
interface IJob extends IJobDocument {
  _id: mongoose.Types.ObjectId;
  "Job URL"?: string;
  "Application Type"?: string;
  "Company Name"?: string;
  "Experience Required"?: string;
  "Job Description"?: string;
  "Job Title"?: string;
  "Location"?: string;
  "Salary"?: string;
  "Scraped Date"?: Date;
  "Search Experience"?: string;
  "Search Location"?: string;
  "Search Query"?: string;
  "Skills"?: string;
  "firstScraped"?: Date;
  "lastUpdated"?: Date;
}

// Define the schema for Job
const jobSchema = new Schema({
  "Job URL": String,
  "Application Type": {
    type: String,
    default: 'Internal'
  },
  "Company Name": String,
  "Experience Required": String,
  "Job Description": String,
  "Job Title": {
    type: String,
    required: true,
    index: true
  },
  "Location": {
    type: String,
    required: true,
    index: true
  },
  "Salary": String,
  "Scraped Date": Date,
  "Search Experience": String,
  "Search Location": String,
  "Search Query": String,
  "Skills": {
    type: String,
    index: true
  },
  "firstScraped": Date,
  "lastUpdated": Date
}, {
  timestamps: true
});

// Create text indexes for better search performance
jobSchema.index({ "Job Title": 'text', "Skills": 'text', "Location": 'text' });

// Create the Job model
const Job = mongoose.model<IJob>('Job', jobSchema);

export default Job;