const { ipcRenderer, app } = require('electron');
const appConfing = require('../../../config/app_config.json');

const loginForm = document.getElementById('loginFrm');
// const submitBtn = document.getElementById('submit-btn');
const statusLabel = document.getElementById('status-label');
const errorLabel = document.getElementById('login-error-message');
const quitBtn = document.getElementById('quit-app-btn');
const userPeerID = document.getElementById('peer-id');

window.onload = async () => {

    if (userPeerID.innerText == 'No connection to P2P relay') {
        ipcRenderer.send('peer-id-request', 'Need peer ID');
    }

    const firstCechck = await checkOnlineStatus();
    if (!firstCechck) { // If there is no connection to the server, disable login button
        document.getElementById('submit-btn').disabled = true;
        document.getElementById('submit-btn').style.background = "#e6e6e6";
        document.getElementById('submit-btn').style.color = "#fff";
        statusLabel.innerHTML = "LOKI server status: <strong>OFFLINE</strong>";
        statusLabel.style.color = "red";
    } else {
        document.getElementById('submit-btn').disabled = false;
        document.getElementById('submit-btn').style.background = "";
        document.getElementById('submit-btn').style.color = "";
        statusLabel.innerHTML = "LOKI server status: <strong>ONLINE</strong>";
        statusLabel.style.color = "green";
    }

    setInterval(async () => {
        const result = await checkOnlineStatus();
        if (!result) { // If there is no connection to the server, disable login button
            document.getElementById('submit-btn').disabled = true;
            document.getElementById('submit-btn').style.background = "#e6e6e6";
            document.getElementById('submit-btn').style.color = "#fff";
            statusLabel.innerHTML = "LOKI server status: <strong>OFFLINE</strong>";
            statusLabel.style.color = "red";
        } else {
            document.getElementById('submit-btn').disabled = false;
            document.getElementById('submit-btn').style.background = "";
            document.getElementById('submit-btn').style.color = "";
            statusLabel.innerHTML = "LOKI server status: <strong>ONLINE</strong>";
            statusLabel.style.color = "green";
        }
    }, 5000); // every 5 seconds

}

const checkOnlineStatus = async () => {
    try {
        const online = await fetch(appConfing.websiteURL);
        if (online.status == 200) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
};


// Event handlers

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    errorLabel.innerHTML = "&nbsp;";

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    ipcRenderer.send('login', { username, password });
    console.log('Login Submit button pressed');
    const loadingImage = document.createElement('img');
    loadingImage.id = 'loading-img';
    loadingImage.src = './../assets/images/loading.gif';
    errorLabel.appendChild(loadingImage); // Visualize loading GIF
});

ipcRenderer.on('login-success', (e, args) => {
    console.log(args);
    window.location.href = './../views/inbox.html';
});

ipcRenderer.on('login-errors', (e, args) => {
    console.log(args);
    errorLabel.innerHTML = args;
});

quitBtn.addEventListener('click', e => {
    ipcRenderer.send('process-event-channel', 'login-exit');
    console.log('quit button pressed');
    app.quit();
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