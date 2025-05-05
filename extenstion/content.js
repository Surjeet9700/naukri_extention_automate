// This content script is injected into Naukri.com pages

// Page type detection
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

// Application form field selectors
const FORM_SELECTORS = {
  name: '#name, input[name="name"]',
  email: '#email, input[type="email"]',
  phone: '#mobile, input[name="phone"], input[type="tel"]',
  experience: '#totalExperience, input[name="experience"]',
  currentCompany: '#current-company, input[name="currentCompany"]',
  currentDesignation: '#current-designation, input[name="currentDesignation"]',
  skills: '#key-skills, textarea[name="skills"]',
  resumeUpload: 'input[type="file"][accept*="pdf"], input[type="file"][accept*="doc"]'
};

// Bot popup selectors
const BOT_POPUP_SELECTORS = {
  container: '.bot-popup, .questionnaire-popup, #screening-questions',
  question: '.question-text, .bot-question, .screening-question',
  options: '.options-container input[type="radio"], .options-container input[type="checkbox"]',
  textInput: '.answer-input input[type="text"], .answer-input textarea',
  submitButton: '.submit-answer, .next-question, button[type="submit"]'
};

// Apply button selector
const APPLY_BUTTON_SELECTOR = '.apply-button, .apply-now-button, button[type="button"]:contains("Apply Now")';

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
    
    let title = '';
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) {
        title = element.innerText.trim();
        break;
      }
    }
    
    let company = '';
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) {
        company = element.innerText.trim();
        break;
      }
    }
    
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

// Function to handle bot popup questions
async function handleBotPopup() {
  try {
    // Wait for the bot popup to appear
    const popup = await waitForElement(BOT_POPUP_SELECTORS.container);
    if (!popup) return false;

    // Get stored resume data
    const { userResume } = await chrome.storage.local.get('userResume');
    if (!userResume) {
      console.error('No resume data found');
      return false;
    }

    while (true) {
      // Wait for question to appear
      const questionElement = await waitForElement(BOT_POPUP_SELECTORS.question);
      if (!questionElement) break;

      const question = questionElement.textContent.trim();
      
      // Get answer from backend using Gemini
      const response = await fetch('http://localhost:3000/api/handleBotQuestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          resumeText: userResume.text
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get answer from backend');
      }

      const { answer } = await response.json();

      // Handle multiple choice questions
      const options = document.querySelectorAll(BOT_POPUP_SELECTORS.options);
      if (options.length > 0) {
        for (const option of options) {
          if (option.value.toLowerCase() === answer.toLowerCase() ||
              option.nextSibling?.textContent?.toLowerCase() === answer.toLowerCase()) {
            option.click();
            break;
          }
        }
      } else {
        // Handle text input questions
        const textInput = document.querySelector(BOT_POPUP_SELECTORS.textInput);
        if (textInput) {
          textInput.value = answer;
          triggerInputEvent(textInput);
        }
      }

      // Submit answer
      const submitButton = document.querySelector(BOT_POPUP_SELECTORS.submitButton);
      if (submitButton) {
        submitButton.click();
      }

      // Wait for next question or end of questionnaire
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return true;
  } catch (error) {
    console.error('Error handling bot popup:', error);
    return false;
  }
}

// Function to find and click apply button
async function findAndClickApplyButton() {
  try {
    // Select all possible apply button variations
    const applyButtonSelectors = [
      'button.apply-button',
      'button.apply-now',
      'a.apply-button',
      'a[href*="apply"]',
      'button:contains("Apply")',
      'button:contains("Apply Now")',
      '.apply-now-button'
    ];

    for (const selector of applyButtonSelectors) {
      const applyBtn = await waitForElement(selector, 3000);
      if (applyBtn) {
        // Check if button is visible and clickable
        const rect = applyBtn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          applyBtn.click();
          return true;
        }
      }
    }
    throw new Error('Apply button not found or not clickable');
  } catch (error) {
    console.error('Error clicking apply button:', error);
    return false;
  }
}

// Listen for page load to auto-click apply button
if (window.location.href.includes('job-listings') || window.location.href.match(/\/job\/[^/]+\/\d+/)) {
  // Wait for page to be fully loaded
  window.addEventListener('load', async () => {
    // Small delay to ensure all dynamic content is loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    const result = await findAndClickApplyButton();
    
    // Notify background script of the result
    chrome.runtime.sendMessage({
      action: 'applyButtonClicked',
      success: result,
      url: window.location.href
    });
  });
}

