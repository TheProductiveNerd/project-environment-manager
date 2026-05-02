// Storage keys
const STORAGE_KEY = "pem_projects";

let projects = [];
let editingEnvId = null;
let editingProjectId = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadProjects();
  initializeEventListeners();
});

// Event Listeners
function initializeEventListeners() {
  // Tab switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", switchTab);
  });

  // Projects tab
  document
    .getElementById("addProjectBtn")
    .addEventListener("click", addProject);
  document.getElementById("projectInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addProject();
  });

  // Settings tab
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("importBtn").addEventListener("click", importData);
  document.getElementById("clearBtn").addEventListener("click", clearAllData);
  const sampleBtn = document.getElementById("sampleBtn");
  if (sampleBtn) sampleBtn.addEventListener("click", downloadSampleData);
  document
    .getElementById("fileInput")
    .addEventListener("change", handleFileImport);
  document
    .getElementById("fileInput")
    .addEventListener("change", handleFileImport);

  // Modal
  document.querySelector(".modal-close").addEventListener("click", closeModal);
  document.getElementById("modalCancel").addEventListener("click", closeModal);
  document
    .getElementById("modalSave")
    .addEventListener("click", saveEnvironment);
  document.getElementById("envModal").addEventListener("click", (e) => {
    if (e.target.id === "envModal") closeModal();
  });
}

// Tab switching
function switchTab(e) {
  const tabName = e.target.dataset.tab;

  // Update buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  e.target.classList.add("active");

  // Update content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });
  document.getElementById(tabName).classList.add("active");
}

// Load projects from storage
function loadProjects() {
  chrome.storage.sync.get(STORAGE_KEY, (result) => {
    projects = result[STORAGE_KEY] || [];
    renderProjects();
  });
}

// Render projects
function renderProjects() {
  const container = document.getElementById("projectsContainer");
  const emptyState = document.getElementById("emptyState");

  container.innerHTML = "";

  if (projects.length === 0) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  // Get current tab URL to check for matching environments
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0]?.url;
    let matchingProjectId = null;

    // Find project with matching environment
    if (currentUrl) {
      for (const project of projects) {
        if (project.environments) {
          for (const env of project.environments) {
            try {
              const envUrlObj = new URL(env.url);
              const currentUrlObj = new URL(currentUrl);
              if (envUrlObj.origin === currentUrlObj.origin) {
                matchingProjectId = project.id;
                break;
              }
            } catch (e) {
              // Invalid URL, continue
            }
          }
          if (matchingProjectId) break;
        }
      }
    }

    // Sort projects: matching project first, then by creation time (most recent first)
    const sortedProjects = [...projects].sort((a, b) => {
      // If a project matches current URL, it comes first
      if (a.id === matchingProjectId) return -1;
      if (b.id === matchingProjectId) return 1;

      // Otherwise sort by creation time (most recent first)
      return parseInt(b.id) - parseInt(a.id);
    });

    sortedProjects.forEach((project) => {
      const projectCard = createProjectCard(project);
      container.appendChild(projectCard);
    });
  });
}

// Create project card
function createProjectCard(project) {
  const card = document.createElement("div");
  card.className = "project-card";

  const header = document.createElement("div");
  header.className = "project-header";

  const name = document.createElement("div");
  name.className = "project-name";
  name.textContent = project.name;

  const actions = document.createElement("div");
  actions.className = "project-actions";

  const addEnvBtn = document.createElement("button");
  addEnvBtn.className = "btn btn-sm btn-primary";
  addEnvBtn.textContent = "+ Environment";
  addEnvBtn.addEventListener("click", () => openModal(project.id, null));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-sm btn-danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteProject(project.id));

  actions.appendChild(addEnvBtn);
  actions.appendChild(deleteBtn);
  header.appendChild(name);
  header.appendChild(actions);

  // Environments
  const envSection = document.createElement("div");
  const environments = document.createElement("div");
  environments.className = "environments";

  if (project.environments && project.environments.length > 0) {
    project.environments.forEach((env) => {
      const envItem = createEnvItem(env, project.id);
      environments.appendChild(envItem);
    });
  }

  envSection.appendChild(environments);

  card.appendChild(header);
  card.appendChild(envSection);

  return card;
}

