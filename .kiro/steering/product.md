# Product Overview

YouTube Channel Filter is a Chrome extension that hides videos from specified YouTube channels across various YouTube pages including search results, home feed, related videos, and Shorts sections.

## Key Features
- Block channels by ID/@handle or display name (supports Japanese names)
- Hide Shorts videos from blocked channels
- Optional bulk hiding of Shorts in search results and recommendations
- Settings sync across Chrome browsers via Chrome sync storage
- Works on search results, home page, watch pages, and Shorts feeds

## Target Users
Users who want to curate their YouTube experience by filtering out content from specific channels, particularly useful for avoiding unwanted content or creators.

## Technical Approach
Content script injection that monitors DOM changes and hides matching video elements in real-time using MutationObserver for dynamic content loading.
