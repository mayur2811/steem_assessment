pragma solidity >=0.5.0 <0.6.0;

import "./HomeTransaction.sol";

contract Factory {
    HomeTransaction[] contracts;

    event ContractCreated(
        address indexed creator,
        address contractAddress,
        uint index
    );

    function create(
        string memory _address,
        string memory _zip,
        string memory _city,
        uint _realtorFee,
        uint _price,
        address payable _seller,
        address payable _buyer
    ) public returns (HomeTransaction homeTransaction) {
        homeTransaction = new HomeTransaction(
            _address,
            _zip,
            _city,
            _realtorFee,
            _price,
            msg.sender,
            _seller,
            _buyer
        );
        contracts.push(homeTransaction);

        emit ContractCreated(
            msg.sender,
            address(homeTransaction),
            contracts.length - 1
        );
    }

    function getInstance(
        uint index
    ) public view returns (HomeTransaction instance) {
        require(index < contracts.length, "index out of range");

        instance = contracts[index];
    }

    function getInstances()
        public
        view
        returns (HomeTransaction[] memory instances)
    {
        instances = contracts;
    }

    function getInstanceCount() public view returns (uint count) {
        count = contracts.length;
    }
}
