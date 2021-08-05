const { app, ipcMain } = require('electron');
const { Notification } = require('electron');
const jwt = require('jsonwebtoken');
const requests = require('./../axios/requests');
const db = require('./../db/emails');
const fs = require('fs');
const app_config = require('./../../../config/app_config.json');
const encModule = require('./../encryption/encryption-module');

let dbExists = false;
const appFolder = app.getPath("userData");
const desktopPath = app.getPath("desktop");
let currentUser = {
    userID: '',
    emailAddress: '',
    sessionToken: '',
    publicKey: '',
    encPrivateKey: '',
    peerID: ''
};

let lastSentMessage = {
    sentOn: '',
    encryptedContent: '',
    encryptionKeys: '',
    personalEncryptionKeys: '',
    trashed: ''
};

let inMemoryPrivKey;

ipcMain.on('db-error-channel', (e, args) => {
    if (args == 'backup-db') {
        console.log('[INFO] Backup DB and restart...');
        fs.copyFile(`${appFolder}/db.sqlite3`, `${desktopPath}/db.sqlite3`, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`[INFO] DB copied to ${desktopPath}`);
            }
        });

        fs.rm(`${appFolder}/db.sqlite3`, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`[INFO] DB deleted from ${appFolder}`);
            }
        });

        console.log(`[INFO] Restarting app...`);
        app.relaunch();
        app.quit();
    }
    if (args == 'delete-db') {
        console.log('[INFO] Delete DB and restart...');

        fs.rm(`${appFolder}/db.sqlite3`, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`[INFO] DB deleted from ${appFolder}`);
            }
        });

        console.log(`[INFO] Restarting app...`);
        app.relaunch();
        app.quit();
    }
});

ipcMain.on('process-event-channel', (e, args) => {
    if (args == 'exit') {
        peerIDUpdate(true);
    }
    if(args == 'login-exit'){
        app.quit();
    }
});

ipcMain.on('login', async (e, args) => {

    // check if the app DB exists
    if (fs.existsSync(`${appFolder}/db.sqlite3`)) {
        console.log('[INFO] DB found!');
        dbExists = true;
    } else {
        console.log('[INFO] No DB found!');
    }

    if (!dbExists) {
        fs.copyFile('./app/components/db/db.sqlite3', `${appFolder}/db.sqlite3`, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`[INFO] DB copied to ${appFolder}`);
            }
        });

    }

    // console.log(args);

    // send a request to the website and wait for the response
    const userData = await requests.loginRequest((app_config.websiteURL + 'app_api/login'), args);

    // if username and password are wrong, send an error to the form
    if (userData.sessionToken == undefined) {
        e.sender.send('login-errors', 'Wrong username/password!');
    } else {

        const userID = jwt.decode(userData.sessionToken).user;
        const accountCreated = db.newAccountDetails(userID, args.username + app_config.domain, userData.sessionToken, userData.publicKey, userData.encPrivateKey)
            .then(result => /*console.log(result)*/ {
                console.log('[INFO] User data written to DB');

                currentUser.userID = userID;
                currentUser.emailAddress = args.username + app_config.domain;
                currentUser.sessionToken = userData.sessionToken;
                currentUser.publicKey = userData.publicKey;
                currentUser.encPrivateKey = userData.encPrivateKey;
                // console.log(currentUser);

                const password = args.password;

                encModule.decryptPrivateKey(currentUser.encPrivateKey, password)
                    .then(result => {
                        if (result != undefined) {
                            inMemoryPrivKey = result;
                            console.log('[INFO] Private Key saved in memory');

                            peerIDUpdate(false);

                            e.sender.send('login2-success', 'inbox');
                            console.log('[INFO] Redirecting to inbox');
                        } else {
                            e.sender.send('login2-errors', 'Wrong password');
                            // console.log('[ERROR] Wrong password!');   
                        }
                    })

                e.sender.send('login-success', 'inbox');
                console.log('[INFO] Redirecting to inbox');

            })
            .catch(err => console.log(err))
    }
});

