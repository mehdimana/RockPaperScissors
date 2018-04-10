const expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");
Promise = require("bluebird");
Promise.promisifyAll(web3.eth, { suffix: "Promise" });

var RockPaperScissorsHub = artifacts.require("./RockPaperScissorsHub.sol");
var RockPaperScissors = artifacts.require("./RockPaperScissors.sol");


contract('RockPaperScissors', function(accounts) {
	var hubContractInstance;
	var owner = accounts[0];
	var player1 = accounts[1];
	var player2 = accounts[2];
	var other = accounts[3];
	var pwd = "12345678";
	
	beforeEach(function() {
		return RockPaperScissorsHub.new("myHub", 1000, {from: owner})
		.then(function(instance){
			hubContractInstance = instance;
		})
	});

	describe("test create game", () => {
		
	
		it("should create succesfully", () => {
			return hubContractInstance.createNewSubContract(player1, player2, 100, {from: other, value: 1000})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(1, txObject.logs.length);
			})
			
		});

		it("should create un-succesfully if not enought funds sent", () => {
			return expectedExceptionPromise(function () {
	                    return hubContractInstance.createNewSubContract(player1, player2, 100, {from: owner, value: 999});
	                }, 3000000);	
			
		});

		it("should create succesfully if stake is 0", () => {	
			return hubContractInstance.createNewSubContract(player1, player2, 0, {from: other, value: 1000})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(1, txObject.logs.length);
			})			
		});

		it("should not succeed if player 1 is 0", () => {	
			return hubContractInstance.createNewSubContract(0, player2, 0, {from: owner})
			.then(instance => {		
				assert.true(false);	
			}).catch(error => {
				//as expected
			})
		});

		it("should not succeed if player 2 is 0", () => {	
			return hubContractInstance.createNewSubContract(player1, 0, 0, {from: owner})
			.then(instance => {		
				assert.true(false);	
			}).catch(error => {
				//as expected
			})
		});

		it("should not succeed if player 1 is player 2", () => {	
			return hubContractInstance.createNewSubContract(player1, player1, 0, {from: owner})
			.then(instance => {		
				assert.true(false);	
			}).catch(error => {
				//as expected
			})
		});		
	});


	describe("test play", () => {
		var rpsContractInstance;
		var moveHashPlayer1;
		var moveHashPlayer2;
		beforeEach(function() {
			return hubContractInstance.createNewSubContract(player1, player2, 100, {from: owner, value: 1000})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(1, txObject.logs.length);
				rpsContractInstance = RockPaperScissors.at(txObject.logs[0].args.contractAddress);
				return rpsContractInstance.calculateMovesHash(player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return rpsContractInstance.calculateMovesHash(player2, pwd, 1);
			}).then(hash => {
				moveHashPlayer2 = hash;
			});
		});

		it("should allow player1 and player 2 to play", () => {
			return rpsContractInstance.play( moveHashPlayer1, {from: player1, value: 100})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.play( moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
			})
		});

		it("should allow player2 to play", () => {
			return rpsContractInstance.play(moveHashPlayer2, {from: player2, value: 100})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
			})
		});

		it("should not allow unknown player to play", () => {	
			return expectedExceptionPromise(function () {
                    return rpsContractInstance.play(moveHashPlayer1, {from: other, value: 100});
                }, 3000000);	
				
		});

		it("should not play successfully if stake wrong", () => {	
			return expectedExceptionPromise(function () {
                    return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 99});
                }, 3000000);	
				
		});

		it("should not allow player to play 2 times", () => {	
			return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 100})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return expectedExceptionPromise(function () {
                    return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 100});
                }, 3000000);
			})
		});

		it("should not allow unknown move", () => {	
			return rpsContractInstance.calculateMovesHash(player1, pwd, 5) //unknown move
			.then(hash => {
				moveHashPlayer1 = hash;
                return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 99});
            }).then(txObject => {
            	assert.true(false); //should never reach this code
            }).catch(error => {
            	//expected
            })
				
		});

	});

	describe("tests reveal", () => {
		var rpsContractInstance;
		var moveHashPlayer1;
		var moveHashPlayer2;
		beforeEach(function() {
			return hubContractInstance.createNewSubContract(player1, player2, 100, {from: owner, value: 1000})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(1, txObject.logs.length);
				rpsContractInstance = RockPaperScissors.at(txObject.logs[0].args.contractAddress);
				return rpsContractInstance.calculateMovesHash(player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return rpsContractInstance.calculateMovesHash(player2, pwd, 1);
			}).then(hash => {
				moveHashPlayer2 = hash;
			});
		});

		it("should not allow to reveal the wrong move", () => {
			return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 100})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.play(moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return expectedExceptionPromise(function () {
                    return rpsContractInstance.reveal(pwd, 1 , {from: player1});
                }, 3000000);
			})
		});

		it("should not allow to reveal when the other player has not played", () => {
			return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 100})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return expectedExceptionPromise(function () {
                    return rpsContractInstance.reveal(pwd, 0 , {from: player1});
                }, 3000000);
			})
		});

		it("should not allow to reveal before playing", () => {
			return expectedExceptionPromise(function () {
                    return rpsContractInstance.reveal(pwd, 0 , {from: player1});
                }, 3000000);
		});
	});


	describe("tests game with a winner", () => {
		var rpsContractInstance;
		var gameHash;
		var moveHashPlayer1;
		var moveHashPlayer2;
		beforeEach(function() {
			return hubContractInstance.createNewSubContract(player1, player2, 100, {from: owner, value: 1000})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(1, txObject.logs.length);
				rpsContractInstance = RockPaperScissors.at(txObject.logs[0].args.contractAddress);
				return rpsContractInstance.calculateMovesHash(player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return rpsContractInstance.calculateMovesHash(player2, pwd, 1);
			}).then(hash => {
				moveHashPlayer2 = hash;
				return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.play(moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.reveal(pwd, 0 , {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.reveal(pwd, 1, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
			})
		});

		it("should allow player 2 to claim", () => {
			return rpsContractInstance.claimAsWinner({from: player2})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(200, txObject.logs[0].args.ammount.toNumber());
				return rpsContractInstance.gameFinished.call({from: owner});
			}).then(gameFinished => {
				assert.strictEqual(true, gameFinished, "game should be finished");// position of the isFinished member
			});
		});

		it("should not allow player 1 to claim", () => {
			return expectedExceptionPromise(function () {
                return rpsContractInstance.claimAsWinner({from: player1});
            }, 3000000);
		});

		it("should not allow player 1 to claim a draw", () => {
			return expectedExceptionPromise(function () {
                return rpsContractInstance.claimDraw({from: player1});
            }, 3000000);
		});

		it("should not allow player 2 to claim a draw", () => {
			return expectedExceptionPromise(function () {
                return rpsContractInstance.claimDraw({from: player2});
            }, 3000000);
		});

	});

	describe("tests game with a draw", () => {
		var rpsContractInstance;
		beforeEach(function() {
			return hubContractInstance.createNewSubContract(player1, player2, 100, {from: owner, value: 1000})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(1, txObject.logs.length);
				rpsContractInstance = RockPaperScissors.at(txObject.logs[0].args.contractAddress);
				return rpsContractInstance.calculateMovesHash(player1, pwd, 0);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return rpsContractInstance.calculateMovesHash(player2, pwd, 0);
			}).then(hash => {
				moveHashPlayer2 = hash;
				return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.play(moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.reveal(pwd, 0 , {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.reveal(pwd, 0, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
			})
		});

		it("should allow both players to claim", () => {
			return rpsContractInstance.claimDraw({from: player1})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(100, txObject.logs[0].args.ammount.toNumber());
				return rpsContractInstance.gameFinished.call({from: owner});
			}).then(gameFinished => {
				assert.strictEqual(false, gameFinished, "game should be finished");// position of the isFinished member
				return rpsContractInstance.claimDraw( {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(100, txObject.logs[0].args.ammount.toNumber());
				return rpsContractInstance.gameFinished.call({from: owner});
			}).then(gameFinished => {
				assert.strictEqual(true, gameFinished, "game should be finished");// position of the isFinished member
			});
		});

		it("should not allow player to claim a win", () => {
			return expectedExceptionPromise(function () {
                return rpsContractInstance.claimAsWinner({from: player2});
            }, 3000000);
		});
	});

	describe("tests game Rock Paper scissors algorithm", () => {
		var gameHash;
		var play = function(player1Move, player2Move) {
			return hubContractInstance.createNewSubContract(player1, player2, 100, {from: owner, value: 1000})
			.then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				assert.strictEqual(1, txObject.logs.length);
				rpsContractInstance = RockPaperScissors.at(txObject.logs[0].args.contractAddress);
				return rpsContractInstance.calculateMovesHash(player1, pwd, player1Move);
			}).then(hash => {
				moveHashPlayer1 = hash;
				return rpsContractInstance.calculateMovesHash(player2, pwd, player2Move);
			}).then(hash => {
				moveHashPlayer2 = hash;
				return rpsContractInstance.play(moveHashPlayer1, {from: player1, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.play(moveHashPlayer2, {from: player2, value: 100});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.reveal(pwd, player1Move , {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
				return rpsContractInstance.reveal(pwd, player2Move, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "transaction was expected to be successfull.");
			})
		};

		it("should return scissors wins from paper", () => {
			return play(2,1).then( () => { //scissorss - paper
				return rpsContractInstance.claimAsWinner(gameHash, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "wrong player won.");
			});
		});

		it("should return paper win from rock", () => {
			return play(1,0).then( () => { //paper - rock
				return rpsContractInstance.claimAsWinner(gameHash, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "wrong player won.");
			});
		});

		it("should return rock win from scissors", () => {
			return play(0,2).then( () => { //scissors - rock
				return rpsContractInstance.claimAsWinner(gameHash, {from: player1});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "wrong player won.");
			});
		});

		it("should return paper loses from scissors", () => {
			return play(1,2).then( () => { //paper - scissorss
				return rpsContractInstance.claimAsWinner(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "wrong player won.");
			});
		});

		it("should return rocks loses from paper", () => {
			return play(0,1).then( () => { // rock - paper
				return rpsContractInstance.claimAsWinner(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "wrong player won.");
			});
		});

		it("should return scissors loses from rocks", () => {
			return play(2,0).then( () => { //rock - scissors
				return rpsContractInstance.claimAsWinner(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "wrong player won.");
			});
		});

		it("should return scissors against scissors is a draw", () => {
			return play(2,2).then( () => { //scissors 
				return rpsContractInstance.claimDraw(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "this game should be a draw.");
			});
		});

		it("should return paper against paper is a draw", () => {
			return play(1,1).then( () => { //paper 
				return rpsContractInstance.claimDraw(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "this game should be a draw.");
			});
		});

		it("should return Rock against Rock is a draw", () => {
			return play(0,0).then( () => { //rock 
				return rpsContractInstance.claimDraw(gameHash, {from: player2});
			}).then(txObject => {
				assert.strictEqual(1, parseInt(txObject.receipt.status), "this game should be a draw.");
			});
		});
	});

});