# Technology Stack

## Core Technologies
- **Chrome Extension Manifest V3** - Modern Chrome extension architecture
- **Vanilla JavaScript** - No external frameworks or libraries
- **HTML/CSS** - Standard web technologies for options page
- **Chrome Storage API** - Sync storage for cross-browser settings persistence
- **Chrome Content Scripts** - DOM manipulation and page interaction

## Key APIs & Features
- `chrome.storage.sync` - Settings synchronization across devices
- `MutationObserver` - Real-time DOM change monitoring
- Content script injection with `document_idle` timing
- Host permissions for `*.youtube.com`

## Development & Deployment

### Loading for Development
```bash
# Load unpacked extension in Chrome
# 1. Open Chrome > More tools > Extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select the `src` folder
```

### File Structure
- All extension files are in the `src/` directory
- No build process required - direct file loading
- No package.json or build tools needed

### Testing
- Manual testing on YouTube pages
- Test across different YouTube sections (search, home, watch, shorts)
- Verify storage sync functionality across Chrome instances

## Performance Considerations
- Efficient DOM querying with combined selectors
- Minimal DOM manipulation (only hiding elements)
- Event-driven updates via storage change listeners