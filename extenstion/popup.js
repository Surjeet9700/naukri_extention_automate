document.addEventListener('DOMContentLoaded', () => {
  // Load saved profile data and applied jobs when popup opens
  loadProfileData();
  loadAppliedJobs();
  
  // Set up event listeners
  document.getElementById('profileForm').addEventListener('submit', saveProfile);
  document.getElementById('findJobs').addEventListener('click', findMatchingJobs);
  document.getElementById('resume').addEventListener('change', handleResumeUpload);
});

// Function to handle resume file upload
async function handleResumeUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    // Convert file to base64 for storage
    const base64Data = await fileToBase64(file);
    
    // For PDF files, extract text using FileReader
    let resumeText = '';
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      resumeText = await new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            // Convert ArrayBuffer to text
            const uint8Array = new Uint8Array(e.target.result);
            let text = '';
            for (let i = 0; i < uint8Array.length; i++) {
              text += String.fromCharCode(uint8Array[i]);
            }
            resolve(text);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    } else {
      // For doc/docx files, we'll store the content when it's parsed by the backend
      resumeText = 'Document text will be extracted during application';
    }
    
    // Store resume data in chrome.storage
    chrome.storage.local.set({ 
      'userResume': {
        name: file.name,
        type: file.type,
        data: base64Data,
        lastModified: file.lastModified,
        text: resumeText
      }
    }, () => {
      showNotification('Resume uploaded successfully!');
    });
  } catch (error) {
    console.error('Error handling resume upload:', error);
    showNotification('Failed to upload resume. Please try again.', 'error');
  }
}

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Function to save profile data to chrome.storage.local
function saveProfile(event) {
  event.preventDefault();
  
  const profileData = {
    skills: document.getElementById('skills').value,
    experience: document.getElementById('experience').value,
    location: document.getElementById('location').value,
    jobTitle: document.getElementById('jobTitle').value
  };
  
  chrome.storage.local.set({ 'userProfile': profileData }, () => {
    showNotification('Profile saved successfully!');
  });
}

// Function to load saved profile data from chrome.storage.local
function loadProfileData() {
  chrome.storage.local.get(['userProfile', 'userResume'], (data) => {
    if (data.userProfile) {
      document.getElementById('skills').value = data.userProfile.skills || '';
      document.getElementById('experience').value = data.userProfile.experience || '';
      document.getElementById('location').value = data.userProfile.location || '';
      document.getElementById('jobTitle').value = data.userProfile.jobTitle || '';
    }
  });
}

// Function to find matching jobs from the backend
async function findMatchingJobs() {
  // Show loading indicator
  const loadingContainer = document.getElementById('loadingContainer');
  loadingContainer.style.display = 'flex';
  
  // Hide any previous job results
  document.getElementById('jobResults').style.display = 'none';
  
  // Disable the find jobs button
  showLoading(true);
  
  try {
    const data = await new Promise((resolve, reject) => {
      chrome.storage.local.get('userProfile', (data) => {
        if (!data.userProfile) {
          reject(new Error('Please save your profile first!'));
          return;
        }
        
        // Send profile data to background service worker to query backend
        chrome.runtime.sendMessage({
          action: 'findMatchingJobs',
          profileData: data.userProfile
        }, (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(response);
        });
      });
    });

    // Get application status for all jobs
    const jobUrls = data.jobs.map(job => job.jobUrl);
    const appliedStatus = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: 'checkAppliedJobs',
        jobUrls: jobUrls
      }, resolve);
    });

    // Merge application status with job data
    const jobsWithStatus = data.jobs.map(job => ({
      ...job,
      applicationStatus: appliedStatus.appliedJobs[job.jobUrl]
    }));

    displayJobs(jobsWithStatus);
  } catch (error) {
    showNotification(error.message, 'error');
  } finally {
    hideLoading();
  }
}

// Function to hide the loading indicator
function hideLoading() {
  const loadingContainer = document.getElementById('loadingContainer');
  loadingContainer.style.display = 'none';
  document.getElementById('jobResults').style.display = 'block';
  showLoading(false);
}

