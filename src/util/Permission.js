const { QOTD } = require('../../config.json');
function isOfficer(user) {
  try {
    return (
      user.permissions.has('ManageChannels') ||
      user.permissions.has('Administrator') ||
      user.roles.cache.has(QOTD.ALLOWED_ROLE_ID)
    );
  } catch (error) {
    return false;
  }
}

function isAdmin(user) {
  return user.permissions.has('ADMINISTRATOR');
}

module.exports = { isOfficer, isAdmin };