ipcMain.on('login2-user-request', (e, args) => {
    const login2Username = db.getAccountDetails()
        .then(result => {
            currentUser = result[0];
            // console.log(currentUser);
            e.sender.send('login2-user-request', currentUser.emailAddress);
        })
});

ipcMain.on('user-data-request', (e, args) => {
    if (currentUser.emailAddress != '') {
        // console.log('sending this data: ', currentUser);
        e.sender.send('user-data-request', currentUser);
    } else {
        e.sender.send('user-data-request', '');
    }
});

ipcMain.on('login2', async (e, args) => {

    // console.log(args);
    const password = args;

    encModule.decryptPrivateKey(currentUser.encPrivateKey, password)
        .then(result => {
            if (result != undefined) {
                inMemoryPrivKey = result;
                peerIDUpdate(false);
                console.log('[INFO] Private Key saved in memory');
                e.sender.send('login2-success', 'inbox');
                console.log('[INFO] Redirecting to inbox');
            } else {
                e.sender.send('login2-errors', 'Wrong password');
                // console.log('[ERROR] Wrong password!');   
            }
        })

});

ipcMain.on('logout', (e, args) => {
    inMemoryPrivKey = '';
    e.sender.send('logout-success', 'Successfully logged out');
    console.log('[INFO] In-Memory Private Key deleted');
    console.log('[INFO] Redirecting to login2');
});

ipcMain.on('peer-id-request', (e, args) => {
    if (currentUser.peerID != undefined) {
        mainWindow.webContents.send('got-peer-id', currentUser.peerID);
    } else {
        mainWindow.webContents.send('got-peer-id', 'No connection to P2P relay');
    }
});

ipcMain.on('inbox-delete', (e, args) => {
    // console.log("inbox message deletion request received. ID: ", args);
    db.TrashOne('inbox', args)
        .then(result => /*console.log(result)*/ {
            if (result == 1) {
                e.sender.send('inbox-delete-success', 'Message deleted.');
            } else {
                e.sender.send('inbox-delete-error', 'Cannot delete the message.');
            }
        })
        .catch(err => console.log(err))
});

ipcMain.on('inbox-request', (e, args) => {

    db.getAllinbox()
        .then(result => /*console.log(result)*/ {
            // console.log('[RESULT] ',result[0]);
            if (result[0] != undefined) {
                decryptInbox(result)
                    .then(result2 => {
                        // console.log(result2);
                        if (result2 != '') {
                            console.log('[INFO] Inbox decrypted. Sending it back to the renderer.');
                            e.sender.send('inbox', result2);
                        } else {
                            e.sender.send('inbox-empty', 'No mail found in Inbox');
                        }
                    })
            } else {
                e.sender.send('inbox-empty', 'No mail found in Inbox');
            }
        })
        .catch(err => console.log(err))

});

async function decryptInbox(inbox) {
    let decryptedInbox = [];

    for (let i = 0; i < inbox.length; i++) {
        // Decrypt entries, check signature, check if they are trashed, add them to the decryptedInbox array
        if (inbox[i].trashed == 0) {
            let decryptedEntry = await encModule.inboxDecrypt(inMemoryPrivKey, inbox[i].encryptedContent, inbox[i].encryptionKeys);

            // If message signature can't be verified, delete the entry from the DB;
            if (!decryptedEntry) {
                console.log('[ERROR] The signature of the message cannot be verified. Deleting the message.');
                console.log('[INFO] Deleting record with ID = ', inbox[i].emailID);
                db.deleteOne('inbox', inbox[i].emailID)
                    .then(result => /*console.log(result)*/ {
                        if (result != 1) {
                            console.log('[ERROR] An error has occurred while deleting the entry');
                        }
                    })
                    .catch(err => console.log(err))
            } else {
                decryptedInbox[i] = new Array();
                decryptedInbox[i].push(inbox[i].emailID, inbox[i].receivedOn, decryptedEntry);
            }
        }
    }
    return decryptedInbox;
}

