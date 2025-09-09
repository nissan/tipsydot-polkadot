// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FaucetToken
 * @notice Simple ERC20 token for testing swaps and demos
 * @dev Anyone can claim tokens from the faucet for testing
 */
contract FaucetToken is ERC20, Ownable {
    
    uint256 public constant CLAIM_AMOUNT = 1000 * 10**18; // 1000 tokens per claim
    uint256 public constant COOLDOWN_PERIOD = 1 hours;
    
    mapping(address => uint256) public lastClaimed;
    
    event TokensClaimed(address indexed claimer, uint256 amount);
    
    constructor() ERC20("Faucet Test Token", "FAUCET") Ownable(msg.sender) {
        // Mint initial supply to owner for liquidity
        _mint(msg.sender, 1_000_000 * 10**18);
    }
    
    /**
     * @notice Claim free tokens from faucet
     * @dev Anyone can claim tokens once per cooldown period
     */
    function claim() external {
        require(
            block.timestamp >= lastClaimed[msg.sender] + COOLDOWN_PERIOD,
            "Cooldown period not met"
        );
        
        lastClaimed[msg.sender] = block.timestamp;
        _mint(msg.sender, CLAIM_AMOUNT);
        
        emit TokensClaimed(msg.sender, CLAIM_AMOUNT);
    }
    
    /**
     * @notice Check if address can claim tokens
     */
    function canClaim(address user) external view returns (bool) {
        return block.timestamp >= lastClaimed[user] + COOLDOWN_PERIOD;
    }
    
    /**
     * @notice Get time until next claim available
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastClaimed[user] + COOLDOWN_PERIOD;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @notice Owner can mint additional tokens for testing
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @notice Get contract info for frontend
     */
    function getFaucetInfo() external view returns (
        uint256 claimAmount,
        uint256 cooldownPeriod,
        uint256 totalSupply
    ) {
        return (CLAIM_AMOUNT, COOLDOWN_PERIOD, totalSupply());
    }
}