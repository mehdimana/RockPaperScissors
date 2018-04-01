pragma solidity ^0.4.21;

import "./Owned.sol";

contract Mortal is Owned {
    
    event LogContractKilled(address contractAddress);
    
    function kill() public accessibleByOwnerOnly {
        emit LogContractKilled(this);
        selfdestruct(getOwner());
    }
}