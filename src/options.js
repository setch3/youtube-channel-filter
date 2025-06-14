const input = document.getElementById('newChannel');
const list = document.getElementById('list');
const addBtn = document.getElementById('add');

function refresh() {
  chrome.storage.sync.get({ banned: [] }, data => {
    list.innerHTML = '';
    data.banned.forEach(channel => {
      const li = document.createElement('li');
      li.textContent = channel;
      const btn = document.createElement('button');
      btn.textContent = 'Remove';
      btn.addEventListener('click', () => {
        chrome.storage.sync.set({ banned: data.banned.filter(c => c !== channel) }, refresh);
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  });
}

addBtn.addEventListener('click', () => {
  const channel = input.value.trim();
  if (!channel) return;
  chrome.storage.sync.get({ banned: [] }, data => {
    if (!data.banned.includes(channel)) {
      data.banned.push(channel);
      chrome.storage.sync.set({ banned: data.banned }, refresh);
    } else {
      refresh();
    }
  });
  input.value = '';
});

document.addEventListener('DOMContentLoaded', refresh);
