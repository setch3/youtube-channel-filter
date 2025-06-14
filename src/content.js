const selectors = [
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-rich-item-renderer',
  'ytd-playlist-video-renderer',
  'ytd-channel-renderer',
  'ytd-shelf-renderer',
  'ytd-rich-section-renderer',

  // Shorts elements
  'ytd-reel-video-renderer',
  'ytd-reel-item-renderer',
  'ytd-reel-shelf-renderer',
  'ytd-rich-shelf-renderer'
];
const selectorsString = selectors.join(',');
let bannedIds = [];
let bannedNames = [];
let hideShortsSearch = false;

function getChannelInfo(node) {
  const link = node.querySelector('a[href*="/channel/"], a[href*="/@"]');
  let id = null;
  if (link) {
    const idMatch = link.href.match(/\/channel\/([^/?]+)/);
    if (idMatch) {
      id = idMatch[1].toLowerCase();
    } else {
      const handleMatch = link.href.match(/@([^/?]+)/);
      if (handleMatch) id = '@' + handleMatch[1].toLowerCase();
    }
  }
  const name = link ? link.textContent.trim() : null;
  return { id, name };
}

function isShort(node) {
  return (
    node.matches('ytd-reel-shelf-renderer, ytd-reel-video-renderer, ytd-reel-item-renderer') ||
    node.querySelector('a[href*="/shorts/"]')
  );
}

function hideIfBannedOrShort(node) {
  const { id, name } = getChannelInfo(node);
  const bannedIdMatch = id && bannedIds.some(b => id === b.toLowerCase());
  const bannedNameMatch = name && bannedNames.some(b => name === b);
  const shortMatch =
    hideShortsSearch &&
    (location.href.includes('/results') || location.href.includes('/watch')) &&
    isShort(node);
  if (bannedIdMatch || bannedNameMatch || shortMatch) {
    const shelf = node.closest('ytd-reel-shelf-renderer');
    const target = shortMatch && shelf ? shelf : node;
    target.style.display = 'none';
  }
}

function filterExisting() {
  document.querySelectorAll(selectorsString).forEach(hideIfBannedOrShort);
}

chrome.storage.sync.get(
  { bannedIds: [], bannedNames: [], hideShortsSearch: false },
  data => {
    bannedIds = data.bannedIds;
    bannedNames = data.bannedNames;
    hideShortsSearch = data.hideShortsSearch;
    filterExisting();
  }
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.bannedIds) {
      bannedIds = changes.bannedIds.newValue;
    }
    if (changes.bannedNames) {
      bannedNames = changes.bannedNames.newValue;
    }
    if (changes.hideShortsSearch) {
      hideShortsSearch = changes.hideShortsSearch.newValue;
    }
    filterExisting();
  }
});

const observer = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      let target = null;
      if (node.matches && node.matches(selectorsString)) {
        target = node;
      } else if (node.closest) {
        target = node.closest(selectorsString);
      }
      if (target) {
        hideIfBannedOrShort(target);
      }
      if (node.querySelectorAll) {
        node.querySelectorAll(selectorsString).forEach(hideIfBannedOrShort);
      }
    });
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
