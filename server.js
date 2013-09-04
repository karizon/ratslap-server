var tls = require('tls');
var fs = require('fs');
var bcrypt = require('bcrypt');
var rsVersion = '0.1';
var serverPort = 31337;

var gameID = 1;

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
var games = [];
var newTwoPlayer = [];
var newFourPlayer = [];

var options = {
	key: fs.readFileSync('server_key.pem'),
	cert: fs.readFileSync('server_cert.pem')
};

String.prototype.chomp = function () {
	return this.replace(/(\n|\r)+$/, '');
}

function returnErrorCode(user,type,errorString) {
	var errorJSON = {
		type: type,
		status: 'ERROR',
		message: errorString
	}
	user.remoteClient.write(JSON.stringify(errorJSON) + '\n');
}

function returnStatistics() {
    var results = {
        type:'STATISTICS',
        status: 'SUCCESS',
        clients: clients.length,
        games: games.length,
        twowaiting: newTwoPlayer.length,
        fourwaiting: newFourPlayer.length
    };
    if(clients.length > 0) {
	    console.log('System: returning statistics to all users - ' + JSON.stringify(results));
	    clients.forEach(function(user) {
	    	user.remoteClient.write(JSON.stringify(results) + '\n');
	    });
	}
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

function addPlayer(user,game,gameSize) {
	console.log('Game ' + gameID + ': Adding Player to game: ' + user.username);
	if(!game) {
		console.log('Game: Game does not exist yet');
		var players = [];
		var gameStart = new Date();
		var newGame = {
			players: players,
			gameSize: gameSize,
			started: gameStart.today() + "T" + gameStart.timeNow(),
			whoseMove: 0,
			roundsPlayed: 0,
			gameID: 0
		}
		if(gameSize == 2) {
			newTwoPlayer.push(newGame);
		} else if(gameSize == 4) {
			newFourPlayer.push(newGame);
		}
		game = newGame;
	} else {
		console.log('Game ' + gameID + ': Game already exists');
	}
	game.players.push(user);
	user.game = game;
	user.gameID = gameID;
	if(game.players.length == gameSize) {
		games.push(game);
		game.gameID = gameID;
		console.log('Game ' + gameID + ': Game is full, starting');
		if(gameSize == 2) {
			newTwoPlayer.splice(newTwoPlayer.indexOf(game),1);
		} else if(gameSize == 2) {
			newFourPlayer.splice(newFourPlayer.indexOf(game),1);
		}
		gameID = gameID + 1;
	}
	gameStatusUpdate(game);
	returnStatistics();
}	

function processJoinCommand(user,request) {
	if(request.players == 2) {
		console.log('Command: ' + user.username + ' joining 2 player game');
		addPlayer(user,newTwoPlayer[0],2)
	} else if(request.players == 4){
		console.log('Command: ' + user.username + ' joining 4 player game');
		addPlayer(user,newFourPlayer[0],4)
	} else {
		console.log('Command: ' + user.username + ' submitted bad join request');
	}
}

function processLeaveCommand(user,request) {
	console.log('Command: ' + user.username + ' left current game - ' + user.game.gameID);
	if(user.game) {
		console.log('Game ' + user.game.gameID + ': Player ' + user.username + ' has left the game');
		user.game.players.splice(user.game.players.indexOf(user),1);
		if(user.game.players.length == 1) {
			gameOverUpdate(user.game.players[0],1);
			games.splice(games.indexOf(user.game),1);
		} else {
			gameStatusUpdate(user.game);
		}
		user.game = null;
		user.gameID = 0;
	}
}

function processCardCommand(user,request) {
	console.log('Command: ' + user.username + ' played a card');
}

function processStackCommand(user,request) {
	console.log('Command: ' + user.username + ' slapped the stack');
}

function processLogoutCommand(user,request) {
	console.log('Command: ' + user.username + ' has logged out');
}

function processBootCommand(user,request) {
	console.log('Command: ' + user.username + ' voted to boot a user');
}

function assignNickname(user,request) {
	console.log('Command: ' + user.username + ' assigning new nickname: ' + request.nickname);
	user.username = request.nickname + ' (' + user.username + ')';
	user.nickname = request.nickname;
}

function gameOverUpdate(user,win) {
	console.log ('Game' + user.game.gameID + ' has ended, sending update to ' + user.username);
	var results = {
        type:'GAME',
        status: 'ENDED',
        id: user.game.gameID,
        playercount: user.game.players.length,
        size: user.game.size,
        winner: win
    };
   	user.game = null;
	user.gameID = 0;
	user.remoteClient.write(JSON.stringify(results) + '\n');
}

function gameStatusUpdate(game) {
	var results = {
        type:'GAME',
        status: 'UPDATE',
        id: game.gameID,
        playercount: game.players.length,
        size: game.size
    };
    console.log('Game ' + game.gameID + ': broadcasting game state');
    game.players.forEach(function(user) {
    	user.remoteClient.write(JSON.stringify(results) + '\n');
    });
}

var server = tls.createServer(options,function(client) {
	var user = {
		remoteAddress: client.socket.remoteAddress,
		remotePort: client.socket.remotePort,
		username: client.socket.remoteAddress + ':' + client.socket.remotePort,
		remoteClient: client,
		nickname: 'Unnamed Player',
		gameID: 0,
		game: null
	}

	console.log('Network: Adding new client: ' + user.username);
	clients.push(user);
	client.write(JSON.stringify(heloString) + '\n');
	returnStatistics();
	client.on('data', function(data) {
		var str = data.toString();
		// console.log('Network: ' + user.remoteAddress + ' sent: ' +  data.toString());
		var result = '';
		while((result = extractJSON(str))) {
			console.log('Command: User ' + user.username + ' submits: ' + JSON.stringify(result[0]));
			var newJSON = result[0];

			if(newJSON.type == 'JOIN') {
				processJoinCommand(user,newJSON);
			} else if(newJSON.type == 'PAUSE') {
				processPauseCommand(user,newJSON);
			} else if(newJSON.type == 'LEAVE') {
				processLeaveCommand(user,newJSON);
			} else if(newJSON.type == 'CARD') {
				processCardCommand(user,newJSON);
			} else if(newJSON.type == 'STACK') {
				processStackCommand(user,newJSON);
			} else if(newJSON.type == 'LOGOUT') {
				processLogoutCommand(user,newJSON);
			} else if(newJSON.type == 'BOOT') {
				processBootCommand(user,newJSON);
			} else if(newJSON.type == 'NICKNAME') {
				assignNickname(user,newJSON);
			}
			str = str.substr(0, result[1]) + str.substr(result[2]);
		}
	});

	client.on('close',function() {
		console.log('Network: closed connection from ' + user.username);
		clients.splice(clients.indexOf(user),1);
		if(user.game) {
			processLeaveCommand(user);
		}
		returnStatistics();
	});
});

server.listen(serverPort,function() {
	console.log('Server: RS v' + rsVersion + ' listening on port',server.address().port);
});
