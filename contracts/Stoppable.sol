pragma solidity ^0.4.21;

import "./Owned.sol";

contract Stoppable is Owned {
   
    bool public running;
    event LogRunningStateChange(address sender, bool running);
    
    /**
     * constructor
     */
    function Stoppable() 
            public 
    {
        running = true;
    }
    
    modifier onlyIfrunning {
        require(running);
        _;
    }
    
    /**
     * switch this contract from a running state to a suspended state
     * @param onOff the new state to set
     * @return true if successful
     */
    function runStopSwitch(bool onOff) 
            accessibleByOwnerOnly 
            external 
            returns(bool success)
    {
        emit LogRunningStateChange(msg.sender, onOff);
        running = onOff;
        return true;
    }
    
}
