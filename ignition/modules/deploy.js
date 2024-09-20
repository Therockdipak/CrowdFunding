const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");


module.exports = buildModule("LockModule", (m) => {
  const target = ethers.parseEther("10");
  const deadline = 1726643169;

  const lock = m.contract("CrowdFunding", [target,deadline]);

  return { lock };
});
// 0x5FbDB2315678afecb367f032d93F642f64180aa3