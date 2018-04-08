pragma solidity ^0.4.21;

import "./Owned.sol";

contract Stoppable is Owned {
   
    bool internal running;
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

    function getRunning() 
            external 
            view
            returns(bool success)
    {
        return running;
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
        if (onOff != running) {
            emit LogRunningStateChange(msg.sender, onOff);
            running = onOff;
        }
        return true;
    }
    
}