// Create environment item
function createEnvItem(env, projectId) {
  const item = document.createElement("div");
  item.className = "env-item";

  const info = document.createElement("div");
  info.className = "env-info";

  const envName = document.createElement("div");
  envName.className = "env-name";
  envName.textContent = env.name;

  const envUrl = document.createElement("div");
  envUrl.className = "env-url";
  envUrl.textContent = env.url;

  const envMeta = document.createElement("div");
  envMeta.className = "env-meta";

  const colorMarker = document.createElement("span");
  colorMarker.className = "env-color-marker";
  colorMarker.style.background = env.color || "#4ade80";

  const statusBadge = document.createElement("span");
  statusBadge.className = `env-status ${env.active ? "active" : "inactive"}`;
  statusBadge.textContent = env.active ? "Active" : "Inactive";

  envMeta.appendChild(colorMarker);
  envMeta.appendChild(statusBadge);

  info.appendChild(envMeta);
  info.appendChild(envName);
  info.appendChild(envUrl);

  const actions = document.createElement("div");
  actions.className = "env-actions";

  const actionsChild = document.createElement("div");
  actionsChild.className = "env-actions-container";

  const duplicateBtn = document.createElement("button");
  duplicateBtn.className = "btn btn-sm btn-secondary";
  duplicateBtn.textContent = "Duplicate";
  duplicateBtn.addEventListener("click", () => {
    duplicateEnvironment(projectId, env.id);
  });

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-sm btn-secondary";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => openModal(projectId, env.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-sm btn-danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () =>
    deleteEnvironment(projectId, env.id),
  );

  actionsChild.appendChild(duplicateBtn);
  actionsChild.appendChild(editBtn);
  actionsChild.appendChild(deleteBtn);

  actions.appendChild(actionsChild);

  item.appendChild(info);
  item.appendChild(actions);

  return item;
}

// Add project
function addProject() {
  const input = document.getElementById("projectInput");
  const name = input.value.trim();

  if (!name) {
    alert("Please enter a project name");
    return;
  }

  const newProject = {
    id: Date.now().toString(),
    name: name,
    environments: [],
  };

  projects.push(newProject);
  saveProjects();
  input.value = "";
}

// Delete project
function deleteProject(projectId) {
  if (confirm("Are you sure you want to delete this project?")) {
    projects = projects.filter((p) => p.id !== projectId);
    saveProjects();
  }
}

// Open modal
function openModal(projectId, envId) {
  editingProjectId = projectId;
  editingEnvId = envId;

  const modal = document.getElementById("envModal");
  const modalTitle = document.getElementById("modalTitle");
  const envNameInput = document.getElementById("envName");
  const envUrlInput = document.getElementById("envUrl");
  const envColorInput = document.getElementById("envColor");
  const envActiveInput = document.getElementById("envActive");

  // Clear inputs
  envNameInput.value = "";
  envUrlInput.value = "";
  envColorInput.value = "#4ade80";
  envActiveInput.checked = true;

  if (envId) {
    // Edit mode
    const project = projects.find((p) => p.id === projectId);
    const env = project.environments.find((e) => e.id === envId);

    modalTitle.textContent = "Edit Environment";
    envNameInput.value = env.name;
    envUrlInput.value = env.url;
    envColorInput.value = env.color || "#4ade80";
    envActiveInput.checked = env.active !== false;
  } else {
    // Add mode
    modalTitle.textContent = "Add Environment";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        envUrlInput.value = tabs[0].url;
      }
    });
  }

  modal.classList.remove("hidden");
  envNameInput.focus();
}

// Close modal
function closeModal() {
  document.getElementById("envModal").classList.add("hidden");
  editingEnvId = null;
  editingProjectId = null;
}

