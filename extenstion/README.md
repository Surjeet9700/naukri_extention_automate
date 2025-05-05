# Naukri Apply Assist Chrome Extension

This Chrome extension streamlines the job application process on Naukri.com by leveraging user profile information and matching jobs from a MongoDB database.

## Features

- Profile input: Save your skills, experience, target job title, and location
- Job matching: Find internal jobs that match your profile from the MongoDB database
- Job navigation: Easily navigate to the job listing on Naukri.com

## Installation

1. Clone this repository
2. Open Chrome and navigate to chrome://extensions
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and available in your Chrome toolbar

## Usage

1. Click on the extension icon in your toolbar
2. Enter your profile information (skills, experience, etc.)
3. Click "Save Profile" to save your information
4. Click "Find Matching Jobs" to see jobs that match your profile
5. Click "View Job" on any job to open it in a new tab

## Development

### Prerequisites

- Node.js and npm installed
- MongoDB database with job listings
- Backend server running (see backend directory)

### Setting up the backend

1. Navigate to the backend directory
2. Run `npm install` to install dependencies
3. Set up your MongoDB connection in the `.env` file
4. Run `npm run dev` to start the development server

### Building the extension

The extension files are ready to use directly. If you make changes, simply refresh the extension in Chrome.