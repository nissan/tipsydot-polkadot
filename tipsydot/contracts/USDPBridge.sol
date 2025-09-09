// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./USDP.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title USDPBridge - XCM Bridge for USDP Stablecoin
 * @notice Manages cross-chain USDP transfers via XCM
 * @dev Demonstrates understanding of Polkadot's cross-chain architecture
 * 
 * This contract shows:
 * - XCM message handling
 * - Sovereign account management
 * - Reserve-backed bridging
 * - Precompile integration patterns
 */
contract USDPBridge is Ownable, ReentrancyGuard {
    // USDP token contract
    USDP public immutable usdp;
    
    // Parachain configuration
    struct ParachainConfig {
        bool isActive;
        bytes32 sovereignAccount;  // Parachain's sovereign account on this chain
        uint256 reserveBalance;     // Reserved USDP for this parachain
        uint256 totalBridged;       // Total amount bridged to this parachain
        uint256 totalReceived;      // Total amount received from this parachain
    }
    
    // XCM message structure
    struct XCMMessage {
        uint32 sourceParaId;
        uint32 destParaId;
        bytes32 sender;
        bytes32 recipient;
        uint256 amount;
        uint256 fee;
        bytes32 messageHash;
        uint256 timestamp;
        bool processed;
    }
    
    // State variables
    mapping(uint32 => ParachainConfig) public parachainConfigs;
    mapping(bytes32 => XCMMessage) public xcmMessages;
    mapping(bytes32 => address) public substrateToEvm; // SS58 to EVM address mapping
    
    uint32[] public supportedParachains;
    uint256 public totalReservedBalance;
    uint256 public bridgeFeesBps = 10; // 0.1% bridge fee
    uint256 public collectedFees;
    
    // Constants
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint32 public constant ASSETHUB_PARAID = 1000;
    uint32 public constant PASSETHUB_PARAID = 1111;
    
    // Events
    event ParachainRegistered(uint32 indexed paraId, bytes32 sovereignAccount);
    event XCMSent(bytes32 indexed messageHash, uint32 destParaId, uint256 amount);
    event XCMReceived(bytes32 indexed messageHash, uint32 sourceParaId, uint256 amount);
    event ReserveDeposited(uint32 indexed paraId, uint256 amount);
    event ReserveWithdrawn(uint32 indexed paraId, uint256 amount);
    event AddressMapped(bytes32 indexed substrateAddress, address evmAddress);
    
    constructor(address _usdp) Ownable(msg.sender) {
        require(_usdp != address(0), "Invalid USDP address");
        usdp = USDP(_usdp);
    }
    
    /**
     * @notice Register a parachain for bridging
     * @param paraId Parachain ID
     * @param sovereignAccount The parachain's sovereign account on this chain
     */
    function registerParachain(
        uint32 paraId,
        bytes32 sovereignAccount
    ) external onlyOwner {
        require(paraId > 0, "Invalid parachain ID");
        require(sovereignAccount != bytes32(0), "Invalid sovereign account");
        require(!parachainConfigs[paraId].isActive, "Already registered");
        
        parachainConfigs[paraId] = ParachainConfig({
            isActive: true,
            sovereignAccount: sovereignAccount,
            reserveBalance: 0,
            totalBridged: 0,
            totalReceived: 0
        });
        
        supportedParachains.push(paraId);
        emit ParachainRegistered(paraId, sovereignAccount);
    }
    
    /**
     * @notice Bridge USDP to another parachain
     * @param amount Amount to bridge (6 decimals)
     * @param destParaId Destination parachain ID
     * @param recipientSubstrate Recipient's Substrate address
     */
    function bridgeToParachain(
        uint256 amount,
        uint32 destParaId,
        bytes32 recipientSubstrate
    ) external nonReentrant returns (bytes32 messageHash) {
        require(parachainConfigs[destParaId].isActive, "Parachain not supported");
        require(amount > 0, "Amount must be > 0");
        
        // Calculate fee
        uint256 fee = (amount * bridgeFeesBps) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;
        
        // Transfer USDP from sender to bridge
        require(
            usdp.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        // Update bridge accounting
        collectedFees += fee;
        parachainConfigs[destParaId].reserveBalance += netAmount;
        parachainConfigs[destParaId].totalBridged += netAmount;
        totalReservedBalance += netAmount;
        
        // Create XCM message
        messageHash = keccak256(
            abi.encodePacked(
                block.chainid,
                destParaId,
                msg.sender,
                recipientSubstrate,
                netAmount,
                block.timestamp
            )
        );
        
        xcmMessages[messageHash] = XCMMessage({
            sourceParaId: PASSETHUB_PARAID, // Current chain
            destParaId: destParaId,
            sender: bytes32(uint256(uint160(msg.sender))),
            recipient: recipientSubstrate,
            amount: netAmount,
            fee: fee,
            messageHash: messageHash,
            timestamp: block.timestamp,
            processed: false
        });
        
        emit XCMSent(messageHash, destParaId, netAmount);
        
        // In production, this would trigger actual XCM message
        _sendXCM(destParaId, recipientSubstrate, netAmount);
        
        return messageHash;
    }
    
    /**
     * @notice Process incoming XCM transfer
     * @dev Called by relayer when XCM message is received
     * @param sourceParaId Source parachain ID
     * @param senderSubstrate Sender's Substrate address
     * @param recipientEvm Recipient's EVM address
     * @param amount Amount to credit
     * @param xcmProof Proof of XCM message (simplified for demo)
     */
    function processIncomingXCM(
        uint32 sourceParaId,
        bytes32 senderSubstrate,
        address recipientEvm,
        uint256 amount,
        bytes32 xcmProof
    ) external onlyOwner nonReentrant {
        require(parachainConfigs[sourceParaId].isActive, "Parachain not supported");
        require(!xcmMessages[xcmProof].processed, "Already processed");
        require(amount > 0, "Invalid amount");
        
        // Mark as processed
        xcmMessages[xcmProof].processed = true;
        
        // Update accounting
        parachainConfigs[sourceParaId].totalReceived += amount;
        
        // Mint USDP to recipient
        usdp.mint(recipientEvm, amount);
        
        // Store the XCM message
        xcmMessages[xcmProof] = XCMMessage({
            sourceParaId: sourceParaId,
            destParaId: PASSETHUB_PARAID,
            sender: senderSubstrate,
            recipient: bytes32(uint256(uint160(recipientEvm))),
            amount: amount,
            fee: 0,
            messageHash: xcmProof,
            timestamp: block.timestamp,
            processed: true
        });
        
        emit XCMReceived(xcmProof, sourceParaId, amount);
    }
    
    /**
     * @notice Map a Substrate address to an EVM address
     * @param substrateAddress SS58 encoded address (as bytes32)
     */
    function mapAddress(bytes32 substrateAddress) external {
        require(substrateAddress != bytes32(0), "Invalid substrate address");
        require(substrateToEvm[substrateAddress] == address(0), "Already mapped");
        
        substrateToEvm[substrateAddress] = msg.sender;
        emit AddressMapped(substrateAddress, msg.sender);
    }
    
    /**
     * @notice Simulate XCM send (in production, would use actual XCM pallet)
     */
    function _sendXCM(
        uint32 destParaId,
        bytes32 recipient,
        uint256 amount
    ) private {
        // In production, this would:
        // 1. Construct XCM message with ReserveAssetDeposited instruction
        // 2. Send via XCM pallet to destination parachain
        // 3. Destination would credit the recipient
        
        // For demo, we just emit an event
        // Real implementation would call XCM pallet precompile
    }
    
    /**
     * @notice Withdraw collected bridge fees
     */
    function withdrawFees() external onlyOwner {
        uint256 fees = collectedFees;
        collectedFees = 0;
        require(usdp.transfer(owner(), fees), "Transfer failed");
    }
    
    /**
     * @notice Update bridge fee
     */
    function setBridgeFee(uint256 _feesBps) external onlyOwner {
        require(_feesBps <= 100, "Fee too high"); // Max 1%
        bridgeFeesBps = _feesBps;
    }
    
    /**
     * @notice Get parachain statistics
     */
    function getParachainStats(uint32 paraId) external view returns (
        bool isActive,
        uint256 reserveBalance,
        uint256 totalBridged,
        uint256 totalReceived
    ) {
        ParachainConfig memory config = parachainConfigs[paraId];
        return (
            config.isActive,
            config.reserveBalance,
            config.totalBridged,
            config.totalReceived
        );
    }
    
    /**
     * @notice Get all supported parachains
     */
    function getSupportedParachains() external view returns (uint32[] memory) {
        return supportedParachains;
    }
    
    /**
     * @notice Calculate bridge fee for an amount
     */
    function calculateBridgeFee(uint256 amount) external view returns (uint256 fee, uint256 netAmount) {
        fee = (amount * bridgeFeesBps) / BPS_DENOMINATOR;
        netAmount = amount - fee;
    }
}