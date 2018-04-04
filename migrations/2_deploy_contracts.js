var RockPaperScissorsHub = artifacts.require("./RockPaperScissorsHub.sol");

module.exports = function(deployer) {
  deployer.deploy(RockPaperScissorsHub, "hubName", 1000);
};
