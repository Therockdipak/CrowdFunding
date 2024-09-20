// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.24;

contract CrowdFunding {
    mapping(address => uint) public Contributors; // map contributor address to their contribution
    address public Manager;
    uint public minContribution;
    uint public deadline;
    uint public target;
    uint public raiseAmount; // Corrected variable name
    uint public noOfContributors;

    struct Request {
        string description;
        address payable recipient; // recipient of money through the request
        uint value;
        bool isCompleted;
        uint noOfVoters;
        mapping(address => bool) voters;
    }

    mapping(uint => Request) public requests;
    uint public numRequests;

    event ContributionReceived(address indexed contributor, uint amount);
    event RefundProcessed(address indexed contributor, uint amount);
    event RequestCreated(uint requestId, string description, address indexed recipient, uint value);
    event PaymentMade(address indexed recipient, uint value);

    constructor(uint _target, uint _deadline) {
        target = _target;
        deadline = block.timestamp + _deadline; // current block timestamp + duration
        minContribution = 100 wei;
        Manager = msg.sender;
    }

    modifier onlyManager() {
        require(msg.sender == Manager, "Only the manager can perform this action");
        _;
    }

    function sendEth() public payable {
        require(block.timestamp < deadline, "The fundraising deadline has passed");
        require(msg.value >= minContribution, "Minimum contribution not met");

        if (Contributors[msg.sender] == 0) {
            noOfContributors++;
        }

        Contributors[msg.sender] += msg.value;
        raiseAmount += msg.value;

        emit ContributionReceived(msg.sender, msg.value); // Emit an event when contribution is received
    }

    function getContractBalance() public view returns(uint) {
        return address(this).balance;
    }

    function refund() public {
        require(block.timestamp > deadline, "Deadline not yet passed");
        require(raiseAmount < target, "Target has been met"); // Corrected variable name
        require(Contributors[msg.sender] > 0, "No contributions made");

        uint amount = Contributors[msg.sender];
        Contributors[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit RefundProcessed(msg.sender, amount); // Emit an event for the refund
    }

    function createRequest(string memory _description, address payable _recipient, uint _value) public onlyManager {
        require(_value <= address(this).balance, "Insufficient contract balance for request");

        Request storage newRequest = requests[numRequests];
        numRequests++;

        newRequest.description = _description;
        newRequest.recipient = _recipient;
        newRequest.value = _value;
        newRequest.isCompleted = false;
        newRequest.noOfVoters = 0;

        emit RequestCreated(numRequests - 1, _description, _recipient, _value); // Emit an event for request creation
    }

    function voteRequest(uint _requestNo) public {
        require(Contributors[msg.sender] > 0, "Only contributors can vote");
        
        Request storage thisRequest = requests[_requestNo];
        require(!thisRequest.voters[msg.sender], "You have already voted on this request");

        thisRequest.voters[msg.sender] = true;
        thisRequest.noOfVoters++;
    }

    function makePayment(uint _requestNo) public onlyManager {
        Request storage thisRequest = requests[_requestNo];

        require(raiseAmount >= target, "Funding target not met");
        require(!thisRequest.isCompleted, "This request has already been fulfilled");
        require(thisRequest.noOfVoters > noOfContributors / 2, "Majority of contributors must approve");
        require(thisRequest.value <= address(this).balance, "Insufficient balance for payment");

        thisRequest.recipient.transfer(thisRequest.value); // Transfer funds to the recipient
        thisRequest.isCompleted = true;

        emit PaymentMade(thisRequest.recipient, thisRequest.value); // Emit an event for payment
    }
}
