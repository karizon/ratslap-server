var tls = require('tls');
var fs = require('fs');
var bcrypt = require('bcrypt');
var rsVersion = '0.1';
var serverPort = 31337;

var gameID = 1;
var playerID = 1;

var standardDeck = [
{type: 'CARD', suit: 'heart', face: 'A'},
{type: 'CARD', suit: 'heart', face: '2'},
{type: 'CARD', suit: 'heart', face: '3'},
{type: 'CARD', suit: 'heart', face: '4'},
{type: 'CARD', suit: 'heart', face: '5'},
{type: 'CARD', suit: 'heart', face: '6'},
{type: 'CARD', suit: 'heart', face: '7'},
{type: 'CARD', suit: 'heart', face: '8'},
{type: 'CARD', suit: 'heart', face: '9'},
{type: 'CARD', suit: 'heart', face: '10'},
{type: 'CARD', suit: 'heart', face: 'J'},
{type: 'CARD', suit: 'heart', face: 'Q'},
{type: 'CARD', suit: 'heart', face: 'K'},

{type: 'CARD', suit: 'spade', face: 'A'},
{type: 'CARD', suit: 'spade', face: '2'},
{type: 'CARD', suit: 'spade', face: '3'},
{type: 'CARD', suit: 'spade', face: '4'},
{type: 'CARD', suit: 'spade', face: '5'},
{type: 'CARD', suit: 'spade', face: '6'},
{type: 'CARD', suit: 'spade', face: '7'},
{type: 'CARD', suit: 'spade', face: '8'},
{type: 'CARD', suit: 'spade', face: '9'},
{type: 'CARD', suit: 'spade', face: '10'},
{type: 'CARD', suit: 'spade', face: 'J'},
{type: 'CARD', suit: 'spade', face: 'Q'},
{type: 'CARD', suit: 'spade', face: 'K'},

{type: 'CARD', suit: 'club', face: 'A'},
{type: 'CARD', suit: 'club', face: '2'},
{type: 'CARD', suit: 'club', face: '3'},
{type: 'CARD', suit: 'club', face: '4'},
{type: 'CARD', suit: 'club', face: '5'},
{type: 'CARD', uit: 'club', face: '6'},
{type: 'CARD', suit: 'club', face: '7'},
{type: 'CARD', suit: 'club', face: '8'},
{type: 'CARD', suit: 'club', face: '9'},
{type: 'CARD', suit: 'club', face: '10'},
{type: 'CARD', suit: 'club', face: 'J'},
{type: 'CARD', suit: 'club', face: 'Q'},
{type: 'CARD', suit: 'club', face: 'K'},

{type: 'CARD', suit: 'diamond', face: 'A'},
{type: 'CARD', suit: 'diamond', face: '2'},
{type: 'CARD', suit: 'diamond', face: '3'},
{type: 'CARD', suit: 'diamond', face: '4'},
{type: 'CARD', suit: 'diamond', face: '5'},
{type: 'CARD', suit: 'diamond', face: '6'},
{type: 'CARD', suit: 'diamond', face: '7'},
{type: 'CARD', suit: 'diamond', face: '8'},
{type: 'CARD', suit: 'diamond', face: '9'},
{type: 'CARD', suit: 'diamond', face: '10'},
{type: 'CARD', suit: 'diamond', face: 'J'},
{type: 'CARD', suit: 'diamond', face: 'Q'},
{type: 'CARD', suit: 'diamond', face: 'K'},
];

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
	    // console.log('System: returning statistics to all users - ' + JSON.stringify(results));
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

