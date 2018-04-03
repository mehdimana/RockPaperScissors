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
    
    /**
     * overides GenericHub actual creation of the contract.
     * @return RockPaperScissors contract instance
     */
    function doCreateSubContract(GenericHubSubContractParameters params)
            public
            accessibleByOwnerOnly
            onlyIfrunning
            returns(GenericHubSubContract createdContract) 
    {
        return new RockPaperScissors(RockPaperScissorsParameters(params));      
    }
}