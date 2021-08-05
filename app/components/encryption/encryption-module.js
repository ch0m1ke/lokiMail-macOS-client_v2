const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

// Decrypts the private key passed in input
async function decryptPrivateKey(encPrivKey, passphrase) {
    let privateKey;
    try {
        privateKeyObject = crypto.createPrivateKey({ format: 'pem', key: encPrivKey, passphrase: passphrase, type: 'pkcs8', cipher: 'aes-256-cbc' });
        privateKey = privateKeyObject.export({ format: 'pem', type: 'pkcs8' }).toString();
    } catch (err) {
        // console.log(err);
        console.log('[ERROR] Couldn\'t decrypt Private Key');
    }
    return privateKey;
}

// Encrypts message using the public key passed in input
async function publicEncrypt(publicKey, message) {
    try {
        const encryptedContent = crypto.publicEncrypt(publicKey, Buffer.from(message));
        console.log('[INFO] Message encrypted using public key.');
        return encryptedContent.toString("base64");
    } catch (err) {
        console.log(err);
        // console.log('[ERROR] Couldn\'t encrypt the message');
    }
}

// Takes in input a base64, encrypted message and a public key, creates a buffer from the message and decrypt it using the public key
function publicDecrypt(publicKey, message) {
    try {
        const buf = Buffer.from(message, "base64");
        const decryptedContent = crypto.publicDecrypt(publicKey, buf);
        // console.log('[INFO] Message decrypted using public key.');
        return decryptedContent.toString("ascii");
    } catch (err) {
        console.log(err);
        console.log('[ERROR] Couldn\'t decrypt the message');
    }
}

// Encrypts message using the private key passed in input
function privateEncrypt(privateKey, message) {
    try {
        const encryptedContent = crypto.privateEncrypt(privateKey, Buffer.from(message));
        console.log('[INFO] Message encrypted using private key.');
        return encryptedContent.toString("base64");
    } catch (err) {
        // console.log(err);
        console.log('[ERROR] Couldn\'t encrypt the message');
    }
}

// Takes in input a base64, encrypted message and a private key, creates a buffer from the message and decrypt it using the private key
function privateDecrypt(privateKey, message) {
    // console.log(message)
    try {
        const buf = Buffer.from(message, "base64");
        const decryptedContent = crypto.privateDecrypt(privateKey, buf);
        // console.log('[INFO] Message decrypted using private key.');
        return decryptedContent.toString("ascii");
    } catch (err) {
        console.log(err);
        console.log('[ERROR] Couldn\'t decrypt the message');
    }
}

// Takes in input sender Public Key and message, encrypts the message and return the object {encryptedContent, encryptionKeys}
async function draftEncrypt(senderPublicKey, message) {
    try {
        // Encrypt the message using randomly generated KEY and IV
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        let encMessage = cipher.update(message);
        encMessage = (Buffer.concat([encMessage, cipher.final()])).toString('hex');
        let encryptionKeys = await publicEncrypt(senderPublicKey, JSON.stringify({ key: key, iv: iv.toString('hex') }));
        return { encryptedContent: encMessage, encryptionKeys: encryptionKeys };
    } catch (err) {
        console.log('[ERROR] Couldn\'t encrypt the draft');
        console.log(err);
    }
}

// Takes in input User Private Key, a message from the draft table and its respective Encryption Keys and return an object with the decrypted record
async function draftDecrypt(privateKey, message, encryptionKeys) {
    try {
        const keyPair = JSON.parse(privateDecrypt(privateKey, encryptionKeys)); // Decrypt the encryption keys using the in-memory user private key and "Destringify" the object

        let iv = Buffer.from(keyPair.iv, 'hex');
        let encryptedText = Buffer.from(message, 'hex');

        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyPair.key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        //console.log(decrypted.toString());
        return decrypted.toString();

    } catch (err) {
        console.log("[ERROR] Cannot decrypt draft message");
        console.log(err);
    }
}

// Takes in input User Private Key, a message from the sent table and its respective Encryption Keys and return an object with the decrypted record
async function sentDecrypt(privateKey, message, personalEncryptionKeys) {
    try {
        const keyPair = JSON.parse(privateDecrypt(privateKey, personalEncryptionKeys)); // Decrypt the encryption keys using the in-memory user private key and "Destringify" the object

        let iv = Buffer.from(keyPair.iv, 'hex');
        let encryptedText = Buffer.from(message, 'hex');

        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyPair.key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        // console.log(decrypted.toString());
        return decrypted.toString();

    } catch (err) {
        console.log("[ERROR] Cannot decrypt sent message");
        console.log(err);
    }
}

// Takes in input User Private Key, a message from the inbox table and its respective Encryption Keys and return an object with the decrypted record
async function inboxDecrypt(privateKey, message, personalEncryptionKeys) {
    try {
        const keyPair = JSON.parse(privateDecrypt(privateKey, personalEncryptionKeys)); // Decrypt the encryption keys using the in-memory user private key and "Destringify" the object

        let iv = Buffer.from(keyPair.iv, 'hex');
        let encryptedText = Buffer.from(message, 'hex');

        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyPair.key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const messageToCheck = (decrypted.toString()).split("{SIGNATURE}")[0];

        const senderPublicKey = ((decrypted.toString()).split("{END_SENDER_PUB_KEY}")[0]).split("{SENDER_PUB_KEY}")[1];

        const signature = ((decrypted.toString()).split("{END_SIGNATURE}")[0]).split("{SIGNATURE}")[1];

        const verifier = crypto.createVerify('sha256');
        verifier.update(messageToCheck);
        const verified = verifier.verify(senderPublicKey, signature, 'base64');
        if (verified) {
            return decrypted.toString();
        }
        return false;

    } catch (err) {
        console.log("[ERROR] Cannot decrypt inbox message");
        console.log(err);
    }
}

// Takes in input users' keys and a message and return an object {encMessage, signature}.
async function encryptMessage(senderPublicKey, senderPrivateKey, receiverPublicKey, emailMessage) {
    try {

        //Sign the message
        const signer = crypto.createSign('sha256');
        signer.update(emailMessage);
        const signature = signer.sign(senderPrivateKey, 'base64');

        // Concatenate message and signature
        let messageToEncrypt = emailMessage + "{SIGNATURE}" + signature + "{END_SIGNATURE}";

        // Encrypt the message using randomly generated KEY and IV
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        let encMessage = cipher.update(messageToEncrypt);
        encMessage = (Buffer.concat([encMessage, cipher.final()])).toString('hex');

        // Encrypt encryption keys using PUBLIC KEYS of sender and recipient
        let encryptionKeys = await publicEncrypt(receiverPublicKey, JSON.stringify({ key: key, iv: iv.toString('hex') }));
        let personalEncryptionKeys = await publicEncrypt(senderPublicKey, JSON.stringify({ key: key, iv: iv.toString('hex') }));

        return { encMessage: encMessage, encryptionKeys: encryptionKeys, personalEncryptionKeys: personalEncryptionKeys };
    } catch (err) {
        // console.log(err);
        console.log('[ERROR] Couldn\'t encrypt the message');
    }
}

module.exports = { encryptMessage, publicEncrypt, privateEncrypt, publicDecrypt, privateDecrypt, decryptPrivateKey, draftEncrypt, draftDecrypt, sentDecrypt, inboxDecrypt };