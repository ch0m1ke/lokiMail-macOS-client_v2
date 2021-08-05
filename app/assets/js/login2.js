const { ipcRenderer } = require('electron');

const loginForm = document.getElementById('loginFrm');
const usernameLbl = document.getElementById('lbl-username');

const errorLabel = document.getElementById('login-error-message');
const quitBtn = document.getElementById('quit-app-btn');
const userPeerID = document.getElementById('peer-id');

// Event handlers

ipcRenderer.on('login2-user-request', (e, args) => {
    console.log(args);
    usernameLbl.innerHTML = args;
});

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    errorLabel.innerHTML = "&nbsp;";

    const password = document.getElementById('password').value;

    ipcRenderer.send('login2', password);
    console.log('Login Submit button pressed');
});

quitBtn.addEventListener('click', e => {
    ipcRenderer.send('process-event-channel', 'exit');
    console.log('quit button pressed');
});

window.onload = () => {
    ipcRenderer.send('login2-user-request', 'userEmail');

    if (userPeerID.innerText == 'No connection to P2P relay') {
        ipcRenderer.send('peer-id-request', 'Need peer ID');
    }
}

ipcRenderer.on('login2-success', (e, args) => {
    console.log(args);
    window.location.href = './../views/inbox.html';
});

ipcRenderer.on('login2-errors', (e, args) => {
    console.log(args);
    errorLabel.innerHTML = args;
});

ipcRenderer.on('got-peer-id', (e, args) => {
    // console.log('Peer ID:', args);
    userPeerID.innerHTML = args;
});

ipcRenderer.on('no-backend-connection', (e, args) => {
    if (confirm('No backend connection. Your peer ID cannot be updated. If you decide to quit, you might not receive any message until you are able to log in again. Do you want to quit the app anyway?')) {
        // If yes
        ipcRenderer.send('force-app-quit', 'quit anyway');
    }
});