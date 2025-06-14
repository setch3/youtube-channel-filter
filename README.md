# youtube-channel-filter

This Chrome extension hides videos from specified YouTube channels. The filter
works on search results, the home page, related videos, and anywhere else videos
appear on youtube.com.

## Usage

1. Load the extension in Chrome via **More Tools > Extensions > Load unpacked**
   and choose the `src` directory.
2. Open the extension options to add channel IDs or names to block.
3. Videos from those channels will be hidden whenever you browse YouTube.

The list of blocked channels is stored using Chrome sync storage so it will be
shared across your browsers where you are signed in (if sync is enabled).
