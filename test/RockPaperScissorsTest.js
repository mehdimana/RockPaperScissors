const expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");
Promise = require("bluebird");
Promise.promisifyAll(web3.eth, { suffix: "Promise" });

var RockPaperScissors = artifacts.require("./RockPaperScissors.sol");

contract('RockPaperScissors', function(accounts) {
	var contractInstance;
	var owner = accounts[0];
	var player1 = accounts[1];
	var player2 = accounts[2];
	var other = accounts[3];
	var pwd = "12345678";

	beforeEach(function() {
		return RockPaperScissors.new({from: owner})
			.then(function(instance){
				contractInstance = instance;
			})
	})

	describe("test create game", () => {
		
		it("should create succesfully", () => {			
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 100, {from: player1, gas:5000000});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
			})
			
		});

		it("should create succesfully if stake is 0", () => {			
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 0, {from: player1, gas:5000000});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
			})
			
		});

		it("should not succeed if not created by one of the players", () => {			
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.createGame(1, 0, player2, 100, {from: owner, gas:5000000});
                }, 3000000);	
				
			})
			
		});
		it("should not succeed if player 1 is 0", () => {			
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.createGame(1, 0, player2, 100, {from: player1, gas:5000000});
                }, 3000000);	
				
			})
			
		});
		it("should not succeed if player 2 is 0", () => {	
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.createGame(1, player1, 0, 100, {from: player1, gas:5000000});
                }, 3000000);	
				
			})
		});

		it("should not succeed if player 1 is player 2", () => {	
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.createGame(1, player1, player1, 100, {from: player1, gas:5000000});
                }, 3000000);	
				
			})
		});

		it("should not succeed if game number is 0", () => {	
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.createGame(0, player1, player2, 100, {from: player1, gas:5000000});
                }, 3000000);	
				
			})
		});		

		it("should not succeed with existing game number", () => {	
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 100, {from: player1, gas:5000000});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return expectedExceptionPromise(function () {
                    return contractInstance.createGame(1, player1, player2, 100, {from: player1, gas:5000000});
                }, 3000000);	
			})
		});	
		
		it("should allow creation of game with an existing game number if the game is finished", () =>{
			var moveHashPlayer1;
			var moveHashPlayer2;
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 100, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				gameHash = txObject.logs[0].args.gameHash;
				return contractInstance.calculateMovesHash(gameHash, player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return contractInstance.calculateMovesHash(gameHash, player2, pwd, 1);
			}).then(hash => {
				moveHashPlayer2 = hash;
				return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.play(gameHash, moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.reveal(gameHash, pwd, 0 , {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.reveal(gameHash, pwd, 1, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.claimAsWinner(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				assert.strictEqual(200, txObject.logs[0].args.ammount.toNumber());
				return contractInstance.games(gameHash, {from: owner});
			}).then(games => {
				assert.strictEqual(true, games[2], "game should be finished");// position of the isFinished member
				return contractInstance.createGame(1, player1, player2, 100, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
			});
		})

	});

	describe("test play", () => {
		var gameHash;
		var moveHashPlayer1;
		var moveHashPlayer2;
		beforeEach(function() {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 100, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				gameHash = txObject.logs[0].args.gameHash;
				return contractInstance.calculateMovesHash(gameHash, player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return contractInstance.calculateMovesHash(gameHash, player2, pwd, 1);
			}).then(hash => {
				moveHashPlayer2 = hash;
			});
		});

		it("should allow player1 and player 2 to play", () => {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.play(gameHash, moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
			})
		});

		it("should allow player2 to play", () => {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.play(gameHash, moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
			})
		});

		it("should not allow unknown player to play", () => {	
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.play(gameHash, moveHashPlayer1, {from: other, value: 100});
                }, 3000000);	
				
			})
		});

		it("should not play successfully if stake wrong", () => {	
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 99});
                }, 3000000);	
				
			})
		});

		it("should not allow player to play 2 times", () => {	
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return expectedExceptionPromise(function () {
                    return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 100});
                }, 3000000);
			})
		});

	});

	describe("tests reveal", () => {
		var gameHash;
		var moveHashPlayer1;
		var moveHashPlayer2;
		beforeEach(function() {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 100, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				gameHash = txObject.logs[0].args.gameHash;
				return contractInstance.calculateMovesHash(gameHash, player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return contractInstance.calculateMovesHash(gameHash, player2, pwd, 1);
			}).then(hash => {
				moveHashPlayer2 = hash;
			})
		});

		it("should not allow to reveal the wrong move", () => {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.play(gameHash, 0, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.play(gameHash, 0, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return expectedExceptionPromise(function () {
                    return contractInstance.reveal(gameHash, pwd, 1 , {from: player1});
                }, 3000000);
			})
		});

		it("should not allow to reveal when the other player has not played", () => {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return expectedExceptionPromise(function () {
                    return contractInstance.reveal(gameHash, pwd, 0 , {from: player1});
                }, 3000000);
			})
		});

		it("should not allow to reveal before playing", () => {
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.reveal(gameHash, pwd, 0 , {from: player1});
                }, 3000000);	
			});
		});
	});


	describe("tests game with a winner", () => {
		var gameHash;
		var moveHashPlayer1;
		var moveHashPlayer2;
		beforeEach(function() {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 100, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				gameHash = txObject.logs[0].args.gameHash;
				return contractInstance.calculateMovesHash(gameHash, player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return contractInstance.calculateMovesHash(gameHash, player2, pwd, 1);
			}).then(hash => {
				moveHashPlayer2 = hash;
				return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.play(gameHash, moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.reveal(gameHash, pwd, 0 , {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.reveal(gameHash, pwd, 1, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
			})
		});

		it("should allow player 2 to claim", () => {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.claimAsWinner(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				assert.strictEqual(200, txObject.logs[0].args.ammount.toNumber());
				return contractInstance.games(gameHash, {from: owner});
			}).then(games => {
				assert.strictEqual(true, games[2], "game should be finished");// position of the isFinished member
			});
		});

		it("should not allow player 1 to claim", () => {
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.claimAsWinner(gameHash, {from: player1});
                }, 3000000);
			})
		});

		it("should not allow player 1 to claim a draw", () => {
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.claimDraw(gameHash, {from: player1});
                }, 3000000);
			})
		});

		it("should not allow player 2 to claim a draw", () => {
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.claimDraw(gameHash, {from: player2});
                }, 3000000);
			})
		});

	});

	describe("tests game with a draw", () => {
		var gameHash;
		beforeEach(function() {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 100, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				gameHash = txObject.logs[0].args.gameHash;
				return contractInstance.calculateMovesHash(gameHash, player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return contractInstance.calculateMovesHash(gameHash, player2, pwd, 0);
			}).then(hash => {
				moveHashPlayer2 = hash;
				return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.play(gameHash, moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.reveal(gameHash, pwd, 0 , {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.reveal(gameHash, pwd, 0, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
			})
		});

		it("should allow both playerss to claim", () => {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.claimDraw(gameHash, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				assert.strictEqual(100, txObject.logs[0].args.ammount.toNumber());
				return contractInstance.games(gameHash, {from: owner});
			}).then(games => {
				assert.strictEqual(false, games[2], "game should be finished");// position of the isFinished member
				return contractInstance.claimDraw(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				assert.strictEqual(100, txObject.logs[0].args.ammount.toNumber());
				return contractInstance.games(gameHash, {from: owner});
			}).then(games => {
				assert.strictEqual(true, games[2], "game should be finished");// position of the isFinished member
			});
		});

		it("should not allow player to claim a win", () => {
			return RockPaperScissors.deployed().then( () => {
				return expectedExceptionPromise(function () {
                    return contractInstance.claimAsWinner(gameHash, {from: player2});
                }, 3000000);
			})
		});
	});

	describe("tests game Rock Paper scissors algorithm", () => {
		var gameHash;
		var play = function(player1Move, player2Move) {
			return RockPaperScissors.deployed().then( () => {
				return contractInstance.createGame(1, player1, player2, 100, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				gameHash = txObject.logs[0].args.gameHash;
				return contractInstance.calculateMovesHash(gameHash, player1, pwd, player1Move);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return contractInstance.calculateMovesHash(gameHash, player2, pwd, player2Move);
			}).then(hash => {
				moveHashPlayer2 = hash;
				return contractInstance.play(gameHash, moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.play(gameHash, moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.reveal(gameHash, pwd, player1Move , {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
				return contractInstance.reveal(gameHash, pwd, player2Move, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "transaction was expected to be successfull.");
			});
		};

		it("should return scissors wins from paper", () => {
			return play(2,1).then( () => { //scissorss - paper
				return contractInstance.claimAsWinner(gameHash, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "wrong player won.");
			});
		});

		it("should return paper win from rock", () => {
			return play(1,0).then( () => { //paper - rock
				return contractInstance.claimAsWinner(gameHash, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "wrong player won.");
			});
		});

		it("should return rock win from scissors", () => {
			return play(0,2).then( () => { //scissors - rock
				return contractInstance.claimAsWinner(gameHash, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "wrong player won.");
			});
		});

		it("should return paper loses from scissors", () => {
			return play(1,2).then( () => { //paper - scissorss
				return contractInstance.claimAsWinner(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "wrong player won.");
			});
		});

		it("should return rocks losess from paper", () => {
			return play(0,1).then( () => { // rock - paper
				return contractInstance.claimAsWinner(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "wrong player won.");
			});
		});

		it("should return scissors loses from rocks", () => {
			return play(2,0).then( () => { //rock - scissors
				return contractInstance.claimAsWinner(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "wrong player won.");
			});
		});

		it("should return scissors against scissors is a draw", () => {
			return play(2,2).then( () => { //scissors 
				return contractInstance.claimDraw(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "this game should be a draw.");
			});
		});

		it("should return paper against paper is a draw", () => {
			return play(1,1).then( () => { //paper 
				return contractInstance.claimDraw(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "this game should be a draw.");
			});
		});

		it("should return Rock against Rock is a draw", () => {
			return play(0,0).then( () => { //rock 
				return contractInstance.claimDraw(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, txObject.receipt.status, "this game should be a draw.");
			});
		});
	});

});