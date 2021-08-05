const { ipcRenderer } = require('electron');

let userData = '';
// const navBarTitle = document.getElementById('navBarTitle').innerHTML;
const logoutBtn = document.getElementById('logout-btn');
const usernameLblMenu = document.getElementById('lbl-username-menu');

logoutBtn.addEventListener('click', e => {
    ipcRenderer.send('logout', 'logout');
    console.log('logout button pressed');
});

ipcRenderer.on('logout-success', (e, args) => {
    console.log(args);
    window.location.href = './../views/login2.html';
});

window.onload = () => {
    ipcRenderer.send('user-data-request', 'userData');
}

ipcRenderer.on('user-data-request', (e, args) => {
    // console.log('Received this user data: ', args);
    userData = args;
    usernameLblMenu.innerHTML = `&nbsp;&nbsp;&nbsp;` + args.emailAddress.split("@")[0];

});