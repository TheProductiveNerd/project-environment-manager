document.addEventListener("DOMContentLoaded", init);

let lastRenderedUrl = location.href;
let uiAbortController = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "HISTORY_STATE_UPDATED":
      rerender();
      break;
  }

  sendResponse({ ok: true });
});

function rerender() {
  if (lastRenderedUrl === location.href) {
    return;
  }

  lastRenderedUrl = location.href;

  cleanupInjectedUI();
  init();
}

function cleanupInjectedUI() {
  // Remove old UI
  const existing = document.getElementById("pem-floating-wrapper");

  if (existing) {
    existing.remove();
  }

  // Remove all previous listeners
  if (uiAbortController) {
    uiAbortController.abort();
    uiAbortController = null;
  }
}

function init() {
  "use strict";

  if (!window.location.protocol.startsWith("http")) {
    return;
  }

  chrome.runtime.sendMessage(
    {
      action: "findMatchingEnv",
      url: window.location.href,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        return;
      }

      if (response && response.matchingEnv) {
        injectFloatingBar(response.matchingEnv);
      }
    },
  );

  function hexToRgba(hex, alpha) {
    let normalized = hex.replace("#", "");

    if (normalized.length === 3) {
      normalized = normalized
        .split("")
        .map((char) => char + char)
        .join("");
    }

    const bigint = parseInt(normalized, 16);

    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function generateEnvList(matchingEnv) {
    const currentEnvId = matchingEnv.envId;

    return matchingEnv.allEnvs
      .map((env) => {
        if (env.active === false) {
          return "";
        }

        const isCurrent = env.id === currentEnvId;

        const classes = ["pem-env-item"];

        if (isCurrent) {
          classes.push("current");
        }

        const badgeText = isCurrent ? "Current" : "";

        return `
          <button
            type="button"
            class="${classes.join(" ")}"
            data-env-id="${env.id}"
            data-env-url="${env.url}"
            ${isCurrent ? "disabled" : ""}
          >
            ${env.name}
            ${badgeText
            ? `<span class="pem-current-badge">${badgeText}</span>`
            : ""
          }
            ${!isCurrent
            ? '<span class="pem-status-badge">Checking</span>'
            : ""
          }
          </button>
        `;
      })
      .join("");
  }

  function injectFloatingBar(matchingEnv) {
    cleanupInjectedUI();

    uiAbortController = new AbortController();

    const { signal } = uiAbortController;

    const currentEnv =
      matchingEnv.allEnvs.find((env) => env.id === matchingEnv.envId) || {};

    const badgeIndicatorColor = currentEnv.badgeIndicatorColor;

    const shadowColor = hexToRgba(badgeIndicatorColor, 0.6);

    const badgeBackgroundColor = currentEnv.badgeBackgroundColor;

    const badgeFontColor = currentEnv.badgeFontColor;

    const indicatorClasses =
      currentEnv.active === false
        ? "pem-indicator inactive"
        : "pem-indicator";

    const html = `
      <div id="pem-floating-wrapper">
        <button
          style="background: ${badgeBackgroundColor};"
          id="pem-floating-btn"
          type="button"
        >
          <span
            class="${indicatorClasses}"
            style="
              background: ${badgeIndicatorColor};
              box-shadow: 0 0 10px ${shadowColor};
            "
          ></span>

          <span
            class="pem-label"
            style="color: ${badgeFontColor};"
          >
            ${matchingEnv.envName}
          </span>

          <span
            class="pem-chevron"
            style="color: ${badgeFontColor};"
          >
            ▾
          </span>
        </button>

        <div id="pem-floating-dropdown">
          <div class="pem-dropdown-header">
            ${matchingEnv.projectName} — ${matchingEnv.envName}
          </div>

          <button type="button" class="pem-copy-btn">
            📋 Copy current URL
          </button>

          <div class="pem-switch-label">
            Switch environment
          </div>

          <div class="pem-env-list">
            ${generateEnvList(matchingEnv)}
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement("div");

    wrapper.innerHTML = html;

    document.body.appendChild(wrapper.firstElementChild);

    const button = document.getElementById("pem-floating-btn");

    const dropdown = document.getElementById("pem-floating-dropdown");

    const copyBtn = document.querySelector(".pem-copy-btn");

    const envItems = Array.from(
      document.querySelectorAll(".pem-env-item"),
    ).filter((item) => !item.disabled);

    function toggleDropdown() {
      dropdown.classList.toggle("visible");
    }

    function hideDropdown() {
      dropdown.classList.remove("visible");
    }

    copyBtn.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        navigator.clipboard.writeText(window.location.href).then(() => {
          copyBtn.textContent = "✓ URL copied";

          setTimeout(() => {
            copyBtn.textContent = "📋 Copy current URL";
          }, 2000);
        });
      },
      { signal },
    );

    envItems.forEach((item) => {
      item.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          const envUrl = item.getAttribute("data-env-url");

          const targetEnv = matchingEnv.allEnvs.find(
            (e) => e.url === envUrl,
          );

          switchToEnvironment(targetEnv, matchingEnv);

          hideDropdown();
        },
        { signal },
      );
    });

    button.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        toggleDropdown();
      },
      { signal },
    );

    document.addEventListener(
      "click",
      (event) => {
        if (
          !button.contains(event.target) &&
          !dropdown.contains(event.target)
        ) {
          hideDropdown();
        }
      },
      { signal },
    );

    checkEnvironmentStatuses(matchingEnv);
  }

  function checkEnvironmentStatuses(matchingEnv) {
    const currentEnvId = matchingEnv.envId;

    const otherEnvs = matchingEnv.allEnvs.filter(
      (env) => env.id !== currentEnvId && env.active !== false,
    );

    chrome.runtime.sendMessage(
      {
        action: "checkEnvStatuses",
        url: window.location.href,
        currentEnv: matchingEnv,
        envs: otherEnvs.map((env) => ({
          id: env.id,
          url: env.url,
        })),
      },
      (response) => {
        if (chrome.runtime.lastError) {
          return;
        }

        if (!response || !response.results) {
          return;
        }

        response.results.forEach((result) => {
          updateEnvironmentStatus(result.id, result.status);
        });
      },
    );
  }

  function updateEnvironmentStatus(envId, status) {
    const statusBadge = document.querySelector(
      `[data-env-id="${envId}"] .pem-status-badge`,
    );

    if (!statusBadge) {
      return;
    }

    const isOnline =
      typeof status === "number" &&
      status >= 200 &&
      status < 300;

    statusBadge.textContent = isOnline
      ? "Available"
      : `Error (${status})`;

    statusBadge.className = `pem-status-badge ${isOnline ? "online" : "offline"
      }`;
  }

  function normalizeUrl(url) {
    return url
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .replace(/\/$/, "")
      .toLowerCase();
  }

  function switchToEnvironment(targetEnv, matchingEnv) {
    if (!targetEnv) {
      return;
    }

    const currentUrlNormalized = normalizeUrl(window.location.href);

    const targetUrlNormalized = normalizeUrl(targetEnv.url);

    const currentEnvNormalized = normalizeUrl(matchingEnv.envUrl);

    const targetUrl = currentUrlNormalized.replace(
      currentEnvNormalized,
      targetUrlNormalized,
    );

    const urlObj = new URL(targetEnv.url);

    const finalTargetUrl =
      urlObj.protocol + "//" + targetUrl;

    try {
      window.location.href = finalTargetUrl;
    } catch (error) {
      console.error("Error switching environment:", error);

      alert("Unable to switch environment. Invalid URL.");
    }
  }
}