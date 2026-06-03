const users = [];

async function findUserByEmail(email) {
  return users.find(u => u.email === email) || null;
}

async function createUser(user) {
  users.push(user);
  return user;
}

async function findUserById(id) {
  return users.find(u => u.id === id) || null;
}

module.exports = {
  findUserByEmail,
  createUser,
  findUserById
};
