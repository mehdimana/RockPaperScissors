pragma solidity ^0.4.21;


import "./RockPaperScissors.sol";

contract RockPaperScissorsHub is Mortal, Stoppable {

    RockPaperScissors[] public rockPaperScissorsSubcontractsArray;
    mapping(address => bool) public rockPaperScissorsSubContractExists;
    
    bytes32 public hubName;
    uint subContractCreationCost;
    
    modifier onlyIfknownSubContract(address subContractAddress) 
    {
        require(rockPaperScissorsSubContractExists[subContractAddress]);
        _;
    }
    
    event LogNewSubContractCreated(address creator, bytes32 name, address contractAddress);
    
    event LogSubContractKilled(address sender, address contractAddress);
    event LogSubContractRunningStateChange(address sender, address contractAddress, bool running);
    event LogOwnerChange(address owner, address newOwner);

    /**
     * contructor
     * @param _hubName name of thiss hub (used during event emitting)
     * @param _subContractCreationCost cost of creating a subcontract. can be 0.
     */
    function RockPaperScissorsHub(bytes32 _hubName, uint _subContractCreationCost)
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
        return rockPaperScissorsSubcontractsArray.length;
    }
    
    /**
     * creates a new subcontracrt that will be managed by this hub. 
     * the created contract should derive from GenericHubSubContract 
     * @param _player1Address player1
     * @param _player2Address player2
     * @param _stake the stake of the game
     * @param _timeoutInMinutes when a first player plays, the game should finish withing this timeout
     */
    function createNewSubContract(address _player1Address, address _player2Address, uint _stake, uint _timeoutInMinutes) 
            onlyIfrunning
            external
            payable
            returns(address newContractAddresss)
    {
        require(subContractCreationCost == msg.value); //cost of creating a contract
        RockPaperScissors trustedRockPaperScissors = new RockPaperScissors(_player1Address, _player2Address, _stake, _timeoutInMinutes);
        rockPaperScissorsSubcontractsArray.push(trustedRockPaperScissors);
        rockPaperScissorsSubContractExists[trustedRockPaperScissors] = true;
        emit LogNewSubContractCreated(msg.sender, hubName, trustedRockPaperScissors);
        return trustedRockPaperScissors;
    }
    
    function withDraw()
            accessibleByOwnerOnly
            external
            returns(bool success) 
    {
        msg.sender.transfer(address(this).balance);
        return true;
    }

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