const bcrypt = require('bcryptjs');
const validator = require('validator');

const User = require('../models/user');

module.exports = {
  createUser: async function ({ userInput }, req) {
    const { email, name, password } = userInput;
    const errors = [];
    if (!validator.isEmail(email))  errors.push({ message: 'Invalid Email' });
    if (validator.isEmpty(password) || !validator.isLength(password, { min: 5 })) errors.push('Password too short');
    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    let user = await User.findOne({ email });
    if (user) {
      const error = new Error('User exist already!');
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user = new User({
      email,
      name,
      password: hashedPassword
    });
    user = await user.save();

    return { ...user._doc, _id: user._id.toString() }
  }
}