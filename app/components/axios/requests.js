const axios = require('axios')

async function loginRequest(url, parameters) {

    const params = new URLSearchParams();
    params.append('username', parameters.username);
    params.append('password', parameters.password);

    return (await axios.post(url, params)).data;
}

async function getUserRequest(url, parameters) {

    const params = new URLSearchParams();
    params.append('sessionToken', parameters.sessionToken);
    params.append('emailAddress', parameters.emailAddress);

    return (await axios.post(url, params)).data;
}

async function updatePeerID(url, parameters) {
    const params = new URLSearchParams();
    params.append('userID', parameters.userID);
    params.append('sessionToken', parameters.sessionToken);
    params.append('peerID', parameters.peerID);

    return (await axios.post(url, params)).data;
}

module.exports = { loginRequest, getUserRequest, updatePeerID };