async function decryptDrafts(drafts) {
    let decryptedDrafts = [];

    for (let i = 0; i < drafts.length; i++) {
        // Decrypt entries, check if they are trashed, add them to the decryptedDrafts array
        if (drafts[i].trashed == 0) {
            let decryptedEntry = '';
            let to = '';
            if (drafts[i].encryptedContent != '') {
                // console.log('[DECRYPTING] ', drafts[i].privKeyEncryptedContent)
                decryptedEntry = await encModule.draftDecrypt(inMemoryPrivKey, drafts[i].encryptedContent, drafts[i].encryptionKeys);
            }
            decryptedDrafts[i] = new Array();
            decryptedDrafts[i].push(drafts[i].emailID, drafts[i].createdOn, decryptedEntry);
        }
    }
    return decryptedDrafts;
}

ipcMain.on('drafts-request', (e, args) => {

    db.getAllDrafts()
        .then(result => /*console.log(result)*/ {
            // console.log('[RESULT] ',result[0]);
            if (result[0] != undefined) {
                decryptDrafts(result)
                    .then(result2 => {
                        if (result2 != '') {
                            console.log('[INFO] Drafts decrypted. Sending it back to the renderer.');
                            // console.log(result2);
                            e.sender.send('drafts', result2);
                        } else {
                            e.sender.send('drafts-empty', 'No mail found in Drafts');
                        }
                    })
            } else {
                e.sender.send('drafts-empty', 'No mail found in Drafts');
            }
        })
        .catch(err => console.log(err))
});

ipcMain.on('drafts-delete', (e, args) => {
    console.log("Drafts message deletion request received. ID: ", args);
    db.TrashOne('drafts', args)
        .then(result => /*console.log(result)*/ {
            if (result == 1) {
                e.sender.send('drafts-delete-success', 'Message deleted.');
            } else {
                e.sender.send('drafts-delete-error', 'Cannot delete the message.');
            }
        })
        .catch(err => console.log(err))
});

ipcMain.on('draft-autosave', async (e, args) => {

    const createdOn = parseInt(args.createdOn, "10");
    const draftMessage = `{TO}${args.to}{END_TO}{SUBJECT}${args.subject}{END_SUBJECT}{MESSAGE}${args.message}{END_MESSAGE}`;
    const trashed = false;

    encModule.draftEncrypt(currentUser.publicKey, draftMessage)
        .then(result => {
            // console.log("New Draft Data = ", result);
            if (result != undefined) {
                console.log('[INFO] Draft encrypted');
                if (args.id != '') {
                    console.log('Updating draft with ID = ', args.id);
                    db.updateDraft(args.id, createdOn, result.encryptedContent, result.encryptionKeys)
                        .then(result => {
                            if (result == 1) {
                                e.sender.send('draft-autosave-success', { id: args.id, action: 'update' });
                            } else {
                                e.sender.send('draft-autosave-failed', 'Draft cannot be saved');
                            }
                        })
                        .catch(err => console.log(err))
                } else {
                    console.log('Creating new draft');
                    db.writeToDrafts(createdOn, result.encryptedContent, result.encryptionKeys, trashed)
                        .then(result => {
                            e.sender.send('draft-autosave-success', { id: result, action: 'create' });
                        })
                        .catch(err => {
                            console.log(err);
                            e.sender.send('draft-autosave-failed', 'Draft cannot be saved');
                        })

                }
            }
        })

});

ipcMain.on('sent-request', (e, args) => {

    db.getAllSent()
        .then(result => {
            // console.log('[RESULT] ',result[0]);
            if (result[0] != undefined) {
                decryptSent(result)
                    .then(result2 => {
                        // console.log(result2);
                        if (result2 != '') {
                            console.log('[INFO] Sent decrypted. Sending it back to the renderer.');
                            // console.log(result2);
                            e.sender.send('sent', result2);
                        } else {
                            e.sender.send('sent-empty', 'No mail found in Sent');
                        }
                    })
                    .catch(err => { console.log(err); })
            } else {
                e.sender.send('sent-empty', 'No mail found in Sent');
            }
        })
        .catch(err => console.log(err))

});

