const accounts = [
  {
    id: "demo-account-1",
    name: "My Savings Account",
    balance: 69000
  }
];

async function getAccountById(id) {
  return accounts.find(a => a.id === id) || null;
}

module.exports = {
  getAccountById
};
