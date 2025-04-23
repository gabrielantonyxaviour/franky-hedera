// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./interfaces/IFrankyAgentAccountImplementation.sol";

contract FrankyAgentAccountImplementation is
    ERC721Holder,
    IFrankyAgentAccountImplementation
{
    string public subname;
    address public owner;
    address public franky;
    bool private initialized;

    /**
     * @dev Initialize the smart account with an owner
     * @param _owner The address to set as the owner
     */
    function initialize(
        string memory _subname,
        address _owner,
        address _franky
    ) external {
        require(!initialized, "Already initialized");
        owner = _owner;
        franky = _franky;
        subname = _subname;
        initialized = true;
    }

    /**
     * @dev Modifier to restrict function access to the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    /**
     * @dev Execute a transaction from this account
     * @param target The address to send the transaction to
     * @param value The amount of ETH to send
     * @param data The calldata to include
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (bool success) {
        (success, ) = target.call{value: value}(data);
        require(success, "Transaction execution failed");
        return success;
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
