# Project Environment Manager

A powerful Chrome extension that helps developers manage and switch between multiple project environments effortlessly.

## 🎯 Overview

**Project Environment Manager** is a Chrome extension designed to streamline your development workflow. Instead of manually typing URLs or using bookmarks, this extension lets you manage all your project environments in one place and switch between them with a single click.

Perfect for developers working with multiple environments like Development, Staging, and Production!

## ✨ Features

- **📁 Project Management** - Organize projects and their environments in a clean, intuitive interface
- **🔄 Quick Environment Switching** - Switch between environments while preserving your current page path
- **🎨 Custom Badge Colors** - Personalize visual indicators for each environment
- **✅ Status Checking** - Automatically detects which environments are available
- **📍 Floating Indicator** - Non-intrusive badge shows your current environment on any webpage
- **💾 Export/Import** - Backup your project configurations and share them with team members
- **🔐 Local Storage** - All data is stored securely in Chrome sync storage (never sent to servers)
- **⚡ Zero Configuration** - Works out of the box with no complex setup

## 🚀 Getting Started

### Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the extension folder
5. The extension icon will appear in your Chrome toolbar

### Quick Start

1. **Create a Project**
   - Click the extension icon in your toolbar
   - Enter a project name (e.g., "My Web App")
   - Click **+ Project**

2. **Add Environments**
   - Click **+ Environment** on your project
   - Enter environment name (e.g., "Development")
   - Enter the environment URL (e.g., `https://dev.example.com`)
   - Customize the badge color (optional)
   - Click **Save**

3. **Switch Environments**
   - Navigate to any page in one of your environments
   - The extension will show a floating badge with the current environment
   - Click the badge to see all available environments
   - Click any environment to switch (your current page path is preserved!)

## 📚 How It Works

### Environment Detection
When you navigate to a URL that matches one of your configured environments, the extension:
1. Detects the matching environment
2. Shows a floating indicator badge on the page
3. Displays the environment name with customizable colors

### Smart URL Switching
When you switch environments:
- Your current page path is preserved
- Example: If you're on `https://dev.example.com/dashboard/users`, switching to Production navigates to `https://prod.example.com/dashboard/users`

### Status Checking
The extension automatically checks if other environments are available:
- ✅ **Available** - Environment is online
- ❌ **Page not found** - Environment returned an error
- ⏳ **Checking** - Status is being verified

## 🎨 Customization

### Badge Colors
Each environment has three customizable colors:
- **Background** - Badge background color
- **Indicator** - The circular indicator dot
- **Font** - Text color

### Active/Inactive
Toggle environments on/off without deleting them:
- Inactive environments won't show the floating badge
- But they're still available in the environment switcher

## 💾 Data Management

### Export Data
1. Click the extension icon
2. Go to the **Settings** tab
3. Click **📥 Export Data**
4. A JSON file with your projects and environments will be downloaded

### Import Data
1. Click the extension icon
2. Go to the **Settings** tab
3. Click **📤 Import Data**
4. Select a previously exported JSON file
5. Your projects will be restored

### Sample Data
Need to see the format? Download a sample import file from the **Settings** tab.

## 🔒 Privacy & Security

- ✅ **No server requests** - All data stored locally in your browser
- ✅ **No tracking** - No analytics or tracking enabled
- ✅ **No data sharing** - Your project URLs never leave your computer
- ✅ **Chrome Sync** - Your data syncs securely across your Chrome profiles (if enabled)

## 🛠️ Technical Details

### Permissions Used

| Permission | Why | 
|-----------|-----|
| `storage` | Stores your projects and environments locally |
| `activeTab` | Detects the current tab URL for environment matching |
| `scripting` | Injects the floating indicator badge into webpages |
| `webNavigation` | Tracks navigation to update environment indicators |
| `<all_urls>` | Enables environment detection on any website |

### Files Structure

```
project-environment-manager/
├── manifest.json          # Extension configuration
├── popup.html            # Settings UI
├── popup.js              # Settings logic
├── popup.css             # Settings styles
├── background.js         # Service worker (background logic)
├── content.js            # Content script (webpage integration)
├── content.css           # Floating badge styles
├── icons/                # Extension icons
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-64.png
│   └── icon-128.png
└── README.md             # This file
```

## 🐛 Troubleshooting

### The floating badge doesn't appear
- **Check**: Make sure the URL matches your configured environment URL
- **Check**: Verify the environment is marked as "Active"
- **Solution**: The extension only shows badges for HTTP/HTTPS pages

### I can't switch to another environment
- **Check**: The target environment is marked as "Active"
- **Check**: The environment URL is valid
- **Solution**: Try opening the environment URL directly first to verify it works

### My data disappeared
- **Solution**: Check if you're using the same Chrome profile
- **Tip**: Export your data regularly to backup

### Status checking shows "Error"
- **Check**: The environment URL is accessible from your network
- **Check**: No firewall is blocking the request
- **Solution**: Verify the URL works in your browser directly

## 📝 Tips & Tricks

1. **Use meaningful names** - Name projects by feature or client
2. **Color code by environment** - Use green for dev, orange for staging, red for production
3. **Regular backups** - Export your configuration weekly
4. **Share with team** - Export and share configurations with team members
5. **Duplicate environments** - Use the Duplicate button to quickly create similar environments

## 🤝 Contributing

Found a bug? Have a feature request? Feel free to:
- Open an issue on GitHub
- Submit a pull request
- Contact the developer

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 About

**Project Environment Manager** was built to solve a real problem: developers spending too much time manually switching between project environments.

### Version
- Current: 1.0.0
- Last Updated: 2026

## ❓ FAQ

**Q: Is my data sent to any server?**
A: No. All data is stored locally in your Chrome browser using Chrome's storage API.

**Q: Can I use this on Chrome Mobile?**
A: Not currently. Chrome extensions on mobile have limited support. This is optimized for desktop Chrome.

**Q: How many projects can I create?**
A: Unlimited! Create as many projects and environments as you need.

**Q: Can I sync across multiple devices?**
A: Yes! If you're signed into Chrome and have sync enabled, your data will sync automatically.

**Q: What happens if I uninstall the extension?**
A: Your data will be deleted from the browser. Always export your data before uninstalling!

**Q: Can I use this for non-HTTP URLs?**
A: The extension only works with `http://` and `https://` URLs for security reasons.

**Q: Is there a performance impact?**
A: No. The extension is lightweight and only activates when you visit a matching environment URL.

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on the GitHub repository
- Check the troubleshooting section above

---

**Made with ❤️ by The Productive Nerd**

Enjoy managing your project environments! 🚀
