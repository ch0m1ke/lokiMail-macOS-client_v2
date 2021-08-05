// document.getElementById("messagesList").prepend(messageDiv);

const { ipcRenderer } = require('electron');

// const messagesListDiv = document.getElementById('messagesList');
const inboxTrashDiv = document.getElementById('inboxTrash');
const draftTrashDiv = document.getElementById('draftTrash');
const sentTrashDiv = document.getElementById('sentTrash');
// const noMailMessage = document.getElementById('no-mail-message');
const restoreBtn = document.getElementById('restoreBtn');
const deleteMessageBtn = document.getElementById('deleteFromTrashBtn');
const emptyTrashBtn = document.getElementById('empty-trash');
const logoutBtn = document.getElementById('logout-btn');
let userData;
let db_ID;
let trashedMessagesArray = [];

window.onload = () => {
    ipcRenderer.send('user-data-request', 'userData');
    ipcRenderer.send('trash-request', 'trash');
}

logoutBtn.addEventListener('click', e => {
    ipcRenderer.send('logout', 'logout');
    console.log('logout button pressed');
});

ipcRenderer.on('logout-success', (e, args) => {
    console.log(args);
    window.location.href = './../views/login2.html';
});

ipcRenderer.on('trash', (e, args) => {

    let email_db_ID, receivedOn, from, subject, message, createdOn, to;
    let mailboxID;
    trashedMessagesCounter = args.length;
    // noMailMessage.style.visibility = 'hidden';

    args.forEach(element => {

        // console.log(element);

        const messageDiv = document.createElement("div");
        messageDiv.id = 'messageContent_' + URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, "");
        messageDiv.className = 'messageContent';
        messageDiv.setAttribute("onclick", "readMessage(this.id)");

        mailboxID = document.createElement('p');
        mailboxID.style.position = "absolute";
        mailboxID.style.visibility = "hidden";
        mailboxID.innerHTML = element[0];
        mailboxID.setAttribute("class", "mailbox-ID");
        mailboxID.setAttribute("id", "mailbox-id-" + element[0]);

        messageDiv.appendChild(mailboxID);

        switch (element[0]) {
            case 'inbox':
                // console.log('inbox');
                // console.log(element);

                email_db_ID = document.createElement('p');
                email_db_ID.style.position = "absolute";
                email_db_ID.style.visibility = "hidden";
                email_db_ID.innerHTML = element[1];
                email_db_ID.setAttribute("class", "db-ID");
                email_db_ID.setAttribute("id", "db-ID-" + element[1]);

                receivedOn = document.createElement('h3');
                receivedOn.innerHTML = "Received: " + new Date(parseInt(element[2], 10)).toLocaleString();

                from = document.createElement('h4');
                from.innerHTML = "From: " + (element[3].split('{END_FROM}')[0]).split("{FROM}")[1];

                subject = document.createElement('h2');
                subject.innerHTML = (element[3].split('{END_SUBJECT}')[0]).split("{SUBJECT}")[1];

                message = document.createElement('p');
                message.innerHTML = (element[3].split('{END_MESSAGE}')[0]).split("{MESSAGE}")[1]

                messageDiv.appendChild(email_db_ID);
                messageDiv.appendChild(receivedOn);
                messageDiv.appendChild(from);
                messageDiv.appendChild(subject);
                messageDiv.appendChild(message);

                inboxTrashDiv.appendChild(messageDiv);

                break;
            case 'drafts':
                // console.log('drafts');
                console.log(element);

                email_db_ID = document.createElement('p');
                email_db_ID.style.position = "absolute";
                email_db_ID.style.visibility = "hidden";
                email_db_ID.innerHTML = element[1];
                email_db_ID.setAttribute("class", "db-ID");
                email_db_ID.setAttribute("id", "db-ID-" + element[1]);

                createdOn = document.createElement('h3');
                createdOn.innerHTML = "Created: " + new Date(parseInt(element[2], 10)).toLocaleString();

                to = document.createElement('h4');
                to.innerHTML = "To: " + (element[3].split('{END_TO}')[0]).split("{TO}")[1];;

                subject = document.createElement('h2');
                subject.innerHTML = (element[3].split('{END_SUBJECT}')[0]).split("{SUBJECT}")[1];

                message = document.createElement('p');
                message.innerHTML = (element[3].split('{END_MESSAGE}')[0]).split("{MESSAGE}")[1];;

                messageDiv.appendChild(email_db_ID);
                messageDiv.appendChild(createdOn);
                messageDiv.appendChild(to);
                messageDiv.appendChild(subject);
                messageDiv.appendChild(message);

                draftTrashDiv.appendChild(messageDiv);

                break;
            case 'sent':
                // console.log('sent');

                email_db_ID = document.createElement('p');
                email_db_ID.style.position = "absolute";
                email_db_ID.style.visibility = "hidden";
                email_db_ID.innerHTML = element[1];
                email_db_ID.setAttribute("class", "db-ID");
                email_db_ID.setAttribute("id", "db-ID-" + element[1]);

                sentOn = document.createElement('h3');
                sentOn.innerHTML = "Sent: " + new Date(parseInt(element[2], 10)).toLocaleString();

                to = document.createElement('h4');
                to.innerHTML = "To: " + (element[3].split('{END_TO}')[0]).split("{TO}")[1];;

                subject = document.createElement('h2');
                subject.innerHTML = (element[3].split('{END_SUBJECT}')[0]).split("{SUBJECT}")[1];

                message = document.createElement('p');
                message.innerHTML = (element[3].split('{END_MESSAGE}')[0]).split("{MESSAGE}")[1];;

                messageDiv.appendChild(email_db_ID);
                messageDiv.appendChild(sentOn);
                messageDiv.appendChild(to);
                messageDiv.appendChild(subject);
                messageDiv.appendChild(message);

                sentTrashDiv.appendChild(messageDiv);

                break;
            default:
                console.log('[ERROR] Couldn\'t recognize entry');
        }

    });
    // console.log(document.getElementsByClassName('messageContent').length)
});

