document.addEventListener('DOMContentLoaded', () => {
  // Load saved profile data when popup opens
  loadProfileData();
  
  // Set up event listeners
  document.getElementById('profileForm').addEventListener('submit', saveProfile);
  document.getElementById('findJobs').addEventListener('click', findMatchingJobs);
});

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
  chrome.storage.local.get('userProfile', (data) => {
    if (data.userProfile) {
      document.getElementById('skills').value = data.userProfile.skills || '';
      document.getElementById('experience').value = data.userProfile.experience || '';
      document.getElementById('location').value = data.userProfile.location || '';
      document.getElementById('jobTitle').value = data.userProfile.jobTitle || '';
    }
  });
}

// Function to find matching jobs from the backend
function findMatchingJobs() {
  // Show loading indicator
  const loadingContainer = document.getElementById('loadingContainer');
  loadingContainer.style.display = 'flex';
  
  // Hide any previous job results
  document.getElementById('jobResults').style.display = 'none';
  
  // Disable the find jobs button
  showLoading(true);
  
  chrome.storage.local.get('userProfile', (data) => {
    if (!data.userProfile) {
      showNotification('Please save your profile first!', 'error');
      hideLoading();
      return;
    }
    
    // Send profile data to background service worker to query backend
    chrome.runtime.sendMessage({
      action: 'findMatchingJobs',
      profileData: data.userProfile
    }, (response) => {
      hideLoading();
      
      if (response.error) {
        showNotification(`Error: ${response.error}`, 'error');
        return;
      }
      
      displayJobs(response.jobs);
    });
  });
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
    // Format the posted date
    const postedDate = job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Unknown date';
    
    jobsHTML += `
      <div class="job-card">
        <div class="job-title">${job.title}</div>
        <div class="job-company">${job.company}</div>
        <div class="job-location">${job.location}</div>
        <div class="job-date">Posted: ${postedDate}</div>
        <div class="job-apply">
          <button class="apply-btn" data-job-url="${job.jobUrl}">View Job</button>
        </div>
      </div>
    `;
  });
  
  jobResultsElement.innerHTML = jobsHTML;
  
  // Add event listeners to the job buttons
  document.querySelectorAll('.apply-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      const jobUrl = event.target.getAttribute('data-job-url');
      openJobPage(jobUrl);
    });
  });
}

// Function to open the job page in a new tab
function openJobPage(jobUrl) {
  chrome.tabs.create({ url: jobUrl });
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