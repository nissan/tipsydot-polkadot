// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title USDCDonation
 * @dev Simple contract for donating USDC to underfunded parachain builders
 * Demonstrates EVM to Substrate cross-chain transfers via XCM
 */
contract USDCDonation {
    // AssetHub USDC precompile address (Asset ID 1337 on Paseo)
    address constant USDC = 0x0800000000000000000000000000000000000539;
    
    struct ParachainBuilder {
        string name;
        string project;
        string substrateAddress; // SS58 encoded address
        uint256 totalReceived;
        bool active;
    }
    
    mapping(uint256 => ParachainBuilder) public builders;
    uint256 public builderCount;
    
    event DonationSent(
        address indexed donor,
        uint256 indexed builderId,
        uint256 amount,
        string substrateAddress,
        uint256 timestamp
    );
    
    constructor() {
        // Pre-populate underfunded builders
        _addBuilder(
            "Alice - Moonbeam", 
            "EVM Smart Contracts for Polkadot", 
            "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
        );
        _addBuilder(
            "Bob - Astar", 
            "WASM & EVM Multi-VM Platform",
            "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
        );
        _addBuilder(
            "Charlie - Acala", 
            "DeFi Hub of Polkadot",
            "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"
        );
    }
    
    /**
     * @dev Donate USDC to a parachain builder
     * @param builderId The ID of the builder to donate to
     * @param amount The amount of USDC to donate (with 6 decimals)
     */
    function donate(uint256 builderId, uint256 amount) external {
        require(builders[builderId].active, "Invalid builder");
        require(amount >= 1e6, "Minimum donation is 1 USDC");
        require(amount <= 100000e6, "Maximum donation is 100,000 USDC");
        
        // For demo: Transfer USDC from donor to contract
        // In production, this would trigger actual XCM transfer
        bool success = IERC20(USDC).transferFrom(msg.sender, address(this), amount);
        require(success, "USDC transfer failed");
        
        // Update builder stats
        builders[builderId].totalReceived += amount;
        
        // Emit event for frontend tracking
        emit DonationSent(
            msg.sender, 
            builderId, 
            amount, 
            builders[builderId].substrateAddress,
            block.timestamp
        );
        
        // In production: Trigger XCM to transfer USDC to substrate address
        // _initiateXCMTransfer(builders[builderId].substrateAddress, amount);
    }
    
    /**
     * @dev Get builder information
     */
    function getBuilder(uint256 builderId) external view returns (
        string memory name,
        string memory project,
        string memory substrateAddress,
        uint256 totalReceived,
        bool active
    ) {
        ParachainBuilder memory builder = builders[builderId];
        return (
            builder.name,
            builder.project,
            builder.substrateAddress,
            builder.totalReceived,
            builder.active
        );
    }
    
    /**
     * @dev Get all builders
     */
    function getAllBuilders() external view returns (ParachainBuilder[] memory) {
        ParachainBuilder[] memory allBuilders = new ParachainBuilder[](builderCount);
        for (uint256 i = 0; i < builderCount; i++) {
            allBuilders[i] = builders[i];
        }
        return allBuilders;
    }
    
    /**
     * @dev Internal function to add a builder
     */
    function _addBuilder(
        string memory name, 
        string memory project, 
        string memory substrateAddress
    ) internal {
        builders[builderCount] = ParachainBuilder({
            name: name,
            project: project,
            substrateAddress: substrateAddress,
            totalReceived: 0,
            active: true
        });
        builderCount++;
    }
}

// Minimal ERC20 interface for USDC
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}