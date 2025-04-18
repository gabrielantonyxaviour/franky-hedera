// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {StringUtils} from "@ensdomains/ens-contracts/contracts/utils/StringUtils.sol";
import "./interfaces/IL2Registry.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./interfaces/IFrankyAgentAccountImplementation.sol";

contract FrankyAgentAccountImplementation is
    ERC721Holder,
    IFrankyAgentAccountImplementation
{
    using StringUtils for string;

    string public subname;
    string public deviceNgrokUrl;
    address public owner;
    address public franky;
    address public registry;
    bool private initialized;

    /**
     * @dev Initialize the smart account with an owner
     * @param _owner The address to set as the owner
     */
    function initialize(
        string memory _subname,
        address _owner,
        address _franky,
        address _registry
    ) external {
        require(!initialized, "Already initialized");
        owner = _owner;
        franky = _franky;
        subname = _subname;
        registry = _registry;
        initialized = true;
    }

    /**
     * @dev Modifier to restrict function access to the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyFrankyOrOwner() {
        require(msg.sender == franky || msg.sender == owner, "Not authorized");
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

    function setCharacterAndUrl(
        Character memory character,
        string memory url,
        string memory avatar
    ) external onlyFrankyOrOwner {
        require(bytes(url).length > 0, "URL cannot be empty");

        if (msg.sender == owner && bytes(deviceNgrokUrl).length > 0)
            deviceNgrokUrl = url;

        bytes32 nameHash = IL2Registry(registry).namehash(
            string.concat(subname, ".frankyagent.xyz")
        );

        IL2Registry(registry).setText(
            IL2Registry(registry).namehash(
                string.concat(subname, ".frankyagent.xyz")
            ),
            "url",
            url
        );

        IL2Registry(registry).setText(nameHash, "name", character.name);

        IL2Registry(registry).setText(
            nameHash,
            "description",
            character.description
        );

        IL2Registry(registry).setText(nameHash, "avatar", avatar);

        IL2Registry(registry).setText(
            nameHash,
            "personality",
            character.personality
        );

        IL2Registry(registry).setText(nameHash, "scenario", character.scenario);

        IL2Registry(registry).setText(
            nameHash,
            "first_mes",
            character.first_mes
        );

        IL2Registry(registry).setText(
            nameHash,
            "mes_example",
            character.mes_example
        );

        IL2Registry(registry).setText(
            nameHash,
            "creatorcomment",
            character.creatorcomment
        );

        IL2Registry(registry).setText(nameHash, "tags", character.tags);

        IL2Registry(registry).setText(
            nameHash,
            "talkativeness",
            character.talkativeness
        );
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
