const idInput = document.getElementById('newChannelId');
const nameInput = document.getElementById('newChannelName');
const idList = document.getElementById('idList');
const nameList = document.getElementById('nameList');
const addIdBtn = document.getElementById('addId');
const addNameBtn = document.getElementById('addName');
const hideShortsCheckbox = document.getElementById('hideShortsSearch');

function refresh() {
  chrome.storage.sync.get(
    { bannedIds: [], bannedNames: [], hideShortsSearch: false },
    data => {
      idList.innerHTML = '';
      data.bannedIds.forEach(id => {
        const li = document.createElement('li');
        li.textContent = id;
        const btn = document.createElement('button');
        btn.textContent = 'Remove';
        btn.addEventListener('click', () => {
          chrome.storage.sync.set(
            { bannedIds: data.bannedIds.filter(c => c !== id) },
            refresh
          );
        });
        li.appendChild(btn);
        idList.appendChild(li);
      });

      nameList.innerHTML = '';
      data.bannedNames.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        const btn = document.createElement('button');
        btn.textContent = 'Remove';
        btn.addEventListener('click', () => {
          chrome.storage.sync.set(
            { bannedNames: data.bannedNames.filter(c => c !== name) },
            refresh
          );
        });
        li.appendChild(btn);
        nameList.appendChild(li);
      });

      hideShortsCheckbox.checked = data.hideShortsSearch;
    }
  );
}

addIdBtn.addEventListener('click', () => {
  const channel = idInput.value.trim();
  if (!channel) return;
  chrome.storage.sync.get({ bannedIds: [] }, data => {
    if (!data.bannedIds.includes(channel)) {
      data.bannedIds.push(channel);
      chrome.storage.sync.set({ bannedIds: data.bannedIds }, refresh);
    } else {
      refresh();
    }
  });
  idInput.value = '';
});

addNameBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) return;
  chrome.storage.sync.get({ bannedNames: [] }, data => {
    if (!data.bannedNames.includes(name)) {
      data.bannedNames.push(name);
      chrome.storage.sync.set({ bannedNames: data.bannedNames }, refresh);
    } else {
      refresh();
    }
  });
  nameInput.value = '';
});

hideShortsCheckbox.addEventListener('change', () => {
  chrome.storage.sync.set({ hideShortsSearch: hideShortsCheckbox.checked });
});

document.addEventListener('DOMContentLoaded', refresh);
