// Allows us to use ES6 in our migrations and tests.
module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 9545,
      gas: 5000000, 
      network_id: '*' // Match any network id
    }
  }
}
