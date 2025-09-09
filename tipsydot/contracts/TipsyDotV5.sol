// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IBridgedUSDC.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TipsyDotV5 - Production-ready with Bridged USDC
 * @notice Uses actual bridged USDC precompile from AssetHub
 * @dev Designed for PassetHub/Omninode deployment with Revive pallet
 */
contract TipsyDotV5 is Ownable, Pausable, ReentrancyGuard {
    using BridgedUSDCLib for *;
    
    // ============ Structs ============
    
    struct Parachain {
        uint32 paraId;
        string name;
        string description;
        address evmAddress;           // H160 EVM address on PassetHub
        bytes32 substrateAddress;      // SS58 substrate address
        address registrar;             // Who registered this parachain
        bool verified;                 // Verification status
        uint256 totalReceived;         // Total USDC received
        uint256 tipCount;              // Number of tips received
        uint256 registeredAt;          // Registration timestamp
    }
    
    struct Tip {
        address tipper;
        uint32 paraId;
        uint256 amount;                // Net amount after fee
        uint256 protocolFee;           // Fee taken
        string message;
        uint256 timestamp;
        bytes32 xcmTxHash;             // XCM transaction hash if forwarded
    }
    
    struct TipperStats {
        uint256 totalTipped;
        uint256 tipCount;
        uint32[] supportedParachains;
        uint256 firstTipTime;
        uint256 lastTipTime;
    }
    
    // ============ State Variables ============
    
    // Parachain registry
    mapping(uint32 => Parachain) public parachains;
    mapping(address => uint32[]) public registrarParachains;
    mapping(address => uint32) public evmAddressToParaId;
    uint32[] public allParachainIds;
    
    // Tip tracking
    mapping(uint32 => Tip[]) public parachainTips;
    mapping(address => Tip[]) public tipperHistory;
    mapping(address => TipperStats) public tipperStats;
    
    // Protocol configuration
    uint256 public constant PROTOCOL_FEE_BPS = 10; // 0.1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public totalProtocolFeesCollected;
    uint256 public protocolFeesBalance;
    
    // Contract configuration
    address public treasury;
    IBridgedUSDC public immutable bridgedUSDC;
    
    // XCM tracking
    mapping(bytes32 => bool) public xcmTransfersProcessed;
    
    // ============ Events ============
    
    event ParachainRegistered(
        uint32 indexed paraId,
        string name,
        address indexed evmAddress,
        address indexed registrar
    );
    
    event ParachainVerified(uint32 indexed paraId);
    
    event Tipped(
        uint32 indexed paraId,
        address indexed tipper,
        uint256 amount,
        uint256 protocolFee,
        string message
    );
    
    event FundsForwarded(
        uint32 indexed paraId,
        address recipient,
        uint256 amount,
        bytes32 xcmTxHash
    );
    
    event ProtocolFeesWithdrawn(
        address indexed to,
        uint256 amount
    );
    
    event XCMBridgeCompleted(
        bytes32 indexed txHash,
        address indexed recipient,
        uint256 amount
    );
    
    // ============ Modifiers ============
    
    modifier validParachain(uint32 paraId) {
        require(parachains[paraId].registeredAt > 0, "Parachain not registered");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        
        // Use the bridged USDC precompile
        bridgedUSDC = BridgedUSDCLib.usdc();
        
        // Verify the precompile is available
        require(address(bridgedUSDC) != address(0), "USDC precompile not found");
        
        // Verify it has the expected decimals
        require(bridgedUSDC.decimals() == BridgedUSDCLib.DECIMALS, "Unexpected USDC decimals");
    }
    
    // ============ Parachain Registration ============
    
    /**
     * @notice Register a new parachain for tipping
     */
    function registerParachain(
        uint32 paraId,
        string memory name,
        string memory description,
        address evmAddress,
        bytes32 substrateAddress
    ) external whenNotPaused returns (bool) {
        require(paraId > 0, "Invalid parachain ID");
        require(bytes(name).length > 0, "Name required");
        require(evmAddress != address(0), "Invalid EVM address");
        require(parachains[paraId].registeredAt == 0, "Already registered");
        require(evmAddressToParaId[evmAddress] == 0, "Address already used");
        
        parachains[paraId] = Parachain({
            paraId: paraId,
            name: name,
            description: description,
            evmAddress: evmAddress,
            substrateAddress: substrateAddress,
            registrar: msg.sender,
            verified: false,
            totalReceived: 0,
            tipCount: 0,
            registeredAt: block.timestamp
        });
        
        registrarParachains[msg.sender].push(paraId);
        evmAddressToParaId[evmAddress] = paraId;
        allParachainIds.push(paraId);
        
        emit ParachainRegistered(paraId, name, evmAddress, msg.sender);
        
        return true;
    }
    
    /**
     * @notice Verify a parachain (owner only)
     */
    function verifyParachain(uint32 paraId) external onlyOwner validParachain(paraId) {
        parachains[paraId].verified = true;
        emit ParachainVerified(paraId);
    }
    
    // ============ Tipping Functions ============
    
    /**
     * @notice Tip a parachain with bridged USDC
     */
    function tipParachain(
        uint32 paraId,
        uint256 amount,
        string memory message
    ) external whenNotPaused validParachain(paraId) nonReentrant returns (bool) {
        require(amount > 0, "Amount must be > 0");
        
        // Calculate protocol fee
        uint256 protocolFee = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = amount - protocolFee;
        
        // Transfer USDC from tipper using the precompile
        require(
            bridgedUSDC.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );
        
        // Update parachain stats
        parachains[paraId].totalReceived += netAmount;
        parachains[paraId].tipCount += 1;
        
        // Update protocol fees
        protocolFeesBalance += protocolFee;
        totalProtocolFeesCollected += protocolFee;
        
        // Record tip
        Tip memory tip = Tip({
            tipper: msg.sender,
            paraId: paraId,
            amount: netAmount,
            protocolFee: protocolFee,
            message: message,
            timestamp: block.timestamp,
            xcmTxHash: bytes32(0)
        });
        
        parachainTips[paraId].push(tip);
        tipperHistory[msg.sender].push(tip);
        
        // Update tipper stats
        _updateTipperStats(msg.sender, paraId, amount);
        
        emit Tipped(paraId, msg.sender, netAmount, protocolFee, message);
        
        return true;
    }
    
    /**
     * @notice Forward accumulated tips to parachain EVM address
     */
    function forwardToParachain(uint32 paraId) 
        external 
        whenNotPaused 
        validParachain(paraId)
        nonReentrant
        returns (bool) 
    {
        Parachain storage para = parachains[paraId];
        require(para.totalReceived > 0, "No funds to forward");
        
        uint256 amount = para.totalReceived;
        para.totalReceived = 0; // Reset before transfer
        
        // Transfer using the precompile
        require(
            bridgedUSDC.transfer(para.evmAddress, amount),
            "USDC transfer failed"
        );
        
        // Generate XCM tx hash (would be real in production)
        bytes32 xcmTxHash = keccak256(
            abi.encodePacked(paraId, para.evmAddress, amount, block.timestamp)
        );
        
        emit FundsForwarded(paraId, para.evmAddress, amount, xcmTxHash);
        
        return true;
    }
    
    // ============ Protocol Fee Management ============
    
    /**
     * @notice Withdraw protocol fees to treasury
     */
    function withdrawProtocolFees(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= protocolFeesBalance, "Insufficient fees");
        
        protocolFeesBalance -= amount;
        require(
            bridgedUSDC.transfer(treasury, amount),
            "USDC transfer failed"
        );
        
        emit ProtocolFeesWithdrawn(treasury, amount);
    }
    
    // ============ Internal Functions ============
    
    function _updateTipperStats(address tipper, uint32 paraId, uint256 amount) private {
        TipperStats storage stats = tipperStats[tipper];
        stats.totalTipped += amount;
        stats.tipCount += 1;
        
        if (stats.firstTipTime == 0) {
            stats.firstTipTime = block.timestamp;
        }
        stats.lastTipTime = block.timestamp;
        
        // Add to supported parachains if new
        bool found = false;
        for (uint i = 0; i < stats.supportedParachains.length; i++) {
            if (stats.supportedParachains[i] == paraId) {
                found = true;
                break;
            }
        }
        if (!found) {
            stats.supportedParachains.push(paraId);
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get all registered parachain IDs
     */
    function getAllParachainIds() external view returns (uint32[] memory) {
        return allParachainIds;
    }
    
    /**
     * @notice Get parachain details
     */
    function getParachainDetails(uint32 paraId) external view returns (
        string memory name,
        string memory description,
        address evmAddress,
        bytes32 substrateAddress,
        bool verified,
        uint256 totalReceived,
        uint256 tipCount
    ) {
        Parachain memory para = parachains[paraId];
        return (
            para.name,
            para.description,
            para.evmAddress,
            para.substrateAddress,
            para.verified,
            para.totalReceived,
            para.tipCount
        );
    }
    
    /**
     * @notice Get tips for a parachain
     */
    function getParachainTips(uint32 paraId, uint256 offset, uint256 limit) 
        external 
        view 
        returns (Tip[] memory) 
    {
        Tip[] memory tips = parachainTips[paraId];
        
        if (offset >= tips.length) {
            return new Tip[](0);
        }
        
        uint256 end = offset + limit;
        if (end > tips.length) {
            end = tips.length;
        }
        
        Tip[] memory result = new Tip[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = tips[i];
        }
        
        return result;
    }
    
    /**
     * @notice Get tipper statistics
     */
    function getTipperStats(address tipper) external view returns (
        uint256 totalTipped,
        uint256 tipCount,
        uint32[] memory supportedParachains,
        uint256 firstTipTime,
        uint256 lastTipTime
    ) {
        TipperStats memory stats = tipperStats[tipper];
        return (
            stats.totalTipped,
            stats.tipCount,
            stats.supportedParachains,
            stats.firstTipTime,
            stats.lastTipTime
        );
    }
    
    /**
     * @notice Calculate fee for a tip amount
     */
    function calculateFee(uint256 amount) external pure returns (
        uint256 grossAmount,
        uint256 protocolFee,
        uint256 netAmount
    ) {
        protocolFee = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        netAmount = amount - protocolFee;
        return (amount, protocolFee, netAmount);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get USDC precompile address
     */
    function getUSDCAddress() external view returns (address) {
        return address(bridgedUSDC);
    }
}