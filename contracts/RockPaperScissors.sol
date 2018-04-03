pragma solidity ^0.4.21;
import "./RockPaperScissorsParameters.sol";

contract RockPaperScissors is GenericHubSubContract {
    enum GameMoves {Rock, Paper, Scissors}
    
    struct PlayerType {
        address playerAddress;
        bytes32 moveHased;
        GameMoves move;
        bool hasDeposited;
        bool hasRevealed;
        bool hasReclaimed;
    }
    
    PlayerType public player1;
    PlayerType public player2;
    
    uint public stake; //the amount each player should transfer
    bool public gameFinished; //true when the winner has reclaimed his money

    event LogWinnerRevealed(address winner, address loser, address contractAddress);
    event LogDrawRevealed(address player1, address player2, address contractAddress);
    event LogClaim(uint ammount, address winner, address contractAddress);
    event LogPlay(bytes32 move, address player, address contractAddress);
    event LogRevealed(GameMoves move, address player, address contractAddress);
    event LogGameCreated(uint stake, address player1, address player2, address contractAddress);
    
    // modifiers
    modifier gameNotFinished 
    {
        require(!gameFinished);
        _;
    }
    
    modifier gameHasStake 
    {
        require(stake > 0);
        _;
    }

    /**
     * create a move hash using 
     * - this so that the same pwd can be reused across instances of this contract, 
     * - gameHash so that a pwd can be reused accross games
     * - owner so that a pwd can be reused accross players
     * - the move
     */
    function calculateMovesHash(address owner, bytes32 pwd, GameMoves move) 
            public 
            view 
            returns(bytes32 hash) 
    {
        return keccak256(this, owner, pwd, move); 
    }
    
    /**
     * constructor: create a new game
     * @param trustedParamers needed parameters for creating this contract
     */
    function RockPaperScissors(RockPaperScissorsParameters trustedParamers) 
            public 
            onlyIfrunning 
            accessibleByOwnerOnly
    {
        require(trustedParamers.getPlayer1Address() != address(0));
        require(trustedParamers.getPlayer2Address() != address(0)); // we expect two real players.
        require(trustedParamers.getPlayer1Address() != trustedParamers.getPlayer2Address()); // we expect # players
  
        stake = trustedParamers.getStake();
        //gameFinished = false; //save gas
        player1.playerAddress = trustedParamers.getPlayer1Address();
        //players1.hasDeposited = false; //save gas
        //players1.hasReclaimed = false;  //save gas
        //players1.hasRevealed = false;  //save gas
        
        player2.playerAddress = trustedParamers.getPlayer2Address();
        //players2.hasDeposited = false; //save gas
       // players2.hasReclaimed = false; //save gas
        //players2.hasRevealed = false;  //save gas
        
        emit LogGameCreated(stake, trustedParamers.getPlayer1Address(), trustedParamers.getPlayer2Address(), this);
    }
    
    function getCallingPlayer() 
            internal 
            view 
            returns(PlayerType storage actualPlayer) 
    {
        if (player1.playerAddress == msg.sender) {
            return player1;
        } else if (player2.playerAddress == msg.sender) {
            return player2;
        } else {
            assert(false); //not expected.
        }
    }
    
    function getOtherPlayer() 
            internal 
            view 
            returns(PlayerType storage actualPlayer) 
    {
        if (player1.playerAddress == msg.sender) {
            return player2;
        } else if (player2.playerAddress == msg.sender) {
            return player1;
        } else {
            assert(false); //not expected.
        }
    }
    
    /**
     * when a game has been created, each player involved can play once (if stake > 0) the player should send the proper amount while playing
     * @param hashMove this player's move (hashed)
     * @return true if successful
     */
    function play(bytes32 hashMove) 
            external 
            payable 
            gameNotFinished
            returns(bool success) 
    {
        require(stake == msg.value); // player should transfer the proper ammount
        
        PlayerType storage actualPlayer = getCallingPlayer(); //get the current player
        require(!actualPlayer.hasDeposited);// player has not yet hasDeposited
        
        actualPlayer.moveHased = hashMove; //then he plays.
        actualPlayer.hasDeposited = true;
        emit LogPlay(hashMove, msg.sender, this);
        return true;
    }
    
    /**
     * when each player has played, each played shall reveal his move.
     * @param pwd the password used to hash the move
     * @param move the move that was hashed.
     * @return true if successful
     */
    function reveal(bytes32 pwd, GameMoves move) 
            external 
            gameNotFinished
            returns(bool success) 
    {
        PlayerType memory actualPlayer = getCallingPlayer(); //get the current player
        require(actualPlayer.hasDeposited);// player has hasDeposited
        
        PlayerType memory otherPlayer = getOtherPlayer();
        require(otherPlayer.hasDeposited);// the other player has hasDeposited
        require(!actualPlayer.hasRevealed);// player has not yet revealed
        
        bytes32 hashMove = calculateMovesHash(msg.sender, pwd, move);
        require(hashMove == actualPlayer.moveHased);// check that the pwd and move match with the previously played move.
        
        actualPlayer.move = move; //then his play is revealed.
        actualPlayer.hasRevealed = true;
        emit LogRevealed(move, msg.sender, this);
        
        //check if we have a winner
        if (otherPlayer.hasRevealed) {
            int compareResult = compare(player1.move, player2.move);
            if (compareResult == -1) { //player1 winner
                emit LogWinnerRevealed(player1.playerAddress, player2.playerAddress, this);
            } else if (compareResult == 1) { //player2 is a winner
                emit LogWinnerRevealed(player2.playerAddress, player1.playerAddress, this);
            } else { //a draw
                emit LogDrawRevealed(player1.playerAddress, player2.playerAddress, this);
            }
        }
        
        return true;
    }    

    /**
     * if there is a winner after both players have played, the winner can claim 
     * @return true if successful
     */
    function claimAsWinner()
            external 
            gameNotFinished // game should not be finished
            gameHasStake // don't claim if no stake
            returns(bool success) 
    {
        require(player1.hasRevealed 
             && player2.hasRevealed); //both players should have played already
             
        PlayerType memory actualPlayer = getCallingPlayer(); //get the current player
        require(!actualPlayer.hasReclaimed); // this player has not reclaimed already
        
        int compareResult = compare(player1.move, player2.move);   
        //sender should be the winner (if not do not call us)
        require((compareResult == -1 && player1.playerAddress == msg.sender) //sender is player1 and has Won
            ||  (compareResult == 1 && player2.playerAddress == msg.sender)); //sender is player2 and has won
  
        uint ammount = stake * 2; // this is >0 since previous require
        gameFinished = true;//avoid re-entrency and make sure the stake is send only once
        emit LogClaim(ammount, msg.sender, this); 
        msg.sender.transfer(ammount);
        return true;
    }
    
    /** 
     * if it is a draw each player involved can recover their stake
     * @return true if successful
     */
    function claimDraw() 
            external 
            gameNotFinished // game should not be finished
            gameHasStake // don't claim if no stake
            returns(bool success) 
    {
        PlayerType memory actualPlayer = getCallingPlayer(); //get the current player
        require(!actualPlayer.hasReclaimed); // this player has not reclaimed already
        PlayerType memory otherPlayer = getOtherPlayer();
        require(actualPlayer.hasRevealed 
             && otherPlayer.hasRevealed); //both players should have played already
             
        require( 0 == compare(actualPlayer.move, otherPlayer.move)); //it's a draw

        uint ammount = stake;
        actualPlayer.hasReclaimed = true; //avoir re-entrency
        if (otherPlayer.hasReclaimed) {
            gameFinished = true; // finish the game when bothe playerss have reclaimed.
        }
        
        emit LogClaim(ammount, msg.sender, this); 
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
            returns(int winner)
    {
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