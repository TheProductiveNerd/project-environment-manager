/**
 * Background Service Worker for Project Environment Manager
 * Handles storage, messaging, and environment detection logic
 */

const STORAGE_KEY = "pem_projects";

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProjects") {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const projects = result[STORAGE_KEY] || [];
      sendResponse({ projects });
    });
    return true; // Indicates we'll send response asynchronously
  }

  if (request.action === "findMatchingEnv") {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const projects = result[STORAGE_KEY] || [];
      const currentUrl = request.url;
      const matchingEnv = findMatchingEnvironment(projects, currentUrl);
      sendResponse({ matchingEnv });
    });
    return true;
  }

  if (request.action === "switchToEnv") {
    const targetUrl = request.targetUrl;
    const currentPath = request.currentPath;

    // Switch by reloading with new base URL + same path
    const newUrl = targetUrl + currentPath;

    sendResponse({ success: true, newUrl });
  }
});

/**
 * Find matching environment for a given URL
 */
function findMatchingEnvironment(projects, currentUrl) {
  try {
    const currentUrlObj = new URL(currentUrl);
    const currentPath =
      currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;

    for (const project of projects) {
      if (project.environments) {
        for (const env of project.environments) {
          try {
            // Check if current page matches this environment's URL
            if (env.active && currentUrl.startsWith(env.url)) {
              return {
                projectId: project.id,
                projectName: project.name,
                envId: env.id,
                envName: env.name,
                envUrl: env.url,
                currentPath: currentPath,
                allEnvs: project.environments,
                badgeBackgroundColor: env.badgeBackgroundColor,
                badgeIndicatorColor: env.badgeIndicatorColor,
                badgeFontColor: env.badgeFontColor,
              };
            }
          } catch (e) {
            console.error("Invalid environment URL:", env.url);
          }
        }
      }
    }
  } catch (e) {
    console.error("Invalid current URL:", currentUrl);
  }

  return null;
}

function updateBadgeForTabUrl(tabId, url) {
  if (!url) {
    chrome.action.setBadgeText({ text: "", tabId });
    return;
  }

  chrome.storage.sync.get(STORAGE_KEY, (result) => {
    const projects = result[STORAGE_KEY] || [];
    const matchingEnv = findMatchingEnvironment(projects, url);

    if (matchingEnv) {
      chrome.action.setBadgeText({ text: "✓", tabId });
      chrome.action.setBadgeBackgroundColor({ color: matchingEnv.badgeIndicatorColor });
      chrome.action.setBadgeTextColor({ color: matchingEnv.badgeFontColor });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  });
}

// Handle badge updates when the active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateBadgeForTabUrl(activeInfo.tabId, tab?.url);
  });
});

// Handle full tab navigations
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateBadgeForTabUrl(tabId, changeInfo.url || tab?.url);
  }
});

// Handle SPA route changes triggered by pushState / replaceState
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) {
    updateBadgeForTabUrl(details.tabId, details.url);
  }
});

// Handle hash changes in single-page apps
chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  if (details.frameId === 0) {
    updateBadgeForTabUrl(details.tabId, details.url);
  }
});

