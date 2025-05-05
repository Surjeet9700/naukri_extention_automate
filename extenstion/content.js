// This content script is injected into Naukri.com pages

// Function to detect what type of Naukri.com page we're on
function detectPageType() {
  const url = window.location.href;
  
  // Check if this is a job listing page (single job)
  if (url.includes('/job-listings-') || url.match(/\/job\/[^/]+\/\d+/) || url.includes('job-detail')) {
    return 'job-listing';
  }
  
  // Check if this is a search results page
  if (url.includes('/jobs-in-') || url.includes('/job-listings') || url.includes('/search/')) {
    return 'search-results';
  }
  
  // Check if this is a job application form page
  if (url.includes('/application-form') || document.querySelector('form.application-form') || url.includes('/apply/')) {
    return 'application-form';
  }
  
  // Check if this is the user's dashboard
  if (url.includes('/mnjuser/homepage') || url.includes('/myprofile') || url.includes('/dashboard')) {
    return 'dashboard';
  }
  
  // Default: unknown page type
  return 'unknown';
}

// Function to extract job details from a job listing page
function extractJobDetails() {
  if (detectPageType() !== 'job-listing') {
    return null;
  }
  
  try {
    // Different selectors to try for job title
    const titleSelectors = [
      'h1.jd-header-title', 
      'h1.jobTitle', 
      '.jd-top h1', 
      '.jd-header h1',
      'h1',
      '.title'
    ];
    
    // Different selectors to try for company name
    const companySelectors = [
      '.jd-header-comp-name', 
      '.company-name', 
      '.jd-comp-name',
      '.comp-info',
      '.company'
    ];
    
    // Different selectors to try for job location
    const locationSelectors = [
      '.jd-header-loc', 
      '.location', 
      '.loc',
      '.job-desc-loc',
      '.details-info .location'
    ];
    
    // Try to find job title using multiple possible selectors
    let title = '';
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) {
        title = element.innerText.trim();
        break;
      }
    }
    
    // Try to find company name using multiple possible selectors
    let company = '';
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) {
        company = element.innerText.trim();
        break;
      }
    }
    
    // Try to find location using multiple possible selectors
    let location = '';
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) {
        location = element.innerText.trim();
        break;
      }
    }
    
    return {
      title,
      company,
      location,
      url: window.location.href
    };
  } catch (error) {
    console.error('Error extracting job details:', error);
    return null;
  }
}

// When the content script loads, detect the page and notify the background script
const pageType = detectPageType();
const jobDetails = pageType === 'job-listing' ? extractJobDetails() : null;

chrome.runtime.sendMessage({
  action: 'pageDetected',
  pageType: pageType,
  url: window.location.href,
  jobDetails: jobDetails
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getPageInfo':
      // Get basic information about the current page
      const pageInfo = {
        title: document.title,
        url: window.location.href,
        pageType: detectPageType()
      };
      
      // If this is a job listing page, extract job details
      if (pageInfo.pageType === 'job-listing') {
        pageInfo.jobDetails = extractJobDetails();
      }
      
      sendResponse(pageInfo);
      break;
      
    default:
      console.log('Unknown action received in content script:', message.action);
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep the message channel open for async response
});