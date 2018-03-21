pragma solidity ^0.4.19;

import "./Owned.sol";

contract Stoppable is Owned {
   
    bool public running;
    event LogRunningStateChange(bool running);
    
    function Stoppable() public {
        running = true;
    }
    
    modifier onlyIfrunning {
        require(running);
        _;
    }
    
    function runStopSwitch(bool onOff) accessibleByOwnerOnly public {
        LogRunningStateChange(onOff);
        running = onOff;
    }
    
}