// Function to display the matched jobs in the popup
function displayJobs(jobs) {
  const jobResultsElement = document.getElementById('jobResults');
  
  if (!jobs || jobs.length === 0) {
    jobResultsElement.innerHTML = '<p class="no-jobs">No matching jobs found.</p>';
    return;
  }
  
  let jobsHTML = '';
  
  jobs.forEach(job => {
    const postedDate = job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Unknown date';
    const applicationStatus = job.applicationStatus || null;
    
    // Determine button state based on application status
    let applyButtonHTML = '';
    if (applicationStatus?.status === 'success') {
      applyButtonHTML = `<button class="apply-btn success" disabled>Applied Successfully</button>`;
    } else if (applicationStatus?.status === 'failed') {
      applyButtonHTML = `<button class="apply-btn failed" data-job-url="${job.jobUrl}">Failed - Retry</button>`;
    } else if (applicationStatus?.status === 'pending') {
      applyButtonHTML = `<button class="apply-btn pending" data-job-url="${job.jobUrl}">Application Pending</button>`;
    } else {
      applyButtonHTML = `<button class="apply-btn" data-job-url="${job.jobUrl}">Apply</button>`;
    }
    
    jobsHTML += `
      <div class="job-card">
        <div class="job-title">${job.title}</div>
        <div class="job-company">${job.company}</div>
        <div class="job-location">${job.location}</div>
        <div class="job-date">Posted: ${postedDate}</div>
        <div class="job-actions">
          <button class="view-btn" data-job-url="${job.jobUrl}">View</button>
          ${applyButtonHTML}
        </div>
      </div>
    `;
  });
  
  jobResultsElement.innerHTML = jobsHTML;
  
  // Add event listeners to the job buttons
  document.querySelectorAll('.view-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      const jobUrl = event.target.getAttribute('data-job-url');
      openJobPage(jobUrl);
    });
  });

  document.querySelectorAll('.apply-btn:not([disabled])').forEach(button => {
    button.addEventListener('click', async (event) => {
      const jobUrl = event.target.getAttribute('data-job-url');
      await startAutomatedApplication(jobUrl);
    });
  });
}

// Function to load applied jobs
async function loadAppliedJobs() {
  const appliedJobsElement = document.getElementById('appliedJobs');
  
  try {
    const response = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: 'checkAppliedJobs',
        jobUrls: [] // Empty array to get all applied jobs
      }, resolve);
    });

    if (!response.success || !response.appliedJobs) {
      appliedJobsElement.innerHTML = '<p class="no-jobs">No applications found.</p>';
      return;
    }

    const jobs = Object.entries(response.appliedJobs);
    if (jobs.length === 0) {
      appliedJobsElement.innerHTML = '<p class="no-jobs">No applications found.</p>';
      return;
    }

    let html = '';
    jobs.forEach(([url, status]) => {
      const statusClass = status.status.toLowerCase();
      const lastAttempt = new Date(status.lastAttempt).toLocaleDateString();
      
      html += `
        <div class="job-card ${statusClass}">
          <div class="job-status">Status: ${status.status}</div>
          <div class="job-attempts">Attempts: ${status.attempts}</div>
          <div class="job-last-attempt">Last Attempt: ${lastAttempt}</div>
          <a href="${url}" target="_blank" class="view-link">View Job</a>
        </div>
      `;
    });

    appliedJobsElement.innerHTML = html;
  } catch (error) {
    console.error('Error loading applied jobs:', error);
    appliedJobsElement.innerHTML = '<p class="error">Failed to load applied jobs.</p>';
  }
}

// Function to open the job page in a new tab
function openJobPage(jobUrl) {
  chrome.tabs.create({ url: jobUrl });
}

// Function to start automated job application
async function startAutomatedApplication(jobUrl) {
  try {
    // Get profile data to verify it exists
    chrome.storage.local.get(['userProfile'], async (data) => {
      if (!data.userProfile) {
        showNotification('Please save your profile first!', 'error');
        return;
      }

      // Launch the assistant window
      chrome.windows.create({
        url: `assistant.html?jobUrl=${encodeURIComponent(jobUrl)}`,
        type: 'popup',
        width: 600,
        height: 600,
        focused: true
      }, (window) => {
        // Close the popup since we now have the assistant window
        window.close();
      });
    });
  } catch (error) {
    console.error('Error starting automation:', error);
    showNotification('Failed to start automation process', 'error');
  }
}

// Helper function to show loading state
function showLoading(isLoading) {
  const findJobsButton = document.getElementById('findJobs');
  
  if (isLoading) {
    findJobsButton.textContent = 'Searching...';
    findJobsButton.disabled = true;
  } else {
    findJobsButton.textContent = 'Find Matching Jobs';
    findJobsButton.disabled = false;
  }
}

// Helper function to show notifications
function showNotification(message, type = 'success') {
  // Check if a notification already exists and remove it
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add notification to the container
  document.querySelector('.container').prepend(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}