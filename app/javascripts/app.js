const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
require("file-loader?name=../index.html!../index.html");
const $ = require("jquery");
// Not to forget our built contract
const rockPaperScissorsHub = require("../../build/contracts/RockPaperScissorsHub.json");
const rockPaperScissors = require("../../build/contracts/RockPaperScissors.json");

// Supports Mist, and other wallets that provide 'web3'.
if (typeof web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    window.web3 = new Web3(web3.currentProvider);
} else {
    // Your preferred fallback.
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545')); 
}

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.version, { suffix: "Promise" });

const RockPaperScissorsHub = truffleContract(rockPaperScissorsHub);
RockPaperScissorsHub.setProvider(web3.currentProvider);

const RockPaperScissors = truffleContract(rockPaperScissors);
RockPaperScissors.setProvider(web3.currentProvider);


var latestGameAddress;

var totalGas;

const updateTotalGas = function(gas) {
  totalGas += gas;
  updateStatus("Gas used: " + totalGas);
}

window.addEventListener('load', function() {
    return web3.eth.getAccountsPromise()
        .then(accounts => {
            if (accounts.length == 0) {
                $("#balance").html("N/A");
                throw new Error("No account with which to transact");
            }
            window.account = accounts[0];

            //update account dropdown
            $("#account-select").empty();
            for(i=0; i<accounts.length; i++) {
                $("#account-select").append($("<option></option>")
                                   .attr("value", accounts[i]).text(i + ": " + accounts[i]));
                $("#second-player-select").append($("<option></option>")
                                   .attr("value", accounts[i]).text(i + ": " + accounts[i]));
                $("#first-player-select").append($("<option></option>")
                                   .attr("value", accounts[i]).text(i + ": " + accounts[i]));
            }
            $("#account-select").change(function(){
                updateBalance($(this).val());
            });
            // console.log("Account:", window.account);
            return web3.version.getNetworkPromise();
        })
        .then(network => console.log("Network:", network.toString(10)))
        .then(() => watchHubEvents())
        .then(() => updateBalance($("#account-select").val()))
        .then(() => $("#create-game").click(createGame))
        .then(() => $("#play-buttont").click(playGame))
        .then(() => $("#reveal-buttont").click(reveal))
        .then(() => $("#claim-buttont").click(claim))
        // Never let an error go unlogged.
        .catch(console.error);
});

const updateBalance = function(accountSelected) {
  return web3.eth.getBalancePromise(accountSelected)
                 .then(balance => {
                    $("#balance").html(balance.toString(10))
                 }).catch(console.error);
};

const watchHubEvents = function() {
  var deployed;
  return RockPaperScissorsHub.deployed().then( deploy => {
          deployed = deploy;
            return deployed.LogNewSubContractCreated({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogSubContractKilled({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogSubContractRunningStateChange({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogOwnerChange({from: account});
         }).then( event => {
            watchEvent(event);
         });

}

const watchgameEvents = function(rpsAddress) {
  var deployed;
  return RockPaperScissors.at(rpsAddress).then(instance => {
          deployed = instance;
            return  deployed.LogClaim({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogPlay({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogRevealed({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogGameCreated({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogWinnerRevealed({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogDrawRevealed({from: account});
         }).then( event => {
            watchEvent(event);
         });
}

var statusIndex=1;

const updateStatus = function(text) {
  $("#status").html(statusIndex++ + "- " + text + "<br>" + $("#status").html());
}

const watchEvent = function(event) {
   event.watch(function(err, result) {
    if (err) {
      console.log(err)
      return;
    }
    console.log("Event received: " + result.event);
    updateStatus("Event received: " + result.event);
    updateStatus(result.args.toSource());
    console.log(result.args);
    if (result.event == "LogNewSubContractCreated") {
      $("#gameAddress").html(result.args.contractAddress);
      latestGameAddress = result.args.contractAddress;
      watchgameEvents(latestGameAddress);
    }
  })
}

const createGame = function() {  
  var params;
  var deployed;
  console.log($("input[name='timeout']").val());
  return RockPaperScissorsHub.deployed()
  .then(deploy => {
    deployed = deploy;
    return deployed.createNewSubContract.estimateGas($("#first-player-select").val(),
                                                     $("#second-player-select").val(), 
                                                     $("input[name='stake']").val(),
                                                     $("input[name='timeout']").val(),
                                                     {from: $("#account-select").val(), gas: 5000000, value: 100});
  }).then(estimatedGas => {
    return deployed.createNewSubContract.sendTransaction($("#first-player-select").val(),
                                                         $("#second-player-select").val(), 
                                                         $("input[name='stake']").val(), 
                                                         $("input[name='timeout']").val(),
                                                         {from: $("#account-select").val(), gas: estimatedGas, value: 100});
  }).then(txHash => {
     return web3.eth.getTransactionReceiptPromise(txHash);
  }).then(txObject => {
     totalGas = txObject.gasUsed;
     updateStatus("Gas used: " + totalGas);
     console.log(txObject);
    if (txObject.status == "0x01" || txObject.status == 1) {
      updateStatus("game created successsfuly.");
    } else {
      updateStatus("error creating game.");
      console.error(txObject);
    }
  }).catch(console.error);

}

const playGame = function() {
  //console.log("in play game");
  var deployed;
   return RockPaperScissors.at(latestGameAddress).then(instance => {
            deployed = instance;
            return getMoveHash();
        }).then(hash => {
            return  deployed.play.sendTransaction(hash, 
                                                 {from: $("#account-select").val(),
                                                  value: $("input[name='stake']").val()});
        }).then(txHash => {
          return web3.eth.getTransactionReceiptPromise(txHash);
        }).then(txObject => {
          updateTotalGas(txObject.gasUsed);
          if (txObject.status == "0x01" || txObject.status == 1) {
            updateStatus("Play successfull.");
          } else {
            updateStatus("Error occured while playing.");
            console.error(txObject);
          }
        }).catch(console.error);
}

const getMoveHash = function() {
  //console.log("in getMoveHash");
   return RockPaperScissors.at(latestGameAddress).then(instance => {
            return  instance.calculateMovesHash($("#account-select").val(),
                                                $("input[name='pwd']").val(),
                                                $("#move-select").val(),
                                                {from: $("#account-select").val()});
    });
}

const reveal = function() {
   return RockPaperScissors.at(latestGameAddress).then(instance => {
            return  instance.reveal.sendTransaction($("input[name='pwd']").val(), 
                                                    $("#move-select").val(),
                                                    {from: $("#account-select").val()});
  }).then(txHash => {
    return web3.eth.getTransactionReceiptPromise(txHash);
  }).then(txObject => {
     updateTotalGas(txObject.gasUsed);
    if (txObject.status == "0x01" || txObject.status == 1) {
      updateStatus("move revealed successfuly.");
    } else {
      updateStatus("error revealing move.");
      console.error(txObject);
    }
  }).catch(console.error);
}

const claim = function() {
   return RockPaperScissors.at(latestGameAddress).then(instance => {
            return  instance.claim.sendTransaction({from: $("#account-select").val()});
  }).then(txHash => {
    return web3.eth.getTransactionReceiptPromise(txHash);
  }).then(txObject => {
    updateTotalGas(txObject.gasUsed);
    if (txObject.status == "0x01" || txObject.status == 1) {
      updateStatus("claimed successsfuly.");
    } else {
      updateStatus("error claiming.");
      console.error(txObject);
    }
  }).catch(console.error);
}