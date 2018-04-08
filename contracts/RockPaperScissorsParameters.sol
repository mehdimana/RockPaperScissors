pragma solidity ^0.4.21;
import "./GenericHubSubContract.sol";

contract RockPaperScissorsParameters is GenericHubSubContractParameters {
    address private player1Address;
    address private player2Address; 
    uint private stake;
    
    function RockPaperScissorsParameters(address _player1Address, address _player2Address, uint _stake) public {
        require(_player1Address != address(0));
        require(_player2Address != address(0)); // we expect two real players.
        require(_player1Address != _player2Address); // we expect # players
        player1Address = _player1Address;
        player2Address = _player2Address;
        stake = _stake;
    }
    
    function getStake() view external returns(uint) { return stake; }
    function getPlayer1Address() view external returns(address) { return player1Address; }
    function getPlayer2Address() view external returns(address) { return player2Address; }
}