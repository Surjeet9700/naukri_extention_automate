# Naukri Apply Assist Backend

This is the backend server for the Naukri Apply Assist Chrome Extension. It handles job matching from the MongoDB database.

## Features

- REST API for job matching based on user profile
- MongoDB integration to query existing job listings
- TypeScript implementation for type safety

## Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Create or modify `.env` file with your MongoDB URI

## Development

Run the development server with automatic reloading:

```
npm run dev
```

This will start the server at http://localhost:3000 by default.

## Building for Production

Build the TypeScript code to JavaScript:

```
npm run build
```

Run the production server:

```
npm start
```

## API Endpoints

### POST /api/matchJobs

Match jobs based on profile criteria.

**Request Body:**
```json
{
  "skills": "JavaScript, React, Node.js",
  "experience": "5",
  "location": "Bangalore",
  "jobTitle": "Software Engineer"
}
```

**Response:**
```json
{
  "count": 2,
  "jobs": [
    {
      "title": "Senior Software Engineer",
      "company": "Example Company",
      "location": "Bangalore",
      "jobUrl": "https://www.naukri.com/job/example1",
      "postedDate": "2023-05-01T00:00:00.000Z"
    },
    {
      "title": "Frontend Developer",
      "company": "Another Company",
      "location": "Bangalore",
      "jobUrl": "https://www.naukri.com/job/example2",
      "postedDate": "2023-04-28T00:00:00.000Z"
    }
  ]
}
```

## Database Schema

The MongoDB database should have a collection called `jobs` with documents in the following format:

```javascript
{
  title: "Software Developer",
  company: "Example Company",
  location: "Bangalore",
  description: "Detailed job description...",
  skills: ["JavaScript", "React", "Node.js"],
  experience: {
    min: 3,
    max: 5
  },
  jobUrl: "https://www.naukri.com/job/unique-job-id",
  applicationUrl: "https://www.naukri.com/apply/unique-job-id",
  applicationType: "Internal",
  postedDate: ISODate("2023-05-01"),
  scrapedDate: ISODate("2023-05-02")
}
```