const authValidators = require('./auth.validator');
const projectValidators = require('./project.validator');
const taskValidators = require('./task.validator');

module.exports = {
  ...authValidators,
  ...projectValidators,
  ...taskValidators,
};