// Function to check for application success
async function checkApplicationSuccess() {
  try {
    // Wait for success indicators
    const successIndicators = [
      '.success-message',
      '.application-success',
      '.confirmation-message',
      'div:contains("Application Submitted Successfully")'
    ];

    for (const selector of successIndicators) {
      const element = document.querySelector(selector);
      if (element) {
        return true;
      }
    }

    // Check for error messages
    const errorIndicators = [
      '.error-message',
      '.application-error',
      'div:contains("already applied")',
      'div:contains("Application Failed")'
    ];

    for (const selector of errorIndicators) {
      const element = document.querySelector(selector);
      if (element) {
        throw new Error(element.textContent.trim());
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking application status:', error);
    throw error;
  }
}

// Function to auto-fill application form
async function autoFillForm(profileData) {
  if (detectPageType() !== 'application-form') {
    return false;
  }

  try {
    // Wait for form fields to be available
    await waitForElement(Object.values(FORM_SELECTORS)[0]);

    const aiData = profileData.parsedResumeData || {};

    // Fill form fields using AI-parsed data or fallback to manual profile data
    for (const [field, selector] of Object.entries(FORM_SELECTORS)) {
      const element = document.querySelector(selector);
      if (!element) continue;

      let value = '';
      switch (field) {
        case 'name':
          value = aiData.fullName || '';
          break;
        case 'email':
          value = aiData.email || '';
          break;
        case 'phone':
          value = aiData.phoneNumber || '';
          break;
        case 'experience':
          value = aiData.yearsOfExperience || profileData.experience || '';
          break;
        case 'currentCompany':
          value = aiData.currentCompany || '';
          break;
        case 'currentDesignation':
          value = aiData.currentJobTitle || profileData.jobTitle || '';
          break;
        case 'skills':
          value = (aiData.skills || profileData.skills || '').toString();
          break;
      }

      if (value) {
        element.value = value;
        triggerInputEvent(element);
      }
    }

    // Then handle bot popup if it appears
    await handleBotPopup();

    // Check for application success
    const success = await checkApplicationSuccess();
    
    // Send status update to background script
    chrome.runtime.sendMessage({
      action: 'updateApplicationStatus',
      jobUrl: window.location.href,
      status: success ? 'success' : 'pending'
    });

    return success;
  } catch (error) {
    console.error('Error auto-filling form:', error);
    
    // Send error status to background script
    chrome.runtime.sendMessage({
      action: 'updateApplicationStatus',
      jobUrl: window.location.href,
      status: 'failed',
      error: error.message
    });
    
    return false;
  }
}

// Function to handle resume upload
async function handleResumeUpload(resumeData) {
  try {
    const uploadInput = document.querySelector(FORM_SELECTORS.resumeUpload);
    if (!uploadInput) return false;

    // Convert base64 back to file
    const response = await fetch(resumeData.data);
    const blob = await response.blob();
    const file = new File([blob], resumeData.name, { type: resumeData.type });

    // Create a DataTransfer object and add the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    uploadInput.files = dataTransfer.files;
    triggerInputEvent(uploadInput);

    return true;
  } catch (error) {
    console.error('Error handling resume upload:', error);
    return false;
  }
}

// Helper function to wait for an element
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Timeout waiting for element: ${selector}`));
        return;
      }
      
      requestAnimationFrame(checkElement);
    };
    
    checkElement();
  });
}

// Helper function to trigger input event
function triggerInputEvent(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
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

    case 'extractJobDetails':
      sendResponse(extractJobDetails());
      break;
      
    case 'autoFillForm':
      autoFillForm(message.profileData)
        .then(success => sendResponse({ success }))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep the message channel open for async response
      
    case 'uploadResume':
      handleResumeUpload(message.resumeData)
        .then(success => sendResponse({ success }))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'findAndClickApply':
      findAndClickApplyButton()
        .then(success => sendResponse({ success }))
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'checkApplicationStatus':
      checkApplicationSuccess()
        .then(success => sendResponse({ success }))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    default:
      console.log('Unknown action received in content script:', message.action);
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep the message channel open for async response
});