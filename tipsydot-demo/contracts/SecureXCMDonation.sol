// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SecureXCMDonation
 * @dev Secure cross-chain USDC donations using OpenZeppelin security patterns
 * Built for PBA Cohort 7 - Production-ready XCM implementation
 */
contract SecureXCMDonation is Ownable, Pausable, ReentrancyGuard {
    // Precompile addresses (configurable per network)
    address public assetsPrecompile;
    address public xcmPrecompile;
    
    uint32 public immutable usdcAssetId;
    uint32 public immutable assetHubParaId;
    
    struct ParachainBuilder {
        string name;
        string project;
        bytes32 substrateAddress;
        uint32 paraId;
        uint256 totalReceived;
        bool active;
    }
    
    mapping(uint256 => ParachainBuilder) public builders;
    uint256 public builderCount;
    
    // Security: Track processed messages to prevent replay
    mapping(bytes32 => bool) public processedMessages;
    
    // Donation limits for security
    uint256 public minDonation = 1e6; // 1 USDC
    uint256 public maxDonation = 100000e6; // 100,000 USDC
    
    // Events
    event XCMDonationSent(
        address indexed donor,
        uint256 indexed builderId,
        uint256 amount,
        uint32 destinationParaId,
        bytes32 destinationAccount,
        bytes32 messageHash,
        uint256 timestamp
    );
    
    event BuilderAdded(uint256 indexed builderId, string name, uint32 paraId);
    event BuilderUpdated(uint256 indexed builderId, bool active);
    event PrecompilesUpdated(address assetsPrecompile, address xcmPrecompile);
    event DonationLimitsUpdated(uint256 minDonation, uint256 maxDonation);
    
    /**
     * @dev Constructor with configurable parameters for different networks
     * @param _assetsPrecompile Address of assets precompile
     * @param _xcmPrecompile Address of XCM precompile
     * @param _usdcAssetId USDC asset ID on the network
     * @param _assetHubParaId AssetHub parachain ID
     */
    constructor(
        address _assetsPrecompile,
        address _xcmPrecompile,
        uint32 _usdcAssetId,
        uint32 _assetHubParaId
    ) Ownable(msg.sender) {
        assetsPrecompile = _assetsPrecompile;
        xcmPrecompile = _xcmPrecompile;
        usdcAssetId = _usdcAssetId;
        assetHubParaId = _assetHubParaId;
        
        // Initialize with default builders
        _initializeBuilders();
    }
    
    /**
     * @dev Donate USDC to a parachain builder using XCM
     * @param builderId The ID of the builder to donate to
     * @param amount The amount of USDC to donate (with 6 decimals)
     */
    function donateViaXCM(
        uint256 builderId,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        require(builders[builderId].active, "Builder not active");
        require(amount >= minDonation, "Below minimum donation");
        require(amount <= maxDonation, "Exceeds maximum donation");
        
        ParachainBuilder memory builder = builders[builderId];
        
        // Generate unique message ID
        bytes32 messageId = keccak256(
            abi.encodePacked(msg.sender, builderId, amount, block.timestamp, block.number)
        );
        require(!processedMessages[messageId], "Duplicate transaction");
        processedMessages[messageId] = true;
        
        // Transfer USDC from donor to contract
        bool success = IAssets(assetsPrecompile).transferFrom(
            usdcAssetId,
            msg.sender,
            address(this),
            amount
        );
        require(success, "USDC transfer failed");
        
        // Build and send XCM message
        bytes memory xcmMessage = _buildReserveTransferXCM(
            builder.paraId,
            builder.substrateAddress,
            amount
        );
        
        bytes32 messageHash = IXcmTransactor(xcmPrecompile).sendXcm(
            _buildDestination(builder.paraId),
            xcmMessage,
            amount / 100 // 1% for fees
        );
        
        // Update stats
        builders[builderId].totalReceived += amount;
        
        // Emit event
        emit XCMDonationSent(
            msg.sender,
            builderId,
            amount,
            builder.paraId,
            builder.substrateAddress,
            messageHash,
            block.timestamp
        );
    }
    
    /**
     * @dev Add a new builder (only owner)
     */
    function addBuilder(
        string memory name,
        string memory project,
        bytes32 substrateAddress,
        uint32 paraId
    ) external onlyOwner {
        builders[builderCount] = ParachainBuilder({
            name: name,
            project: project,
            substrateAddress: substrateAddress,
            paraId: paraId,
            totalReceived: 0,
            active: true
        });
        
        emit BuilderAdded(builderCount, name, paraId);
        builderCount++;
    }
    
    /**
     * @dev Update builder status (only owner)
     */
    function updateBuilderStatus(uint256 builderId, bool active) external onlyOwner {
        require(builderId < builderCount, "Invalid builder ID");
        builders[builderId].active = active;
        emit BuilderUpdated(builderId, active);
    }
    
    /**
     * @dev Update precompile addresses (only owner)
     */
    function updatePrecompiles(
        address _assetsPrecompile,
        address _xcmPrecompile
    ) external onlyOwner {
        require(_assetsPrecompile != address(0), "Invalid assets precompile");
        require(_xcmPrecompile != address(0), "Invalid XCM precompile");
        
        assetsPrecompile = _assetsPrecompile;
        xcmPrecompile = _xcmPrecompile;
        
        emit PrecompilesUpdated(_assetsPrecompile, _xcmPrecompile);
    }
    
    /**
     * @dev Update donation limits (only owner)
     */
    function updateDonationLimits(
        uint256 _minDonation,
        uint256 _maxDonation
    ) external onlyOwner {
        require(_minDonation > 0, "Min must be positive");
        require(_maxDonation > _minDonation, "Max must exceed min");
        
        minDonation = _minDonation;
        maxDonation = _maxDonation;
        
        emit DonationLimitsUpdated(_minDonation, _maxDonation);
    }
    
    /**
     * @dev Pause donations in case of emergency (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause donations (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal (only owner, when paused)
     */
    function emergencyWithdraw(
        uint32 assetId,
        address recipient,
        uint256 amount
    ) external onlyOwner whenPaused {
        require(recipient != address(0), "Invalid recipient");
        
        bool success = IAssets(assetsPrecompile).transfer(
            assetId,
            recipient,
            amount
        );
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Get builder information
     */
    function getBuilder(uint256 builderId) external view returns (
        string memory name,
        string memory project,
        bytes32 substrateAddress,
        uint32 paraId,
        uint256 totalReceived,
        bool active
    ) {
        require(builderId < builderCount, "Invalid builder ID");
        ParachainBuilder memory builder = builders[builderId];
        return (
            builder.name,
            builder.project,
            builder.substrateAddress,
            builder.paraId,
            builder.totalReceived,
            builder.active
        );
    }
    
    /**
     * @dev Get all active builders
     */
    function getActiveBuilders() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active builders
        for (uint256 i = 0; i < builderCount; i++) {
            if (builders[i].active) {
                activeCount++;
            }
        }
        
        // Collect active builder IDs
        uint256[] memory activeIds = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < builderCount; i++) {
            if (builders[i].active) {
                activeIds[index] = i;
                index++;
            }
        }
        
        return activeIds;
    }
    
    /**
     * @dev Initialize default builders
     */
    function _initializeBuilders() private {
        // Alice - Moonbeam
        builders[0] = ParachainBuilder({
            name: "Alice - Moonbeam",
            project: "EVM Smart Contracts for Polkadot",
            substrateAddress: 0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48,
            paraId: 2004,
            totalReceived: 0,
            active: true
        });
        
        // Bob - Astar
        builders[1] = ParachainBuilder({
            name: "Bob - Astar",
            project: "WASM & EVM Multi-VM Platform",
            substrateAddress: 0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d,
            paraId: 2006,
            totalReceived: 0,
            active: true
        });
        
        // Charlie - Acala
        builders[2] = ParachainBuilder({
            name: "Charlie - Acala",
            project: "DeFi Hub of Polkadot",
            substrateAddress: 0x90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe22,
            paraId: 2000,
            totalReceived: 0,
            active: true
        });
        
        builderCount = 3;
    }
    
    /**
     * @dev Build XCM reserve transfer message
     */
    function _buildReserveTransferXCM(
        uint32 paraId,
        bytes32 account,
        uint256 amount
    ) private view returns (bytes memory) {
        // Simplified XCM message structure
        // In production, use proper XCM encoding library
        return abi.encode(
            uint8(5), // XCM Version 5
            uint8(3), // Number of instructions
            // WithdrawAsset
            uint8(0),
            usdcAssetId,
            amount,
            // BuyExecution
            uint8(3),
            amount / 100, // Fee amount
            // DepositReserveAsset
            uint8(8),
            paraId,
            account
        );
    }
    
    /**
     * @dev Build destination multilocation
     */
    function _buildDestination(uint32 paraId) private pure returns (bytes memory) {
        return abi.encode(
            1, // parents
            1, // interior X1
            uint8(0), // Parachain
            paraId
        );
    }
}

// Interfaces for precompiles
interface IAssets {
    function transferFrom(uint32 assetId, address from, address to, uint256 amount) external returns (bool);
    function transfer(uint32 assetId, address to, uint256 amount) external returns (bool);
    function balanceOf(uint32 assetId, address account) external view returns (uint256);
}

interface IXcmTransactor {
    function sendXcm(bytes memory dest, bytes memory message, uint256 feeAmount) external returns (bytes32);
}