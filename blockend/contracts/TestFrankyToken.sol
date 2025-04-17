// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestFrankyToken is ERC20, Ownable {
    constructor(
        address initialOwner
    ) ERC20("Franky Agent", "FRANKY") Ownable(initialOwner) {}

    // Add additional functionality as needed, such as:

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }
}
