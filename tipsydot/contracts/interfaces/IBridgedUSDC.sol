// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBridgedUSDC
 * @notice Interface for bridged USDC from AssetHub on PassetHub
 * @dev This represents the precompile at 0x0000000000000000000000000000000000000800
 * The actual USDC is Asset ID 31337 on AssetHub, bridged via XCM
 */
interface IBridgedUSDC {
    // Standard ERC20 functions
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    // ERC20 metadata
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @notice Helper library for interacting with bridged USDC
 */
library BridgedUSDCLib {
    // PassetHub USDC precompile address
    address public constant USDC_PRECOMPILE = 0x0000000000000000000000000000000000000800;
    
    // AssetHub Asset ID for USDC
    uint32 public constant ASSET_ID = 31337;
    
    // Expected decimals for USDC
    uint8 public constant DECIMALS = 6;
    
    /**
     * @notice Get the USDC precompile as an interface
     */
    function usdc() internal pure returns (IBridgedUSDC) {
        return IBridgedUSDC(USDC_PRECOMPILE);
    }
    
    /**
     * @notice Safe transfer helper
     */
    function safeTransfer(address to, uint256 amount) internal returns (bool) {
        return usdc().transfer(to, amount);
    }
    
    /**
     * @notice Safe transferFrom helper
     */
    function safeTransferFrom(address from, address to, uint256 amount) internal returns (bool) {
        return usdc().transferFrom(from, to, amount);
    }
}