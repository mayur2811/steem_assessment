pragma solidity >=0.5.0 <0.6.0;

contract HomeTransaction {
    // Constants
    uint constant timeBetweenDepositAndFinalization = 5 minutes;
    uint constant timeBetweenDepositAndRealtorReviewDeadline = 30 minutes;
    uint constant depositPercentage = 10;

    enum ContractState {
        WaitingSellerSignature,
        WaitingBuyerSignature,
        WaitingRealtorReview,
        WaitingFinalization,
        Finalized,
        Rejected
    }
    ContractState public contractState = ContractState.WaitingSellerSignature;

    // Roles acting on contract
    address payable public realtor;
    address payable public seller;
    address payable public buyer;

    // Contract details
    string public homeAddress;
    string public zip;
    string public city;
    uint public realtorFee;
    uint public price;

    // Set when buyer signs and pays deposit
    uint public deposit;
    uint public finalizeDeadline;
    uint public realtorReviewDeadline;

    // Set when realtor reviews closing conditions
    enum ClosingConditionsReview {
        Pending,
        Accepted,
        Rejected
    }
    ClosingConditionsReview closingConditionsReview =
        ClosingConditionsReview.Pending;

    // Events for transparency and off-chain tracking
    event ContractSigned(address indexed signer, ContractState newState);
    event DepositPaid(address indexed buyer, uint amount, uint deadline);
    event ClosingReviewed(address indexed realtor, bool accepted);
    event TransactionFinalized(address indexed buyer, uint totalPrice);
    event TransactionWithdrawn(
        address indexed initiator,
        ContractState newState
    );

    constructor(
        string memory _address,
        string memory _zip,
        string memory _city,
        uint _realtorFee,
        uint _price,
        address payable _realtor,
        address payable _seller,
        address payable _buyer
    ) public {
        require(_price > 0, "Price must be greater than zero");
        require(
            _price >= _realtorFee,
            "Price needs to be more than realtor fee!"
        );
        require(_realtor != address(0), "Realtor address cannot be zero");
        require(_seller != address(0), "Seller address cannot be zero");
        require(_buyer != address(0), "Buyer address cannot be zero");
        require(
            _realtor != _seller && _realtor != _buyer && _seller != _buyer,
            "Roles must be different addresses"
        );

        realtor = _realtor;
        seller = _seller;
        buyer = _buyer;
        homeAddress = _address;
        zip = _zip;
        city = _city;
        price = _price;
        realtorFee = _realtorFee;
    }

    // BUG FIX: Removed `payable` — seller does not need to send ETH to sign.
    // Previously, any ETH sent would be locked in the contract permanently.
    function sellerSignContract() public {
        require(seller == msg.sender, "Only seller can sign contract");

        require(
            contractState == ContractState.WaitingSellerSignature,
            "Wrong contract state"
        );

        contractState = ContractState.WaitingBuyerSignature;

        emit ContractSigned(msg.sender, contractState);
    }

    function buyerSignContractAndPayDeposit() public payable {
        require(buyer == msg.sender, "Only buyer can sign contract");

        require(
            contractState == ContractState.WaitingBuyerSignature,
            "Wrong contract state"
        );

        require(
            msg.value >= (price * depositPercentage) / 100 &&
                msg.value <= price,
            "Buyer needs to deposit between 10% and 100% to sign contract"
        );

        contractState = ContractState.WaitingRealtorReview;

        deposit = msg.value;
        finalizeDeadline = now + timeBetweenDepositAndFinalization;
        realtorReviewDeadline =
            now +
            timeBetweenDepositAndRealtorReviewDeadline;

        emit DepositPaid(msg.sender, msg.value, finalizeDeadline);
    }

    function realtorReviewedClosingConditions(bool accepted) public {
        require(
            realtor == msg.sender,
            "Only realtor can review closing conditions"
        );

        require(
            contractState == ContractState.WaitingRealtorReview,
            "Wrong contract state"
        );

        if (accepted) {
            closingConditionsReview = ClosingConditionsReview.Accepted;
            contractState = ContractState.WaitingFinalization;
        } else {
            closingConditionsReview = ClosingConditionsReview.Rejected;
            contractState = ContractState.Rejected;

            buyer.transfer(deposit);
        }

        emit ClosingReviewed(msg.sender, accepted);
    }

    // BUG FIX: Added escape hatch for buyer if realtor never reviews.
    // Without this, buyer's deposit is locked forever if realtor disappears.
    function buyerWithdrawFromRealtorReview() public {
        require(buyer == msg.sender, "Only buyer can call this");
        require(
            contractState == ContractState.WaitingRealtorReview,
            "Wrong contract state"
        );
        require(
            now > realtorReviewDeadline,
            "Realtor review deadline has not passed yet"
        );

        contractState = ContractState.Rejected;

        // Full deposit returned — realtor failed to act, no fee deducted
        buyer.transfer(deposit);

        emit TransactionWithdrawn(msg.sender, contractState);
    }

    function buyerFinalizeTransaction() public payable {
        require(buyer == msg.sender, "Only buyer can finalize transaction");

        require(
            contractState == ContractState.WaitingFinalization,
            "Wrong contract state"
        );

        // BUG FIX: Added deadline check — buyer must finalize before the deadline.
        // Without this, a buyer could finalize after the deadline has expired and
        // the seller has already received deposit via anyWithdrawFromTransaction().
        require(now <= finalizeDeadline, "Finalization deadline has passed");

        // BUG FIX: Changed from `msg.value + deposit == price` to avoid overflow.
        // In Solidity <0.8, msg.value + deposit can silently wrap around to equal price.
        // `price - deposit` is safe because deposit <= price (enforced in buyerSignContractAndPayDeposit).
        require(
            msg.value == price - deposit,
            "Buyer needs to pay the rest of the cost to finalize transaction"
        );

        contractState = ContractState.Finalized;

        seller.transfer(price - realtorFee);
        realtor.transfer(realtorFee);

        emit TransactionFinalized(msg.sender, price);
    }

    // BUG FIX: Completely reworked access control and fund distribution.
    //
    // Original bugs:
    // 1. Access control: `require(buyer == msg.sender || finalizeDeadline <= now)`
    //    allowed ANY address to withdraw after deadline — not just buyer or seller.
    // 2. Underflow risk: `deposit - realtorFee` could underflow if deposit (10% of price)
    //    was less than the realtorFee.
    //
    // Fix:
    // - Only buyer or seller can initiate withdrawal.
    // - Buyer can withdraw anytime during WaitingFinalization → gets deposit back.
    // - Seller can only withdraw after deadline expires → gets deposit (buyer forfeits for missing deadline).
    // - Added underflow guard for realtorFee deduction.
    function buyerWithdrawFromTransaction() public {
        require(buyer == msg.sender, "Only buyer can call this");
        require(
            contractState == ContractState.WaitingFinalization,
            "Wrong contract state"
        );

        contractState = ContractState.Rejected;

        // Buyer voluntarily withdrew, return deposit minus realtor fee (if applicable)
        if (deposit > realtorFee) {
            buyer.transfer(deposit - realtorFee);
            realtor.transfer(realtorFee);
        } else {
            // If deposit is less than or equal to realtor fee, give all to realtor
            realtor.transfer(deposit);
        }

        emit TransactionWithdrawn(msg.sender, contractState);
    }

    function sellerWithdrawAfterDeadline() public {
        require(seller == msg.sender, "Only seller can call this");
        require(
            contractState == ContractState.WaitingFinalization,
            "Wrong contract state"
        );
        require(now > finalizeDeadline, "Deadline has not passed yet");

        contractState = ContractState.Rejected;

        // Buyer missed the deadline — seller gets deposit minus realtor fee
        if (deposit > realtorFee) {
            seller.transfer(deposit - realtorFee);
            realtor.transfer(realtorFee);
        } else {
            realtor.transfer(deposit);
        }

        emit TransactionWithdrawn(msg.sender, contractState);
    }
}
