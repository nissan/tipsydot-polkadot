// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TipsyDotNFT - Dynamic NFT Rewards for Tippers
 * @notice NFTs with traits based on tip amount, parachain, and block hash
 * @dev CryptoZombies-style collectible with on-chain metadata
 */
contract TipsyDotNFT is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint256;
    
    // NFT Traits
    struct TipCard {
        uint256 tipAmount;      // Amount tipped (affects rarity)
        uint32 paraId;          // Parachain tipped to
        uint256 blockNumber;    // Block when tipped
        uint8 rarity;           // 0: Common, 1: Rare, 2: Epic, 3: Legendary
        uint8 background;       // Background pattern (0-7)
        uint8 border;           // Border style (0-7)
        uint8 emblem;           // Parachain emblem (0-15)
        uint8 sparkle;          // Sparkle effect (0-3)
        uint256 power;          // Power level based on amount
        uint256 generosity;     // Generosity score
        string message;         // Tip message
        uint256 mintedAt;       // When NFT was minted
    }
    
    // State variables
    mapping(uint256 => TipCard) public tipCards;
    mapping(address => uint256[]) public userCards;
    mapping(uint32 => string) public parachainNames;
    
    uint256 public nextTokenId = 1;
    address public tipsyDotContract;
    
    // Rarity thresholds (in USDP with 6 decimals)
    uint256 public constant RARE_THRESHOLD = 100 * 10**6;      // 100 USDP
    uint256 public constant EPIC_THRESHOLD = 1000 * 10**6;     // 1,000 USDP
    uint256 public constant LEGENDARY_THRESHOLD = 10000 * 10**6; // 10,000 USDP
    
    // Color schemes for different rarities
    string[4] public rarityColors = [
        "#C0C0C0", // Common - Silver
        "#4169E1", // Rare - Royal Blue
        "#9400D3", // Epic - Violet
        "#FFD700"  // Legendary - Gold
    ];
    
    string[4] public rarityNames = ["Common", "Rare", "Epic", "Legendary"];
    
    // Events
    event TipCardMinted(
        address indexed tipper,
        uint256 indexed tokenId,
        uint32 paraId,
        uint8 rarity
    );
    
    constructor(address _tipsyDotContract) 
        ERC721("TipsyDot Tip Cards", "TIPCARD") 
        Ownable(msg.sender) 
    {
        tipsyDotContract = _tipsyDotContract;
        
        // Initialize parachain names
        parachainNames[2004] = "Moonbeam";
        parachainNames[2090] = "Hydration";
        parachainNames[2000] = "Acala";
        parachainNames[2032] = "Interlay";
        parachainNames[1000] = "AssetHub";
        parachainNames[1111] = "PassetHub";
    }
    
    /**
     * @notice Mint a tip card NFT for a tipper
     * @param tipper Address of the tipper
     * @param tipAmount Amount tipped
     * @param paraId Parachain ID tipped to
     * @param message Tip message
     */
    function mintTipCard(
        address tipper,
        uint256 tipAmount,
        uint32 paraId,
        string memory message
    ) external returns (uint256 tokenId) {
        require(msg.sender == tipsyDotContract || msg.sender == owner(), "Unauthorized");
        
        tokenId = nextTokenId++;
        
        // Generate pseudo-random traits based on inputs
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            tipper,
            tipAmount,
            paraId,
            tokenId
        )));
        
        // Determine rarity based on tip amount
        uint8 rarity = calculateRarity(tipAmount);
        
        // Generate traits from seed
        uint8 background = uint8((seed >> 8) % 8);
        uint8 border = uint8((seed >> 16) % 8);
        uint8 emblem = uint8((seed >> 24) % 16);
        uint8 sparkle = uint8((seed >> 32) % 4);
        
        // Calculate power and generosity scores
        uint256 power = calculatePower(tipAmount, rarity);
        uint256 generosity = calculateGenerosity(tipAmount, userCards[tipper].length);
        
        // Create and store the tip card
        tipCards[tokenId] = TipCard({
            tipAmount: tipAmount,
            paraId: paraId,
            blockNumber: block.number,
            rarity: rarity,
            background: background,
            border: border,
            emblem: emblem,
            sparkle: sparkle,
            power: power,
            generosity: generosity,
            message: message,
            mintedAt: block.timestamp
        });
        
        userCards[tipper].push(tokenId);
        _safeMint(tipper, tokenId);
        
        emit TipCardMinted(tipper, tokenId, paraId, rarity);
        
        return tokenId;
    }
    
    /**
     * @notice Calculate rarity based on tip amount
     */
    function calculateRarity(uint256 amount) public pure returns (uint8) {
        if (amount >= LEGENDARY_THRESHOLD) return 3;
        if (amount >= EPIC_THRESHOLD) return 2;
        if (amount >= RARE_THRESHOLD) return 1;
        return 0;
    }
    
    /**
     * @notice Calculate power level
     */
    function calculatePower(uint256 amount, uint8 rarity) public pure returns (uint256) {
        uint256 basePower = amount / 10**6; // Convert to whole USDP
        uint256 rarityMultiplier = (rarity + 1) * 25;
        return basePower * rarityMultiplier / 10;
    }
    
    /**
     * @notice Calculate generosity score
     */
    function calculateGenerosity(uint256 amount, uint256 previousTips) public pure returns (uint256) {
        uint256 baseGenerosity = amount / 10**5; // Scale down
        uint256 loyaltyBonus = previousTips * 10;
        return baseGenerosity + loyaltyBonus;
    }
    
    /**
     * @notice Generate SVG image for the card
     */
    function generateSVG(uint256 tokenId) public view returns (string memory) {
        TipCard memory card = tipCards[tokenId];
        string memory parachainName = parachainNames[card.paraId];
        if (bytes(parachainName).length == 0) {
            parachainName = string(abi.encodePacked("Parachain #", uint256(card.paraId).toString()));
        }
        
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 500">',
            '<defs>',
                '<linearGradient id="bg', tokenId.toString(), '" x1="0%" y1="0%" x2="100%" y2="100%">',
                    '<stop offset="0%" style="stop-color:', rarityColors[card.rarity], ';stop-opacity:0.8"/>',
                    '<stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1"/>',
                '</linearGradient>',
                generateSparkleFilter(card.sparkle),
            '</defs>',
            '<rect width="350" height="500" rx="15" fill="url(#bg', tokenId.toString(), ')"/>',
            '<rect x="10" y="10" width="330" height="480" rx="10" fill="none" stroke="', rarityColors[card.rarity], '" stroke-width="3"/>',
            generateCardContent(tokenId, card, parachainName),
            '</svg>'
        ));
    }
    
    /**
     * @notice Generate card content
     */
    function generateCardContent(uint256 tokenId, TipCard memory card, string memory parachainName) 
        private 
        view 
        returns (string memory) 
    {
        return string(abi.encodePacked(
            // Title
            '<text x="175" y="40" text-anchor="middle" fill="white" font-size="24" font-weight="bold">TipsyDot Card</text>',
            '<text x="175" y="65" text-anchor="middle" fill="', rarityColors[card.rarity], '" font-size="18">', rarityNames[card.rarity], '</text>',
            
            // Center emblem/logo area
            '<circle cx="175" cy="150" r="60" fill="none" stroke="', rarityColors[card.rarity], '" stroke-width="2" opacity="0.5"/>',
            '<text x="175" y="140" text-anchor="middle" fill="white" font-size="48">TIPSY</text>',
            '<text x="175" y="170" text-anchor="middle" fill="white" font-size="14">', parachainName, '</text>',
            
            // Stats
            '<text x="30" y="260" fill="white" font-size="14">Power</text>',
            '<text x="320" y="260" text-anchor="end" fill="', rarityColors[card.rarity], '" font-size="16" font-weight="bold">', card.power.toString(), '</text>',
            
            '<text x="30" y="290" fill="white" font-size="14">Generosity</text>',
            '<text x="320" y="290" text-anchor="end" fill="', rarityColors[card.rarity], '" font-size="16" font-weight="bold">', card.generosity.toString(), '</text>',
            
            '<text x="30" y="320" fill="white" font-size="14">Amount</text>',
            '<text x="320" y="320" text-anchor="end" fill="white" font-size="14">', formatAmount(card.tipAmount), ' USDP</text>',
            
            '<text x="30" y="350" fill="white" font-size="14">Block</text>',
            '<text x="320" y="350" text-anchor="end" fill="white" font-size="14">#', card.blockNumber.toString(), '</text>',
            
            // Message (if exists)
            generateMessage(card.message),
            
            // Card ID
            '<text x="175" y="470" text-anchor="middle" fill="gray" font-size="12">#', tokenId.toString(), '</text>'
        ));
    }
    
    /**
     * @notice Generate sparkle filter for legendary cards
     */
    function generateSparkleFilter(uint8 sparkleLevel) private pure returns (string memory) {
        if (sparkleLevel == 0) return '';
        
        return string(abi.encodePacked(
            '<filter id="sparkle">',
                '<feTurbulence baseFrequency="0.02" numOctaves="', uint256(sparkleLevel).toString(), '" result="turbulence"/>',
                '<feComposite in="turbulence" in2="SourceGraphic" operator="multiply"/>',
            '</filter>'
        ));
    }
    
    /**
     * @notice Generate message display
     */
    function generateMessage(string memory message) private pure returns (string memory) {
        if (bytes(message).length == 0) return '';
        
        // Truncate long messages
        string memory displayMessage = message;
        if (bytes(message).length > 30) {
            displayMessage = string(abi.encodePacked(substring(message, 0, 27), "..."));
        }
        
        return string(abi.encodePacked(
            '<rect x="20" y="380" width="310" height="60" rx="5" fill="black" opacity="0.3"/>',
            '<text x="175" y="415" text-anchor="middle" fill="white" font-size="12" font-style="italic">"', displayMessage, '"</text>'
        ));
    }
    
    /**
     * @notice Format amount for display
     */
    function formatAmount(uint256 amount) private pure returns (string memory) {
        uint256 whole = amount / 10**6;
        uint256 decimal = (amount % 10**6) / 10**4; // Show 2 decimal places
        return string(abi.encodePacked(whole.toString(), ".", decimal.toString()));
    }
    
    /**
     * @notice Get token URI with on-chain metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        TipCard memory card = tipCards[tokenId];
        string memory parachainName = parachainNames[card.paraId];
        if (bytes(parachainName).length == 0) {
            parachainName = string(abi.encodePacked("Parachain #", uint256(card.paraId).toString()));
        }
        
        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "TipsyDot Card #', tokenId.toString(), '",',
            '"description": "A collectible tip card earned by supporting ', parachainName, ' on TipsyDot.",',
            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(generateSVG(tokenId))), '",',
            '"attributes": [',
                '{"trait_type": "Rarity", "value": "', rarityNames[card.rarity], '"},',
                '{"trait_type": "Parachain", "value": "', parachainName, '"},',
                '{"trait_type": "Power", "value": ', card.power.toString(), '},',
                '{"trait_type": "Generosity", "value": ', card.generosity.toString(), '},',
                '{"trait_type": "Amount", "value": ', card.tipAmount.toString(), '},',
                '{"trait_type": "Background", "value": ', uint256(card.background).toString(), '},',
                '{"trait_type": "Border", "value": ', uint256(card.border).toString(), '},',
                '{"trait_type": "Emblem", "value": ', uint256(card.emblem).toString(), '},',
                '{"trait_type": "Sparkle", "value": ', uint256(card.sparkle).toString(), '}',
            ']}'
        ))));
        
        return string(abi.encodePacked('data:application/json;base64,', json));
    }
    
    /**
     * @notice Get all cards owned by a user
     */
    function getUserCards(address user) external view returns (uint256[] memory) {
        return userCards[user];
    }
    
    /**
     * @notice Get card details
     */
    function getCardDetails(uint256 tokenId) external view returns (TipCard memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tipCards[tokenId];
    }
    
    /**
     * @notice Update TipsyDot contract address
     */
    function setTipsyDotContract(address _tipsyDotContract) external onlyOwner {
        tipsyDotContract = _tipsyDotContract;
    }
    
    /**
     * @notice Add or update parachain name
     */
    function setParachainName(uint32 paraId, string memory name) external onlyOwner {
        parachainNames[paraId] = name;
    }
    
    /**
     * @notice Helper function to substring
     */
    function substring(string memory str, uint256 start, uint256 end) private pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = strBytes[i];
        }
        return string(result);
    }
    
    // Required overrides
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}