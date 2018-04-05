pragma solidity ^0.4.21;

import "./GenericHub.sol";
import "./RockPaperScissors.sol";

contract RockPaperScissorsHub is GenericHub {

    /**
     * contructor
     * @param hubName name of thiss hub (used during event emitting)
     * @param subContractCreationCost cost of creating a subcontract. can be 0.
     */
    function RockPaperScissorsHub(bytes32 hubName, uint subContractCreationCost)
            public 
            GenericHub(hubName, subContractCreationCost)
    {}
    
    /**
     * overides GenericHub actual creation of the contract.
     * @return RockPaperScissors contract instance
     */
    function doCreateSubContract(GenericHubSubContractParameters params)
            public
            onlyIfrunning
            returns(GenericHubSubContract createdContract) 
    {
        return new RockPaperScissors(RockPaperScissorsParameters(params));      
    }
}