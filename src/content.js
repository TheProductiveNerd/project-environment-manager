document.addEventListener("DOMContentLoaded", init);
function init() {
  "use strict";

  if (!window.location.protocol.startsWith("http")) {
    return;
  }

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

  function generateEnvList(matchingEnv) {
    const currentEnvId = matchingEnv.envId;

    return matchingEnv.allEnvs
      .map((env) => {
        const isCurrent = env.id === currentEnvId;
        if (env.active === false) return;

        const classes = ["pem-env-item"];
        if (isCurrent) classes.push("current");

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
            ${badgeText ? `<span class="pem-current-badge">${badgeText}</span>` : ""}
            ${!isCurrent ? '<span class="pem-status-badge">Checking</span>' : ""}
          </button>
        `;
      })
      .join("");
  }

  function injectFloatingBar(matchingEnv) {
    const currentEnv =
      matchingEnv.allEnvs.find((env) => env.id === matchingEnv.envId) || {};

    const badgeIndicatorColor = currentEnv.badgeIndicatorColor;
    const shadowColor = hexToRgba(badgeIndicatorColor, 0.6);

    const badgeBackgroundColor = currentEnv.badgeBackgroundColor;
    const badgeFontColor = currentEnv.badgeFontColor;

    const indicatorClasses =
      currentEnv.active === false ? "pem-indicator inactive" : "pem-indicator";

    const html = `
      <div id="pem-floating-wrapper">
        <button style="background: ${badgeBackgroundColor};" id="pem-floating-btn" type="button">
          <span class="${indicatorClasses}" style="background: ${badgeIndicatorColor}; box-shadow: 0 0 10px ${shadowColor};"></span>
          <span class="pem-label" style="color: ${badgeFontColor};">${matchingEnv.envName}</span>
          <span class="pem-chevron">▾</span>
        </button>
        <div id="pem-floating-dropdown">
          <div class="pem-dropdown-header">${matchingEnv.projectName} — ${matchingEnv.envName}</div>
          <button type="button" class="pem-copy-btn">📋 Copy current URL</button>
          <div class="pem-switch-label">Switch environment</div>
          <div class="pem-env-list">${generateEnvList(matchingEnv)}</div>
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

    copyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      navigator.clipboard.writeText(window.location.href).then(() => {
        copyBtn.textContent = "✓ URL copied";
        setTimeout(() => {
          copyBtn.textContent = "📋 Copy current URL";
        }, 2000);
      });
    });

    envItems.forEach((item) => {
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        const envUrl = item.getAttribute("data-env-url");
        const targetEnv = matchingEnv.allEnvs.find((e) => e.url === envUrl);
        switchToEnvironment(targetEnv, matchingEnv);
        hideDropdown();
      });
    });

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDropdown();
    });

    document.addEventListener("click", (event) => {
      if (!button.contains(event.target) && !dropdown.contains(event.target)) {
        hideDropdown();
      }
    });

    checkEnvironmentStatuses(matchingEnv);
  }

  function checkEnvironmentStatuses(matchingEnv) {
    const currentEnvId = matchingEnv.envId;
    const otherEnvs = matchingEnv.allEnvs.filter(
      (env) => env.id !== currentEnvId && env.active !== false,
    );

    otherEnvs.forEach((env) => {
      fetch(env.url, { method: "HEAD" })
        .then((response) => {
          updateEnvironmentStatus(env.id, response.status);
        })
        .catch(() => {
          updateEnvironmentStatus(env.id, "Error");
        });
    });
  }

  function updateEnvironmentStatus(envId, status) {
    const statusBadge = document.querySelector(
      `[data-env-id="${envId}"] .pem-status-badge`,
    );
    if (statusBadge) {
      statusBadge.textContent = status >= 200 && status < 300 ? "Available" : "Page not found";
      statusBadge.className = `pem-status-badge ${status >= 200 && status < 300 ? "online" : "offline"}`;
    }
  }

  function normalizeUrl(url) {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "").toLowerCase();
  }

  function switchToEnvironment(targetEnv, matchingEnv) {
    if (!targetEnv) {
      return;
    }

    const currentUrlNormalized = normalizeUrl(window.location.href);
    const targetUrlNormalized = normalizeUrl(targetEnv.url);
    const currentEnvNormalized = normalizeUrl(matchingEnv.envUrl);
    const targetUrl = currentUrlNormalized.replace(currentEnvNormalized, targetUrlNormalized);
    const urlObj = new URL(targetEnv.url);
    const finalTargetUrl = urlObj.protocol + "//" + targetUrl;
    try {
      window.location.href = finalTargetUrl;
    } catch (error) {
      console.error("Error switching environment:", error);
      alert("Unable to switch environment. Invalid URL.");
    }
  }
}