async function decryptSent(Sent) {
    let decryptedSent = [];

    for (let i = 0; i < Sent.length; i++) {
        // ToDo: Decrypt entries, check if they are trashed, add them to the decryptedSent array
        if (Sent[i].trashed == 0) {
            let decryptedEntry = await encModule.sentDecrypt(inMemoryPrivKey, Sent[i].encryptedContent, Sent[i].personalEncryptionKeys);

            // If message signature can't be verified, delete the entry from the DB;
            if (decryptedEntry == 'undefined') {
                console.log('[ERROR] The message cannot be decrypted. Deleting the message.');
                console.log('[INFO] Deleting record with ID = ', Sent[i].emailID);
                db.deleteOne('Sent', Sent[i].emailID)
                    .then(result => /*console.log(result)*/ {
                        if (result != 1) {
                            console.log('[ERROR] An error has occurred while deleting the entry');
                        }
                    })
                    .catch(err => console.log(err))
            } else {
                decryptedSent[i] = new Array();
                decryptedSent[i].push(Sent[i].emailID, Sent[i].sentOn, decryptedEntry);
            }
        }
    }

    return decryptedSent;

}

ipcMain.on('sent-delete', (e, args) => {
    // console.log("semt message deletion request received. ID: ", args);
    db.TrashOne('sent', args)
        .then(result => /*console.log(result)*/ {
            if (result == 1) {
                e.sender.send('sent-delete-success', 'Message deleted.');
            } else {
                e.sender.send('sent-delete-error', 'Cannot delete the message.');
            }
        })
        .catch(err => console.log(err))
});

ipcMain.on('trash-request', (e, args) => {

    let trashArray = [];

    db.getInboxTrash()
        .then(result => {
            // console.log('[RESULT] ',result[0]);
            if (result[0] != undefined) {
                decryptInboxTrash(result)
                    .then(result2 => {
                        if (result2 != '') {
                            console.log('[INFO] Collected inbox trash');
                            for (let i = 0; i < result2.length; i++) {
                                result2[i].unshift('inbox');
                                trashArray.push(result2[i]);
                            }
                            //console.log(trashArray);
                            e.sender.send('inbox-trash', trashArray);
                        } else {
                            // e.sender.send('inbox-empty', 'No mail found in Inbox');
                            // e.sender.send('inbox-trash-empty', 'No trash found in inbox');
                        }
                    })
            } else {
                // e.sender.send('inbox-trash-empty', 'No trash found in inbox');
                console.log('[INFO] No trash found in inbox');
            }
            db.getDraftsTrash()
                .then(result => {
                    // console.log('[RESULT] ',result[0]);
                    if (result[0] != undefined) {
                        decryptDraftsTrash(result)
                            .then(result2 => {
                                if (result2 != '') {
                                    console.log('[INFO] Collected drafts trash');
                                    for (let i = 0; i < result2.length; i++) {
                                        result2[i].unshift('drafts');
                                        trashArray.push(result2[i]);
                                    }
                                    // console.log(trashArray);
                                    e.sender.send('inbox-trash', trashArray);
                                } else {
                                    // e.sender.send('drafts-trash-empty', 'No mail found in drafts');
                                }
                            })
                    } else {
                        // e.sender.send('drafts-trash-empty', 'No trash found in drafts');
                        console.log('[INFO] No trash found in drafts');
                    }
                    db.getSentTrash()
                        .then(result => {
                            // console.log('[RESULT] ',result[0]);
                            if (result[0] != undefined) {
                                decryptSentTrash(result)
                                    .then(result2 => {
                                        if (result2 != '') {
                                            console.log('[INFO] Collected sent trash');
                                            for (let i = 0; i < result2.length; i++) {
                                                result2[i].unshift('sent');
                                                trashArray.push(result2[i]);
                                            }
                                            console.log('[INFO] Sending data back to trashRenderer');
                                            e.sender.send('trash', trashArray);
                                        } else {
                                            console.log('[INFO] Sending data back to trashRenderer');
                                            e.sender.send('trash', trashArray);
                                            // e.sender.send('inbox-empty', 'No mail found in Inbox');
                                        }
                                    })
                            } else {
                                console.log('[INFO] No trash found in sent');
                                console.log('[INFO] Sending data back to trashRenderer');
                                e.sender.send('trash', trashArray);
                            }
                        })
                        .catch(err => console.log(err))
                })
                .catch(err => console.log(err))
        })
        .catch(err => console.log(err))
});

