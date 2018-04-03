pragma solidity ^0.4.21;

import "./GenericHubSubContract.sol";

contract GenericHub is Mortal, Stoppable {
    
    GenericHubSubContract[] public genericHubSubContractsArray;
    mapping(address => bool) public genericSubContractExsists;
    bytes32 public hubName;
    
    modifier onlyIfknownSubContract(address subContractAddress) 
    {
        require(genericSubContractExsists[subContractAddress]);
        _;
    }
    
    event LogNewSubContractCreated(address creator, bytes32 name, address contractAddress);
    
    event LogSubContractKilled(address sender, address contractAddress);
    event LogSubContractRunningStateChange(address sender, address contractAddress, bool running);
    event LogOwnerChange(address sender, address owner, address newOwner);
    
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
            returns(uint count) 
    {
        return genericHubSubContractsArray.length;
    }
    
    /**
     * creates a new subcontracrt that will be managed by this hub. 
     * the created contract should derive from GenericHubSubContract 
     * TODO make it callable by other people and payable (costs something to create a subcontract --> configurable)
     * TODO add a function to retrieve eth by owner
     */
    function createNewSubContract(GenericHubSubContractParameters params) 
            accessibleByOwnerOnly
            onlyIfrunning
            external
            returns(address newContractAddresss)
    {
        GenericHubSubContract trustedGenericHubSubContract = doCreateSubContract(params);
        genericHubSubContractsArray.push(trustedGenericHubSubContract);
        genericSubContractExsists[trustedGenericHubSubContract] = true;
        emit LogNewSubContractCreated(msg.sender, hubName, trustedGenericHubSubContract);
        return trustedGenericHubSubContract;
    }
    
    /**
     * interface function to be implemented by children of this hub contract
     * @return a contract deriving from GenericHubSubContract
     */
    function doCreateSubContract(GenericHubSubContractParameters params)
            accessibleByOwnerOnly
            onlyIfrunning
            public
            returns(GenericHubSubContract createdContract);
    
    // Pass-through admin controls
    
    /**
     * change owner
     * @param newOwner the new owner
     * @return true if call successful
     */
    function changeOwner(address newOwner) 
            accessibleByOwnerOnly
            external
            returns(bool success)
    {
        require(newOwner != address(0));
        emit LogOwnerChange(msg.sender, getOwner(), newOwner);
        return setOwner(newOwner);
    }
    
    /**
     * disables/enables a sub contract
     * @param onOff true or false (true --> enable, false --> disable)
     * @param subContractAddress the subContract to enable/disable
     * return true if successful
     */
    function runStopSwitchForSubContract(bool onOff, address subContractAddress) 
            accessibleByOwnerOnly
            onlyIfknownSubContract(subContractAddress)
            external 
            returns(bool success)
    {
        Stoppable stoppable = Stoppable(subContractAddress);
        emit LogSubContractRunningStateChange(msg.sender, stoppable, onOff);
        return stoppable.runStopSwitch(onOff);
    }
    
    /**
     * disables/enables all sub contracts  --> emergency call, to be used with care since the number of subContract is unknow
     * could fail (cost too much gas)
     * safe: only accesssible by owner.
     * @param onOff true or false (true --> enable, false --> disable)
     * return true if successful
     */ 
    function runStopSwitchForAllSubContracts(bool onOff) 
            accessibleByOwnerOnly
            external 
            returns(bool success)
    {
        for (uint i=0; i<genericHubSubContractsArray.length; i++) {
            genericHubSubContractsArray[i].runStopSwitch(onOff);
            emit LogSubContractRunningStateChange(msg.sender, genericHubSubContractsArray[i], onOff);
        }
        return true;
    }
    
    /**
     * kills a sub contract
     * @param subContractAddress the subContract to kill
     * @return true if successful
     */
    function killSubContract(address subContractAddress) 
            accessibleByOwnerOnly
            onlyIfknownSubContract(subContractAddress)
            external
            returns(bool success)
    {
        Mortal mortal = Mortal(subContractAddress);
        emit LogSubContractKilled(msg.sender, subContractAddress);
        return mortal.kill();
    }
    
    /**
     * kills all sub contracts --> emergency call, to be used with care since the number of subContract is unknow
     * could fail (cost too much gas)
     * safe: only accesssible by owner.
     * @return true if successful
     */
    function killAllSubContracts() 
            accessibleByOwnerOnly
            external
            returns(bool success)
    {
        for (uint i=0; i<genericHubSubContractsArray.length; i++) {
            emit LogSubContractKilled(msg.sender, genericHubSubContractsArray[i]);
            genericHubSubContractsArray[i].kill();
        }
        return true;
    }
    
    
    /**
     * kills nbSubContractsToKill sub contracts starting from the begining of the contract array --> emergency call, to be used with care.
     * could fail (cost too much gas --> adjust nbSubContractsToKill accordingly)
     * safe: only accesssible by owner.
     * @return true if successful
     */
    function killSubContracts(uint nbSubContractsToKill) 
            accessibleByOwnerOnly
            external
            returns(bool success)
    {
        for (uint i=0; i<genericHubSubContractsArray.length || i<nbSubContractsToKill; i++) {
            emit LogSubContractKilled(msg.sender, genericHubSubContractsArray[i]);
            genericHubSubContractsArray[i].kill();
        }
        return true;
    }    
}