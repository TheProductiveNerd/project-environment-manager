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
            const envUrlObj = new URL(env.url);
            const envBase = envUrlObj.origin;
            const currentBase = currentUrlObj.origin;

            // Check if current page matches this environment's base URL
            if (currentBase === envBase) {
              return {
                projectId: project.id,
                projectName: project.name,
                envId: env.id,
                envName: env.name,
                envUrl: env.url,
                currentPath: currentPath,
                allEnvs: project.environments,
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

// Handle badge updates (optional: show number of matching envs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const projects = result[STORAGE_KEY] || [];
      const matchingEnv = findMatchingEnvironment(projects, tab.url);

      if (matchingEnv) {
        chrome.action.setBadgeText({ text: "✓", tabId: activeInfo.tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#667eea" });
      } else {
        chrome.action.setBadgeText({ text: "", tabId: activeInfo.tabId });
      }
    });
  });
});

// Update badge on URL change
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const projects = result[STORAGE_KEY] || [];
      const matchingEnv = findMatchingEnvironment(projects, tab.url);

      if (matchingEnv) {
        chrome.action.setBadgeText({ text: "✓", tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#667eea" });
      } else {
        chrome.action.setBadgeText({ text: "", tabId });
      }
    });
  }
});
