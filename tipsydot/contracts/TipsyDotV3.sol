// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IXcmRouter.sol";

/**
 * @title TipsyDot - Sustainable Cross-chain Crowdfunding on Polkadot
 * @notice Demonstrates Solidity smart contracts on Polkadot with XCM integration
 * @dev Takes 0.1% protocol fee to cover parachain coretime costs
 */
contract TipsyDotV3 {
    struct Campaign {
        string name;
        string description;
        address creator;
        uint32 destParaId;           // Target parachain ID
        bytes32 sovereignAccount;     // Parachain sovereign account on AssetHub
        uint256 totalRaised;          // Total USDC raised (after fees)
        uint256 protocolFeesCollected; // Protocol fees from this campaign
        bool forwarded;
        uint256 createdAt;
    }
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => string[]) public campaignMemos;
    uint256 public nextCampaignId;
    
    // Protocol fee configuration (0.1% = 10 basis points)
    uint256 public constant PROTOCOL_FEE_BPS = 10; // 0.1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // TipsyDot parachain sovereign account for fee collection
    bytes32 public constant TIPSYDOT_SOVEREIGN = keccak256("TipsyDot_Parachain");
    uint256 public totalProtocolFeesCollected;
    uint256 public protocolFeesBalance;
    
    // AssetHub USDC precompile on Passet Hub
    function USDC_PRECOMPILE() public view virtual returns (address) {
        return address(0x0000000000000000000000000000000000000803); // Example
    }
    uint32 public constant ASSET_HUB_PARAID = 1000;
    uint32 public constant TIPSYDOT_PARAID = 3000; // Our parachain ID
    
    address public owner;
    address public treasury; // TipsyDot treasury for coretime costs
    
    event CampaignCreated(
        uint256 indexed campaignId,
        string name,
        uint32 destParaId,
        bytes32 sovereignAccount
    );
    
    event Tipped(
        uint256 indexed campaignId,
        address indexed tipper,
        uint256 grossAmount,
        uint256 netAmount,
        uint256 protocolFee,
        string memo
    );
    
    event ForwardedToSovereign(
        uint256 indexed campaignId,
        bytes32 sovereignAccount,
        uint256 amount,
        uint32 destParaId
    );
    
    event ProtocolFeesWithdrawn(
        address indexed to,
        uint256 amount,
        string purpose
    );
    
    event CoretimeFunded(
        uint256 amount,
        uint256 estimatedDays,
        string message
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;
    }
    
    /**
     * @notice Create a campaign targeting a specific parachain
     * @param _name Campaign name
     * @param _description Campaign description
     * @param _destParaId Target parachain ID
     * @dev The sovereign account is calculated as the parachain's account on AssetHub
     */
    function createCampaign(
        string memory _name,
        string memory _description,
        uint32 _destParaId
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Name required");
        require(_destParaId > 0, "Invalid parachain ID");
        
        uint256 campaignId = nextCampaignId++;
        
        // Calculate parachain sovereign account on AssetHub
        // In production, this would be the actual sovereign account derivation
        bytes32 sovereignAccount = keccak256(abi.encodePacked("para", _destParaId));
        
        campaigns[campaignId] = Campaign({
            name: _name,
            description: _description,
            creator: msg.sender,
            destParaId: _destParaId,
            sovereignAccount: sovereignAccount,
            totalRaised: 0,
            protocolFeesCollected: 0,
            forwarded: false,
            createdAt: block.timestamp
        });
        
        emit CampaignCreated(campaignId, _name, _destParaId, sovereignAccount);
        
        return campaignId;
    }
    
    /**
     * @notice Tip a campaign with AssetHub USDC (0.1% protocol fee applied)
     * @param _campaignId Campaign to tip
     * @param _amount Gross amount of USDC (with decimals)
     * @param _memo Optional message
     * @dev Uses AssetHub USDC (Asset ID 1337), deducts 0.1% for coretime costs
     */
    function tip(uint256 _campaignId, uint256 _amount, string memory _memo) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.createdAt > 0, "Campaign not found");
        require(!campaign.forwarded, "Already forwarded");
        require(_amount > 0, "Amount must be > 0");
        
        // Calculate protocol fee (0.1%)
        uint256 protocolFee = (_amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = _amount - protocolFee;
        
        // Transfer AssetHub USDC from tipper to this contract
        IERC20 usdc = IERC20(USDC_PRECOMPILE());
        require(
            usdc.transferFrom(msg.sender, address(this), _amount),
            "USDC transfer failed"
        );
        
        // Update campaign with net amount (after fee)
        campaign.totalRaised += netAmount;
        campaign.protocolFeesCollected += protocolFee;
        
        // Track total protocol fees
        protocolFeesBalance += protocolFee;
        totalProtocolFeesCollected += protocolFee;
        
        if (bytes(_memo).length > 0) {
            campaignMemos[_campaignId].push(_memo);
        }
        
        emit Tipped(_campaignId, msg.sender, _amount, netAmount, protocolFee, _memo);
    }
    
    /**
     * @notice Forward collected USDC to parachain sovereign account on AssetHub
     * @param _campaignId Campaign to forward
     * @dev Sends USDC to the parachain's sovereign account on AssetHub
     */
    function forwardToParachain(uint256 _campaignId) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.createdAt > 0, "Campaign not found");
        require(!campaign.forwarded, "Already forwarded");
        require(campaign.totalRaised > 0, "Nothing to forward");
        
        campaign.forwarded = true;
        
        // Send USDC to parachain sovereign account on AssetHub
        IERC20 usdc = IERC20(USDC_PRECOMPILE());
        
        // Transfer to the sovereign account address
        address sovereignAddress = address(uint160(uint256(campaign.sovereignAccount)));
        usdc.transfer(sovereignAddress, campaign.totalRaised);
        
        emit ForwardedToSovereign(
            _campaignId,
            campaign.sovereignAccount,
            campaign.totalRaised,
            campaign.destParaId
        );
    }
    
    /**
     * @notice Withdraw protocol fees to fund coretime costs
     * @param _amount Amount to withdraw
     * @dev Only owner can withdraw to treasury for coretime purchases
     */
    function withdrawProtocolFees(uint256 _amount) external onlyOwner {
        require(_amount <= protocolFeesBalance, "Insufficient protocol fees");
        
        protocolFeesBalance -= _amount;
        
        IERC20 usdc = IERC20(USDC_PRECOMPILE());
        usdc.transfer(treasury, _amount);
        
        emit ProtocolFeesWithdrawn(treasury, _amount, "Coretime funding");
    }
    
    /**
     * @notice Fund parachain coretime on Polkadot relay chain
     * @param _amount Amount of USDC to allocate for coretime
     * @dev This demonstrates how protocol fees sustain the parachain
     */
    function fundCoretime(uint256 _amount) external onlyOwner {
        require(_amount <= protocolFeesBalance, "Insufficient protocol fees");
        
        protocolFeesBalance -= _amount;
        
        // In production: Convert USDC to DOT and purchase coretime
        // For demo: Transfer to TipsyDot parachain sovereign account
        IERC20 usdc = IERC20(USDC_PRECOMPILE());
        address tipsydotSovereign = address(uint160(uint256(TIPSYDOT_SOVEREIGN)));
        usdc.transfer(tipsydotSovereign, _amount);
        
        // Estimate coretime coverage (example: 100 USDC = 1 day)
        uint256 estimatedDays = _amount / (100 * 10**6); // Assuming USDC has 6 decimals
        
        emit CoretimeFunded(
            _amount, 
            estimatedDays,
            "Protocol fees funding parachain coretime"
        );
    }
    
    /**
     * @notice View protocol fee statistics
     */
    function getProtocolFeeStats() external view returns (
        uint256 totalCollected,
        uint256 currentBalance,
        uint256 feePercentage,
        uint256 estimatedCoretimeDays
    ) {
        uint256 estimatedDays = protocolFeesBalance / (100 * 10**6); // 100 USDC per day estimate
        
        return (
            totalProtocolFeesCollected,
            protocolFeesBalance,
            PROTOCOL_FEE_BPS,
            estimatedDays
        );
    }
    
    /**
     * @notice Demonstrates Solidity + XCM: Tip and forward in one transaction
     */
    function tipAndForward(
        uint256 _campaignId,
        uint256 _amount,
        string memory _memo
    ) external {
        tip(_campaignId, _amount, _memo);
        forwardToParachain(_campaignId);
    }
    
    /**
     * @notice Get campaign details including fees
     */
    function getCampaignDetails(uint256 _campaignId) external view returns (
        string memory name,
        string memory description,
        address creator,
        uint32 destParaId,
        bytes32 sovereignAccount,
        uint256 totalRaised,
        uint256 protocolFeesCollected,
        bool forwarded,
        uint256 createdAt
    ) {
        Campaign memory c = campaigns[_campaignId];
        return (
            c.name,
            c.description,
            c.creator,
            c.destParaId,
            c.sovereignAccount,
            c.totalRaised,
            c.protocolFeesCollected,
            c.forwarded,
            c.createdAt
        );
    }
    
    /**
     * @notice Calculate fee for a given tip amount
     */
    function calculateProtocolFee(uint256 _tipAmount) external pure returns (
        uint256 grossAmount,
        uint256 protocolFee,
        uint256 netAmount
    ) {
        protocolFee = (_tipAmount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        netAmount = _tipAmount - protocolFee;
        return (_tipAmount, protocolFee, netAmount);
    }
    
    /**
     * @notice Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
}