function shuffle (array, random) {
  var i = array.length, j, swap;
  while (--i) {
    j = Math.random() * (i + 1) | 0;
    swap = array[i];
    array[i] = array[j];
    array[j] = swap;
  }
  return array;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function dealCardsToRemainingPlayers(game, cards) {
	var currentPlayer = 0;
	cards.forEach(function(card) {
		game.players[currentPlayer].cards.push(card);
		currentPlayer = currentPlayer + 1;
		if(currentPlayer == game.players.length) {
			currentPlayer = 0;
		}
	});
}

function announceCurrentRound(game) {
	var handSizes = [];
	var position = 1;
	game.players.forEach(function(player) {
		var hand = {
			position: position++,
			size: player.cards.length
		}
		handSizes.push(hand);
	});
    var results = {
        type:'ROUND',
        status: 'UPDATE',
        handSizes: handSizes,
        currentPlayer: game.whoseMove
	};
    game.players.forEach(function(user) {
    	user.remoteClient.write(JSON.stringify(results) + '\n');
    });

}

function startGame(game) {
	// Shuffle the Deck.
	var newDeck = standardDeck.slice(0);
	newDeck = shuffle(newDeck);
	// Deal cards to all players
	dealCardsToRemainingPlayers(game,newDeck);
	// Pick random player to start
	game.whoseMove = getRandomInt(1,game.players.length);
	// Announce deck sizes + current player (begin play!)
	announceCurrentRound(game);
}

function addPlayer(user,game,gameSize) {
	console.log('Game ' + gameID + ': Adding Player to game: ' + user.username);
	if(!game) {
		console.log('Game ' + gameID + ': initialized');
		var players = [];
		var gameStart = new Date();
		var centerPile = [];
		var newGame = {
			players: players,
			gameSize: gameSize,
			started: gameStart.today() + "T" + gameStart.timeNow(),
			whoseMove: 0,
			roundsPlayed: 0,
			gameID: 0,
			centerPile: centerPile
		}
		if(gameSize == 2) {
			newTwoPlayer.push(newGame);
		} else if(gameSize == 4) {
			newFourPlayer.push(newGame);
		}
		game = newGame;
	}
	game.players.push(user);
	user.game = game;
	if(game.players.length == gameSize) {
		games.push(game);
		game.gameID = gameID;
		console.log('Game ' + gameID + ': Full, starting');
		if(gameSize == 2) {
			newTwoPlayer.splice(newTwoPlayer.indexOf(game),1);
		} else if(gameSize == 4) {
			newFourPlayer.splice(newFourPlayer.indexOf(game),1);
		}
		gameID = gameID + 1;
		gameStatusUpdate(game,'GAMESTART');
		startGame(game);
	} else {
		gameStatusUpdate(game,'NEWPLAYER');	
	}
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
	if(user.game) {
		// console.log('Command: ' + user.username + ' left current game - ' + user.game.gameID);
		if(user.game) {
			console.log('Game ' + user.game.gameID + ': Player ' + user.username + ' has left the game');
			user.game.players.splice(user.game.players.indexOf(user),1);
			if(user.game.players.length == 1) {
				if(user.game.gameID != 0) {
					gameOverUpdate(user.game.players[0],1);
					games.splice(games.indexOf(user.game),1);
				}  else {
					gameStatusUpdate(user.game,'PLAYERPART');
				}
				returnStatistics();
			} else if(user.game.players.length == 0) {
				console.log('Game ' + user.game.gameID + ': No players waiting to play, abandoning');
				if(user.game.gameID == 0) {
					if(user.game.gameSize == 2) {
						newTwoPlayer.splice(newTwoPlayer.indexOf(user.game),1);
					} else if(user.game.gameSize == 4) {
						newFourPlayer.splice(newFourPlayer.indexOf(user.game),1);
					}
				} else {
					games.splice(games.indexOf(user.game),1);
				}
				returnStatistics();
			} else {
				gameStatusUpdate(user.game,'PLAYERPART');
			}
			user.game = null;
			user.cards = [];
		}
	}
}

function processCardCommand(user,request) {
	if(user.game) {
		if(request.status == 'stack') {
			var userNum = user.game.players.indexOf(user);
			userNum += 1;
			if(user.game.whoseMove == userNum) {
				var newCard = user.cards.shift();
				console.log('Command: ' + user.username + ' played a card - ' +
					JSON.stringify(newCard));
				user.game.centerPile.push(newCard);
			    user.game.players.forEach(function(localUser) {
			    	localUser.remoteClient.write(JSON.stringify(newCard) + '\n');
			    });
			} else {
				console.log('Command: ' + user.username + ' attempted to play a card but not his turn!');
			}
		} else {
			console.log('Command: ' + user.username + ' slapped the pile');
		}
	}
}

function processBootCommand(user,request) {
	console.log('Command: ' + user.username + ' voted to boot a user');
}

function assignNickname(user,request) {
	console.log('Command: ' + user.username + ' assigning new nickname: ' + request.nickname);
	user.username = request.nickname + ' (' + user.username + ')';
	user.nickname = request.nickname;
	if(user.game) {
		gameStatusUpdate(user.game,'NICKNAMECHANGE');
	}
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
   	user.cards = [];
	user.remoteClient.write(JSON.stringify(results) + '\n');
}

function gameStatusUpdate(game,status) {
	var playerNames = [];
	var i=1;
	game.players.forEach(function(user) {
		var newPlayer = {
			position: i,
			name: user.nickname
		}
		playerNames.push(newPlayer);
		i++;
	});
	var results = {
        type:'GAME',
        status: status,
        gameID: game.gameID,
        playerCount: game.players.length,
        gameSize: game.gameSize,
        position: game.players.length,
        playerNames: playerNames
    };
    console.log('Game ' + game.gameID + ': broadcasting game state');
    game.players.forEach(function(user) {
    	results.position = game.players.indexOf(user) + 1;
    	user.remoteClient.write(JSON.stringify(results) + '\n');
    });
}

var server = tls.createServer(options,function(client) {
	var playerCards = [];
	var user = {
		remoteAddress: client.socket.remoteAddress,
		remotePort: client.socket.remotePort,
		username: client.socket.remoteAddress + ':' + client.socket.remotePort,
		remoteClient: client,
		nickname: 'Unnamed Player',
		game: null,
		playerID: playerID,
		cards: playerCards
	}

	playerID = playerID + 1;

	console.log('Network: Adding new client: ' + user.username);
	clients.push(user);
	client.write(JSON.stringify(heloString) + '\n');
	returnStatistics();
	client.on('data', function(data) {
		var str = data.toString();
		// console.log('Network: ' + user.remoteAddress + ' sent: ' +  data.toString());
		var result = '';
		while((result = extractJSON(str))) {
			// console.log('Command: User ' + user.username + ' submits: ' + JSON.stringify(result[0]));
			var newJSON = result[0];

			if(newJSON.type == 'JOIN') {
				processJoinCommand(user,newJSON);
			} else if(newJSON.type == 'LEAVE') {
				processLeaveCommand(user,newJSON);
			} else if(newJSON.type == 'CARD') {
				processCardCommand(user,newJSON);
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