// Save environment
function saveEnvironment() {
  const name = document.getElementById("envName").value.trim();
  const url = document.getElementById("envUrl").value.trim();
  const color = document.getElementById("envColor").value;
  const active = document.getElementById("envActive").checked;

  if (!name) {
    alert("Please enter an environment name");
    return;
  }

  if (!url) {
    alert("Please enter a valid URL");
    return;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    alert("Please enter a valid URL (e.g., https://example.com)");
    return;
  }

  const project = projects.find((p) => p.id === editingProjectId);

  if (!project.environments) {
    project.environments = [];
  }

  if (editingEnvId) {
    // Update existing
    const env = project.environments.find((e) => e.id === editingEnvId);
    env.name = name;
    env.url = url;
    env.color = color;
    env.active = active;
  } else {
    // Add new
    project.environments.push({
      id: Date.now().toString(),
      name: name,
      url: url,
      color: color,
      active: active,
    });
  }

  saveProjects();
  closeModal();
}

// Delete environment
function deleteEnvironment(projectId, envId) {
  if (confirm("Are you sure you want to delete this environment?")) {
    const project = projects.find((p) => p.id === projectId);
    project.environments = project.environments.filter((e) => e.id !== envId);
    saveProjects();
  }
}

function duplicateEnvironment(projectId, envId) {
  const project = projects.find((p) => p.id === projectId);
  const env = project.environments.find((e) => e.id === envId);

  if (!env) {
    return;
  }

  const duplicatedEnv = {
    id: Date.now().toString(),
    name: `${env.name} (copy)`,
    url: env.url,
    color: env.color || "#4ade80",
    active: env.active !== false,
  };

  project.environments.push(duplicatedEnv);
  saveProjects();
  showNotification("Environment duplicated!");
}

// Save projects to storage
function saveProjects() {
  chrome.storage.sync.set({ [STORAGE_KEY]: projects }, () => {
    renderProjects();
  });
}

// Export data
function exportData() {
  const dataStr = JSON.stringify(projects, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `project-env-manager-backup-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showNotification("Data exported successfully!");
}

function getSampleData() {
  return [
    {
      id: "sample-project",
      name: "Example Project",
      environments: [
        {
          id: "env-prod",
          name: "Production",
          url: "https://prod.example.com",
          color: "#16a34a",
          active: true,
        },
        {
          id: "env-dev",
          name: "Development",
          url: "https://dev.example.com",
          color: "#2563eb",
          active: false,
        },
        {
          id: "env-uat",
          name: "UAT",
          url: "https://uat.example.com",
          color: "#f59e0b",
          active: false,
        },
      ],
    },
  ];
}

function downloadSampleData() {
  const sampleProjects = getSampleData();
  const dataStr = JSON.stringify(sampleProjects, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "project-env-manager-sample.json";
  link.click();
  URL.revokeObjectURL(url);
  showNotification("Sample file downloaded!");
}

// Import data
function importData() {
  document.getElementById("fileInput").click();
}

// Handle file import
function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedProjects = JSON.parse(event.target.result);

      if (!Array.isArray(importedProjects)) {
        throw new Error("Invalid format: expected array of projects");
      }

      // Validate structure
      importedProjects.forEach((p) => {
        if (!p.id || !p.name) {
          throw new Error("Invalid project structure");
        }
      });

      projects = importedProjects;
      saveProjects();
      showNotification("Data imported successfully!");
    } catch (error) {
      alert("Error importing file: " + error.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// Clear all data
function clearAllData() {
  if (
    confirm(
      "Are you sure you want to delete all projects and environments? This cannot be undone.",
    )
  ) {
    projects = [];
    saveProjects();
    showNotification("All data cleared!");
  }
}

// Show notification
function showNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #333;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 2000;
        animation: slideInNotification 0.3s ease;
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOutNotification 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Add animation styles
const style = document.createElement("style");
style.textContent = `
    @keyframes slideInNotification {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutNotification {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
