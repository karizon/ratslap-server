// Ratslap Server
// Copyright 2013 Geoff 'Mandrake' Harrison <mandrake@mandrake.net>
// http://mandrake.net
// All Rights Reserved

tls = require('tls');
var serverPort = 31337;


// callback for when secure connection established
function connected(stream) {
	if (stream) {
        // socket connected
    	//stream.write("GET / HTTP/1.0\n\rHost: encrypted.google.com:443\n\r\n\r");  
    } else {
    	console.log("Connection failed");
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
	console.log(data);
});

dummy.socket.addListener('error', function(error) {
	if (!dummy.connected) {
    	// socket was not connected, notify callback
		connected(null);
	}
	console.log('error internally: ' + error);
});

dummy.socket.addListener('close', function() {
	// do something
});