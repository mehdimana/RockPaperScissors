pragma solidity ^0.4.21;
import "./Mortal.sol";
import "./Stoppable.sol";

contract RockPaperScissors is Mortal, Stoppable {
    enum GameMoves {Rock, Paper, Scissors}
    
    struct PlayerType {
        address playerAddress;
        bytes32 moveHashed;
        GameMoves move;
        bool hasRevealed;
        bool hasReclaimed;
    }
    
    PlayerType public player1;
    PlayerType public player2;
    
    uint public stake; //the amount each player should transfer
    bool public gameFinished; //true when the winner has reclaimed his money
    uint public timeoutInMinutes;
    uint public clockStartedOn;

    event LogWinnerRevealed(address winner, address loser);
    event LogDrawRevealed(address player1, address player2);
    event LogClaim(uint ammount, address winner);
    event LogPlay(bytes32 move, address player);
    event LogTimeoutClockStarted(address playerRequestedToPlayOrReveal);
    event LogRevealed(GameMoves move, address player);
    event LogGameCreated(uint stake, address player1, address player2);
    
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
     * - player so that a pwd can be reused accross players
     * - the move
     */
    function calculateMovesHash(address player, bytes32 pwd, GameMoves move) 
            public 
            view 
            returns(bytes32 hash) 
    {
        return keccak256(this, player, pwd, move); 
    }
    
    /**
     * constructor: create a new game
     * @param _player1Address player1
     * @param _player2Address player2
     * @param _stake the stake of the game
     * @param _timeoutInMinutes when a first player plays, the game should finish withing this timeout
     * when one player starts playing (send funds), the clock start ticking.
     * if the timeout is reached:
     * - only one player has played --> that player can recover its stake
     * - both players have played -> the timeout is canceled.
     * 
     * if a player reveal --> the clock start ticking
     * if the timeout is reached:
     * - one player has revealed -> that player can retreive both stakes
     * - if both players have revealed, the game is finished and the timeout has no effect.
     */
    function RockPaperScissors(address _player1Address, address _player2Address, uint _stake, uint _timeoutInMinutes) 
            public 
            onlyIfrunning 
            accessibleByOwnerOnly
    { 
        require(_player1Address != address(0));
        require(_player2Address != address(0)); // we expect two real players.
        require(_player1Address != _player2Address); // we expect # players
        require(_timeoutInMinutes > 0); //or it is not possible to play
        
        timeoutInMinutes = _timeoutInMinutes;
        stake = _stake;
        //gameFinished = false; //save gas
        player1.playerAddress = _player1Address;
        //players1.hasReclaimed = false;  //save gas
        //players1.hasRevealed = false;  //save gas
        
        player2.playerAddress = _player2Address;
       // players2.hasReclaimed = false; //save gas
        //players2.hasRevealed = false;  //save gas
        
        emit LogGameCreated(stake, player1.playerAddress, player2.playerAddress);
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
            returns(PlayerType storage otherPlayer) 
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
        require(hashMove != bytes32(0));
        require(stake == msg.value); // player should transfer the proper ammount
        
        PlayerType storage actualPlayer = getCallingPlayer(); //get the current player
        require(actualPlayer.moveHashed == bytes32(0));// player has not yet hasDeposited/played
        
        actualPlayer.moveHashed = hashMove; //then he plays.
        emit LogPlay(hashMove, msg.sender);
        
        PlayerType storage otherPlayer = getOtherPlayer();
        if (otherPlayer.moveHashed == bytes32(0)) { // if other player has not yet played start the clock
            clockStartedOn = now;
            emit LogTimeoutClockStarted(otherPlayer.playerAddress);
        }
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
        PlayerType storage actualPlayer = getCallingPlayer(); //get the current player
        require(actualPlayer.moveHashed != bytes32(0));// player has hasDeposited/played
        
        PlayerType storage otherPlayer = getOtherPlayer();
        require(otherPlayer.moveHashed != bytes32(0));// the other player has hasDeposited/played
        require(!actualPlayer.hasRevealed);// player has not yet revealed
        
        bytes32 hashMove = calculateMovesHash(msg.sender, pwd, move);
        require(hashMove == actualPlayer.moveHashed);// check that the pwd and move match with the previously played move.
        
        actualPlayer.move = move; //then his play is revealed.
        actualPlayer.hasRevealed = true;
        emit LogRevealed(move, msg.sender);
        
        //check if we have a winner
        if (otherPlayer.hasRevealed) {
            int compareResult = compare(player1.move, player2.move);
            if (compareResult == -1) { //player1 winner
                emit LogWinnerRevealed(player1.playerAddress, player2.playerAddress);
            } else if (compareResult == 1) { //player2 is a winner
                emit LogWinnerRevealed(player2.playerAddress, player1.playerAddress);
            } else { //a draw
                emit LogDrawRevealed(player1.playerAddress, player2.playerAddress);
            }
        } else { // other player has not yet revealed --> sdtart clock
            clockStartedOn = now;
            emit LogTimeoutClockStarted(otherPlayer.playerAddress);
        }
        
        return true;
    }    
    
    function claimTimeoutReached()
            external
            gameNotFinished // game should not be finished
            gameHasStake // don't claim if no stake
            returns(bool success) 
    {
        PlayerType storage actualPlayer = getCallingPlayer(); //get the current player
        PlayerType storage otherPlayer = getOtherPlayer();
        if (clockStartedOn + (timeoutInMinutes * 60 seconds) > now) { //timeout reached
            if (actualPlayer.hasRevealed && !otherPlayer.hasRevealed) { 
                uint ammount = stake * 2;
                gameFinished = true;//avoid re-entrency and make sure the stake is send only once
                emit LogClaim(ammount, msg.sender); 
                msg.sender.transfer(ammount);
                return true;
            } else if (actualPlayer.moveHashed != bytes32(0) && otherPlayer.moveHashed == bytes32(0)) { //sender has played, the other player not
                gameFinished = true;//avoid re-entrency and make sure the stake is send only once
                emit LogClaim(ammount, msg.sender); 
                msg.sender.transfer(stake);
                return true;
            }
        }
        return false;
    }

    /** 
     * sender claims a draw or a win 
     * @return true if successful
     */
    function claim() 
            external 
            gameNotFinished // game should not be finished
            gameHasStake // don't claim if no stake
            returns(bool success) 
    {
        PlayerType storage actualPlayer = getCallingPlayer(); //get the current player
        require(!actualPlayer.hasReclaimed); // this player has not reclaimed already
        PlayerType storage otherPlayer = getOtherPlayer();
        require(actualPlayer.hasRevealed 
             && otherPlayer.hasRevealed); //both players should have played already
             
        int compareResult = compare(actualPlayer.move, otherPlayer.move);
        if (compareResult == 0) { //a draw
            uint ammount = stake;
            if (otherPlayer.hasReclaimed) {
                gameFinished = true; // finish the game when bothe playerss have reclaimed.
            }
        } else if (compareResult == -1) { //actual player has won
             ammount = stake * 2;
             gameFinished = true; //finish game when winner has claimed
        } else { // other player has won -> actual player cannot claim
            revert();
        }

        actualPlayer.hasReclaimed = true; //avoir re-entrency
        emit LogClaim(ammount, msg.sender); 
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