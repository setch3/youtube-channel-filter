# Project Structure

## Directory Layout
```
/
├── src/                    # Extension source files (main directory)
│   ├── manifest.json      # Extension manifest (entry point)
│   ├── content.js         # Content script for YouTube DOM manipulation
│   ├── options.html       # Options page UI
│   └── options.js         # Options page logic
├── .git/                  # Git repository
├── .kiro/                 # Kiro AI assistant configuration
├── .vscode/               # VS Code settings
└── README.md              # Project documentation (Japanese)
```

## File Responsibilities

### `src/manifest.json`
- Extension configuration and permissions
- Defines content script injection rules
- Specifies options page and storage permissions

### `src/content.js`
- Core filtering logic and DOM manipulation
- YouTube element selectors and hiding logic
- Storage synchronization and change listeners
- MutationObserver for dynamic content handling

### `src/options.html` & `src/options.js`
- User interface for managing blocked channels
- Add/remove functionality for channel IDs and names
- Settings persistence via Chrome storage API

## Code Organization Patterns

### Selector Management
- Centralized YouTube element selectors array
- Combined selector string for efficient querying
- Covers all YouTube video/channel element types

### Storage Structure
```javascript
{
  bannedIds: [],           // Channel IDs/@handles
  bannedNames: [],         // Channel display names
  hideShortsSearch: false  // Shorts hiding preference
}
```

### Function Naming Conventions
- Descriptive function names (`getChannelInfo`, `hideIfBannedOrShort`)
- Clear separation of concerns (filtering vs UI logic)
- Event-driven architecture with listeners