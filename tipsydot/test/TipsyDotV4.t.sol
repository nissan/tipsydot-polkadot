// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/TipsyDotV4.sol";
import "../contracts/MockUSDC.sol";

contract TipsyDotV4Test is Test {
    TipsyDotV4 public tipsydot;
    MockUSDC public usdc;
    
    // Test accounts (Anvil default accounts)
    address constant OWNER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant TREASURY = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address constant ALICE = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address constant BOB = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
    address constant CHARLIE = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
    
    // Parachain IDs
    uint32 constant MOONBEAM_ID = 2004;
    uint32 constant HYDRATION_ID = 2090;
    uint32 constant ACALA_ID = 2000;
    
    event ParachainRegistered(uint32 indexed paraId, string name, address indexed evmAddress, address indexed registrar);
    event Tipped(uint32 indexed paraId, address indexed tipper, uint256 amount, uint256 protocolFee, string message);
    
    function setUp() public {
        vm.startPrank(OWNER);
        
        // Deploy contracts
        usdc = new MockUSDC();
        tipsydot = new TipsyDotV4(TREASURY, address(usdc));
        
        // Setup test environment
        _setupParachains();
        _fundAccounts();
        
        vm.stopPrank();
    }
    
    function _setupParachains() internal {
        // Register Moonbeam
        tipsydot.registerParachain(
            MOONBEAM_ID,
            "Moonbeam",
            "EVM-compatible smart contract platform",
            ALICE,
            bytes32(uint256(MOONBEAM_ID))
        );
        
        // Register Hydration
        tipsydot.registerParachain(
            HYDRATION_ID,
            "Hydration",
            "DeFi liquidity protocol",
            BOB,
            bytes32(uint256(HYDRATION_ID))
        );
        
        // Verify parachains
        tipsydot.verifyParachain(MOONBEAM_ID);
        tipsydot.verifyParachain(HYDRATION_ID);
    }
    
    function _fundAccounts() internal {
        // Mint USDC to test accounts
        usdc.mint(ALICE, 10000 * 10**6); // 10,000 USDC
        usdc.mint(BOB, 5000 * 10**6);    // 5,000 USDC
        usdc.mint(CHARLIE, 1000 * 10**6); // 1,000 USDC
    }
    
    function testParachainRegistration() public {
        vm.startPrank(CHARLIE);
        
        // Register new parachain
        vm.expectEmit(true, true, true, true);
        emit ParachainRegistered(ACALA_ID, "Acala", CHARLIE, CHARLIE);
        
        bool success = tipsydot.registerParachain(
            ACALA_ID,
            "Acala",
            "DeFi hub of Polkadot",
            CHARLIE,
            bytes32(uint256(ACALA_ID))
        );
        
        assertTrue(success, "Registration should succeed");
        
        // Check registration details
        (string memory name,, address evmAddr,,,, uint256 tipCount) = tipsydot.getParachainDetails(ACALA_ID);
        assertEq(name, "Acala");
        assertEq(evmAddr, CHARLIE);
        assertEq(tipCount, 0);
        
        vm.stopPrank();
    }
    
    function testTipping() public {
        uint256 tipAmount = 100 * 10**6; // 100 USDC
        uint256 expectedFee = (tipAmount * 10) / 10000; // 0.1% fee
        uint256 expectedNet = tipAmount - expectedFee;
        
        vm.startPrank(ALICE);
        
        // Approve USDC spending
        usdc.approve(address(tipsydot), tipAmount);
        
        // Tip Moonbeam
        vm.expectEmit(true, true, false, true);
        emit Tipped(MOONBEAM_ID, ALICE, expectedNet, expectedFee, "Great project!");
        
        bool success = tipsydot.tipParachain(
            MOONBEAM_ID,
            tipAmount,
            "Great project!"
        );
        
        assertTrue(success, "Tipping should succeed");
        
        // Verify balances
        assertEq(usdc.balanceOf(ALICE), 9900 * 10**6, "Alice balance should decrease");
        assertEq(usdc.balanceOf(address(tipsydot)), tipAmount, "Contract should hold funds");
        
        // Verify parachain stats
        (,,,,,uint256 totalReceived, uint256 tipCount) = tipsydot.getParachainDetails(MOONBEAM_ID);
        assertEq(totalReceived, expectedNet, "Parachain should receive net amount");
        assertEq(tipCount, 1, "Tip count should increment");
        
        // Verify protocol fees
        assertEq(tipsydot.protocolFeesBalance(), expectedFee, "Protocol fees should accumulate");
        
        vm.stopPrank();
    }
    
    function testMultipleTips() public {
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 50 * 10**6;  // 50 USDC
        amounts[1] = 100 * 10**6; // 100 USDC
        amounts[2] = 200 * 10**6; // 200 USDC
        
        // Alice tips multiple times
        vm.startPrank(ALICE);
        usdc.approve(address(tipsydot), 1000 * 10**6);
        
        for (uint i = 0; i < amounts.length; i++) {
            tipsydot.tipParachain(MOONBEAM_ID, amounts[i], string(abi.encodePacked("Tip ", vm.toString(i))));
        }
        vm.stopPrank();
        
        // Bob tips once
        vm.startPrank(BOB);
        usdc.approve(address(tipsydot), 500 * 10**6);
        tipsydot.tipParachain(MOONBEAM_ID, 500 * 10**6, "Big support!");
        vm.stopPrank();
        
        // Check tipper stats
        (uint256 totalTipped, uint256 tipCount, uint32[] memory supported,,) = tipsydot.getTipperStats(ALICE);
        assertEq(totalTipped, 350 * 10**6, "Alice total should be correct");
        assertEq(tipCount, 3, "Alice tip count should be 3");
        assertEq(supported.length, 1, "Alice supported 1 parachain");
        assertEq(supported[0], MOONBEAM_ID, "Alice supported Moonbeam");
    }
    
    function testForwardingFunds() public {
        // Setup: Tip some funds first
        vm.startPrank(ALICE);
        usdc.approve(address(tipsydot), 1000 * 10**6);
        tipsydot.tipParachain(MOONBEAM_ID, 1000 * 10**6, "Support!");
        vm.stopPrank();
        
        // Get initial balances
        uint256 moonbeamBalanceBefore = usdc.balanceOf(ALICE); // ALICE is Moonbeam's address
        
        // Forward funds
        vm.prank(OWNER);
        bool success = tipsydot.forwardToParachain(MOONBEAM_ID);
        assertTrue(success, "Forwarding should succeed");
        
        // Check balances
        uint256 expectedAmount = (1000 * 10**6 * 9990) / 10000; // Net after fee
        assertEq(usdc.balanceOf(ALICE), moonbeamBalanceBefore + expectedAmount, "Moonbeam should receive funds");
        
        // Check parachain balance is reset
        (,,,,,uint256 totalReceived,) = tipsydot.getParachainDetails(MOONBEAM_ID);
        assertEq(totalReceived, 0, "Parachain balance should be reset");
    }
    
    function testProtocolFeeWithdrawal() public {
        // Generate some fees
        vm.startPrank(ALICE);
        usdc.approve(address(tipsydot), 10000 * 10**6);
        tipsydot.tipParachain(MOONBEAM_ID, 10000 * 10**6, "Large tip!");
        vm.stopPrank();
        
        uint256 expectedFees = (10000 * 10**6 * 10) / 10000; // 10 USDC
        uint256 treasuryBalanceBefore = usdc.balanceOf(TREASURY);
        
        // Withdraw fees
        vm.prank(OWNER);
        tipsydot.withdrawProtocolFees(expectedFees);
        
        // Check treasury received fees
        assertEq(usdc.balanceOf(TREASURY), treasuryBalanceBefore + expectedFees, "Treasury should receive fees");
        assertEq(tipsydot.protocolFeesBalance(), 0, "Protocol fees should be withdrawn");
    }
    
    function testPauseUnpause() public {
        // Pause contract as owner
        vm.prank(OWNER);
        tipsydot.pause();
        
        // Try to tip while paused (should fail)
        vm.startPrank(ALICE);
        usdc.approve(address(tipsydot), 100 * 10**6);
        vm.expectRevert("Pausable: paused");
        tipsydot.tipParachain(MOONBEAM_ID, 100 * 10**6, "Test");
        vm.stopPrank();
        
        // Unpause as owner
        vm.prank(OWNER);
        tipsydot.unpause();
        
        // Now tipping should work
        vm.startPrank(ALICE);
        bool success = tipsydot.tipParachain(MOONBEAM_ID, 100 * 10**6, "Test");
        assertTrue(success, "Tipping should work after unpause");
        vm.stopPrank();
    }
    
    function testFeeCalculation() public {
        uint256[] memory testAmounts = new uint256[](4);
        testAmounts[0] = 100 * 10**6;   // 100 USDC
        testAmounts[1] = 1000 * 10**6;  // 1,000 USDC
        testAmounts[2] = 10000 * 10**6; // 10,000 USDC
        testAmounts[3] = 1 * 10**6;     // 1 USDC
        
        for (uint i = 0; i < testAmounts.length; i++) {
            (uint256 gross, uint256 fee, uint256 net) = tipsydot.calculateFee(testAmounts[i]);
            
            assertEq(gross, testAmounts[i], "Gross should match input");
            assertEq(fee, (testAmounts[i] * 10) / 10000, "Fee should be 0.1%");
            assertEq(net, testAmounts[i] - fee, "Net should be gross minus fee");
            assertEq(net + fee, gross, "Net + fee should equal gross");
        }
    }
    
    function testCannotTipUnregisteredParachain() public {
        vm.startPrank(ALICE);
        usdc.approve(address(tipsydot), 100 * 10**6);
        
        vm.expectRevert("Parachain not registered");
        tipsydot.tipParachain(9999, 100 * 10**6, "Test");
        
        vm.stopPrank();
    }
    
    function testCannotRegisterDuplicateParachain() public {
        vm.startPrank(CHARLIE);
        
        vm.expectRevert("Already registered");
        tipsydot.registerParachain(
            MOONBEAM_ID,
            "Duplicate",
            "Should fail",
            CHARLIE,
            bytes32(uint256(MOONBEAM_ID))
        );
        
        vm.stopPrank();
    }
    
    function testOnlyOwnerCanVerify() public {
        // Register new parachain as Charlie
        vm.prank(CHARLIE);
        tipsydot.registerParachain(
            ACALA_ID,
            "Acala",
            "DeFi hub",
            CHARLIE,
            bytes32(uint256(ACALA_ID))
        );
        
        // Try to verify as non-owner (should fail)
        vm.prank(ALICE);
        vm.expectRevert();
        tipsydot.verifyParachain(ACALA_ID);
        
        // Verify as owner (should succeed)
        vm.prank(OWNER);
        tipsydot.verifyParachain(ACALA_ID);
        
        (,,,,bool verified,,) = tipsydot.getParachainDetails(ACALA_ID);
        assertTrue(verified, "Parachain should be verified");
    }
    
    function testGetAllParachainIds() public {
        uint32[] memory ids = tipsydot.getAllParachainIds();
        assertEq(ids.length, 2, "Should have 2 parachains");
        assertEq(ids[0], MOONBEAM_ID, "First should be Moonbeam");
        assertEq(ids[1], HYDRATION_ID, "Second should be Hydration");
    }
}