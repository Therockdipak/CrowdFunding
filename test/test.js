const {expect} = require("chai");
const {ethers} = require("hardhat");

describe("CrowdFunding", async ()=> {
   let crowdFunding;
   let owner;
   let addr1;
   let addr2;
   let deadline;

   beforeEach(async ()=> {
    [owner,addr1,addr2] = await ethers.getSigners();
    const target = ethers.parseEther("10");
    deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  
    crowdFunding = await ethers.deployContract("CrowdFunding",[target,deadline]);
    console.log(await crowdFunding.getAddress());
   });

   it("should set right owner", async ()=> {
     expect(await crowdFunding.Manager()).to.equal(owner.address);
   });

   describe( "sendEth", async ()=> {
      it("should accept ETH contribution and track them", async ()=>{
       const contribution = ethers.parseEther("1");
       await crowdFunding.connect(addr1).sendEth({value:contribution});

      //  check the contribution recorded correctly
      expect(await crowdFunding.Contributors(addr1.address)).to.equal(contribution);
        
      //check total raised amount
      expect(await crowdFunding.raiseAmount()).to.equal(contribution);
      
      // check contract balance 
      expect(await crowdFunding.getContractBalance()).to.equal(contribution);
     });
   });

   it("should refund contributors if target not met after deadline", async () => {
      const contribution = ethers.parseEther("5");
      await crowdFunding.connect(addr1).sendEth({ value: contribution });
  
      // Move forward in time beyond the deadline
      const currentBlockTime = (await ethers.provider.getBlock()).timestamp;
      const deadline = await crowdFunding.deadline();
      const timeToPass = Number(deadline) - currentBlockTime + 1; // Convert both deadline and currentBlockTime to numbers
  
      // Move time forward and mine a block
      await ethers.provider.send("evm_increaseTime", [timeToPass]);
      await ethers.provider.send("evm_mine");
  
      // Refund the contributor
      await expect(crowdFunding.connect(addr1).refund()).to.changeEtherBalances(
          [addr1, crowdFunding],
          [contribution, -contribution]
      );
  
      // Ensure the contribution record is reset
      expect((await crowdFunding.Contributors(addr1.address)).toString()).to.equal("0");
  });

   it("should allow a manager to create a spending request", async ()=> {
      const description = "help the poors";
      const recipient = addr2.address;
      const value = ethers.parseEther("2");

      // send ethers to the contract
      const contribution= ethers.parseEther("5");
      await crowdFunding.connect(addr1).sendEth({value:contribution});

      // create a request 
      await crowdFunding.connect(owner).createRequest(description,recipient,value);
      const contractBalance = await ethers.provider.getBalance(crowdFunding.target);
      console.log("contract balance is: ", ethers.formatEther(contractBalance));

      const request = await crowdFunding.requests(0);

      expect(request.description).to.equal(description);
      expect(request.recipient).to.equal(recipient);
      expect(request.value).to.equal(value);
      expect(request.isCompleted).to.be.false;
   });

   it("should allow contributors to vote on request", async ()=> {
      const description = "help the poors";
      const recipient = addr2.address;
      const value = ethers.parseEther("5");

      // contribute funds 
      const contribution= ethers.parseEther("5");
      await crowdFunding.connect(addr2).sendEth({value:contribution});

      // create a request
      await crowdFunding.connect(owner).createRequest(description,recipient,value);

      // vote on the request
      await crowdFunding.connect(addr2).voteRequest(0);

      const request = await crowdFunding.requests(0);
      expect(request.noOfVoters).to.equal(1);
   });

   it("allow manager to make payment after approval", async ()=> {
      const description =  "help the poors";
      const recipient = addr2.address;
      const value = ethers.parseEther("5");

      // contributr funds 
      const contribution = ethers.parseEther("10");
      await crowdFunding.connect(addr1).sendEth({value:contribution});
      await crowdFunding.connect(addr2).sendEth({value:contribution});

      // create a request
      await crowdFunding.connect(owner).createRequest(description,recipient,value);

      // vote on request 
      await crowdFunding.connect(addr1).voteRequest(0);
      await crowdFunding.connect(addr2).voteRequest(0);

      // make payments 
      await crowdFunding.connect(owner).makePayment(0);

      // check  request is marked as completed
      const request = await crowdFunding.requests(0);
      expect(request.isCompleted).to.be.true;
   })
  
});  

