pragma solidity ^0.4.19;

contract Owned {
    address private owner;
    
    event LogOwnerChange(address owner, address newOwner);
    
    function Owned() public {
        owner = msg.sender;
        assert(owner != address(0));
    }
    
    modifier accessibleByOwnerOnly {
        require(owner == msg.sender);
        _;
    }
    
    function getOwner() public view returns(address ownerAddress) {
        return owner;
    }
    
    function setOwner(address newOwner) public accessibleByOwnerOnly {
        assert(newOwner != address(0));
        LogOwnerChange(owner, newOwner);
        owner = newOwner;
    }
}
