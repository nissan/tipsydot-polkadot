// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IXcmRouter.sol";

/**
 * @title TipsyDot - Cross-chain Crowdfunding on Polkadot
 * @notice Demonstrates Solidity smart contracts on Polkadot with XCM integration
 * @dev Uses AssetHub USDC (Asset ID 1337) for payments
 */
contract TipsyDotV2 {
    struct Campaign {
        string name;
        string description;
        address creator;
        uint32 destParaId;           // Target parachain ID
        bytes32 sovereignAccount;     // Parachain sovereign account on AssetHub
        uint256 totalRaised;          // Total USDC raised
        bool forwarded;
        uint256 createdAt;
    }
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => string[]) public campaignMemos;
    uint256 public nextCampaignId;
    
    // AssetHub USDC precompile on Passet Hub
    address public constant USDC_PRECOMPILE = address(0x0000000000000000000000000000000000000803); // Example
    uint32 public constant ASSET_HUB_PARAID = 1000;
    
    address public owner;
    
    event CampaignCreated(
        uint256 indexed campaignId,
        string name,
        uint32 destParaId,
        bytes32 sovereignAccount
    );
    
    event Tipped(
        uint256 indexed campaignId,
        address indexed tipper,
        uint256 amount,
        string memo
    );
    
    event ForwardedToSovereign(
        uint256 indexed campaignId,
        bytes32 sovereignAccount,
        uint256 amount,
        uint32 destParaId
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
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
            forwarded: false,
            createdAt: block.timestamp
        });
        
        emit CampaignCreated(campaignId, _name, _destParaId, sovereignAccount);
        
        return campaignId;
    }
    
    /**
     * @notice Tip a campaign with AssetHub USDC
     * @param _campaignId Campaign to tip
     * @param _amount Amount of USDC (with decimals)
     * @param _memo Optional message
     * @dev Uses AssetHub USDC (Asset ID 1337)
     */
    function tip(uint256 _campaignId, uint256 _amount, string memory _memo) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.createdAt > 0, "Campaign not found");
        require(!campaign.forwarded, "Already forwarded");
        require(_amount > 0, "Amount must be > 0");
        
        // Transfer AssetHub USDC from tipper to this contract
        // This would use the USDC precompile that bridges to AssetHub
        IERC20 usdc = IERC20(USDC_PRECOMPILE);
        require(
            usdc.transferFrom(msg.sender, address(this), _amount),
            "USDC transfer failed"
        );
        
        campaign.totalRaised += _amount;
        
        if (bytes(_memo).length > 0) {
            campaignMemos[_campaignId].push(_memo);
        }
        
        emit Tipped(_campaignId, msg.sender, _amount, _memo);
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
        
        // In production: Send USDC to parachain sovereign account on AssetHub
        // The parachain can then use these funds as needed
        // This demonstrates Solidity contracts interacting with Polkadot's native architecture
        
        IERC20 usdc = IERC20(USDC_PRECOMPILE);
        
        // Transfer to the sovereign account address
        // In reality, this would be an XCM call to AssetHub
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
     * @notice Get campaign details
     */
    function getCampaignDetails(uint256 _campaignId) external view returns (
        string memory name,
        string memory description,
        address creator,
        uint32 destParaId,
        bytes32 sovereignAccount,
        uint256 totalRaised,
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
            c.forwarded,
            c.createdAt
        );
    }
    
    /**
     * @notice Get all memos for a campaign
     */
    function getCampaignMemos(uint256 _campaignId) external view returns (string[] memory) {
        return campaignMemos[_campaignId];
    }
}