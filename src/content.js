const selectors = [
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-rich-item-renderer',
  'ytd-playlist-video-renderer',
  'ytd-channel-renderer'
];
const selectorsString = selectors.join(',');
let banned = [];

function getIdentifier(link) {
  if (!link) return null;
  const idMatch = link.href.match(/\/channel\/([^/?]+)/);
  if (idMatch) return idMatch[1].toLowerCase();
  const nameMatch = link.href.match(/@([^/?]+)/);
  if (nameMatch) return '@' + nameMatch[1].toLowerCase();
  return null;
}

function hideIfBanned(node) {
  const link = node.querySelector('a[href*="/channel/"], a[href*="/@"]');
  const identifier = getIdentifier(link);
  if (!identifier) return;
  if (banned.some(b => identifier === b.toLowerCase())) {
    node.style.display = 'none';
  }
}

function filterExisting() {
  document.querySelectorAll(selectorsString).forEach(hideIfBanned);
}

chrome.storage.sync.get({ banned: [] }, data => {
  banned = data.banned;
  filterExisting();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.banned) {
    banned = changes.banned.newValue;
    filterExisting();
  }
});

const observer = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.matches && node.matches(selectorsString)) {
        hideIfBanned(node);
      } else if (node.querySelectorAll) {
        node.querySelectorAll(selectorsString).forEach(hideIfBanned);
      }
    });
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
