const User = require("../users/user.model");

const generateToken = require("../../utils/jwt");

const registerUser = async (data) => {
  const { name, email, password } = data;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const token = generateToken(user._id);

  const userObj = user.toObject();
  delete userObj.password;

  return {
    user: userObj,
    token,
  };
};
const loginUser = async (data) => {
  const { email, password } = data;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken(user._id);

  const userObj = user.toObject();
  delete userObj.password;

  return {
    user: userObj,
    token,
  };
};

module.exports = {
  registerUser,
  loginUser,
};
