pragma solidity ^0.4.19;
import "./Mortal.sol";
import "./Stoppable.sol";

contract RockPaperScissors is Mortal, Stoppable {
    enum GameMoves {Rock, Paper, Scissors}
    
    struct PlayerType {
        bool initialized;
        bytes32 moveHased;
        GameMoves move;
        bool hasDeposited;
        bool hasRevealed;
        bool hasReclaimed;
    }
    
    struct GameType {
        uint gameNumber;
        mapping (address => PlayerType) players;
        address[] mappingsKeys;// players addresses
        uint stake; //the amount each player should transfer
        bool gameFinished; //true when the winner has reclaimed his money
    } 

    // bytes32 represents the hash of a game, GameType contains the game details.     
    mapping (bytes32 => GameType) public games;
    
    event LogWinnerRevealed(address winner, address loser, bytes32 gameHash);
    event LogDrawRevealed(address player1, address player2, bytes32 gameHash);
    event LogClaim(uint ammount, address winner, bytes32 gameHash);
    event LogPlay(bytes32 move, address player, bytes32 gameHash);
    event LogRevealed(GameMoves move, address player, bytes32 gameHash);
    event LogGameCreated(uint stake, address player1, address player2, bytes32 gameHash);
    
    /**
     * create a move hash using 
     * - this so that the same pwd can be reused across instances of this contract, 
     * - gameHash so that a pwd can be reused accross games
     * - owner so that a pwd can be reused accross players
     * - the move
     */
    function calculateMovesHash(bytes32 gameHash, address owner, bytes32 pwd, GameMoves move) public view returns(bytes32 hash) {
        return keccak256(this, gameHash, owner, pwd, move); 
    }
    
    /**
     * create a new game
     * @param gameNumber should be unique per gameNumber
     * @param player1Address first player
     * @param player2Address second player
     * @param stake can be 0.
     * @return the gameHash to be reused when playing or claiming
     */
    function createGame(uint gameNumber, address player1Address, address player2Address, uint stake) 
            external 
            onlyIfrunning 
            returns(bytes32 gameHash) {
        require(gameNumber != 0); //we reserve the value 0 to check if a structure is empty.
        require(player1Address != address(0));
        require(player2Address != address(0)); // we expect two real players.
        require(player1Address != player2Address);
        require(msg.sender == player1Address || msg.sender == player2Address); // we expect one of the player to create the game.
        
        bytes32 hash = keccak256(gameNumber, player2Address, player2Address, stake);
        require(games[hash].gameNumber == 0 || games[hash].gameFinished == true); // check that this game does not exist already or is finished.
        
        games[hash].gameNumber = gameNumber;
        games[hash].stake = stake;
        games[hash].gameFinished = false; 
        
        games[hash].players[player1Address].hasDeposited = false;
        games[hash].players[player1Address].initialized = true;
        games[hash].players[player1Address].hasReclaimed = false; 
        games[hash].players[player1Address].hasRevealed = false; 
        games[hash].mappingsKeys.push(player1Address); 
        
        games[hash].players[player2Address].hasDeposited = false;
        games[hash].players[player2Address].initialized = true;
        games[hash].players[player2Address].hasReclaimed = false;
        games[hash].players[player2Address].hasRevealed = false; 
        games[hash].mappingsKeys.push(player2Address); 
        
        LogGameCreated(stake, player1Address, player2Address, hash);
        
        return hash;
    }
    
    /**
     * when a game has been created, each player involved can play once (if stake > 0) the player should send the proper amount while playing
     * @param gameHash the game id
     * @param hashMove this player's move (hashed)
     * @return true if successful
     */
    function play(bytes32 gameHash, bytes32 hashMove) 
            external 
            payable 
            returns(bool success) {
        require(!games[gameHash].gameFinished); // game should not be finished.
        require(games[gameHash].players[msg.sender].initialized); // only player involved in the game can play.
        require(games[gameHash].stake == msg.value); // player should transfer the proper ammount
        require(!games[gameHash].players[msg.sender].hasDeposited);// player has not yet hasDeposited
        games[gameHash].players[msg.sender].moveHased = hashMove; //then he plays.
        games[gameHash].players[msg.sender].hasDeposited = true;
        LogPlay(hashMove, msg.sender, gameHash);
        return true;
    }
    
    /**
     * when each player has played, each played shall reveal his move.
     * @param gameHash the game id
     * @param pwd the password used to hash the move
     * @param move the move that was hashed.
     * @return true if successful
     */
    function reveal(bytes32 gameHash, bytes32 pwd, GameMoves move) 
            external 
            returns(bool success) {
        require(!games[gameHash].gameFinished); // game should not be finished.
        require(games[gameHash].players[msg.sender].initialized); // only player involved in the game can play.
               
        require(games[gameHash].players[msg.sender].hasDeposited);// player has hasDeposited
        address player1 = games[gameHash].mappingsKeys[0];
        address player2 = games[gameHash].mappingsKeys[1];
        address otherPlayer = msg.sender == player1 ? player2 : player1;
        require(games[gameHash].players[otherPlayer].hasDeposited);// the other player has hasDeposited
        
        require(!games[gameHash].players[msg.sender].hasRevealed);// player has not yet revealed
        
        bytes32 hashMove = calculateMovesHash(gameHash, msg.sender, pwd, move);
        require(hashMove == games[gameHash].players[msg.sender].moveHased);// check that the pwd and move match with the previously played move.
        
        games[gameHash].players[msg.sender].move = move; //then his play is revealed.
        games[gameHash].players[msg.sender].hasRevealed = true;
        LogRevealed(move, msg.sender, gameHash);
        
        //check if we have a winner
        if (games[gameHash].players[otherPlayer].hasRevealed) {
            int compareResult = compare(games[gameHash].players[player1].move, games[gameHash].players[player2].move);
            if (compareResult == -1) { //player1 winner
                LogWinnerRevealed(player1, player2, gameHash);
            } else if (compareResult == 1) { //player2 is a winner
                LogWinnerRevealed(player2, player1, gameHash);
            } else { //a draw
                LogDrawRevealed(player1, player2, gameHash);
            }
        }
        
        return true;
    }    

    /**
     * if there is a winner after both players have played, the winner can claim 
     * @param gameHash the game's id
     * @return true if successful
     */
    function claimAsWinner(bytes32 gameHash)
            external 
            returns(bool success) {
        require(games[gameHash].players[msg.sender].initialized); // only player involved in the game can request.
        address player1 = games[gameHash].mappingsKeys[0];
        address player2 = games[gameHash].mappingsKeys[1];
        require(games[gameHash].players[player1].hasRevealed 
             && games[gameHash].players[player2].hasRevealed); //both players should have played already
        require(games[gameHash].stake > 0); // don't claim if no stake
        
        int compareResult = compare(games[gameHash].players[player1].move, games[gameHash].players[player2].move);   
        //sender should be the winner (if not do not call us)
        require((compareResult == -1 && player1 == msg.sender) //sender is player1 and has Won
            ||  (compareResult == 1 && player2 == msg.sender)); //sender is player2 and has won
  
        uint ammount = games[gameHash].stake * 2; // this is >0 since previous require
        games[gameHash].gameFinished = true;//avoid re-entrency and make sure the stake is send only once
        //games[gameHash].players[msg.sender].hasReclaimed = true; //save gas
        LogClaim(ammount, msg.sender, gameHash); 
        msg.sender.transfer(ammount);
        return true;
    }
    
    /** 
     * if it is a draw each player involved can recover their stake
     * @param gameHash the game's id
     * @return true if successful
     */
    function claimDraw(bytes32 gameHash) 
            external 
            returns(bool success) {
        require(games[gameHash].players[msg.sender].initialized); // only player involved in the game can request.
        require(!games[gameHash].players[msg.sender].hasReclaimed); // this player has not reclaimed already
        
        address player1 = games[gameHash].mappingsKeys[0];
        address player2 = games[gameHash].mappingsKeys[1];
        require(games[gameHash].players[player1].hasRevealed 
             && games[gameHash].players[player2].hasRevealed); //both players should have played already
             
        require( 0 == compare(games[gameHash].players[player1].move, games[gameHash].players[player2].move)); //it's a draw
        require(games[gameHash].stake > 0); // don't claim if no stake
        uint ammount = games[gameHash].stake;
        games[gameHash].players[msg.sender].hasReclaimed = true; //avoir re-entrency
        address otherPlayer = msg.sender == player1 ? player2 : player1;
        if (games[gameHash].players[otherPlayer].hasReclaimed) {
            games[gameHash].gameFinished = true; // finish the game when bothe playerss have reclaimed.
        }
        
        LogClaim(ammount, msg.sender, gameHash); 
        msg.sender.transfer(ammount);
        
        return true;
        
    }
    
    /**
     * compares two moves
     * @param player1Move the player 1 move
     * @param player2Move the player 2 move
     * @return -1 if player1Move wins, 0 if draw, +1 if player2Move wins
     */
    function compare(GameMoves player1Move, GameMoves player2Move) 
            pure 
            private 
            returns(int winner){
        //split in multiple ifs to reduce mental load.
        if (player1Move == player2Move)
            return 0;
            
        if (player1Move == GameMoves.Rock && player2Move == GameMoves.Scissors)
            return -1; //player1Move wins
            
        if (player1Move == GameMoves.Scissors && player2Move == GameMoves.Paper)
            return -1; //player1Move wins
            
        if (player1Move == GameMoves.Paper && player2Move == GameMoves.Rock)
            return -1; //player1Move wins
            
        return 1; //player2Move wins
            
        
    }
}