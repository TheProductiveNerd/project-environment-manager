/**
 * Content Script for Project Environment Manager
 * Injects a floating environment switch button for matching environments
 */

(function () {
  "use strict";

  // Only run on http/https pages
  if (!window.location.protocol.startsWith("http")) {
    return;
  }

  // Check for matching environment
  chrome.runtime.sendMessage(
    { action: "findMatchingEnv", url: window.location.href },
    (response) => {
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

  /**
   * Generate environment list HTML
   */
  function generateEnvList(matchingEnv) {
    const currentEnvId = matchingEnv.envId;

    return matchingEnv.allEnvs
      .map((env) => {
        const isCurrent = env.id === currentEnvId;
        const isInactive = env.active === false;
        const classes = ["pem-env-item"];
        if (isCurrent) classes.push("current");
        if (isInactive) classes.push("inactive");

        const badgeText = isCurrent ? "Current" : isInactive ? "Inactive" : "";

        return `
          <button
            type="button"
            class="${classes.join(" ")}"
            data-env-id="${env.id}"
            data-env-url="${env.url}"
            ${isCurrent || isInactive ? "disabled" : ""}
          >
            ${env.name}
            ${badgeText ? `<span class="pem-current-badge">${badgeText}</span>` : ""}
            ${!isCurrent && !isInactive ? '<span class="pem-status-badge">Checking</span>' : ""}
          </button>
        `;
      })
      .join("");
  }

  /**
   * Inject floating button with environment info and dropdown actions
   */
  function injectFloatingBar(matchingEnv) {
    const currentEnv =
      matchingEnv.allEnvs.find((env) => env.id === matchingEnv.envId) || {};
    const blinkColor = currentEnv.color || "#4ade80";
    const shadowColor = hexToRgba(blinkColor, 0.6);
    const indicatorClasses =
      currentEnv.active === false ? "pem-indicator inactive" : "pem-indicator";

    const html = `
      <div id="pem-floating-wrapper">
        <button id="pem-floating-btn" type="button">
          <span class="${indicatorClasses}" style="background: ${blinkColor}; box-shadow: 0 0 10px ${shadowColor};"></span>
          <span class="pem-label"><strong>${matchingEnv.envName}</strong></span>
          <span class="pem-chevron">▾</span>
        </button>
        <div id="pem-floating-dropdown">
          <div class="pem-dropdown-header">${matchingEnv.projectName} — ${matchingEnv.envName}</div>
          <button type="button" class="pem-copy-btn">📋 Copy current URL</button>
          <div class="pem-switch-label">Switch environment</div>
          ${generateEnvList(matchingEnv)}
        </div>
      </div>
    `;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);

    // Get references to elements
    const button = document.getElementById("pem-floating-btn");
    const dropdown = document.getElementById("pem-floating-dropdown");
    const copyBtn = document.querySelector(".pem-copy-btn");
    const envItems = Array.from(
      document.querySelectorAll(".pem-env-item"),
    ).filter((item) => !item.disabled);

    // Toggle dropdown
    function toggleDropdown() {
      dropdown.classList.toggle("visible");
    }

    function hideDropdown() {
      dropdown.classList.remove("visible");
    }

    // Copy URL functionality
    copyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      navigator.clipboard.writeText(window.location.href).then(() => {
        copyBtn.textContent = "✓ URL copied";
        setTimeout(() => {
          copyBtn.textContent = "📋 Copy current URL";
        }, 2000);
      });
    });

    // Environment switch functionality
    envItems.forEach((item) => {
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        const envUrl = item.getAttribute("data-env-url");
        const targetEnv = matchingEnv.allEnvs.find((e) => e.url === envUrl);
        switchToEnvironment(targetEnv, matchingEnv);
        hideDropdown();
      });
    });

    // Button click handler
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
      if (!button.contains(event.target) && !dropdown.contains(event.target)) {
        hideDropdown();
      }
    });

    // Check status of other environments
    checkEnvironmentStatuses(matchingEnv);
  }

  /**
   * Check if other environments are reachable
   */
  function checkEnvironmentStatuses(matchingEnv) {
    const currentEnvId = matchingEnv.envId;
    const otherEnvs = matchingEnv.allEnvs.filter(
      (env) => env.id !== currentEnvId && env.active !== false,
    );

    otherEnvs.forEach((env) => {
      const testUrl = new URL(env.url).origin + matchingEnv.currentPath;

      fetch(testUrl, { method: "HEAD" })
        .then((response) => {
          updateEnvironmentStatus(env.id, response.ok ? "online" : "offline");
        })
        .catch(() => {
          updateEnvironmentStatus(env.id, "offline");
        });
    });
  }

  /**
   * Update environment status in dropdown
   */
  function updateEnvironmentStatus(envId, status) {
    const statusBadge = document.querySelector(
      `[data-env-id="${envId}"] .pem-status-badge`,
    );
    if (statusBadge) {
      statusBadge.textContent = status === "online" ? "Online" : "Offline";
      statusBadge.className = `pem-status-badge ${status}`;
    }
  }

  /**
   * Switch to a different environment
   */
  function switchToEnvironment(targetEnv, matchingEnv) {
    if (!targetEnv) {
      return;
    }

    try {
      const currentUrl = window.location.href;
      const currentUrlObj = new URL(currentUrl);
      const targetUrlObj = new URL(targetEnv.url);

      const targetOrigin = targetUrlObj.origin;
      const currentPath =
        currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;

      const newUrl = targetOrigin + currentPath;
      window.location.href = newUrl;
    } catch (error) {
      console.error("Error switching environment:", error);
      alert("Unable to switch environment. Invalid URL.");
    }
  }
})();
