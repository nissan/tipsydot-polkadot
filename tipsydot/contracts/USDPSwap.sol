// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./USDP.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title USDPSwap - AssetHub Liquidity Pool Interface
 * @notice Swap faucet tokens for USDP via AssetHub liquidity pools
 * @dev Demonstrates Polkadot DeFi capabilities and cross-chain liquidity
 * 
 * Flow:
 * 1. User receives faucet tokens on PassetHub
 * 2. User swaps faucet tokens for USDP via this contract
 * 3. Contract interacts with AssetHub liquidity pools (simulated)
 * 4. User receives USDP and can tip parachains
 */
contract USDPSwap is Ownable, ReentrancyGuard, Pausable {
    // Token contracts
    USDP public immutable usdp;
    
    // Liquidity pool configuration
    struct Pool {
        address tokenA;         // Faucet token or other asset
        address tokenB;         // USDP
        uint256 reserveA;       // Reserve of token A
        uint256 reserveB;       // Reserve of USDP
        uint256 totalLiquidity; // Total LP tokens
        uint256 swapFeesBps;    // Swap fee in basis points
        bool isActive;
    }
    
    // Liquidity provider position
    struct LPPosition {
        uint256 liquidity;      // LP tokens owned
        uint256 tokenADeposited;
        uint256 tokenBDeposited;
        uint256 feesEarned;
    }
    
    // State variables
    mapping(address => Pool) public pools; // tokenA => Pool
    mapping(address => mapping(address => LPPosition)) public lpPositions; // pool => provider => position
    mapping(address => bool) public supportedTokens;
    
    address[] public poolTokens;
    uint256 public constant MIN_LIQUIDITY = 1000;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public defaultSwapFee = 30; // 0.3% like Uniswap V2
    
    // AssetHub integration (simulated)
    uint32 public constant ASSETHUB_PARAID = 1000;
    mapping(address => uint32) public tokenToAssetId; // ERC20 => AssetHub Asset ID
    
    // Events
    event PoolCreated(address indexed tokenA, address indexed tokenB, uint256 swapFee);
    event LiquidityAdded(address indexed provider, address indexed token, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(address indexed provider, address indexed token, uint256 amountA, uint256 amountB);
    event Swapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event AssetHubSyncInitiated(uint32 assetId, uint256 amount, bytes32 xcmHash);
    
    constructor(address _usdp) Ownable(msg.sender) {
        require(_usdp != address(0), "Invalid USDP address");
        usdp = USDP(_usdp);
    }
    
    /**
     * @notice Create a new liquidity pool for token/USDP pair
     * @param token The faucet token or other asset
     * @param assetId AssetHub asset ID for the token
     */
    function createPool(
        address token,
        uint32 assetId
    ) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!pools[token].isActive, "Pool already exists");
        require(assetId > 0, "Invalid asset ID");
        
        pools[token] = Pool({
            tokenA: token,
            tokenB: address(usdp),
            reserveA: 0,
            reserveB: 0,
            totalLiquidity: 0,
            swapFeesBps: defaultSwapFee,
            isActive: true
        });
        
        supportedTokens[token] = true;
        poolTokens.push(token);
        tokenToAssetId[token] = assetId;
        
        emit PoolCreated(token, address(usdp), defaultSwapFee);
    }
    
    /**
     * @notice Add liquidity to a pool
     * @param token The non-USDP token in the pair
     * @param amountToken Amount of token to add
     * @param amountUSDPE Amount of USDP to add
     */
    function addLiquidity(
        address token,
        uint256 amountToken,
        uint256 amountUSDPE
    ) external nonReentrant whenNotPaused returns (uint256 liquidity) {
        Pool storage pool = pools[token];
        require(pool.isActive, "Pool not active");
        require(amountToken > 0 && amountUSDPE > 0, "Invalid amounts");
        
        // Transfer tokens from user
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amountToken),
            "Token transfer failed"
        );
        require(
            usdp.transferFrom(msg.sender, address(this), amountUSDPE),
            "USDP transfer failed"
        );
        
        if (pool.totalLiquidity == 0) {
            // First liquidity provider
            liquidity = sqrt(amountToken * amountUSDPE) - MIN_LIQUIDITY;
            pool.totalLiquidity = liquidity + MIN_LIQUIDITY;
            
            // Lock minimum liquidity
            lpPositions[token][address(0)].liquidity = MIN_LIQUIDITY;
        } else {
            // Subsequent providers
            uint256 liquidityToken = (amountToken * pool.totalLiquidity) / pool.reserveA;
            uint256 liquidityUSDPE = (amountUSDPE * pool.totalLiquidity) / pool.reserveB;
            liquidity = liquidityToken < liquidityUSDPE ? liquidityToken : liquidityUSDPE;
            pool.totalLiquidity += liquidity;
        }
        
        // Update reserves
        pool.reserveA += amountToken;
        pool.reserveB += amountUSDPE;
        
        // Update LP position
        LPPosition storage position = lpPositions[token][msg.sender];
        position.liquidity += liquidity;
        position.tokenADeposited += amountToken;
        position.tokenBDeposited += amountUSDPE;
        
        emit LiquidityAdded(msg.sender, token, amountToken, amountUSDPE);
        
        // Sync with AssetHub (simulated)
        _syncWithAssetHub(token, amountToken, true);
        
        return liquidity;
    }
    
    /**
     * @notice Swap tokens for USDP
     * @param tokenIn Token to swap from (faucet token)
     * @param amountIn Amount to swap
     * @param minAmountOut Minimum USDP to receive (slippage protection)
     */
    function swapForUSDPE(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        Pool storage pool = pools[tokenIn];
        require(pool.isActive, "Pool not active");
        require(amountIn > 0, "Invalid amount");
        
        // Calculate output amount using constant product formula
        uint256 amountInWithFee = (amountIn * (BPS_DENOMINATOR - pool.swapFeesBps));
        uint256 numerator = amountInWithFee * pool.reserveB;
        uint256 denominator = (pool.reserveA * BPS_DENOMINATOR) + amountInWithFee;
        amountOut = numerator / denominator;
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut < pool.reserveB, "Insufficient liquidity");
        
        // Transfer tokens
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "Token transfer failed"
        );
        require(
            usdp.transfer(msg.sender, amountOut),
            "USDP transfer failed"
        );
        
        // Update reserves
        pool.reserveA += amountIn;
        pool.reserveB -= amountOut;
        
        emit Swapped(msg.sender, tokenIn, address(usdp), amountIn, amountOut);
        
        // Sync with AssetHub
        _syncWithAssetHub(tokenIn, amountIn, true);
        
        return amountOut;
    }
    
    /**
     * @notice Swap USDP for other tokens
     * @param tokenOut Token to receive
     * @param amountIn USDP amount to swap
     * @param minAmountOut Minimum tokens to receive
     */
    function swapFromUSDPE(
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        Pool storage pool = pools[tokenOut];
        require(pool.isActive, "Pool not active");
        require(amountIn > 0, "Invalid amount");
        
        // Calculate output amount
        uint256 amountInWithFee = (amountIn * (BPS_DENOMINATOR - pool.swapFeesBps));
        uint256 numerator = amountInWithFee * pool.reserveA;
        uint256 denominator = (pool.reserveB * BPS_DENOMINATOR) + amountInWithFee;
        amountOut = numerator / denominator;
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut < pool.reserveA, "Insufficient liquidity");
        
        // Transfer tokens
        require(
            usdp.transferFrom(msg.sender, address(this), amountIn),
            "USDP transfer failed"
        );
        require(
            IERC20(tokenOut).transfer(msg.sender, amountOut),
            "Token transfer failed"
        );
        
        // Update reserves
        pool.reserveA -= amountOut;
        pool.reserveB += amountIn;
        
        emit Swapped(msg.sender, address(usdp), tokenOut, amountIn, amountOut);
        
        return amountOut;
    }
    
    /**
     * @notice Get swap output amount
     * @param tokenIn Input token
     * @param tokenOut Output token  
     * @param amountIn Input amount
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        Pool memory pool;
        
        if (tokenIn == address(usdp)) {
            pool = pools[tokenOut];
            require(pool.isActive, "Pool not active");
            
            uint256 amountInWithFee = (amountIn * (BPS_DENOMINATOR - pool.swapFeesBps));
            uint256 numerator = amountInWithFee * pool.reserveA;
            uint256 denominator = (pool.reserveB * BPS_DENOMINATOR) + amountInWithFee;
            amountOut = numerator / denominator;
        } else {
            pool = pools[tokenIn];
            require(pool.isActive, "Pool not active");
            require(tokenOut == address(usdp), "Invalid token pair");
            
            uint256 amountInWithFee = (amountIn * (BPS_DENOMINATOR - pool.swapFeesBps));
            uint256 numerator = amountInWithFee * pool.reserveB;
            uint256 denominator = (pool.reserveA * BPS_DENOMINATOR) + amountInWithFee;
            amountOut = numerator / denominator;
        }
        
        return amountOut;
    }
    
    /**
     * @notice Simulate sync with AssetHub liquidity pools
     * @dev In production, would send XCM to update AssetHub pool state
     */
    function _syncWithAssetHub(
        address token,
        uint256 amount,
        bool isDeposit
    ) private {
        uint32 assetId = tokenToAssetId[token];
        
        // Generate XCM hash for tracking
        bytes32 xcmHash = keccak256(
            abi.encodePacked(
                ASSETHUB_PARAID,
                assetId,
                amount,
                isDeposit,
                block.timestamp
            )
        );
        
        emit AssetHubSyncInitiated(assetId, amount, xcmHash);
        
        // In production:
        // 1. Send XCM to AssetHub with pool update
        // 2. AssetHub updates its pool state
        // 3. Maintains consistency across chains
    }
    
    /**
     * @notice Calculate square root (Babylonian method)
     */
    function sqrt(uint256 x) private pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
    
    /**
     * @notice Get pool information
     */
    function getPoolInfo(address token) external view returns (
        uint256 reserveToken,
        uint256 reserveUSDPE,
        uint256 totalLiquidity,
        uint256 swapFee
    ) {
        Pool memory pool = pools[token];
        return (pool.reserveA, pool.reserveB, pool.totalLiquidity, pool.swapFeesBps);
    }
    
    /**
     * @notice Pause swaps
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause swaps
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}