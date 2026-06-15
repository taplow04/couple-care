const { registerUser, loginUser } = require("./auth.service");

const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
const getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
};

module.exports = {
  register,
  login,
  getCurrentUser,
};
