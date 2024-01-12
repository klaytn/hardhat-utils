// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Counter {
    uint256 public number;

    event SetNumber(uint256 newNumber);

    function _setNumber(uint256 newNumber) private {
        number = newNumber;
        emit SetNumber(number);
    }

    function setNumber(uint256 newNumber) public {
        _setNumber(newNumber);
    }

    function increment() public {
        _setNumber(number + 1);
    }

    // To test various argument types
    // Try hh send Counter setComplex 1,2,3 0xabcd "zzz" true
    // Try hh send Counter setComplex 7 0x "" false
    function setComplex(
        uint256[] calldata arr,
        bytes memory bs,
        string memory str,
        bool flag
    ) public {
        uint256 sum = 0;
        for (uint i = 0; i < arr.length; i++) {
            sum += arr[i];
        }

        uint256 newNumber = sum;
        newNumber = newNumber * 16 + bs.length;
        newNumber = newNumber * 16 + bytes(str).length;
        newNumber = newNumber * 16 + (flag ? 1 : 0);
        _setNumber(newNumber);
    }
}
