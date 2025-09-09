// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IXcmRouter.sol";

contract TipsyDot {
    struct Campaign {
        string name;
        string description;
        address creator;
        address asset;
        bytes beneficiary;
        uint32 destParaId;
        uint256 totalRaised;
        bool forwarded;
        uint256 createdAt;
    }
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => string[]) public campaignMemos;
    uint256 public nextCampaignId;
    
    address public xcmRouter;
    address public owner;
    
    event CampaignCreated(
        uint256 indexed campaignId,
        string name,
        address indexed creator,
        address asset,
        uint32 destParaId
    );
    
    event Tipped(
        uint256 indexed campaignId,
        address indexed tipper,
        uint256 amount,
        string memo
    );
    
    event Forwarded(
        uint256 indexed campaignId,
        uint256 amount,
        uint32 destParaId
    );
    
    event XcmRouterSet(address indexed newRouter);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function createCampaign(
        string memory _name,
        string memory _description,
        address _asset,
        bytes memory _beneficiary,
        uint32 _destParaId
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Name required");
        require(_asset != address(0), "Invalid asset");
        require(_destParaId > 0, "Invalid parachain ID");
        require(_beneficiary.length > 0, "Beneficiary required");
        
        uint256 campaignId = nextCampaignId++;
        
        campaigns[campaignId] = Campaign({
            name: _name,
            description: _description,
            creator: msg.sender,
            asset: _asset,
            beneficiary: _beneficiary,
            destParaId: _destParaId,
            totalRaised: 0,
            forwarded: false,
            createdAt: block.timestamp
        });
        
        emit CampaignCreated(campaignId, _name, msg.sender, _asset, _destParaId);
        
        return campaignId;
    }
    
    function tip(uint256 _campaignId, uint256 _amount, string memory _memo) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.createdAt > 0, "Campaign not found");
        require(!campaign.forwarded, "Already forwarded");
        require(_amount > 0, "Amount must be > 0");
        
        IERC20 token = IERC20(campaign.asset);
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        
        campaign.totalRaised += _amount;
        
        if (bytes(_memo).length > 0) {
            campaignMemos[_campaignId].push(_memo);
        }
        
        emit Tipped(_campaignId, msg.sender, _amount, _memo);
    }
    
    function forward(uint256 _campaignId) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.createdAt > 0, "Campaign not found");
        require(!campaign.forwarded, "Already forwarded");
        require(campaign.totalRaised > 0, "Nothing to forward");
        require(xcmRouter != address(0), "XCM router not set");
        
        campaign.forwarded = true;
        
        IERC20 token = IERC20(campaign.asset);
        token.approve(xcmRouter, campaign.totalRaised);
        
        IXcmRouter(xcmRouter).transferAssets(
            campaign.asset,
            campaign.totalRaised,
            campaign.beneficiary,
            campaign.destParaId,
            5000000000
        );
        
        emit Forwarded(_campaignId, campaign.totalRaised, campaign.destParaId);
    }
    
    function tipAndForward(
        uint256 _campaignId,
        uint256 _amount,
        string memory _memo
    ) external {
        tip(_campaignId, _amount, _memo);
        forward(_campaignId);
    }
    
    function setXcmRouter(address _xcmRouter) external onlyOwner {
        require(_xcmRouter != address(0), "Invalid router");
        xcmRouter = _xcmRouter;
        emit XcmRouterSet(_xcmRouter);
    }
    
    function getCampaignMemos(uint256 _campaignId) external view returns (string[] memory) {
        return campaignMemos[_campaignId];
    }
    
    function getCampaignDetails(uint256 _campaignId) external view returns (
        string memory name,
        string memory description,
        address creator,
        address asset,
        bytes memory beneficiary,
        uint32 destParaId,
        uint256 totalRaised,
        bool forwarded,
        uint256 createdAt
    ) {
        Campaign memory c = campaigns[_campaignId];
        return (
            c.name,
            c.description,
            c.creator,
            c.asset,
            c.beneficiary,
            c.destParaId,
            c.totalRaised,
            c.forwarded,
            c.createdAt
        );
    }
}