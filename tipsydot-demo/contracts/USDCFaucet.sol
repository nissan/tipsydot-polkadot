// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title USDCFaucet
 * @dev Faucet contract that exchanges PAS (native token) for USDC at a fixed rate
 * Rate: 1 PAS = 2 USDC (simulating PAS at $2)
 */
contract USDCFaucet {
    // AssetHub USDC precompile address (Asset ID 1337)
    address constant USDC_PRECOMPILE = 0x0800000000000000000000000000000000000539;
    
    // Exchange rate: 1 PAS = 2 USDC
    uint256 constant EXCHANGE_RATE = 2;
    
    // Maximum USDC per request (to prevent draining)
    uint256 constant MAX_USDC_PER_REQUEST = 1000 * 10**6; // 1000 USDC
    
    // Minimum PAS required for exchange
    uint256 constant MIN_PAS_AMOUNT = 0.5 ether; // 0.5 PAS minimum
    
    // Track daily limits per address
    mapping(address => uint256) public lastRequestTime;
    mapping(address => uint256) public dailyRequestAmount;
    uint256 constant DAILY_LIMIT = 5000 * 10**6; // 5000 USDC per day
    
    event USDCExchanged(
        address indexed user,
        uint256 pasAmount,
        uint256 usdcAmount,
        uint256 timestamp
    );
    
    event FaucetFunded(
        address indexed funder,
        uint256 amount,
        uint256 timestamp
    );
    
    /**
     * @dev Exchange PAS for USDC at fixed rate
     * User sends PAS and receives USDC from the faucet
     */
    function exchangePASForUSDC() external payable {
        require(msg.value >= MIN_PAS_AMOUNT, "Minimum 0.5 PAS required");
        
        // Calculate USDC amount (PAS has 18 decimals, USDC has 6)
        // 1 PAS (1e18 wei) = 2 USDC (2e6 units)
        uint256 usdcAmount = (msg.value * EXCHANGE_RATE * 10**6) / 10**18;
        
        require(usdcAmount <= MAX_USDC_PER_REQUEST, "Exceeds maximum per request");
        
        // Check daily limit
        if (block.timestamp / 86400 > lastRequestTime[msg.sender] / 86400) {
            // New day, reset daily amount
            dailyRequestAmount[msg.sender] = 0;
        }
        
        require(
            dailyRequestAmount[msg.sender] + usdcAmount <= DAILY_LIMIT,
            "Daily limit exceeded"
        );
        
        // Check faucet has enough USDC
        uint256 faucetBalance = IERC20(USDC_PRECOMPILE).balanceOf(address(this));
        require(faucetBalance >= usdcAmount, "Faucet is empty, please wait for refill");
        
        // Update tracking
        lastRequestTime[msg.sender] = block.timestamp;
        dailyRequestAmount[msg.sender] += usdcAmount;
        
        // Transfer USDC to user using precompile
        bool success = IERC20(USDC_PRECOMPILE).transfer(msg.sender, usdcAmount);
        require(success, "USDC transfer failed");
        
        emit USDCExchanged(msg.sender, msg.value, usdcAmount, block.timestamp);
    }
    
    /**
     * @dev Check user's remaining daily limit
     */
    function getRemainingDailyLimit(address user) external view returns (uint256) {
        if (block.timestamp / 86400 > lastRequestTime[user] / 86400) {
            // New day
            return DAILY_LIMIT;
        }
        
        if (dailyRequestAmount[user] >= DAILY_LIMIT) {
            return 0;
        }
        
        return DAILY_LIMIT - dailyRequestAmount[user];
    }
    
    /**
     * @dev Get exchange rate info
     */
    function getExchangeInfo() external pure returns (
        uint256 rate,
        uint256 minPAS,
        uint256 maxUSDCPerRequest,
        uint256 dailyLimit
    ) {
        return (EXCHANGE_RATE, MIN_PAS_AMOUNT, MAX_USDC_PER_REQUEST, DAILY_LIMIT);
    }
    
    /**
     * @dev Check faucet USDC balance
     */
    function getFaucetBalance() external view returns (uint256) {
        return IERC20(USDC_PRECOMPILE).balanceOf(address(this));
    }
    
    /**
     * @dev Fund the faucet with USDC (requires approval)
     */
    function fundFaucet(uint256 amount) external {
        bool success = IERC20(USDC_PRECOMPILE).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        require(success, "USDC transfer failed");
        
        emit FaucetFunded(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Withdraw PAS collected by the faucet (admin only)
     * In production, this would have access control
     */
    function withdrawPAS(address to, uint256 amount) external {
        require(address(this).balance >= amount, "Insufficient PAS balance");
        payable(to).transfer(amount);
    }
    
    /**
     * @dev Receive PAS
     */
    receive() external payable {}
}

// Minimal ERC20 interface for the precompile
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}