# Naukri Extension Automate

A Chrome extension that streamlines the job application process on Naukri.com by leveraging user profile information and matching jobs from a MongoDB database.

## Project Structure

- **Backend**: Node.js/Express server with MongoDB integration
- **Extension**: Chrome extension with profile matching and job display
- **Frontend**: React application (development version)

## Features

- User profile input (skills, experience, location, job title)
- Job matching from MongoDB database
- Displaying matching jobs in the extension popup
- Easy navigation to job listings on Naukri.com

## Installation and Setup

### Backend

1. Navigate to the `backend` folder
2. Install dependencies:
   ```
   npm install
   ```
3. Configure MongoDB connection in `.env` file
4. Start the development server:
   ```
   npm run dev
   ```

### Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extenstion` folder
4. Click the extension icon in your browser toolbar to use

## Development

- Backend: TypeScript with Express and MongoDB
- Extension: Vanilla JavaScript with Chrome Extension APIs
- Frontend: React with TypeScript and Vite (development version)

## Future Enhancements

- Resume parsing with AI
- Automated form filling
- Job application tracking