ipcRenderer.on('inbox-empty', (e, args) => {
    // noMailMessage.style.visibility = 'visible';
});

deleteMessageBtn.addEventListener('click', e => {
    console.log('Delete message button pressed');

    const mailbox = document.getElementById("messageDiv").childNodes[0].innerHTML;
    db_ID = (document.getElementById("messageDiv").childNodes[1].id).split("db-ID-")[1];

    // console.log('mailbox ID: ', document.getElementById("messageDiv").childNodes[0].innerHTML);
    // console.log('Mail ID: ', db_ID);

    ipcRenderer.send('shred-message', { mailbox: mailbox, emailID: db_ID });
});

ipcRenderer.on('delete-error', (e, args) => {
    alert("An error has occurred. The message cannot be deleted!");
});

ipcRenderer.on('delete-success', (e, args) => {

    for (let i = 0; i < document.getElementsByClassName('messageContent').length; i++) {

        if (document.getElementsByClassName('messageContent')[i].childNodes[0].id == ("mailbox-id-" + args.mailbox) && document.getElementsByClassName('messageContent')[i].childNodes[1].id == `db-ID-${args.emailID}`) {
            console.log(document.getElementsByClassName('messageContent')[i].remove());
            closeMessage();
        }
    }
});

restoreBtn.addEventListener('click', e => {
    console.log('Restore message button pressed');

    const mailbox = document.getElementById("messageDiv").childNodes[0].innerHTML;
    db_ID = (document.getElementById("messageDiv").childNodes[1].id).split("db-ID-")[1];

    ipcRenderer.send('restore-message', { mailbox: mailbox, emailID: db_ID });
});

ipcRenderer.on('restore-message-error', (e, args) => {
    alert("An error has occurred. The message cannot be restored!");
});

ipcRenderer.on('restore-message-success', (e, args) => {

    for (let i = 0; i < document.getElementsByClassName('messageContent').length; i++) {

        if (document.getElementsByClassName('messageContent')[i].childNodes[0].id == ("mailbox-id-" + args.mailbox) && document.getElementsByClassName('messageContent')[i].childNodes[1].id == `db-ID-${args.emailID}`) {
            document.getElementsByClassName('messageContent')[i].remove();
            closeMessage();
            alert("Message restored!");
        }
    }
});

emptyTrashBtn.addEventListener('click', e => {
    let trashArray = [];
    if (document.getElementsByClassName('messageContent').length > 0) {
        for (let i = 0; i < document.getElementsByClassName('messageContent').length; i++) {
            trashArray[i] = new Array();
            trashArray[i].mailbox = document.getElementsByClassName('messageContent')[i].childNodes[0].id.split("mailbox-id-")[1];
            trashArray[i].emailID = document.getElementsByClassName('messageContent')[i].childNodes[1].id.split("db-ID-")[1];

            trashedMessagesArray[i] = new Array();
            trashedMessagesArray[i].mailbox = document.getElementsByClassName('messageContent')[i].childNodes[0].id;
            trashedMessagesArray[i].emailID = document.getElementsByClassName('messageContent')[i].childNodes[1].id;
        }
        ipcRenderer.send('empty-trash', { trashArray });
    } else {
        alert('You can\'t empty an empty bin! Can you?!?');
    }
});

ipcRenderer.on('empty-trash-success', (e, args) => {
    closeMessage();
    for (let i = 0; i < document.getElementsByClassName('messageContent').length; i++) {
        for (let j = 0; j < trashedMessagesArray.length; j++) {
            if (document.getElementsByClassName('messageContent')[i].childNodes[0].id == trashedMessagesArray[j].mailbox && document.getElementsByClassName('messageContent')[i].childNodes[1].id == trashedMessagesArray[j].emailID) {
                document.getElementsByClassName('messageContent')[i].remove();
            }
        }
    }
    // console.log(trashedMessagesArray);
    alert("Trash emptied.");
});

ipcRenderer.on('empty-trash-error', (e, args) => {
    alert("An error has occurred. Trash cannot be emptied!");
});

// Other stuff
let search = document.getElementById('searchBar');
const usernameLblMenu = document.getElementById('lbl-username-menu');

search.addEventListener('keyup', e => {
    Array.from(document.getElementsByClassName('messageContent')).forEach(item => {
        let hasMatch = item.innerText.toLowerCase().includes(search.value);
        item.style.display = hasMatch ? 'block' : 'none';
    })
})

ipcRenderer.on('user-data-request', (e, args) => {
    // console.log('Received this user data: ', args);
    userData = args;
    usernameLblMenu.innerHTML = `&nbsp;&nbsp;&nbsp;` + args.emailAddress.split("@")[0];

});