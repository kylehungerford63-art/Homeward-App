class User {
  constructor({
    id,
    name,
    email,
    password_hash,
    house_goal_id = null,
    selected_house_savings_account_id = null,
    created_at = new Date(),
    updated_at = new Date()
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password_hash = password_hash;
    this.house_goal_id = house_goal_id;
    this.selected_house_savings_account_id = selected_house_savings_account_id;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }
}

module.exports = User;
