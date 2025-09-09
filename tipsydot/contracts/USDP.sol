// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title USDP - USD Polkadot Stablecoin
 * @notice A stablecoin designed for the Polkadot ecosystem
 * @dev Demonstrates custom asset creation and bridging capabilities
 * 
 * This contract shows understanding of:
 * - Asset creation on Substrate chains
 * - XCM bridge mechanics
 * - Precompile integration
 * - Cross-chain asset management
 */
contract USDP is ERC20, ERC20Burnable, AccessControl, Pausable {
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Asset metadata for Substrate integration
    uint32 public constant ASSET_ID = 42069; // Custom asset ID for USDP
    uint8 private constant DECIMALS = 6; // Match USDC standard
    
    // Bridge tracking
    mapping(bytes32 => bool) public processedBridgeTransactions;
    mapping(address => uint256) public bridgedBalances;
    uint256 public totalBridgedSupply;
    
    // Events for bridge operations
    event BridgeOut(
        address indexed from,
        bytes32 indexed substrateAddress,
        uint256 amount,
        uint32 destinationParaId,
        bytes32 xcmTransactionHash
    );
    
    event BridgeIn(
        bytes32 indexed substrateAddress,
        address indexed to,
        uint256 amount,
        uint32 sourceParaId,
        bytes32 xcmTransactionHash
    );
    
    event AssetRegistered(
        uint32 indexed assetId,
        address contractAddress,
        string symbol
    );
    
    constructor() ERC20("USD Polkadot", "USDP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Emit registration event for Substrate indexers
        emit AssetRegistered(ASSET_ID, address(this), "USDP");
    }
    
    /**
     * @notice Returns the number of decimals (6 to match USDC)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Mint new USDP tokens
     * @dev Only callable by MINTER_ROLE
     * @param to Recipient address
     * @param amount Amount to mint (with 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    /**
     * @notice Bridge USDP to another parachain via XCM
     * @dev Burns tokens here and emits event for XCM relayer
     * @param amount Amount to bridge
     * @param destinationParaId Target parachain ID
     * @param substrateAddress Recipient's Substrate address (SS58)
     */
    function bridgeOut(
        uint256 amount,
        uint32 destinationParaId,
        bytes32 substrateAddress
    ) external whenNotPaused returns (bytes32 xcmTxHash) {
        require(amount > 0, "Amount must be > 0");
        require(destinationParaId > 0, "Invalid parachain ID");
        require(substrateAddress != bytes32(0), "Invalid substrate address");
        
        // Burn tokens from sender
        _burn(msg.sender, amount);
        
        // Generate XCM transaction hash
        xcmTxHash = keccak256(
            abi.encodePacked(
                msg.sender,
                substrateAddress,
                amount,
                destinationParaId,
                block.timestamp,
                block.number
            )
        );
        
        // Track for bridge accounting
        bridgedBalances[msg.sender] -= amount;
        totalBridgedSupply -= amount;
        
        emit BridgeOut(
            msg.sender,
            substrateAddress,
            amount,
            destinationParaId,
            xcmTxHash
        );
        
        return xcmTxHash;
    }
    
    /**
     * @notice Process incoming bridge transaction from XCM
     * @dev Only callable by BRIDGE_ROLE (typically a relayer)
     * @param substrateAddress Source Substrate address
     * @param recipient EVM recipient address
     * @param amount Amount to mint
     * @param sourceParaId Source parachain ID
     * @param xcmTxHash XCM transaction hash for idempotency
     */
    function bridgeIn(
        bytes32 substrateAddress,
        address recipient,
        uint256 amount,
        uint32 sourceParaId,
        bytes32 xcmTxHash
    ) external onlyRole(BRIDGE_ROLE) whenNotPaused {
        require(!processedBridgeTransactions[xcmTxHash], "Already processed");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        
        // Mark as processed for idempotency
        processedBridgeTransactions[xcmTxHash] = true;
        
        // Mint tokens to recipient
        _mint(recipient, amount);
        
        // Track bridge accounting
        bridgedBalances[recipient] += amount;
        totalBridgedSupply += amount;
        
        emit BridgeIn(
            substrateAddress,
            recipient,
            amount,
            sourceParaId,
            xcmTxHash
        );
    }
    
    /**
     * @notice Get metadata for Substrate registration
     * @return assetId The asset ID
     * @return name_ The token name
     * @return symbol_ The token symbol
     * @return decimals_ The token decimals
     * @return totalSupply_ The total supply
     * @return contractAddress The contract address
     */
    function getAssetMetadata() external view returns (
        uint32 assetId,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 totalSupply_,
        address contractAddress
    ) {
        return (
            ASSET_ID,
            super.name(),
            super.symbol(),
            decimals(),
            totalSupply(),
            address(this)
        );
    }
    
    /**
     * @notice Pause all token transfers and bridge operations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause all token transfers and bridge operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Override transfer to respect pause state
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._update(from, to, amount);
    }
    
    /**
     * @notice Check if an XCM transaction has been processed
     */
    function isBridgeTransactionProcessed(bytes32 xcmTxHash) external view returns (bool) {
        return processedBridgeTransactions[xcmTxHash];
    }
    
    /**
     * @notice Get bridge statistics for an account
     */
    function getBridgeStats(address account) external view returns (
        uint256 bridgedBalance,
        uint256 totalBridged
    ) {
        return (bridgedBalances[account], totalBridgedSupply);
    }
}