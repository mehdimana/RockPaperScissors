const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
require("file-loader?name=../index.html!../index.html");
const $ = require("jquery");
// Not to forget our built contract
const rockPaperScissorsJson = require("../../build/contracts/RockPaperScissors.json");

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

const RockPaperScissors = truffleContract(rockPaperScissorsJson);
RockPaperScissors.setProvider(web3.currentProvider);

var latestGameHash;

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
            }
            $("#account-select").change(function(){
                updateBalance($(this).val());
            });
            // console.log("Account:", window.account);
            return web3.version.getNetworkPromise();
        })
        .then(network => console.log("Network:", network.toString(10)))
        .then(() => watchEvents())
        .then(() => updateBalance($("#account-select").val()))
        .then(() => $("#create-game").click(createGame))
        .then(() => $("#play-buttont").click(playGame))
        .then(() => $("#reveal-buttont").click(reveal))
        .then(() => $("#claim-winner-buttont").click(claimAsWinner))
        .then(() => $("#claim-draw-buttont").click(claimDraw))
        // Never let an error go unlogged.
        .catch(console.error);
});

const updateBalance = function(accountSelected) {
  return web3.eth.getBalancePromise(accountSelected)
                 .then(balance => {
                    $("#balance").html(balance.toString(10))
                 }).catch(console.error);
};

const watchEvents = function() {
  var deployed;
  return RockPaperScissors.deployed().then( deploy => {
          deployed = deploy;
            return  deploy.LogClaim({from: account});
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
         });
}

const watchEvent = function(event) {
   event.watch(function(err, result) {
    if (err) {
      console.log(err)
      return;
    }
    console.log("Event received: " + result.event);
    console.log(result.args);
    if (result.event == "LogGameCreated") {
      $("#gameHash").html(result.args.gameHash);
      latestGameHash = result.args.gameHash;
    }
  })
}

const createGame = function() {
  //console.log("in create game");
  return RockPaperScissors.deployed().then( deploy => {
            return  deploy.createGame.sendTransaction($("input[name='gnumber']").val(), 
                                                      $("#account-select").val(), 
                                                      $("#second-player-select").val(),
                                                      $("input[name='stake']").val(),
                                                      {from: $("#account-select").val(),
                                                       gas: 5000000});
        }).then(txHash => {
          return web3.eth.getTransactionReceiptPromise(txHash);
        }).then(txObject => {
          if (txObject.status == "0x01" || txObject.status == 1) {
            $("#status").html("game created successsfuly.");
          } else {
            $("#status").html("error creating game.");
            console.error(txObject);
          }
         }).catch(console.error);
}

const playGame = function() {
  //console.log("in play game");
  var deployed;
   return RockPaperScissors.deployed().then( deploy => {
            deployed = deploy;
            return getMoveHash();
        }).then(hash => {
            return  deployed.play.sendTransaction(latestGameHash, 
                                                  hash, 
                                                 {from: $("#account-select").val(),
                                                  value: $("input[name='stake']").val()});
        }).then(txHash => {
          return web3.eth.getTransactionReceiptPromise(txHash);
        }).then(txObject => {
          if (txObject.status == "0x01" || txObject.status == 1) {
            $("#status").html("Play successfull.");
          } else {
            $("#status").html("Error occured while playing.");
            console.error(txObject);
          }
        }).catch(console.error);
}

const getMoveHash = function() {
  //console.log("in getMoveHash");
   return RockPaperScissors.deployed() .then( deploy => {
            return  deploy.calculateMovesHash(latestGameHash, 
                                              $("#account-select").val(),
                                              $("input[name='pwd']").val(),
                                              $("#move-select").val(),
                                              {from: $("#account-select").val()});
    });
}

const reveal = function() {
   return RockPaperScissors.deployed().then( deploy => {
            return  deploy.reveal.sendTransaction(latestGameHash,
                                                  $("input[name='pwd']").val(), 
                                                  $("#move-select").val(),
                                                  {from: $("#account-select").val()});
  }).then(txHash => {
    return web3.eth.getTransactionReceiptPromise(txHash);
  }).then(txObject => {
    if (txObject.status == "0x01" || txObject.status == 1) {
      $("#status").html("move revealed successfuly.");
    } else {
      $("#status").html("error revealing move.");
      console.error(txObject);
    }
  }).catch(console.error);
}

const claimDraw = function() {
   return RockPaperScissors.deployed().then( deploy => {
            return  deploy.claimDraw.sendTransaction(latestGameHash,
                                                    {from: $("#account-select").val()});
  }).then(txHash => {
    return web3.eth.getTransactionReceiptPromise(txHash);
  }).then(txObject => {
    if (txObject.status == "0x01" || txObject.status == 1) {
      $("#status").html("claimed successfuly.");
    } else {
      $("#status").html("error claiming.");
      console.error(txObject);
    }
  }).catch(console.error);
}

const claimAsWinner = function() {
   return RockPaperScissors.deployed().then( deploy => {
            return  deploy.claimAsWinner.sendTransaction(latestGameHash,
                                                        {from: $("#account-select").val()});
  }).then(txHash => {
    return web3.eth.getTransactionReceiptPromise(txHash);
  }).then(txObject => {
    if (txObject.status == "0x01" || txObject.status == 1) {
      $("#status").html("claimed successsfuly.");
    } else {
      $("#status").html("error claiming.");
      console.error(txObject);
    }
  }).catch(console.error);
}