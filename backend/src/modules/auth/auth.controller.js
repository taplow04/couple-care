const {
  requestRegistration,
  verifyRegistration,
  resendOtp,
  loginUser,
} = require("./auth.service");
const { resolveStage } = require("../users/stage.helper");

// Step 1: collect credentials + email an OTP (no account created yet).
const requestOtp = async (req, res, next) => {
  try {
    const result = await requestRegistration(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Step 2: verify OTP → create account → auto-login.
const verifyOtp = async (req, res, next) => {
  try {
    const result = await verifyRegistration(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const resend = async (req, res, next) => {
  try {
    const result = await resendOtp(req.body);
    res.status(200).json({ success: true, data: result });
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

    // Resolve the lifecycle stage (preparing | growing | healing). This also
    // yields coupleConnected (true only when BOTH partners are linked), which
    // the frontend route guards rely on.
    const { stage, hasPartner, coupleConnected, lastCoupleId } =
      await resolveStage(req.user);

    res.status(200).json({
      success: true,
      data: {
        ...userObj,
        coupleConnected,
        stage,
        stageMeta: { hasPartner, lastCoupleId },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestOtp,
  verifyOtp,
  resend,
  login,
  getCurrentUser,
};
