const API_BASE_URL = 'http://localhost:3000/api';

// Store the active tab's state
let activeTabState = {
  pageType: null,
  jobDetails: null,
  url: null
};

// Log that the background script is loaded
console.log('Naukri Apply Assist background script loaded');

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);

  // Handle different message actions
  switch (message.action) {
    case 'findMatchingJobs':
      findMatchingJobs(message.profileData, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'navigateToJob':
      navigateToJob(message.jobUrl, sendResponse);
      return true;
      
    case 'pageDetected':
      // Store the page state when content script detects a page
      activeTabState = {
        pageType: message.pageType,
        jobDetails: message.jobDetails,
        url: message.url
      };
      sendResponse({ received: true });
      break;

    case 'applyButtonClicked':
      if (message.success) {
        console.log('Apply button clicked successfully');
        // Wait for form page to load
        setTimeout(() => {
          chrome.storage.local.get(['userProfile', 'userResume'], async (data) => {
            if (data.userProfile) {
              // Auto-fill form when it loads
              chrome.tabs.sendMessage(sender.tab.id, {
                action: 'autoFillForm',
                profileData: data.userProfile
              });
              
              // Upload resume if available
              if (data.userResume) {
                chrome.tabs.sendMessage(sender.tab.id, {
                  action: 'uploadResume',
                  resumeData: data.userResume
                });
              }
            }
          });
        }, 3000); // Wait for form page to load
      } else {
        console.error('Failed to click apply button');
      }
      sendResponse({ received: true });
      break;

    case 'startAutomation':
      handleAutomation(message.profileData, message.resumeData, sendResponse);
      return true;

    case 'updateApplicationStatus':
      updateApplicationStatus(message.jobUrl, message.status, message.error)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'checkAppliedJobs':
      checkAppliedJobs(message.jobUrls)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      return true;

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
        error: 'Cannot connect to backend server. Please make sure the server is running on http://localhost:3000/api',
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
        error: 'Cannot connect to backend server. Please make sure the server is running on http://localhost:3000/api' 
      });
    } else {
      // Handle all other errors with a generic error message and the specific error details
      sendResponse({ 
        error: 'Error finding matching jobs',
        details: error.message 
      });
    }
  }
}

// Function to navigate to a specific job URL
function navigateToJob(jobUrl, sendResponse) {
  console.log('Navigating to job URL:', jobUrl);
  
  chrome.tabs.create({ url: jobUrl }, (tab) => {
    sendResponse({ success: true, tabId: tab.id });
  });
  return true; // Keep message channel open
}

// Function to mark job as applied
async function markJobAsApplied(jobDetails) {
  try {
    const response = await fetch(`${API_BASE_URL}/markJobApplied`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobUrl: jobDetails.url,
        jobTitle: jobDetails.title,
        company: jobDetails.company
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error marking job as applied:', error);
    throw error;
  }
}

// Function to update application status
async function updateApplicationStatus(jobUrl, status, error = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/updateApplicationStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobUrl,
        status,
        error
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
}

// Function to check which jobs are already applied
async function checkAppliedJobs(jobUrls) {
  try {
    const response = await fetch(`${API_BASE_URL}/checkAppliedJobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobUrls })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking applied jobs:', error);
    throw error;
  }
}

// Function to handle the automation process
async function handleAutomation(profileData, resumeData, sendResponse) {
  try {
    // Get the tab ID from the message
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }

    // Wait for the tab to load completely
    await new Promise(resolve => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    // Check if we're on a job listing page
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
    
    if (response.pageType === 'job-listing') {
      const jobDetails = response.jobDetails;
      if (!jobDetails) {
        throw new Error('Could not extract job details');
      }

      // Mark the job as being applied to
      await markJobAsApplied(jobDetails);

      // Find and click the apply button
      const applyResult = await chrome.tabs.sendMessage(tab.id, { 
        action: 'findAndClickApply'
      });

      if (!applyResult.success) {
        throw new Error('Failed to click apply button');
      }

      // Wait for navigation to application form
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Auto-fill the form
      const fillResult = await chrome.tabs.sendMessage(tab.id, {
        action: 'autoFillForm',
        profileData
      });

      if (fillResult.success && resumeData) {
        // Upload resume if available
        await chrome.tabs.sendMessage(tab.id, {
          action: 'uploadResume',
          resumeData
        });
      }

      sendResponse({ success: true });
    } else {
      sendResponse({ error: 'Not on a job listing page' });
    }
  } catch (error) {
    console.error('Error in automation:', error);
    sendResponse({ error: error.message });
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('naukri.com')) {
    // Reset state for new page loads
    activeTabState = {
      pageType: null,
      jobDetails: null,
      url: tab.url
    };
  }
});