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

contract TipsyDotV3SecurityTest is Test {
    TestTipsyDotV3 public tipsyDot;
    MockUSDC public usdc;
    
    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    address public attacker = address(0x666);
    
    uint256 constant INITIAL_BALANCE = 10000 * 10**6; // 10,000 USDC
    uint256 constant TIP_AMOUNT = 1000 * 10**6; // 1,000 USDC
    
    event SecurityAlert(string message, address suspicious, uint256 amount);

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy MockUSDC
        usdc = new MockUSDC();
        
        // Deploy TestTipsyDotV3 with MockUSDC address
        tipsyDot = new TestTipsyDotV3(treasury, address(usdc));
        
        // Setup users with USDC
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdc.mint(attacker, INITIAL_BALANCE);
        
        vm.stopPrank();
        
        // Users approve TipsyDot to spend their USDC
        vm.prank(user1);
        usdc.approve(address(tipsyDot), type(uint256).max);
        
        vm.prank(user2);
        usdc.approve(address(tipsyDot), type(uint256).max);
        
        vm.prank(attacker);
        usdc.approve(address(tipsyDot), type(uint256).max);
    }
    
    /**
     * @notice Test that tip amounts are correctly transferred with no hidden fees
     * @dev Verifies exact amounts to detect any malicious fee injection
     */
    function testExactTransferAmounts() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        // Record ALL balances before transaction
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        uint256 contractBalanceBefore = usdc.balanceOf(address(tipsyDot));
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);
        uint256 attackerBalanceBefore = usdc.balanceOf(attacker);
        
        // Calculate expected amounts
        uint256 expectedFee = (TIP_AMOUNT * 10) / 10000; // 0.1%
        uint256 expectedNet = TIP_AMOUNT - expectedFee;
        
        // User2 tips the campaign
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        // Verify EXACT amounts - no hidden transfers
        assertEq(
            usdc.balanceOf(user2), 
            user2BalanceBefore - TIP_AMOUNT,
            "User balance mismatch - possible theft!"
        );
        
        assertEq(
            usdc.balanceOf(address(tipsyDot)), 
            contractBalanceBefore + TIP_AMOUNT,
            "Contract didn't receive full amount - possible redirect!"
        );
        
        // Ensure no funds went to attacker
        assertEq(
            usdc.balanceOf(attacker), 
            attackerBalanceBefore,
            "CRITICAL: Funds sent to attacker address!"
        );
        
        // Ensure treasury hasn't received funds yet
        assertEq(
            usdc.balanceOf(treasury), 
            treasuryBalanceBefore,
            "Treasury received funds prematurely!"
        );
        
        // Verify campaign accounting
        (,,,,,uint256 totalRaised, uint256 protocolFeesCollected,,) = tipsyDot.getCampaignDetails(campaignId);
        assertEq(totalRaised, expectedNet, "Campaign raised amount mismatch!");
        assertEq(protocolFeesCollected, expectedFee, "Protocol fee mismatch!");
    }
    
    /**
     * @notice Test that forwarding sends exact amounts to correct destination
     * @dev Critical test to ensure no fund redirection
     */
    function testForwardingIntegrity() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        // Get the intended recipient
        (,,,,bytes32 sovereignAccount,uint256 totalRaised,,,) = tipsyDot.getCampaignDetails(campaignId);
        address intendedRecipient = address(uint160(uint256(sovereignAccount)));
        
        // Record balances before forwarding
        uint256 recipientBalanceBefore = usdc.balanceOf(intendedRecipient);
        uint256 contractBalanceBefore = usdc.balanceOf(address(tipsyDot));
        uint256 attackerBalanceBefore = usdc.balanceOf(attacker);
        
        // Forward funds
        tipsyDot.forwardToParachain(campaignId);
        
        // Verify EXACT transfer to intended recipient
        assertEq(
            usdc.balanceOf(intendedRecipient),
            recipientBalanceBefore + totalRaised,
            "CRITICAL: Incorrect amount forwarded to sovereign account!"
        );
        
        // Verify contract balance decreased by exact amount
        assertEq(
            usdc.balanceOf(address(tipsyDot)),
            contractBalanceBefore - totalRaised,
            "Contract balance mismatch after forwarding!"
        );
        
        // Ensure no funds went to attacker
        assertEq(
            usdc.balanceOf(attacker),
            attackerBalanceBefore,
            "CRITICAL: Funds redirected to attacker during forwarding!"
        );
    }
    
    /**
     * @notice Test protocol fee withdrawal integrity
     * @dev Ensures fees go only to treasury, not elsewhere
     */
    function testProtocolFeeWithdrawalIntegrity() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        uint256 expectedFee = (TIP_AMOUNT * 10) / 10000; // 0.1%
        
        // Record balances before withdrawal
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);
        uint256 contractBalanceBefore = usdc.balanceOf(address(tipsyDot));
        uint256 attackerBalanceBefore = usdc.balanceOf(attacker);
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        
        // Owner withdraws protocol fees
        vm.prank(owner);
        tipsyDot.withdrawProtocolFees(expectedFee);
        
        // Verify EXACT transfer to treasury
        assertEq(
            usdc.balanceOf(treasury),
            treasuryBalanceBefore + expectedFee,
            "Treasury didn't receive exact fee amount!"
        );
        
        // Verify contract balance decreased by exact amount
        assertEq(
            usdc.balanceOf(address(tipsyDot)),
            contractBalanceBefore - expectedFee,
            "Contract balance mismatch after fee withdrawal!"
        );
        
        // Ensure no funds went to attacker
        assertEq(
            usdc.balanceOf(attacker),
            attackerBalanceBefore,
            "CRITICAL: Protocol fees redirected to attacker!"
        );
        
        // Ensure owner didn't receive funds (should go to treasury)
        assertEq(
            usdc.balanceOf(owner),
            ownerBalanceBefore,
            "Owner received funds instead of treasury!"
        );
    }
    
    /**
     * @notice Test multiple tips to detect cumulative theft
     * @dev Small thefts might accumulate - this detects them
     */
    function testCumulativeTransferIntegrity() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        uint256 totalTipped = 0;
        uint256 totalExpectedFees = 0;
        uint256 totalExpectedNet = 0;
        
        uint256 initialContractBalance = usdc.balanceOf(address(tipsyDot));
        uint256 initialAttackerBalance = usdc.balanceOf(attacker);
        
        // Multiple small tips
        for (uint i = 0; i < 10; i++) {
            uint256 tipAmount = 100 * 10**6; // 100 USDC each
            uint256 expectedFee = (tipAmount * 10) / 10000;
            uint256 expectedNet = tipAmount - expectedFee;
            
            vm.prank(user2);
            tipsyDot.tip(campaignId, tipAmount, "Tip");
            
            totalTipped += tipAmount;
            totalExpectedFees += expectedFee;
            totalExpectedNet += expectedNet;
        }
        
        // Verify exact totals
        assertEq(
            usdc.balanceOf(address(tipsyDot)),
            initialContractBalance + totalTipped,
            "Contract balance doesn't match total tips!"
        );
        
        // Ensure no cumulative theft to attacker
        assertEq(
            usdc.balanceOf(attacker),
            initialAttackerBalance,
            "CRITICAL: Cumulative theft detected to attacker!"
        );
        
        // Verify campaign totals
        (,,,,,uint256 totalRaised, uint256 protocolFeesCollected,,) = tipsyDot.getCampaignDetails(campaignId);
        assertEq(totalRaised, totalExpectedNet, "Campaign total mismatch - possible skimming!");
        assertEq(protocolFeesCollected, totalExpectedFees, "Fee total mismatch - possible fee manipulation!");
    }
    
    /**
     * @notice Fuzz test to detect any amount manipulation
     * @dev Tests random amounts to catch edge cases
     */
    function testFuzz_TransferIntegrity(uint256 amount) public {
        // Bound to reasonable amounts
        vm.assume(amount > 10**6 && amount < 10**12); // Between 1 and 1M USDC
        
        // Setup
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Fuzz", "Test", 3000);
        
        // Mint exact amount needed
        usdc.mint(user2, amount);
        
        // Record initial state
        uint256 contractBalanceBefore = usdc.balanceOf(address(tipsyDot));
        uint256 attackerBalanceBefore = usdc.balanceOf(attacker);
        
        // Calculate expected values
        uint256 expectedFee = (amount * 10) / 10000;
        uint256 expectedNet = amount - expectedFee;
        
        // Tip
        vm.prank(user2);
        tipsyDot.tip(campaignId, amount, "Fuzz tip");
        
        // Verify integrity
        assertEq(
            usdc.balanceOf(address(tipsyDot)),
            contractBalanceBefore + amount,
            "Fuzz: Contract didn't receive full amount!"
        );
        
        assertEq(
            usdc.balanceOf(attacker),
            attackerBalanceBefore,
            "Fuzz: Funds leaked to attacker!"
        );
        
        // Verify campaign accounting
        (,,,,,uint256 totalRaised, uint256 protocolFeesCollected,,) = tipsyDot.getCampaignDetails(campaignId);
        assertEq(totalRaised, expectedNet, "Fuzz: Net amount mismatch!");
        assertEq(protocolFeesCollected, expectedFee, "Fuzz: Fee calculation mismatch!");
    }
    
    /**
     * @notice Test for reentrancy protection
     * @dev Ensures no double-spending via reentrancy
     */
    function testReentrancyProtection() public {
        vm.prank(user1);
        uint256 campaignId = tipsyDot.createCampaign("Test", "Desc", 2000);
        
        vm.prank(user2);
        tipsyDot.tip(campaignId, TIP_AMOUNT, "Support!");
        
        uint256 balanceBefore = usdc.balanceOf(address(tipsyDot));
        
        // Try to forward twice in same transaction (should fail)
        tipsyDot.forwardToParachain(campaignId);
        
        vm.expectRevert("Already forwarded");
        tipsyDot.forwardToParachain(campaignId);
        
        // Verify no double-spending occurred
        (,,,,bytes32 sovereignAccount,uint256 totalRaised,,,) = tipsyDot.getCampaignDetails(campaignId);
        address recipient = address(uint160(uint256(sovereignAccount)));
        
        assertEq(
            usdc.balanceOf(recipient),
            totalRaised,
            "Double-spending detected!"
        );
    }
}