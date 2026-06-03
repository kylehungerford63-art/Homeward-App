const profiles = [];

async function getProfileByUserId(user_id) {
  return profiles.find(p => p.user_id === user_id) || null;
}

async function createProfile(profile) {
  profiles.push(profile);
  return profile;
}

async function updateProfile(user_id, updates) {
  const profile = profiles.find(p => p.user_id === user_id);
  if (!profile) return null;

  Object.assign(profile, updates, { updated_at: new Date() });
  return profile;
}

module.exports = {
  getProfileByUserId,
  createProfile,
  updateProfile
};
