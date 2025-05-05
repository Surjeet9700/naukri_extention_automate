// Store window state
let activeState = {
    jobUrl: null,
    profile: null,
    resume: null,
    automationStatus: 'initializing'
};

// Initialize the window
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    document.getElementById('closeButton').addEventListener('click', () => {
        window.close();
    });

    // Get the initial state from the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    activeState.jobUrl = urlParams.get('jobUrl');

    // Load profile data
    chrome.storage.local.get(['userProfile', 'userResume'], (data) => {
        if (data.userProfile) {
            activeState.profile = data.userProfile;
            displayProfile(data.userProfile);
        }
        if (data.userResume) {
            activeState.resume = data.userResume;
        }
        startAutomation();
    });
});

// Display profile information
function displayProfile(profile) {
    const profileInfo = document.getElementById('profileInfo');
    profileInfo.innerHTML = `
        <div class="info-card">
            <p><strong>Skills:</strong> ${profile.skills || 'Not specified'}</p>
            <p><strong>Experience:</strong> ${profile.experience || 'Not specified'} years</p>
            <p><strong>Location:</strong> ${profile.location || 'Not specified'}</p>
            <p><strong>Target Job:</strong> ${profile.jobTitle || 'Not specified'}</p>
        </div>
    `;
}

// Update automation status
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    const automationStatus = document.getElementById('automationStatus');
    
    statusElement.textContent = message;
    automationStatus.innerHTML += `
        <div class="status-message ${type}">
            ${message}
        </div>
    `;
    
    activeState.automationStatus = message;
}

// Start the automation process
async function startAutomation() {
    if (!activeState.jobUrl) {
        updateStatus('No job URL provided', 'error');
        return;
    }

    updateStatus('Starting automation process...');

    // Create a new tab with the job URL
    const tab = await new Promise(resolve => {
        chrome.tabs.create({ url: activeState.jobUrl, active: true }, tab => resolve(tab));
    });

    // Wait for the tab to load completely
    await new Promise(resolve => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        });
    });

    // Start the automation process
    chrome.runtime.sendMessage({
        action: 'startAutomation',
        profileData: activeState.profile,
        resumeData: activeState.resume,
        tabId: tab.id
    }, (response) => {
        if (response.error) {
            updateStatus(`Automation error: ${response.error}`, 'error');
        } else {
            updateStatus('Application process completed successfully!', 'success');
        }
    });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'updateStatus':
            updateStatus(message.status, message.type);
            sendResponse({ received: true });
            break;
            
        case 'automationComplete':
            updateStatus('Automation completed!', 'success');
            sendResponse({ received: true });
            break;
    }
    return true;
});