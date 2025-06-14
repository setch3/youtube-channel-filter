const selectors = [
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-rich-item-renderer',
  'ytd-playlist-video-renderer',
  'ytd-channel-renderer',
  // Shorts elements
  'ytd-reel-video-renderer',
  'ytd-reel-item-renderer',
  'ytd-reel-shelf-renderer',
  'ytd-rich-shelf-renderer'
];
const selectorsString = selectors.join(',');
let banned = [];
let hideShortsSearch = false;

function getIdentifier(link) {
  if (!link) return null;
  const idMatch = link.href.match(/\/channel\/([^/?]+)/);
  if (idMatch) return idMatch[1].toLowerCase();
  const nameMatch = link.href.match(/@([^/?]+)/);
  if (nameMatch) return '@' + nameMatch[1].toLowerCase();
  return null;
}

function hideIfBannedOrShort(node) {
  const link = node.querySelector('a[href*="/channel/"], a[href*="/@"]');
  const identifier = getIdentifier(link);
  const bannedMatch = identifier && banned.some(b => identifier === b.toLowerCase());
  const shortMatch =
    hideShortsSearch &&
    location.href.includes('/results') &&
    (node.matches('ytd-reel-shelf-renderer, ytd-reel-video-renderer, ytd-reel-item-renderer') ||
      node.querySelector('a[href*="/shorts/"]'));
  if (bannedMatch || shortMatch) {
    const shelf = node.closest('ytd-reel-shelf-renderer');
    const target = shortMatch && shelf ? shelf : node;
    target.style.display = 'none';
  }
}

function filterExisting() {
  document.querySelectorAll(selectorsString).forEach(hideIfBannedOrShort);
}

chrome.storage.sync.get({ banned: [], hideShortsSearch: false }, data => {
  banned = data.banned;
  hideShortsSearch = data.hideShortsSearch;
  filterExisting();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.banned) {
      banned = changes.banned.newValue;
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
