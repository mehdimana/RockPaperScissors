pragma solidity ^0.4.21;

import "./GenericHubSubContract.sol";

contract GenericHub is Mortal, Stoppable {
    
    GenericHubSubContract[] genericHubSubContractsArray;
    event LogNewSubContractCreated(bytes32 name, address creator);
    bytes32 hubName;
    
    /**
     * contructor
     * @param _hubName name of thiss hub (used during event emitting)
     */
    function GenericHub(bytes32 _hubName)
            public 
    {
        hubName = _hubName;
    }

    /**
     * @return the number of subcontract managed by this hubName 
     */
    function getRockPaperScissorsContractsArrayCount() 
            external
            view
            accessibleByOwnerOnly
            onlyIfrunning
            returns(uint count) 
    {
        return genericHubSubContractsArray.length;
    }
    
    /**
     * creates a new subcontracrt that will be managed by this hub. 
     * the created contract should derive from GenericHubSubContract 
     */
    function createNewSubContract(GenericHubSubContractParameters params) 
            public 
            accessibleByOwnerOnly
            onlyIfrunning
            returns(address newContractAddresss)
    {
        GenericHubSubContract trustedGenericHubSubContract = doCreateSubContract(params);
        genericHubSubContractsArray.push(trustedGenericHubSubContract);
        emit LogNewSubContractCreated(hubName, msg.sender);
        return trustedGenericHubSubContract;
    }
    
    /**
     * interface function to be implemented by children of this hub contract
     * @return a contract deriving from GenericHubSubContract
     */
    function doCreateSubContract(GenericHubSubContractParameters params)
            public
            returns(GenericHubSubContract createdContract);
    
    /**
     * disables/enables a sub contract
     * @param onOff true or false (true --> enable, false --> disable)
     * @param index the index of the contract to enable/disable
     * return true if successful
     */
    function runStopSwitchForSubContract(bool onOff, uint index) 
            accessibleByOwnerOnly
            onlyIfrunning
            public 
            returns(bool success)
    {
        genericHubSubContractsArray[index].runStopSwitch(onOff);
        return true;
    }
    
    /**
     * disables/enables all sub contracts 
     * @param onOff true or false (true --> enable, false --> disable)
     * return true if successful
     */ 
    function runStopSwitchForAllSubContracts(bool onOff) 
            accessibleByOwnerOnly
            onlyIfrunning
            public 
            returns(bool success)
    {
        for (uint i=0; i<genericHubSubContractsArray.length; i++) {
            genericHubSubContractsArray[i].runStopSwitch(onOff);
        }
        return true;
    }
    
    /**
     * kills a sub contract
     * @param index the index of the contract to kill
     * return true if successful
     */
    function killSubContract(uint index) 
            public 
            accessibleByOwnerOnly
            onlyIfrunning
            returns(bool success)
    {
        genericHubSubContractsArray[index].kill();
        return true;
    }
    
    /**
     * kills all sub contract
     * return true if successful
     */
    function killAllSubContracts() 
            public 
            accessibleByOwnerOnly
            onlyIfrunning
            returns(bool success)
    {
        for (uint i=0; i<genericHubSubContractsArray.length; i++) {
            genericHubSubContractsArray[i].kill();
        }
        return true;
    }
}