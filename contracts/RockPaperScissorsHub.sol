pragma solidity ^0.4.21;

import "./GenericHub.sol";
import "./RockPaperScissors.sol";

contract RockPaperScissorsHub is GenericHub {

    /**
     * contructor
     * @param _hubName name of thiss hub (used during event emitting)
     */
    function RockPaperScissorsHub(bytes32 _hubName)
            public 
            GenericHub(_hubName)
    {}
    
    function doCreateSubContract(GenericHubSubContractParameters params)
            public
            returns(GenericHubSubContract createdContract) 
    {
        return new RockPaperScissors(RockPaperScissorsParameters(params));      
    }
}