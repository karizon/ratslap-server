var tls = require('tls');
var fs = require('fs');
var mysql = require ('mysql');
var bcrypt = require('bcrypt');
var config = require('./config.js');
var rsVersion = '0.1';


//For todays date;
Date.prototype.today = function(){ 
	return this.getFullYear() +"/"+ (((this.getMonth()+1) < 10)?"0":"") 
	+ (this.getMonth()+1) +"/"+  ((this.getDate() < 10)?"0":"") + this.getDate()
};

//For the time now
Date.prototype.timeNow = function(){
	return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") 
	+ this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
};
var startDate = new Date();

var heloString = {
	type: 'HELO',
	status: 'CONNECTED',
	message: 'RS Server v' + rsVersion,
	protocol: rsVersion,
	started: startDate.today() + "T" + startDate.timeNow()
};

var clients = [];

var options = {
	key: fs.readFileSync('server_key.pem'),
	cert: fs.readFileSync('server_cert.pem')
};

String.prototype.chomp = function () {
	return this.replace(/(\n|\r)+$/, '');
}

function return_error_code(user,type,error_string) {
	var error_json = {
		type: type,
		status: 'ERROR',
		message: error_string
	}
	user.remoteClient.write(JSON.stringify(error_json) + '\n');
}

function extractJSON(str) {
	// str = str.toString;
    var firstOpen, firstClose, candidate;
    firstOpen = str.indexOf('{', firstOpen + 1);
    do {
        firstClose = str.lastIndexOf('}');
        if(firstClose <= firstOpen) {
            return null;
        }
        do {
            candidate = str.substring(firstOpen, firstClose + 1);
            try {
                var res = JSON.parse(candidate);
                return [res, firstOpen, firstClose + 1];
            }
            catch(e) {
            }
            firstClose = str.substr(0, firstClose).lastIndexOf('}');
        } while(firstClose > firstOpen);
        firstOpen = str.indexOf('{', firstOpen + 1);
    } while(firstOpen != -1);
}

var server = tls.createServer(options,function(client) {
	var user = {
		remoteAddress: client.socket.remoteAddress,
		remotePort: client.socket.remotePort,
		username: client.socket.remoteAddress + ':' + client.socket.remotePort,
		remoteClient: client,
		authenticated: 1
	}

	console.log('Network: Adding new client from ' + user.remoteAddress);
	clients.push(client);
	client.write(JSON.stringify(heloString) + '\n');

	client.on('data', function(data) {
		var str = data.toString();
		// console.log('Network: ' + user.remoteAddress + ' sent: ' +  data.toString());
		var result = '';
		while((result = extractJSON(str))) {
			console.log('Command: User ' + user.username + ' submits: ' + JSON.stringify(result[0]));
			var newJSON = result[0];

			if(user.authenticated) {
				if(newJSON.type = 'GAME') {
					console.log('Command: ' + user.username + ' requesting new game');
				}
			} else {
			}
			str = str.substr(0, result[1]) + str.substr(result[2]);
		}

	});

	client.on('close',function() {
		console.log('Network: closed connection from ' + user.remoteAddress);
		clients.splice(clients.indexOf(client),1);
	});
});

server.listen(config.serverPort,function() {
	console.log('Server: RS v' + rsVersion + ' listening on port',server.address().port);
});
