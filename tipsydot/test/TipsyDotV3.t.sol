// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/TipsyDotV3.sol";
import "../contracts/MockUSDC.sol";

// Test version that uses MockUSDC instead of precompile
contract TestTipsyDotV3 is TipsyDotV3 {
    address public immutable testUSDC;
    
    constructor(address _treasury, address _testUSDC) TipsyDotV3(_treasury) {
        testUSDC = _testUSDC;
    }
    
    function USDC_PRECOMPILE() public view override returns (address) {
        return testUSDC;
    }
}

contract TipsyDotV3Test is Test {
    TestTipsyDotV3 public tipsyDot;
    MockUSDC public usdc;
    
    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    
    uint256 constant INITIAL_BALANCE = 10000 * 10**6; // 10,000 USDC
    uint256 constant TIP_AMOUNT = 1000 * 10**6; // 1,000 USDC
    
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

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy MockUSDC
        usdc = new MockUSDC();
        
        // Deploy TestTipsyDotV3 with MockUSDC address
        tipsyDot = new TestTipsyDotV3(treasury, address(usdc));
        
        // Setup users with USDC
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        
        vm.stopPrank();
        
        // Users approve TipsyDot to spend their USDC
        vm.prank(user1);
        usdc.approve(address(tipsyDot), type(uint256).max);
        
        vm.prank(user2);
        usdc.approve(address(tipsyDot), type(uint256).max);
    }
    
    function testCreateCampaign() public {
        vm.startPrank(user1);
        
        uint256 campaignId = tipsyDot.createCampaign(
            "Test Campaign",
            "Test Description",
            2000
        );
        
        assertEq(campaignId, 0);
        
        (
            string memory name,
            string memory description,
            address creator,
            uint32 destParaId,
            ,
            uint256 totalRaised,
            uint256 protocolFeesCollected,
            bool forwarded,
            uint256 createdAt
        ) = tipsyDot.getCampaignDetails(0);
        
        assertEq(name, "Test Campaign");
        assertEq(description, "Test Description");
        assertEq(creator, user1);
        assertEq(destParaId, 2000);
        assertEq(totalRaised, 0);
        assertEq(protocolFeesCollected, 0);
        assertFalse(forwarded);
        assertGt(createdAt, 0);
        
        vm.stopPrank();
    }
    
    function testProtocolFeeCalculation() public view {
        (uint256 gross, uint256 fee, uint256 net) = tipsyDot.calculateProtocolFee(TIP_AMOUNT);
        
        assertEq(gross, TIP_AMOUNT);
        assertEq(fee, TIP_AMOUNT * 10 / 10000); // 0.1%
        assertEq(net, TIP_AMOUNT - fee);
        assertEq(fee, 1 * 10**6); // 1 USDC fee for 1000 USDC tip
    }
    
    function testTipWithProtocolFee() public {
        // Create campaign
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        // Record balances before
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        uint256 contractBalanceBefore = usdc.balanceOf(address(tipsyDot));
        
        // User2 tips the campaign
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        // Check balances
        assertEq(usdc.balanceOf(user2), user2BalanceBefore - TIP_AMOUNT);
        assertEq(usdc.balanceOf(address(tipsyDot)), contractBalanceBefore + TIP_AMOUNT);
        
        // Check campaign details
        (,,,,,uint256 totalRaised, uint256 protocolFeesCollected,,) = tipsyDot.getCampaignDetails(campaignId);
        assertEq(totalRaised, 999 * 10**6); // Net amount
        assertEq(protocolFeesCollected, 1 * 10**6); // Fee amount
        
        // Check protocol fee stats
        (uint256 totalCollected, uint256 currentBalance,,) = tipsyDot.getProtocolFeeStats();
        assertEq(totalCollected, 1 * 10**6);
        assertEq(currentBalance, 1 * 10**6);
    }
    
    function testMultipleTips() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        // Multiple tips
        vm.prank(user1);
        tipsyDot.tip(campaignId, 500 * 10**6, "Tip 1");
        
        vm.prank(user2);
        tipsyDot.tip(campaignId, 1500 * 10**6, "Tip 2");
        
        // Check totals
        (,,,,,uint256 totalRaised, uint256 protocolFeesCollected,,) = tipsyDot.getCampaignDetails(campaignId);
        
        // 500 USDC -> 499.5 net, 0.5 fee
        // 1500 USDC -> 1498.5 net, 1.5 fee
        assertEq(totalRaised, 1998 * 10**6); // 499.5 + 1498.5
        assertEq(protocolFeesCollected, 2 * 10**6); // 0.5 + 1.5
        
        (uint256 totalCollected, uint256 currentBalance,,) = tipsyDot.getProtocolFeeStats();
        assertEq(totalCollected, 2 * 10**6);
        assertEq(currentBalance, 2 * 10**6);
    }
    
    function testForwardCampaignFunds() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        // Get sovereign account address
        (,,,,bytes32 sovereignAccount,uint256 totalRaised,,,) = tipsyDot.getCampaignDetails(campaignId);
        address sovereignAddr = address(uint160(uint256(sovereignAccount)));
        
        uint256 sovereignBalanceBefore = usdc.balanceOf(sovereignAddr);
        
        // Forward funds
        tipsyDot.forwardToParachain(campaignId);
        
        // Check funds were transferred
        assertEq(usdc.balanceOf(sovereignAddr), sovereignBalanceBefore + totalRaised);
        
        // Check campaign is marked as forwarded
        (,,,,,,,bool forwarded,) = tipsyDot.getCampaignDetails(campaignId);
        assertTrue(forwarded);
    }
    
    function testCannotForwardEmptyCampaign() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        vm.expectRevert("Nothing to forward");
        tipsyDot.forwardToParachain(campaignId);
    }
    
    function testCannotForwardTwice() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        tipsyDot.forwardToParachain(campaignId);
        
        vm.expectRevert("Already forwarded");
        tipsyDot.forwardToParachain(campaignId);
    }
    
    function testCannotTipForwardedCampaign() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        tipsyDot.forwardToParachain(campaignId);
        
        vm.prank(user1);
        vm.expectRevert("Already forwarded");
        tipsyDot.tip(campaignId, 100 * 10**6, "Too late!");
    }
    
    function testWithdrawProtocolFees() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);
        
        // Only owner can withdraw
        vm.prank(user1);
        vm.expectRevert("Only owner");
        tipsyDot.withdrawProtocolFees(1 * 10**6);
        
        // Owner withdraws
        vm.prank(owner);
        tipsyDot.withdrawProtocolFees(1 * 10**6);
        
        assertEq(usdc.balanceOf(treasury), treasuryBalanceBefore + 1 * 10**6);
        
        (uint256 totalCollected, uint256 currentBalance,,) = tipsyDot.getProtocolFeeStats();
        assertEq(totalCollected, 1 * 10**6); // Total doesn't change
        assertEq(currentBalance, 0); // Balance depleted
    }
    
    function testInvalidCampaignOperations() public {
        // Cannot tip non-existent campaign
        vm.prank(user1);
        vm.expectRevert("Campaign not found");
        tipsyDot.tip(999, TIP_AMOUNT, "Oops");
        
        // Cannot forward non-existent campaign
        vm.expectRevert("Campaign not found");
        tipsyDot.forwardToParachain(999);
        
        // Cannot create campaign with empty name
        vm.expectRevert("Name required");
        tipsyDot.createCampaign("", "Desc", 2000);
        
        // Cannot create campaign with invalid parachain ID
        vm.expectRevert("Invalid parachain ID");
        tipsyDot.createCampaign("Test", "Desc", 0);
    }
    
    function testFuzz_ProtocolFeeCalculation(uint256 amount) public view {
        vm.assume(amount < 10**30); // Reasonable bounds
        
        (uint256 gross, uint256 fee, uint256 net) = tipsyDot.calculateProtocolFee(amount);
        
        assertEq(gross, amount);
        assertEq(fee, amount * 10 / 10000);
        assertEq(net, amount - fee);
        assertEq(gross, net + fee);
    }
}