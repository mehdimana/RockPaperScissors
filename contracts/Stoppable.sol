pragma solidity ^0.4.21;

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
        emit LogRunningStateChange(onOff);
        running = onOff;
    }
    
}
