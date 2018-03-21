pragma solidity ^0.4.19;

import "./Owned.sol";

contract Mortal is Owned {
    function kill() public accessibleByOwnerOnly {
        selfdestruct(getOwner());
    }
}