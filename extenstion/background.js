// Backend API URL - update this to your actual backend URL when deployed
const API_BASE_URL = 'http://localhost:3000/api';

// Log that the background script is loaded
console.log('Naukri Apply Assist background script loaded');

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);

  // Handle different message actions
  switch (message.action) {
    case 'findMatchingJobs':
      findMatchingJobs(message.profileData, sendResponse);
      return true; // This keeps the message channel open for async response
      
    case 'navigateToJob':
      navigateToJob(message.jobUrl, sendResponse);
      return true;
      
    case 'pageDetected':
      // Handle page detection from content script
      console.log('Page detected:', message.pageType, message.url);
      if (message.jobDetails) {
        console.log('Job details detected:', message.jobDetails);
      }
      sendResponse({ received: true });
      return false;
      
    default:
      console.error('Unknown action:', message.action);
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

// Function to query the backend for matching jobs
async function findMatchingJobs(profileData, sendResponse) {
  try {
    console.log('Finding matching jobs with profile:', profileData);
    console.log('Sending request to:', `${API_BASE_URL}/matchJobs`);
    
    // Check if the backend is reachable
    try {
      await fetch(`${API_BASE_URL}`);
    } catch (connectionError) {
      console.error('Cannot connect to backend server:', connectionError);
      sendResponse({ 
        error: 'Cannot connect to backend server. Please make sure the server is running on http://localhost:3000',
        details: connectionError.message 
      });
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/matchJobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        skills: profileData.skills,
        experience: profileData.experience,
        location: profileData.location,
        jobTitle: profileData.jobTitle
      }),
      mode: 'cors' // Explicitly state that we want CORS requests
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received job data:', data);
    
    if (!data.jobs || !Array.isArray(data.jobs)) {
      throw new Error('Invalid response format: jobs array missing');
    }
    
    sendResponse({ jobs: data.jobs });
  } catch (error) {
    console.error('Error finding matching jobs:', error);
    if (error.message === 'Failed to fetch') {
      sendResponse({ 
        error: 'Cannot connect to backend server. Please make sure the server is running on http://localhost:3000' 
      });
    } else {
      sendResponse({ error: error.message });
    }
  }
}

// Function to navigate to a specific job URL
function navigateToJob(jobUrl, sendResponse) {
  console.log('Navigating to job URL:', jobUrl);
  
  chrome.tabs.create({ url: jobUrl }, (tab) => {
    sendResponse({ success: true, tabId: tab.id });
  });
}