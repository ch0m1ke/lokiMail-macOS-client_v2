const { ipcRenderer } = require('electron');
const messagesListDiv = document.getElementById('messagesList');
const noMailMessage = document.getElementById('no-mail-message');
const deleteMessageBtn = document.getElementById('btnCancel');
const logoutBtn = document.getElementById('logout-btn');

const btnNewMessage = document.getElementById('newMessageBtn');
const btnCancel = document.getElementById('btnCancel');
const usernameLblTxtSender = document.getElementById('txtSender');
let search = document.getElementById('searchBar');
const usernameLblMenu = document.getElementById('lbl-username-menu');
const draftDBID = document.getElementById('db-ID');
let userData = '';
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
    ipcRenderer.send('drafts-request', 'drafts');
}

logoutBtn.addEventListener('click', e => {
    ipcRenderer.send('logout', 'logout');
    console.log('logout button pressed');
});

ipcRenderer.on('logout-success', (e, args) => {
    console.log(args);
    window.location.href = './../views/login2.html';
});

// Draft autosave functionality
document.getElementsByClassName('newMessageContainer')[0].addEventListener('keyup', throttle(function () {

    autosaveObj.action = 'autosave';
    autosaveObj.id = draftDBID.innerHTML;
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

    autosaveObj.id = args.id;

    if (args.action == 'create') {
        // Create the DIV containing the draft and assign the draft ID to the hidden <p>

        const messageDiv = document.createElement("div");

        const draft_UID = 'messageContent_' + URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, "");
        messageDiv.id = draft_UID;
        messageDiv.className = 'messageContent';
        messageDiv.setAttribute("onclick", "openDraft(this.id)");

        const email_db_ID = document.createElement('p');
        email_db_ID.style.position = "absolute";
        email_db_ID.style.visibility = "hidden";
        email_db_ID.innerHTML = autosaveObj.id;
        email_db_ID.setAttribute("class", "db-ID");
        email_db_ID.setAttribute("id", "db-ID-" + autosaveObj.id);

        const createdOn = document.createElement('h3');
        createdOn.innerHTML = "Created: " + new Date(parseInt(autosaveObj.createdOn, 10)).toLocaleString();

        const to = document.createElement('h4');
        to.innerHTML = "To: " + autosaveObj.to;

        const subject = document.createElement('h2');
        subject.innerHTML = autosaveObj.subject;

        const message = document.createElement('p');
        message.innerHTML = autosaveObj.message;

        messageDiv.appendChild(email_db_ID);
        messageDiv.appendChild(createdOn);
        messageDiv.appendChild(to);
        messageDiv.appendChild(subject);
        messageDiv.appendChild(message);
        // messagesListDiv.appendChild(messageDiv);
        document.getElementById("messagesList").prepend(messageDiv);

        openDraft(draft_UID);

    } else {

        // Search for the draft with the hidden ID == to the one returned and update its DIV
        currentDraftDiv = document.getElementById(`db-ID-${autosaveObj.id}`).parentNode;

        currentDraftDiv.childNodes[1].innerHTML = "Created: " + new Date(parseInt(autosaveObj.createdOn, 10)).toLocaleString();
        currentDraftDiv.childNodes[2].innerHTML = "To: " + autosaveObj.to;
        currentDraftDiv.childNodes[3].innerHTML = autosaveObj.subject;
        currentDraftDiv.childNodes[4].innerHTML = autosaveObj.message;
    }

    if (document.getElementsByClassName('messageContent').length > 0) {
        noMailMessage.style.visibility = "hidden";
    }

});

ipcRenderer.on('draft-autosave-failed', (e, args) => {
    alert("An error has occurred. The draft cannot be saved!");
});

