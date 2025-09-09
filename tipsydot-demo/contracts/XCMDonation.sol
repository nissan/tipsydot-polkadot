// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title XCMDonation
 * @dev Cross-chain USDC donations using XCM via precompiles
 * Built for PBA Cohort 7 - Demonstrates real XCM transfers
 */
contract XCMDonation {
    // Precompile addresses on OmniNode with Revive
    address constant ASSETS_PRECOMPILE = 0x0000000000000000000000000000000000000802;
    address constant XCM_TRANSACTOR = 0x0000000000000000000000000000000000000803;
    
    uint32 constant USDC_ASSET_ID = 1337;
    uint32 constant ASSETHUB_PARA_ID = 1000;
    
    struct ParachainBuilder {
        string name;
        string project;
        bytes32 substrateAddress; // AccountId32
        uint32 paraId;
        uint256 totalReceived;
        bool active;
    }
    
    mapping(uint256 => ParachainBuilder) public builders;
    uint256 public builderCount;
    
    event XCMDonationSent(
        address indexed donor,
        uint256 indexed builderId,
        uint256 amount,
        uint32 destinationParaId,
        bytes32 destinationAccount,
        bytes32 messageHash
    );
    
    constructor() {
        // Pre-populate builders with their parachain IDs
        _addBuilder(
            "Alice - Moonbeam", 
            "EVM Smart Contracts for Polkadot",
            0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48, // Alice
            2004 // Moonbeam para ID
        );
        _addBuilder(
            "Bob - Astar",
            "WASM & EVM Multi-VM Platform", 
            0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d, // Bob
            2006 // Astar para ID
        );
        _addBuilder(
            "Charlie - Acala",
            "DeFi Hub of Polkadot",
            0x90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe22, // Charlie
            2000 // Acala para ID
        );
    }
    
    /**
     * @dev Donate USDC to a parachain builder using real XCM
     * @param builderId The ID of the builder to donate to
     * @param amount The amount of USDC to donate (with 6 decimals)
     */
    function donateViaXCM(uint256 builderId, uint256 amount) external {
        require(builders[builderId].active, "Invalid builder");
        require(amount >= 1e6, "Minimum donation is 1 USDC");
        require(amount <= 100000e6, "Maximum donation is 100,000 USDC");
        
        ParachainBuilder memory builder = builders[builderId];
        
        // 1. Transfer USDC from donor to contract using Assets precompile
        IAssets(ASSETS_PRECOMPILE).transferFrom(
            USDC_ASSET_ID,
            msg.sender,
            address(this),
            amount
        );
        
        // 2. Build XCM message for reserve transfer
        bytes memory xcmMessage = _buildReserveTransferXCM(
            builder.paraId,
            builder.substrateAddress,
            amount
        );
        
        // 3. Execute XCM via transactor precompile
        bytes32 messageHash = IXcmTransactor(XCM_TRANSACTOR).sendXcm(
            _buildDestination(builder.paraId),
            xcmMessage,
            amount // Include fee amount
        );
        
        // Update stats
        builders[builderId].totalReceived += amount;
        
        // Emit event
        emit XCMDonationSent(
            msg.sender,
            builderId,
            amount,
            builder.paraId,
            builder.substrateAddress,
            messageHash
        );
    }
    
    /**
     * @dev Build XCM reserve transfer message (V5)
     */
    function _buildReserveTransferXCM(
        uint32 paraId,
        bytes32 account,
        uint256 amount
    ) internal pure returns (bytes memory) {
        // XCM V5 message for reserve transfer
        // Based on Francisco Aguirre's pattern
        return abi.encode(
            uint8(5), // Version 5
            uint8(3), // Number of instructions
            
            // Instruction 1: WithdrawAsset
            uint8(0), // WithdrawAsset instruction
            abi.encode(
                1, // Number of assets
                // Asset: USDC
                0, // parents
                2, // interior type (X2)
                uint8(5), // PalletInstance
                uint8(50), // Pallet index
                uint8(4), // GeneralIndex
                uint32(1337), // USDC ID
                uint8(1), // Fungible
                amount
            ),
            
            // Instruction 2: BuyExecution
            uint8(3), // BuyExecution instruction
            abi.encode(
                // Fee asset (same as above)
                amount / 100, // 1% for fees
                uint8(0) // Unlimited weight
            ),
            
            // Instruction 3: DepositReserveAsset
            uint8(8), // DepositReserveAsset instruction
            abi.encode(
                uint8(0), // Wild All assets
                // Destination
                1, // parents
                1, // interior type (X1)
                uint8(0), // Parachain
                paraId,
                // Beneficiary XCM
                1, // Number of instructions
                uint8(7), // DepositAsset
                uint8(0), // Wild All
                // Beneficiary location
                0, // parents
                1, // interior type (X1)
                uint8(1), // AccountId32
                account,
                uint8(0) // Any network
            )
        );
    }
    
    /**
     * @dev Build destination multilocation
     */
    function _buildDestination(uint32 paraId) internal pure returns (bytes memory) {
        return abi.encode(
            1, // parents (up to relay chain)
            1, // interior type (X1)
            uint8(0), // Parachain junction
            paraId
        );
    }
    
    /**
     * @dev Add a new builder
     */
    function _addBuilder(
        string memory name,
        string memory project,
        bytes32 substrateAddress,
        uint32 paraId
    ) internal {
        builders[builderCount] = ParachainBuilder({
            name: name,
            project: project,
            substrateAddress: substrateAddress,
            paraId: paraId,
            totalReceived: 0,
            active: true
        });
        builderCount++;
    }
    
    /**
     * @dev Get builder information
     */
    function getBuilder(uint256 builderId) external view returns (
        string memory name,
        string memory project,
        bytes32 substrateAddress,
        uint32 paraId,
        uint256 totalReceived,
        bool active
    ) {
        ParachainBuilder memory builder = builders[builderId];
        return (
            builder.name,
            builder.project,
            builder.substrateAddress,
            builder.paraId,
            builder.totalReceived,
            builder.active
        );
    }
}

// Interfaces for precompiles
interface IAssets {
    function transferFrom(uint32 assetId, address from, address to, uint256 amount) external returns (bool);
    function transfer(uint32 assetId, address to, uint256 amount) external returns (bool);
    function approve(uint32 assetId, address spender, uint256 amount) external returns (bool);
    function balanceOf(uint32 assetId, address account) external view returns (uint256);
}

interface IXcmTransactor {
    function sendXcm(bytes memory dest, bytes memory message, uint256 feeAmount) external returns (bytes32);
    function queryXcmWeight(bytes memory message) external view returns (uint64);
}