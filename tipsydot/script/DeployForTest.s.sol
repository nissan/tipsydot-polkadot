// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/TipsyDotV3.sol";
import "../contracts/MockUSDC.sol";

// Test version of TipsyDot that overrides USDC_PRECOMPILE
contract TestTipsyDotV3 is TipsyDotV3 {
    address public immutable testUSDC;
    
    constructor(address _treasury, address _testUSDC) TipsyDotV3(_treasury) {
        testUSDC = _testUSDC;
    }
    
    function USDC_PRECOMPILE() public view override returns (address) {
        return testUSDC;
    }
}

contract DeployForTestScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));
        
        // Deploy TestTipsyDotV3 with MockUSDC
        TestTipsyDotV3 tipsyDot = new TestTipsyDotV3(treasury, address(usdc));
        console.log("TestTipsyDotV3 deployed at:", address(tipsyDot));
        
        vm.stopBroadcast();
    }
}