ipcRenderer.on('drafts', (e, args) => {
    noMailMessage.style.visibility = 'hidden';

    args.forEach(element => {

        const messageDiv = document.createElement("div");

        messageDiv.id = 'messageContent_' + URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, "");
        messageDiv.className = 'messageContent';
        messageDiv.setAttribute("onclick", "openDraft(this.id)");

        const email_db_ID = document.createElement('p');
        email_db_ID.style.position = "absolute";
        email_db_ID.style.visibility = "hidden";
        email_db_ID.innerHTML = element[0];
        email_db_ID.setAttribute("class", "db-ID");
        email_db_ID.setAttribute("id", "db-ID-" + element[0]);

        const createdOn = document.createElement('h3');
        createdOn.innerHTML = "Created: " + new Date(parseInt(element[1], 10)).toLocaleString();

        const to = document.createElement('h4');
        to.innerHTML = "To: " + (element[2].split('{END_TO}')[0]).split("{TO}")[1];

        const subject = document.createElement('h2');
        subject.innerHTML = (element[2].split('{END_SUBJECT}')[0]).split("{SUBJECT}")[1];

        const message = document.createElement('p');
        message.innerHTML = ((element[2].split('{END_MESSAGE}')[0])).split("{MESSAGE}")[1];

        messageDiv.appendChild(email_db_ID);
        messageDiv.appendChild(createdOn);
        messageDiv.appendChild(to);
        messageDiv.appendChild(subject);
        messageDiv.appendChild(message);
        messagesListDiv.appendChild(messageDiv);

    });
    // console.log(document.getElementsByClassName('messageContent').length)
});

ipcRenderer.on('drafts-empty', (e, args) => {
    noMailMessage.style.visibility = 'visible';
});

deleteMessageBtn.addEventListener('click', e => {

    // console.log('Delete message button pressed');

    if (draftDBID.innerHTML != '') {
        console.log('Request to delete draft with ID: ', draftDBID.innerHTML);
        ipcRenderer.send('drafts-delete', draftDBID.innerHTML);
    }

});

ipcRenderer.on('drafts-delete-error', (e, args) => {
    alert("An error has occurred. The message cannot be deleted!");
});

ipcRenderer.on('drafts-delete-success', (e, args) => {

    // document.getElementById("messagesList").style.width = "calc(100% - 52px)";
    document.getElementById(`db-ID-${draftDBID.innerHTML}`).parentNode.remove();

    if (document.getElementsByClassName('messageContent').length == 0) {
        noMailMessage.style.visibility = 'visible';
    }
    closeAfterDelete();
    // draftDBID.innerHTML = '';

});

// Other stuff

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
});

ipcRenderer.on('user-data-request', (e, args) => {
    // console.log('Received this user data: ', args);
    userData = args;
    usernameLblMenu.innerHTML = `&nbsp;&nbsp;&nbsp;` + args.emailAddress.split("@")[0];
    usernameLblTxtSender.value = userData.emailAddress;
});

const btnSend = document.getElementById('btnSend');

btnSend.addEventListener('click', e => {
    console.log('Send button pressed');

    if (autosaveObj.id == '') {
        autosaveObj.id = document.getElementById('db-ID').innerHTML;
        autosaveObj.createdOn = Date.now();
        autosaveObj.from = document.getElementById('txtSender').value;
        autosaveObj.to = document.getElementById('txtRecipient').value;
        autosaveObj.cc = document.getElementById('txtccRecipient').value;
        autosaveObj.bcc = document.getElementById('txtbccRecipient').value;
        autosaveObj.subject = document.getElementById('txtemailSubject').value;
        autosaveObj.message = document.getElementById('output').innerText;
    }

    console.log(autosaveObj);

    if (autosaveObj.id != '' && autosaveObj.createdOn != '' && autosaveObj.to != '' && autosaveObj.subject != '' && autosaveObj.message != '') {
        ipcRenderer.send('send-message', autosaveObj);
    } else {
        alert("The message can\'t be sent. Make sure you fill up TO, SUBJECT, MESSAGE fields and try again.")
    }

});

ipcRenderer.on('message-send-success', (e, args) => {
    ipcRenderer.send('shred-message', { mailbox: 'drafts', emailID: autosaveObj.id });
});

ipcRenderer.on('message-send-error', (e, args) => {
    alert("Error! " + args);
    console.log(args);
});

ipcRenderer.on('delete-error', (e, args) => {
    alert("An error has occurred. The draft cannot be deleted after being sent!");
});

ipcRenderer.on('delete-success', (e, args) => {

    document.getElementById(`db-ID-${draftDBID.innerHTML}`).parentNode.remove();

    if (document.getElementsByClassName('messageContent').length == 0) {
        noMailMessage.style.visibility = 'visible';
    }

    autosaveObj.action = '';
    autosaveObj.id = '';
    autosaveObj.createdOn = '';
    autosaveObj.from = '';
    autosaveObj.to = '';
    autosaveObj.cc = '';
    autosaveObj.bcc = '';
    autosaveObj.subject = '';
    autosaveObj.message = '';

    closeAfterDelete();

    alert("Message sent");
});