async function decryptInboxTrash(inbox) {
    let decryptedInboxTrash = [];

    for (let i = 0; i < inbox.length; i++) {
        // ToDo: Decrypt entries, check signature, check if they are trashed, add them to the decryptedInboxTrash array
        if (inbox[i].trashed == 1) {
            let decryptedEntry = await encModule.inboxDecrypt(inMemoryPrivKey, inbox[i].encryptedContent, inbox[i].encryptionKeys);

            // If message signature can't be verified, delete the entry from the DB;
            if (!decryptedEntry) {
                console.log('[ERROR] The signature of the message cannot be verified. Deleting the message.');
                console.log('[INFO] Deleting record with ID = ', inbox[i].emailID);
                db.deleteOne('inbox', inbox[i].emailID)
                    .then(result => /*console.log(result)*/ {
                        if (result != 1) {
                            console.log('[ERROR] An error has occurred while deleting the entry');
                        }
                    })
                    .catch(err => console.log(err))
            } else {
                decryptedInboxTrash[i] = new Array();
                decryptedInboxTrash[i].push(inbox[i].emailID, inbox[i].receivedOn, decryptedEntry);
            }
        }
    }
    return decryptedInboxTrash;
}

async function decryptDraftsTrash(drafts) {
    let decryptedDraftsTrash = [];

    //console.log(drafts)

    for (let i = 0; i < drafts.length; i++) {
        // ToDo: Decrypt entries, check signature, check if they are trashed, add them to the decryptedDraftsTrash array
        if (drafts[i].trashed == 1) {
            let decryptedEntry = '';
            if (drafts[i].encryptedContent != '') {
                // console.log('[DECRYPTING] ', drafts[i].privKeyEncryptedContent)
                decryptedEntry = await encModule.draftDecrypt(inMemoryPrivKey, drafts[i].encryptedContent, drafts[i].encryptionKeys);
            }
            decryptedDraftsTrash[i] = new Array();
            decryptedDraftsTrash[i].push(drafts[i].emailID, drafts[i].createdOn, decryptedEntry);//drafts[i].decryptedEntry);
        }
    }
    return decryptedDraftsTrash;
}

async function decryptSentTrash(Sent) {
    let decryptedSentTrash = [];

    for (let i = 0; i < Sent.length; i++) {
        // ToDo: Decrypt entries, check if they are trashed, add them to the decryptedSentTrash array
        if (Sent[i].trashed == 1) {
            let decryptedEntry = await encModule.sentDecrypt(inMemoryPrivKey, Sent[i].encryptedContent, Sent[i].personalEncryptionKeys);

            // If message signature can't be verified, delete the entry from the DB;
            if (decryptedEntry == 'undefined') {
                console.log('[ERROR] The message cannot be decrypted. Deleting the message.');
                console.log('[INFO] Deleting record with ID = ', Sent[i].emailID);
                db.deleteOne('Sent', Sent[i].emailID)
                    .then(result => /*console.log(result)*/ {
                        if (result != 1) {
                            console.log('[ERROR] An error has occurred while deleting the entry');
                        }
                    })
                    .catch(err => console.log(err))
            } else {
                decryptedSentTrash[i] = new Array();
                decryptedSentTrash[i].push(Sent[i].emailID, Sent[i].sentOn, decryptedEntry);
            }
        }
    }
    return decryptedSentTrash;
}

