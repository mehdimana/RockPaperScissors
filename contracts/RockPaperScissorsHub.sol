pragma solidity ^0.4.19;

import "./RockPaperScissors.sol";

contract RockPaperScissorsHub is Mortal, Stoppable {
    
    RockPaperScissors[] RockPaperScissorsContractsArray;
    event LogNewRockPaperScissors(address creator);

    function getRockPaperScissorsContractsArrayCount() 
            external
            view
            returns(uint count) 
    {
        return RockPaperScissorsContractsArray.length;
    }
    
    function createNewGame1() 
            public 
            returns(address newContractAddresss)
    {
        RockPaperScissors trustedRockPaperScissors = new RockPaperScissors();
        RockPaperScissorsContractsArray.push(trustedRockPaperScissors);
        LogNewRockPaperScissors(msg.sender);
        return trustedRockPaperScissors;
    }
    
    
}