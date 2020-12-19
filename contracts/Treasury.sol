// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./lib/Babylonian.sol";
import "./lib/FixedPoint.sol";
import "./lib/Safe112.sol";
import "./owner/Operator.sol";
import "./utils/ContractGuard.sol";
import "./interfaces/IBasisAsset.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/IBoardroom.sol";

/**
 * @title Basis Franc Treasury contract
 * @notice Monetary policy logic to adjust supplies of basis franc assets
 * @author Summer Smith & Rick Sanchez
 */
contract Treasury is ContractGuard, Operator {
    using FixedPoint for *;
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;
    using Safe112 for uint112;

    /* ========= CONSTANT VARIABLES ======== */

    uint256 public constant PERIOD = 12 hours;

    /* ========== STATE VARIABLES ========== */

    // flags
    bool private migrated = false;
    bool private initialized = false;

    // epoch
    uint256 public startTime;
    uint256 public epoch = 0;

    // core components
    address private franc;
    address private bond;
    address private share;
    address private boardroom;
    address private francOracle;

    // price
    uint256 public francPriceOne;
    uint256 public francPriceCeiling;
    uint256 private bondDepletionFloor;
    uint256 private seigniorageSaved = 0;
    uint256 private maxPercentageToExpand = 115e16; // Upto 1.15x supply for expansion

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _franc,
        address _bond,
        address _share,
        address _francracle,
        address _boardroom,
        uint256 _startTime
    ) public {
        franc = _franc;
        bond = _bond;
        share = _share;
        francOracle = _francOracle;
        boardroom = _boardroom;

        startTime = _startTime;

       francPriceOne = 10**18;
        francPriceCeiling = uint256(105).mul(francPriceOne).div(10**2);

        bondDepletionFloor = uint256(10000).mul(francPriceOne);
    }

    /* =================== Modifier =================== */

    modifier checkCondition {
        require(!migrated, "Treasury: migrated");
        require(now >= startTime, "Treasury: not started yet");

        _;
    }

    modifier checkEpoch {
        require(now >= nextEpochPoint(), "Treasury: not opened yet");

        _;

        epoch = epoch.add(1);
    }

    modifier checkOperator {
        require(
            IBasisAsset(franc).operator() == address(this) &&
                IBasisAsset(bond).operator() == address(this) &&
                IBasisAsset(share).operator() == address(this) &&
                Operator(boardroom).operator() == address(this),
            "Treasury: need more permission"
        );

        _;
    }

    modifier notInitialized {
        require(!initialized, "Treasury: already initialized");

        _;
    }

    /* ========== VIEW FUNCTIONS ========== */

    // flags
    function isMigrated() public view returns (bool) {
        return migrated;
    }

    function isInitialized() public view returns (bool) {
        return initialized;
    }

    // epoch
    function nextEpochPoint() public view returns (uint256) {
        return startTime.add(epoch.mul(PERIOD));
    }

    // oracle
    function getFrancPrice() public view returns (uint256 francPrice) {
        try IOracle(francOracle).consult(franc, 1e18) returns (uint256 price) {
            return price;
        } catch {
            revert("Treasury: failed to consult franc price from the oracle");
        }
    }

    // budget
    function getReserve() public view returns (uint256) {
        return seigniorageSaved;
    }

    /* ========== GOVERNANCE ========== */

    function initialize() public notInitialized checkOperator {
        // burn all of it's balance
        IBasisAsset(franc).burn(IERC20(franc).balanceOf(address(this)));

        // mint only 10,001 franc to itself
        IBasisAsset(franc).mint(address(this), bondDepletionFloor.add(1 ether));

        // set seigniorageSaved to it's balance
        seigniorageSaved = IERC20(franc).balanceOf(address(this));

        initialized = true;
        emit Initialized(msg.sender, block.number);
    }

    function migrate(address target) public onlyOperator checkOperator {
        require(!migrated, "Treasury: migrated");

        // franc
        Operator(franc).transferOperator(target);
        Operator(franc).transferOwnership(target);
        IERC20(franc).transfer(target, IERC20(franc).balanceOf(address(this)));

        // bond
        Operator(bond).transferOperator(target);
        Operator(bond).transferOwnership(target);
        IERC20(bond).transfer(target, IERC20(bond).balanceOf(address(this)));

        // share
        Operator(share).transferOperator(target);
        Operator(share).transferOwnership(target);
        IERC20(share).transfer(target, IERC20(share).balanceOf(address(this)));

        migrated = true;
        emit Migration(target);
    }

    /* ========== MUTABLE FUNCTIONS ========== */

    function _updateFrancPrice() internal {
        try IOracle(francOracle).update() {} catch {}
    }

    function buyBonds(uint256 amount, uint256 targetPrice) external onlyOneBlock checkCondition checkOperator {
        require(amount > 0, "Treasury: cannot purchase bonds with zero amount");

        uint256 francPrice = getFrancPrice();
        require(francPrice == targetPrice, "Treasury: v price moved");
        require(
            francPrice < francPriceOne, // price < $1
            "Treasury: francPrice not eligible for bond purchase"
        );

        uint256 bondPrice = francPrice;

        IBasisAsset(franc).burnFrom(msg.sender, amount);
        IBasisAsset(bond).mint(msg.sender, amount.mul(1e18).div(bondPrice));
        _updateFrancPrice();

        emit BoughtBonds(msg.sender, amount);
    }

    function redeemBonds(uint256 amount, uint256 targetPrice) external onlyOneBlock checkCondition checkOperator {
        require(amount > 0, "Treasury: cannot redeem bonds with zero amount");

        uint256 francPrice = getFrancPrice();
        require(francPrice == targetPrice, "Treasury: franc price moved");
        require(
            francPrice > francPriceCeiling, // price > $1.05
            "Treasury: francPrice not eligible for bond purchase"
        );
        require(IERC20(franc).balanceOf(address(this)) >= amount, "Treasury: treasury has no more budget");

        seigniorageSaved = seigniorageSaved.sub(Math.min(seigniorageSaved, amount));

        IBasisAsset(bond).burnFrom(msg.sender, amount);
        IERC20(franc).safeTransfer(msg.sender, amount);

        _updateFrancPrice();

        emit RedeemedBonds(msg.sender, amount);
    }

    function allocateSeigniorage() external onlyOneBlock checkCondition checkEpoch checkOperator {
        _updateFrancPrice();
        uint256 francPrice = getFrancPrice();
        if (francPrice > francPriceCeiling) {
            // there is some seigniorage to be allocated
            uint256 francSupply = IERC20(franc).totalSupply().sub(seigniorageSaved);
            uint256 _percentage = francPrice.sub(francPriceOne);
            if (_percentage > maxPercentageToExpand) {
                _percentage = maxPercentageToExpand;
            }
            uint256 seigniorage = francSupply.mul(_percentage).div(1e18);

            if (seigniorageSaved > bondDepletionFloor) {
                IBasisAsset(franc).mint(address(this), seigniorage);
                IERC20(franc).safeApprove(boardroom, seigniorage);
                IBoardroom(boardroom).allocateSeigniorage(seigniorage);
                emit BoardroomFunded(now, seigniorage);
            } else {
                seigniorageSaved = seigniorageSaved.add(seigniorage);
                IBasisAsset(franc).mint(address(this), seigniorage);
                emit TreasuryFunded(now, seigniorage);
            }
        }
    }

    event Initialized(address indexed executor, uint256 at);
    event Migration(address indexed target);
    event RedeemedBonds(address indexed from, uint256 amount);
    event BoughtBonds(address indexed from, uint256 amount);
    event TreasuryFunded(uint256 timestamp, uint256 seigniorage);
    event BoardroomFunded(uint256 timestamp, uint256 seigniorage);
}
