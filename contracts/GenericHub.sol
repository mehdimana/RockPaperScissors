pragma solidity ^0.4.21;

import "./GenericHubSubContract.sol";

contract GenericHub is Mortal, Stoppable {
    
    GenericHubSubContract[] public genericHubSubContractsArray;
    mapping(address => bool) public genericSubContractExsists;
    bytes32 public hubName;
    uint subContractCreationCost;
    
    modifier onlyIfknownSubContract(address subContractAddress) 
    {
        require(genericSubContractExsists[subContractAddress]);
        _;
    }
    
    event LogNewSubContractCreated(address creator, bytes32 name, address contractAddress);
    
    event LogSubContractKilled(address sender, address contractAddress);
    event LogSubContractRunningStateChange(address sender, address contractAddress, bool running);
    event LogOwnerChange(address owner, address newOwner);
    
    /**
     * contructor
     * @param _hubName name of thiss hub (used during event emitting)
     */
    function GenericHub(bytes32 _hubName, uint _subContractCreationCost)
            public 
    {
        hubName = _hubName;
        subContractCreationCost = _subContractCreationCost;
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
     */
    function createNewSubContract(GenericHubSubContractParameters params) 
            onlyIfrunning
            external
            payable
            returns(address newContractAddresss)
    {
        require(subContractCreationCost == msg.value); //cost of creating a contract
        GenericHubSubContract trustedGenericHubSubContract = doCreateSubContract(params);
        genericHubSubContractsArray.push(trustedGenericHubSubContract);
        genericSubContractExsists[trustedGenericHubSubContract] = true;
        emit LogNewSubContractCreated(msg.sender, hubName, trustedGenericHubSubContract);
        return trustedGenericHubSubContract;
    }
    
    function withDraw()
            accessibleByOwnerOnly
            external
            returns(bool success) 
    {
        msg.sender.transfer(address(this).balance);
        return true;
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
        emit LogOwnerChange(owner, newOwner);
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
   
}