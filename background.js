const STORAGE_KEY = "pem_projects";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProjects") {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const projects = result[STORAGE_KEY] || [];
      sendResponse({ projects });
    });
    return true;
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

    const newUrl = targetUrl + currentPath;

    sendResponse({ success: true, newUrl });
    return;
  }

  if (request.action === "checkEnvStatuses") {
    const currentUrl = request.url;
    const envs = Array.isArray(request.envs) ? request.envs : [];
    const statusPromises = envs.map((env) => {
      const targetUrl = currentUrl.replace(request.currentEnv.envUrl, env.url);
      return checkEnvStatus(targetUrl)
        .then((status) => ({ id: env.id, status }))
        .catch(() => ({ id: env.id, status: "Error" }))
    }
    );
    Promise.all(statusPromises).then((results) => {
      sendResponse({ results });
    });
    return true;
  }
});

function findMatchingEnvironment(projects, currentUrl) {
  try {
    const currentUrlObj = new URL(currentUrl);
    const currentPath =
      currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;

    for (const project of projects) {
      if (project.environments) {
        for (const env of project.environments) {
          try {
            if (env.active && compareUrls(currentUrl, env.url)) {
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

function normalizeUrl(url) {
  return url.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "").toLowerCase();
}

function compareUrls(url1, url2) {
  return normalizeUrl(url1).startsWith(normalizeUrl(url2));
}

async function checkEnvStatus(url) {
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
  });
  return response.status;
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

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateBadgeForTabUrl(activeInfo.tabId, tab?.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateBadgeForTabUrl(tabId, changeInfo.url || tab?.url);
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) {
    updateBadgeForTabUrl(details.tabId, details.url);
  }
});

chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  if (details.frameId === 0) {
    updateBadgeForTabUrl(details.tabId, details.url);
  }
});

