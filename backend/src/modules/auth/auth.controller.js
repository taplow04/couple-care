const { registerUser, loginUser } = require("./auth.service");
const Couple = require("../couples/couple.model");

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
const getCurrentUser = async (req, res, next) => {
  try {
    const userObj = req.user.toObject ? req.user.toObject() : req.user;

    // Determine connection state so the frontend can gate routes:
    // coupleConnected === true only when BOTH partners are linked.
    let coupleConnected = false;
    if (userObj.currentCoupleId) {
      const couple = await Couple.findById(userObj.currentCoupleId).select(
        "partnerOneId partnerTwoId",
      );
      coupleConnected = !!(couple && couple.partnerOneId && couple.partnerTwoId);
    }

    res.status(200).json({
      success: true,
      data: { ...userObj, coupleConnected },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
};
