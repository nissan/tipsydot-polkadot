// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract SimpleTipping {
    // USDC contract address (will be set in constructor)
    IERC20 public immutable usdc;
    
    // Owner of the contract
    address public owner;
    
    // Parachain builders
    struct Builder {
        string name;
        string description;
        address wallet;
        uint256 totalReceived;
        bool active;
    }
    
    // Mapping of builder ID to builder details
    mapping(uint256 => Builder) public builders;
    uint256 public builderCount;
    
    // Events
    event Tip(
        address indexed tipper,
        uint256 indexed builderId,
        uint256 amount,
        string message,
        uint256 timestamp
    );
    
    event BuilderAdded(uint256 indexed builderId, string name, address wallet);
    event BuilderUpdated(uint256 indexed builderId, string name, address wallet);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
        
        // Pre-populate with demo builders (using Anvil test accounts)
        _addBuilder(
            "Alice - Moonbeam",
            "Building EVM smart contracts on Polkadot",
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8  // Anvil Account #1
        );
        
        _addBuilder(
            "Bob - Astar", 
            "WASM & EVM platform for developers",
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC  // Anvil Account #2
        );
        
        _addBuilder(
            "Charlie - Acala",
            "DeFi hub of Polkadot",
            0x90F79bf6EB2c4f870365E785982E1f101E93b906  // Anvil Account #3
        );
    }
    
    function _addBuilder(string memory name, string memory description, address wallet) private {
        builderCount++;
        builders[builderCount] = Builder({
            name: name,
            description: description,
            wallet: wallet,
            totalReceived: 0,
            active: true
        });
        emit BuilderAdded(builderCount, name, wallet);
    }
    
    function addBuilder(string memory name, string memory description, address wallet) external onlyOwner {
        _addBuilder(name, description, wallet);
    }
    
    function updateBuilder(uint256 builderId, string memory name, string memory description, address wallet, bool active) external onlyOwner {
        require(builderId > 0 && builderId <= builderCount, "Invalid builder");
        Builder storage builder = builders[builderId];
        builder.name = name;
        builder.description = description;
        builder.wallet = wallet;
        builder.active = active;
        emit BuilderUpdated(builderId, name, wallet);
    }
    
    function tip(uint256 builderId, uint256 amount, string memory message) external {
        require(builderId > 0 && builderId <= builderCount, "Invalid builder");
        require(builders[builderId].active, "Builder not active");
        require(amount > 0, "Amount must be > 0");
        
        // Transfer USDC from tipper to builder
        require(usdc.transferFrom(msg.sender, builders[builderId].wallet, amount), "Transfer failed");
        
        // Update stats
        builders[builderId].totalReceived += amount;
        
        // Emit event
        emit Tip(msg.sender, builderId, amount, message, block.timestamp);
    }
    
    function getAllBuilders() external view returns (Builder[] memory) {
        Builder[] memory allBuilders = new Builder[](builderCount);
        for (uint256 i = 1; i <= builderCount; i++) {
            allBuilders[i - 1] = builders[i];
        }
        return allBuilders;
    }
    
    function getActiveBuilders() external view returns (Builder[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= builderCount; i++) {
            if (builders[i].active) activeCount++;
        }
        
        Builder[] memory activeBuilders = new Builder[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= builderCount; i++) {
            if (builders[i].active) {
                activeBuilders[index] = builders[i];
                index++;
            }
        }
        return activeBuilders;
    }
}