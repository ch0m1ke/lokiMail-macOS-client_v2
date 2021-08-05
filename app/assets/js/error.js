const { ipcRenderer } = require('electron');

const backupBtn = document.getElementById('db-backup-btn');
const deleteBtn = document.getElementById('db-delete-btn');

backupBtn.addEventListener('click', e => {
    ipcRenderer.send('db-error-channel', 'backup-db');
    console.log('backup button pressed');
    backupBtn.disabled = "true";
    backupBtn.style.background = "#e6e6e6";
    backupBtn.style.color = "#000";
    deleteBtn.disabled = "true";
    deleteBtn.style.background = "#e6e6e6";
    deleteBtn.style.color = "#000";
});

deleteBtn.addEventListener('click', e => {
    ipcRenderer.send('db-error-channel', 'delete-db');
    console.log('delete button pressed');
    backupBtn.disabled = "true";
    backupBtn.style.background = "#e6e6e6";
    backupBtn.style.color = "#000";
    deleteBtn.disabled = "true";
    deleteBtn.style.background = "#e6e6e6";
    deleteBtn.style.color = "#000";
});