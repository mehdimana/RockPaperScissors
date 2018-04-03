pragma solidity ^0.4.21;

import "./Owned.sol";

contract Mortal is Owned {
    
    event LogContractKilled(address sender, address contractAddress);
    
    /**
     * self destruct this contractAddress
     * only available to getOwne
     * @return true if successful
     */
    function kill() 
            public 
            accessibleByOwnerOnly
            returns(bool success)
    {
        emit LogContractKilled(msg.sender, this);
        selfdestruct(getOwner());
        return true;
    }
}