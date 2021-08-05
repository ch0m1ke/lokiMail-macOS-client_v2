const knex = require('./knex');

function resetDB(dbPath, dbName) {
    // delete the DB and return true if the operation is complete, false otherwise
};

function updateAccountDetails(email) {
    // ToDo
}

function getAccountDetails() {
    return knex("accountDetails").select("*");
}

function newAccountDetails(userID, emailAddress, sessionToken, publicKey, encPrivateKey) {
    return knex("accountDetails").insert({
        userID: userID,
        emailAddress: emailAddress,
        sessionToken: sessionToken,
        publicKey: publicKey,
        encPrivateKey: encPrivateKey
    });
}

function writeToInbox(receivedOn, encryptedContent, encryptionKeys, trashed) {
    return knex("inbox").insert({
        receivedOn: receivedOn,
        encryptedContent: encryptedContent,
        encryptionKeys: encryptionKeys,
        trashed: trashed
    });
}

function writeToSent(sentOn, encryptedContent, encryptionKeys, personalEncryptionKeys, trashed) {
    return knex("sent").insert({
        sentOn: sentOn,
        encryptedContent: encryptedContent,
        encryptionKeys: encryptionKeys,
        personalEncryptionKeys: personalEncryptionKeys,
        trashed: trashed
    });
}

function writeToDrafts(createdOn, encryptedContent, encryptionKeys, trashed) {
    return knex("drafts").insert({
        createdOn: createdOn,
        encryptedContent: encryptedContent,
        encryptionKeys: encryptionKeys,
        trashed: trashed
    });
}


function updateDraft(emailID, createdOn, encryptedContent, encryptionKeys) {
    return knex("drafts").where('emailID', emailID).update({ createdOn: createdOn, encryptedContent: encryptedContent, encryptionKeys: encryptionKeys });
}

function getAllinbox() {
    return knex("inbox").select("*").orderBy("receivedOn", "desc");
}

function getAllDrafts() {
    return knex("drafts").select("*").orderBy("createdOn", "desc");
}

function getAllSent() {
    return knex("sent").select("*").orderBy("sentOn", "desc");
}

function getInboxTrash() {
    return knex("inbox").select("*").where('trashed', 1).orderBy("receivedOn", "desc");
}

function getDraftsTrash() {
    return knex("drafts").select("*").where('trashed', 1).orderBy("createdOn", "desc");
}

function getSentTrash() {
    return knex("sent").select("*").where('trashed', 1).orderBy("sentOn", "desc");
}

function TrashOne(mailboxType, emailID) {
    return knex(mailboxType).where('emailID', emailID).update({ trashed: 1 });
}

function RestoreOne(mailboxType, emailID) {
    return knex(mailboxType).where('emailID', emailID).update({ trashed: 0 });
}

function TrashAll(mailboxType) {
    return knex(mailboxType).where(1, 1).update({ trashed: 1 });
}

function deleteOne(mailboxType, emailID) {
    return knex(mailboxType).where('emailID', emailID).del();
}

function deleteAll(mailboxType) {
    return knex(mailboxType).where(1, 1).del();
}

// ToDo: add other functions

module.exports = { resetDB, getAccountDetails, newAccountDetails, updateAccountDetails, getAllinbox, getAllDrafts, getAllSent, getInboxTrash, getDraftsTrash, getSentTrash, writeToInbox, writeToSent, writeToDrafts, updateDraft, TrashOne, TrashAll, deleteOne, deleteAll, RestoreOne };