const { ipcRenderer } = require('electron');
const appConfig = require(__dirname + '../../../config/app_config.json');

const testBtn = document.getElementById("btnTest");

/*********************************
        P2P connection
*********************************/

// const peer = new Peer({
//     secure: true, 
//     host: 'loki-mail-p2p-relay.herokuapp.com'
//   });

const peer = new Peer({
    secure: true,
    host: appConfig.p2pRelay
});

let conn;

peer.on('open', function (id) {

    console.log('Server Lookup timer stopped.');
    // console.log('My peer ID is: ' + id);
    console.log('My peer ID: ' + peer.id);
    document.getElementById('peer-ID').innerHTML = `<strong>Peer ID:</strong> ${peer.id}`;
    ipcRenderer.send('update-peer-id', peer.id);

});

peer.on('connection', function (connection) {

    if (conn == undefined) {
        conn = peer.connect(connection.peer);
        console.log('connected to: ', connection.peer);
    } else {
        console.log('connected to: ', connection.peer);
    }

    connection.on('data', function (data) {
        console.log('Received:', data);
        ipcRenderer.send('p2p-data-received', data);
    })

});

/*********************************
          IPC Renderer
*********************************/

testBtn.addEventListener('click', (e) => {
    // ipcRenderer.send('test-channel', 'I\'m here...');
    if (conn) {
        conn.send('Hello Moto');
    } else {
        console.log("No connection...")
    }
})

ipcRenderer.on('WebRTCsendMessage', (e, args) => {

    // console.log("Sending to: " + args.receiverPeerID);
    // console.log("From: " + peer.id);

    if (args.receiverPeerID != peer.id) {

        conn = peer.connect(args.receiverPeerID);
        if (conn != undefined) {

            console.log('connected to: ', conn.peer);

            conn.on('open', function () {
                // Receive messages
                conn.on('data', function (data) {
                    console.log('Received', data);
                });

                // Send messages
                // conn.send(args.encMessage);
                conn.send((args.message));
                ipcRenderer.send('p2p-info', 'Message sent');
            });

        } else {
            ipcRenderer.send('p2p-error', 'P2P connection error. Please try again.');
        }

    } else {
        console.log("I\'m not connecting to anybody...You can\'t send a message to yourself");
        ipcRenderer.send('p2p-error', 'You can\'t send a message to yourself.');
    }

});