ipcMain.on('shred-message', (e, args) => {
    // console.log("Message destruction request received. Mailbox: ", args.mailbox, ", emailID: ", args.emailID);

    db.deleteOne(args.mailbox, args.emailID)
        .then(result => /*console.log(result)*/ {
            if (result == 1) {
                console.log(`[INFO] Record with ID = ${args.emailID} deleted from "${args.mailbox}" table.`)
                e.sender.send('delete-success', { mailbox: args.mailbox, emailID: args.emailID });
            } else {
                e.sender.send('delete-error', 'Cannot delete the message.');
            }
        })
        .catch(err => console.log(err))
});

ipcMain.on('restore-message', (e, args) => {
    // console.log("Message destruction request received. Mailbox: ", args.mailbox, ", emailID: ", args.emailID);

    db.RestoreOne(args.mailbox, args.emailID)
        .then(result => /*console.log(result)*/ {
            if (result == 1) {
                console.log(`[INFO] Record with ID = ${args.emailID} restored to "${args.mailbox}" table.`)
                e.sender.send('restore-message-success', { mailbox: args.mailbox, emailID: args.emailID });
            } else {
                e.sender.send('restore-message-error', 'Cannot delete the message.');
            }
        })
        .catch(err => console.log(err))
});

ipcMain.on('empty-trash', (e, args) => {
    console.log("[INFO] Empty trash request received.");
    // console.log(args.trashArray);
    for (let i = 0; i < args.trashArray.length; i++) {
        db.deleteOne(args.trashArray[i].mailbox, args.trashArray[i].emailID)
            .then(result => /*console.log(result)*/ {
                if (result == 1) {
                    console.log(`[INFO] Record with ID = ${args.trashArray[i].emailID} deleted from "${args.trashArray[i].mailbox}" table.`)
                } else {
                    e.sender.send('empty-trash-error', `[ERROR] Record with ID = ${args.emailID} cannot be deleted from "${args.mailbox}" table.`);
                }
            })
            .catch(err => console.log(err))
    }
    e.sender.send('empty-trash-success', 'Trash emptied');
});

function validateMessageFields(messageObj) {

    recipientLocalAddress = messageObj.to.split("@")[0];
    recipientDomain = messageObj.to.split("@")[1];

    if (recipientDomain == undefined || recipientDomain == '' || recipientDomain == app_config.domain.split("@")[1]) { // No domain found

        if (!hasUpperCase(recipientLocalAddress) && !hasSpecialChar(recipientLocalAddress) && (recipientLocalAddress.length >= 5 && recipientLocalAddress.length <= 20)) { // username is ok
            // check subject
            if (messageObj.subject.includes('{SUBJECT}') || messageObj.subject.includes('{END_SUBJECT}') || messageObj.subject.includes('{MESSAGE}') || messageObj.subject.includes('{END_MESSAGE}') || messageObj.subject.includes('{OBJECT}') || messageObj.subject.includes('{END_OBJECT}')) {
                return false; // error! the subject field contains keywords
            } else {
                // check message
                if (messageObj.message.includes('{SUBJECT}') || messageObj.message.includes('{END_SUBJECT}') || messageObj.message.includes('{MESSAGE}') || messageObj.message.includes('{END_MESSAGE}') || messageObj.message.includes('{OBJECT}') || messageObj.message.includes('{END_OBJECT}')) {
                    return false; // error! the message field contains keywords
                } else {
                    return true; // Fields are ok
                }
            }
        } else {
            return false; // error! The username is wrong
        }
    } else {
        return false; // error! The domain is different from loki-mail.com
    }
}

async function prepareMessageForSending(messageObj) {

    console.log(messageObj);

    let finalMessage;

    const requestParams = {
        emailAddress: messageObj.to.split("@")[0] + app_config.domain,
        sessionToken: currentUser.sessionToken
    }

    // send a request to the website and wait for the response
    const receiverData = await requests.getUserRequest((app_config.websiteURL + 'app_api/getUser'), requestParams);
    // console.log("[DEBUG] " + receiverData)
    if (receiverData != undefined && receiverData.publicKey != undefined && receiverData.publicKey.includes("-----BEGIN PUBLIC KEY-----")) {

        // [X] Add necessary information, encrypt & sign the message.
        const message = `{FROM}${messageObj.from}{END_FROM}{TO}${requestParams.emailAddress + app_config.domain}{END_TO}{SENDER_PUB_KEY}${currentUser.publicKey}{END_SENDER_PUB_KEY}{SUBJECT}${messageObj.subject}{END_SUBJECT}{MESSAGE}${messageObj.message}{END_MESSAGE}`;
        await encModule.encryptMessage(currentUser.publicKey, inMemoryPrivKey, receiverData.publicKey, message)
            .then(result => {
                // SEND THE STRINGIFIED MESSAGE AND RECORD THE LAST SENT MESSAGE
                /*const */finalMessage = JSON.stringify({ "encMessage": result.encMessage, "encryptionKeys": result.encryptionKeys }); //send encrypted content and encryptionKeys only

                // console.log(finalMessage);

                lastSentMessage.sentOn = Date.now();
                lastSentMessage.encryptedContent = result.encMessage;
                lastSentMessage.encryptionKeys = result.encryptionKeys;
                lastSentMessage.personalEncryptionKeys = result.personalEncryptionKeys;
                lastSentMessage.trashed = false;

                // return {"encMessage": finalMessage, "receiverPeerID": receiverData.peerID};

            }, (err) => {
                console.log("[ERROR] " + err);
                return false;
            })
        return { "message": finalMessage, "receiverPeerID": receiverData.peerID };
    }
}

function hasUpperCase(str) {
    return (/[A-Z]/.test(str));
}

function hasSpecialChar(str) {
    return !(/^[a-zA-Z0-9\.]*$/.test(str)); // Returns true if a special character is found.
}

ipcMain.on('send-message', async (e, args) => {

    if (!validateMessageFields(args)) { // if message fields are ok
        console.log("[ERROR] Fields contain error/s!");
        // e.sender.send('message-send-error', 'One or more fields contain error. Please check them and try again.');
    } else {
        console.log("[INFO] Fields are OK");

        // Can prepare the message for sending
        prepareMessageForSending(args)
            .then(result => {

                if (!result) {
                    console.log("[ERROR] Error while preparing the message!");
                    e.sender.send('message-send-error', 'An error has occured while preparing the message. User may not exist or no Backend connection.');
                } else {
                    console.log("[INFO] Message ready to be sent.");
                    // console.log(result.message);
                    // console.log(result.receiverPeerID);

                    if (result.receiverPeerID != '' && result.receiverPeerID != null && result.receiverPeerID != undefined) {
                        // Message ready to be sent. Sending it via WebRTC
                        p2pWindow.webContents.send('WebRTCsendMessage', result);
                    } else {
                        // tell user that the recipient is offline
                        e.sender.send('message-send-error', 'The user may be offline. Please try again later.');
                    }

                }

            })
    }

});

ipcMain.on('update-peer-id', (e, args) => {
    console.log('Peer ID:', args);
    currentUser.peerID = args;
    mainWindow.webContents.send('got-peer-id', args);
});

ipcMain.on('p2p-data-received', (e, args) => {
    // console.log('Data received:', args);
    console.log("[INFO] New message reveived");
    saveToInbox(args);
});

// Takes in input a parameter (true or false) to update or reset the peer ID in the online DB.
async function peerIDUpdate(quittingApp) {

    let requestParams = {
        userID: currentUser.userID,
        sessionToken: currentUser.sessionToken,
        peerID: ''
    }

    if (!quittingApp) { // If the app is quitting, reset the peerID.
        requestParams.peerID = currentUser.peerID;
    }

    console.log('[INFO] Updating Peer ID in the online DB');
    requests.updatePeerID((app_config.websiteURL + 'app_api/updatePeerID'), requestParams)
        .then(result => {
            // console.log(result);
            if (result != undefined && result.completed == true) {

                if (quittingApp) {
                    console.log('[INFO] Peer ID deleted from Online DB');
                    app.quit();
                } else {
                    console.log('[INFO] Peer ID updated successfully');
                }
            } else {
                console.log('[ERROR] Peer ID couldn\'t be updated');
                mainWindow.webContents.send('no-backend-connection', 'Impossible to connect to the backend.');
            }

        })
        .catch(err => {
            // console.log(err);
            console.log('[ERROR] Peer ID couldn\'t be updated');
            mainWindow.webContents.send('no-backend-connection', 'Impossible to connect to the backend.');
        });
}

