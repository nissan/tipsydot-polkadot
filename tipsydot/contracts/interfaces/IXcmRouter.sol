// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IXcmRouter {
    function transferAssets(
        address asset,
        uint256 amount,
        bytes calldata beneficiary,
        uint32 destParaId,
        uint64 weight
    ) external;
    
    function transferAssetsWithMemo(
        address asset,
        uint256 amount,
        bytes calldata beneficiary,
        uint32 destParaId,
        uint64 weight,
        bytes calldata memo
    ) external;
}