const UserProfile = require('../models/profileModel');
const profileRepo = require('../db/profileRepository');

exports.getProfile = async (req, res) => {
  const user_id = req.user.id;

  let profile = await profileRepo.getProfileByUserId(user_id);

  if (!profile) {
    profile = new UserProfile({ user_id });
    await profileRepo.createProfile(profile);
  }

  res.json(profile);
};

exports.updateProfile = async (req, res) => {
  const user_id = req.user.id;
  const updates = req.body;

  const updated = await profileRepo.updateProfile(user_id, updates);

  if (!updated) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json(updated);
};

exports.getHouseSavingsAccount = async (req, res) => {
  const user_id = req.user.id;
  const profile = await profileRepo.getProfileByUserId(user_id);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json({
    selected_house_savings_account_id: profile.selected_house_savings_account_id
  });
};

exports.setHouseSavingsAccount = async (req, res) => {
  const user_id = req.user.id;
  const { account_id } = req.body;

  if (!account_id) {
    return res.status(400).json({ error: 'Missing account_id' });
  }

  const updated = await profileRepo.updateProfile(user_id, {
    selected_house_savings_account_id: account_id
  });

  res.json(updated);
};