ipcMain.on('p2p-error', (e, args) => {
    console.log("[ERROR] Error with P2P connection");
    mainWindow.webContents.send('message-send-error', args);
})

ipcMain.on('p2p-info', (e, args) => {
    console.log("[INFO] Message sent");

    db.writeToSent(lastSentMessage.sentOn, lastSentMessage.encryptedContent, lastSentMessage.encryptionKeys, lastSentMessage.personalEncryptionKeys, lastSentMessage.trashed)
        .then(result => {
            console.log("[INFO] New sent message saved successfully");

            lastSentMessage.sentOn = '';
            lastSentMessage.encryptedContent = '';
            lastSentMessage.encryptionKeys = '';
            lastSentMessage.personalEncryptionKeys = '';
            lastSentMessage.trashed = '';

            mainWindow.webContents.send('message-send-success', 'Message sent');

        })
        .catch(err => {
            // console.log(err);
            console.log("[ERROR] Couldn\'t save sent message in the DB");
            mainWindow.webContents.send('sent-save-failed', 'Failed to save sent message');
        })

})

ipcMain.on('test-channel', (e, args) => {
    console.log(args);
})

async function saveToInbox(message) {

    const messageObj = JSON.parse(message);
    let messageFrom = '';

    let inboxMessage = {
        emailID: '',
        receivedOn: Date.now(),
        message: ''
    }

    db.writeToInbox(Date.now(), messageObj.encMessage, messageObj.encryptionKeys, false)
        .then(async (result) => {
            inboxMessage.emailID = result;
            console.log("[INFO] New inbox message saved successfully");

            if (inMemoryPrivKey != '' && inMemoryPrivKey != undefined) {

                let decryptedEntry = await encModule.inboxDecrypt(inMemoryPrivKey, messageObj.encMessage, JSON.stringify(messageObj.encryptionKeys));

                // If message signature can't be verified, don't save the entry;
                if (!decryptedEntry) {
                    console.log('[ERROR] The signature of the message cannot be verified. The message will be deleted from the DB.');
                    db.deleteOne('inbox', inboxMessage.emailID)
                        .then(result => /*console.log(result)*/ {
                            if (result != 1) {
                                console.log('[ERROR] An error has occurred while deleting the entry');
                            }
                        })
                        .catch(err => console.log(err))
                } else {
                    // console.log(decryptedEntry)
                    messageFrom = (decryptedEntry.split("{END_FROM}")[0]).split("{FROM}")[1];
                    inboxMessage.message = decryptedEntry;
                }

            } else {
                console.log('[INFO] New message received but not decrypted since the user is not logged in.');
            }

            const NOTIFICATION_TITLE = 'New message';
            let NOTIFICATION_BODY;
            if (messageFrom != '') {
                NOTIFICATION_BODY = 'New message from ' + messageFrom;
                // console.log(decryptedEntry);
                mainWindow.webContents.send('inbox-save-success', inboxMessage);
            } else {
                NOTIFICATION_BODY = 'New message received. Unlock the app to read it';
            }

            function showNotification() {
                new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
            }

            app.whenReady().then(showNotification)

        })
        .catch(err => {
            // console.log(err);
            console.log("[ERROR] Couldn\'t save inbox message in the DB");
            mainWindow.webContents.send('inbox-save-failed', 'Failed to save inbox message');
        })

}

ipcMain.on('force-app-quit', (e, args) => {
    app.quit();
})

module.exports = { peerIDUpdate };