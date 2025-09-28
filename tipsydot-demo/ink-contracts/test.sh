#!/bin/bash

# Test script for Ink! smart contracts
# Runs unit tests, integration tests, and generates coverage report

set -e

echo "🧪 Testing Ink! Smart Contracts"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test statistics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run unit tests for a contract
run_unit_tests() {
    local contract_name=$1
    echo -e "${YELLOW}Running unit tests for $contract_name...${NC}"

    cd $contract_name

    if cargo test 2>&1 | tee test_output.txt; then
        # Extract test statistics
        local tests_run=$(grep -o "[0-9]* passed" test_output.txt | awk '{print $1}' | tail -1)
        if [ -n "$tests_run" ]; then
            PASSED_TESTS=$((PASSED_TESTS + tests_run))
            TOTAL_TESTS=$((TOTAL_TESTS + tests_run))
            echo -e "${GREEN}✅ $contract_name: $tests_run tests passed${NC}"
        fi
    else
        echo -e "${RED}❌ Tests failed for $contract_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    rm -f test_output.txt
    cd ..
    echo ""
}

# Run integration tests
run_integration_tests() {
    echo -e "${YELLOW}Running integration tests...${NC}"

    # Check if substrate-contracts-node is running
    if ! lsof -Pi :9944 -sTCP:LISTEN -t >/dev/null; then
        echo -e "${BLUE}Starting substrate-contracts-node...${NC}"
        substrate-contracts-node --dev > /dev/null 2>&1 &
        NODE_PID=$!
        sleep 5
    fi

    # Run integration tests
    if cargo test --features e2e-tests -- --nocapture 2>&1 | tee integration_output.txt; then
        local tests_run=$(grep -o "[0-9]* passed" integration_output.txt | awk '{print $1}' | tail -1)
        if [ -n "$tests_run" ]; then
            PASSED_TESTS=$((PASSED_TESTS + tests_run))
            TOTAL_TESTS=$((TOTAL_TESTS + tests_run))
            echo -e "${GREEN}✅ Integration tests: $tests_run tests passed${NC}"
        fi
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    # Clean up node if we started it
    if [ -n "$NODE_PID" ]; then
        kill $NODE_PID 2>/dev/null || true
    fi

    rm -f integration_output.txt
    echo ""
}

# Generate coverage report
generate_coverage() {
    echo -e "${YELLOW}Generating coverage report...${NC}"

    # Install tarpaulin if not present
    if ! command -v cargo-tarpaulin &> /dev/null; then
        echo "Installing cargo-tarpaulin..."
        cargo install cargo-tarpaulin
    fi

    # Run coverage
    cargo tarpaulin --workspace --out Html --output-dir coverage 2>&1 | tee coverage_output.txt

    # Extract coverage percentage
    local coverage=$(grep "Coverage" coverage_output.txt | grep -o "[0-9.]*%" | tail -1)
    if [ -n "$coverage" ]; then
        echo -e "${GREEN}📊 Code coverage: $coverage${NC}"
    fi

    rm -f coverage_output.txt
    echo ""
}

# Main execution
echo "1. Unit Tests"
echo "-------------"
run_unit_tests "psp22_usdc"
run_unit_tests "tipping"
run_unit_tests "cross_chain"

echo "2. Integration Tests"
echo "-------------------"
run_integration_tests

echo "3. Property-Based Tests"
echo "----------------------"
echo -e "${YELLOW}Running property tests...${NC}"
if cargo test --features property-tests property_tests 2>&1 | tee property_output.txt; then
    echo -e "${GREEN}✅ Property tests passed${NC}"
else
    echo -e "${RED}❌ Property tests failed${NC}"
fi
rm -f property_output.txt
echo ""

echo "4. Coverage Report"
echo "-----------------"
generate_coverage

# Final summary
echo "================================"
echo -e "${BLUE}📊 Test Summary${NC}"
echo "================================"
echo -e "Total tests run: ${TOTAL_TESTS}"
echo -e "Tests passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Tests failed: ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi