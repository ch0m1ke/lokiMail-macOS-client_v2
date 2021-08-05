// document.getElementById("messagesList").prepend(messageDiv);

const { ipcRenderer } = require('electron');

const messagesListDiv = document.getElementById('messagesList');
const noMailMessage = document.getElementById('no-mail-message');
const deleteMessageBtn = document.getElementById('delete-message-btn');
const logoutBtn = document.getElementById('logout-btn');
const draftDBID = document.getElementById('db-ID');
let userData = '';
let db_ID;

const autosaveObj = {
    action: '',
    id: '',
    createdOn: '',
    from: '',
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    message: ''
};

window.onload = () => {
    ipcRenderer.send('user-data-request', 'userData');
    ipcRenderer.send('inbox-request', 'inbox');
}

logoutBtn.addEventListener('click', e => {
    ipcRenderer.send('logout', 'logout');
    console.log('logout button pressed');
});

ipcRenderer.on('logout-success', (e, args) => {
    console.log(args);
    window.location.href = './../views/login2.html';
});

ipcRenderer.on('inbox', (e, args) => {
    noMailMessage.style.visibility = 'hidden';

    args.forEach(element => {

        const messageDiv = document.createElement("div");

        messageDiv.id = 'messageContent_' + URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, "");
        messageDiv.className = 'messageContent';
        messageDiv.setAttribute("onclick", "readMessage(this.id)");

        const email_db_ID = document.createElement('p');
        email_db_ID.style.position = "absolute";
        email_db_ID.style.visibility = "hidden";
        email_db_ID.innerHTML = element[0];
        email_db_ID.setAttribute("class", "db-ID");
        email_db_ID.setAttribute("id", "db-ID-" + element[0]);

        const receivedOn = document.createElement('h3');
        receivedOn.innerHTML = "Received: " + new Date(parseInt(element[1], 10)).toLocaleString();

        const from = document.createElement('h4');
        from.innerHTML = "From: " + (element[2].split("{END_FROM}")[0]).split("{FROM}")[1];

        const subject = document.createElement('h2');
        subject.innerHTML = (element[2].split('{END_SUBJECT}')[0]).split("{SUBJECT}")[1];

        const message = document.createElement('p');
        message.innerHTML = (element[2].split('{END_MESSAGE}')[0]).split("{MESSAGE}")[1];

        messageDiv.appendChild(email_db_ID);
        messageDiv.appendChild(receivedOn);
        messageDiv.appendChild(from);
        messageDiv.appendChild(subject);
        messageDiv.appendChild(message);
        messagesListDiv.appendChild(messageDiv);

    });
    // console.log(document.getElementsByClassName('messageContent').length)
});

ipcRenderer.on('inbox-empty', (e, args) => {
    noMailMessage.style.visibility = 'visible';
});

deleteMessageBtn.addEventListener('click', e => {
    console.log('Delete message button pressed');
    db_ID = (document.getElementById("messageDiv").childNodes[0].id).split("db-ID-")[1];
    // console.log('Sending ID: ', db_ID);
    ipcRenderer.send('inbox-delete', db_ID);
});

ipcRenderer.on('inbox-delete-error', (e, args) => {
    alert("An error has occurred. The message cannot be deleted!");
});

ipcRenderer.on('inbox-delete-success', (e, args) => {
    document.getElementById(`db-ID-${db_ID}`).parentNode.remove();
    // console.log("Removing node: ", document.getElementById(`db-ID-${db_ID}`).parentNode);
    // document.getElementById(db_ID)[0].parentNode.remove();

    closeMessage();
    // document.getElementById("messagesList").style.width = "calc(100% - 52px)";
    // document.getElementById("messageContainerRight").style.left = "100%";
    // document.getElementById("messageContainerRight").style.visibility = "hidden";

    if (document.getElementsByClassName('messageContent').length == 0) {
        noMailMessage.style.visibility = 'visible';
    }

});

// Other stuff

const btnNewMessage = document.getElementById('newMessageBtn');
const btnCancel = document.getElementById('btnCancel');
const usernameLblTxtSender = document.getElementById('txtSender');
let search = document.getElementById('searchBar');
const usernameLblMenu = document.getElementById('lbl-username-menu');

search.addEventListener('keyup', e => {
    Array.from(document.getElementsByClassName('messageContent')).forEach(item => {
        let hasMatch = item.innerText.toLowerCase().includes(search.value);
        item.style.display = hasMatch ? 'block' : 'none';
    })
})

btnCancel.addEventListener('click', e => {
    console.log('Cancel button pressed');
});

btnNewMessage.addEventListener('click', e => {
    usernameLblTxtSender.value = userData.emailAddress;
    console.log('New Message button pressed');
    console.log(userData.emailAddress);

    autosaveObj.action = '';
    autosaveObj.id = '';
    autosaveObj.createdOn = '';
    autosaveObj.from = '';
    autosaveObj.to = '';
    autosaveObj.cc = '';
    autosaveObj.bcc = '';
    autosaveObj.subject = '';
    autosaveObj.message = '';
    draftDBID.innerHTML = '';
});

