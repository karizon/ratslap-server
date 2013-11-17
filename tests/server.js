// Ratslap Server
// Copyright 2013 Geoff 'Mandrake' Harrison <mandrake@mandrake.net>
// http://mandrake.net
// All Rights Reserved

tls = require('tls');
var serverPort = 31337;

console.log('TEST: Basic Server Connectivity');
// callback for when secure connection established
function connected(stream) {
	if (stream) {
    } else {
    	console.log("FAIL: Connection failed");
    	process.exit(-1);
    }
}

// needed to keep socket variable in scope
var dummy = this;

// try to connect to the server
var options = {
	rejectUnauthorized: false
};

dummy.socket = tls.connect(serverPort, 'localhost', options, function() {
    // callback called only after successful socket connection
    dummy.connected = true;
    dummy.socket.setEncoding('utf-8');
	console.log(dummy.socket.authorizationError);
    connected(dummy.socket);
});

dummy.socket.addListener('data', function(data) {
	// received data
	// console.log(data);
	var obj = JSON.parse(data);
	if((obj.type == 'STATISTICS') && (obj.status == 'SUCCESS')) {
		console.log('PASS: Server successfully transmitted statistics');
		process.exit(0);
	}
});

dummy.socket.addListener('error', function(error) {
	if (!dummy.connected) {
    	// socket was not connected, notify callback
    	console.log('FAIL: Connection Failed');
		process.exit(-1)
	}
	console.log('FAIL: ' + error);
	process.exit(-1);
});

dummy.socket.addListener('close', function() {
	console.log('FAIL: Server dropped connection')
	process.exit(-1);
	// do something
});