# youtube-channel-filter

This Chrome extension hides videos from specified YouTube channels. The filter
works on search results, the home page, related videos, Shorts (including the
"Latest Shorts" shelf), and anywhere else videos appear on youtube.com.
It can also hide all Shorts from search results if enabled in the options page.

## Usage

1. Load the extension in Chrome via **More Tools > Extensions > Load unpacked**
   and choose the `src` directory.
2. Open the extension options to add channel IDs or names to block.
3. Optionally enable **Hide Shorts from search results** to remove Shorts
   shelves when searching.
4. Videos from those channels will be hidden whenever you browse YouTube.

The list of blocked channels is stored using Chrome sync storage so it will be
shared across your browsers where you are signed in (if sync is enabled).
