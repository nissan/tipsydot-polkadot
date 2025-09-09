#!/bin/bash

# Cast interaction helpers for TipsyDot contract

source .env.local

RPC_URL=${VITE_EVM_RPC:-"https://testnet-passet-hub-eth-rpc.polkadot.io"}
CONTRACT=${VITE_TIPSY_ADDRESS}

if [ -z "$CONTRACT" ]; then
    echo "❌ Error: VITE_TIPSY_ADDRESS not set in .env.local"
    exit 1
fi

# Function signatures
case "$1" in
    "create-campaign")
        echo "Creating campaign..."
        cast send --rpc-url $RPC_URL \
            --private-key $PRIVATE_KEY \
            $CONTRACT \
            "createCampaign(string,string,address,bytes,uint32)" \
            "$2" "$3" "$4" "$5" "$6"
        ;;
        
    "tip")
        echo "Tipping campaign $2 with amount $3..."
        cast send --rpc-url $RPC_URL \
            --private-key $PRIVATE_KEY \
            $CONTRACT \
            "tip(uint256,uint256,string)" \
            "$2" "$3" "$4"
        ;;
        
    "forward")
        echo "Forwarding funds for campaign $2..."
        cast send --rpc-url $RPC_URL \
            --private-key $PRIVATE_KEY \
            $CONTRACT \
            "forward(uint256)" \
            "$2"
        ;;
        
    "set-router")
        echo "Setting XCM router to $2..."
        cast send --rpc-url $RPC_URL \
            --private-key $PRIVATE_KEY \
            $CONTRACT \
            "setXcmRouter(address)" \
            "$2"
        ;;
        
    "get-campaign")
        echo "Getting campaign details for ID $2..."
        cast call --rpc-url $RPC_URL \
            $CONTRACT \
            "getCampaignDetails(uint256)" \
            "$2"
        ;;
        
    "next-id")
        echo "Getting next campaign ID..."
        cast call --rpc-url $RPC_URL \
            $CONTRACT \
            "nextCampaignId()"
        ;;
        
    *)
        echo "Usage: $0 {create-campaign|tip|forward|set-router|get-campaign|next-id} [args...]"
        echo ""
        echo "Examples:"
        echo "  $0 create-campaign \"Save the Trees\" \"Help us plant trees\" 0xUSDC_ADDRESS 0xBENEFICIARY 2000"
        echo "  $0 tip 0 1000000 \"Great cause!\""
        echo "  $0 forward 0"
        echo "  $0 set-router 0xROUTER_ADDRESS"
        echo "  $0 get-campaign 0"
        echo "  $0 next-id"
        ;;
esac