ipcRenderer.on('user-data-request', (e, args) => {
    // console.log('Received this user data: ', args);
    userData = args;
    usernameLblMenu.innerHTML = `&nbsp;&nbsp;&nbsp;` + args.emailAddress.split("@")[0];

});

// Draft autosave functionality
document.getElementsByClassName('newMessageContainer')[0].addEventListener('keyup', throttle(function () {

    autosaveObj.action = 'autosave';
    // autosaveObj.id = draftDBID.innerHTML;
    autosaveObj.createdOn = Date.now();
    autosaveObj.from = document.getElementById('txtSender').value;
    autosaveObj.to = document.getElementById('txtRecipient').value;
    autosaveObj.cc = document.getElementById('txtccRecipient').value;
    autosaveObj.bcc = document.getElementById('txtbccRecipient').value;
    autosaveObj.subject = document.getElementById('txtemailSubject').value;
    autosaveObj.message = document.getElementById('output').innerText;

    if (draftDBID != '') {
        ipcRenderer.send('draft-autosave', autosaveObj);
    } else {
        ipcRenderer.send('draft-autosave', autosaveObj);
    }
}));

// delay the autosave of 0.5 seconds (500ms) after the last keyup event on the newMessageContainer DIV
function throttle(f, delay) {
    var timer = null;
    return function () {
        var context = this, args = arguments;
        clearTimeout(timer);
        timer = window.setTimeout(function () {
            f.apply(context, args);
        },
            delay || 500);
    };
}

ipcRenderer.on('draft-autosave-success', (e, args) => {
    console.log(args);
    autosaveObj.id = args.id;
    draftDBID.innerHTML = args;
});

ipcRenderer.on('draft-autosave-failed', (e, args) => {
    alert("An error has occurred. The draft cannot be saved!");
});

const btnSend = document.getElementById('btnSend');

btnSend.addEventListener('click', e => {
    console.log('Send button pressed');
    if (autosaveObj.id != '' && autosaveObj.createdOn != '' && autosaveObj.to != '' && autosaveObj.subject != '' && autosaveObj.message != '') {
        ipcRenderer.send('send-message', autosaveObj);
    } else {
        ipcRenderer.send('send-message', autosaveObj);
        // alert("The message can\'t be sent. Make sure you fill up TO, SUBJECT, MESSAGE fields and try again.")
    }

});

ipcRenderer.on('message-send-success', (e, args) => {

    ipcRenderer.send('shred-message', { mailbox: 'drafts', emailID: autosaveObj.id });

});

ipcRenderer.on('message-send-error', (e, args) => {
    alert("Error! " + args);
});

ipcRenderer.on('delete-error', (e, args) => {
    alert("An error has occurred. The draft cannot be deleted after being sent!");
});

ipcRenderer.on('delete-success', (e, args) => {

    autosaveObj.action = '';
    autosaveObj.id = '';
    autosaveObj.createdOn = '';
    autosaveObj.from = '';
    autosaveObj.to = '';
    autosaveObj.cc = '';
    autosaveObj.bcc = '';
    autosaveObj.subject = '';
    autosaveObj.message = '';

    closeEditor();

    alert("Message sent");
});

ipcRenderer.on('inbox-save-success', (e, args) => {

    //* AFTER GETTING THE DECRYPTED MESSAGE FROM IPCMAINHANDLER, CREATE A DIV FOR THE MESSAGE, ATTACH IT ON TOP OF THE INBOX AND HIGHLIGHT THE MESSAGE *//

    noMailMessage.style.visibility = 'hidden';

    const messageDiv = document.createElement("div");

    messageDiv.id = 'messageContent_' + URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, "");
    messageDiv.className = 'messageContent';
    messageDiv.setAttribute("onclick", "readMessage(this.id)");

    const email_db_ID = document.createElement('p');
    email_db_ID.style.position = "absolute";
    email_db_ID.style.visibility = "hidden";
    email_db_ID.innerHTML = args.emailID;
    email_db_ID.setAttribute("class", "db-ID");
    email_db_ID.setAttribute("id", "db-ID-" + args.emailID);

    const receivedOn = document.createElement('h3');
    receivedOn.innerHTML = "Received: " + new Date(parseInt(args.receivedOn, 10)).toLocaleString();

    const from = document.createElement('h4');
    from.innerHTML = "From: " + (args.message.split('{END_FROM}')[0]).split("{FROM}")[1];;

    const subject = document.createElement('h2');
    subject.innerHTML = (args.message.split('{END_SUBJECT}')[0]).split("{SUBJECT}")[1];

    const message = document.createElement('p');
    message.innerHTML = (args.message.split('{END_MESSAGE}')[0]).split("{MESSAGE}")[1];;

    //highlighting the selected message
    messageDiv.style.backgroundColor = '#28282e';
    messageDiv.style.color = '#fff';

    messageDiv.appendChild(email_db_ID);
    messageDiv.appendChild(receivedOn);
    messageDiv.appendChild(from);
    messageDiv.appendChild(subject);
    messageDiv.appendChild(message);
    messagesListDiv.prepend(messageDiv);

});