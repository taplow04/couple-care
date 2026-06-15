const asyncHandler = require("../../utils/asyncHandler");
const securityService = require("./security.service");

const sendVerification = asyncHandler(async (req, res) => {
  await securityService.sendVerificationEmail(req.user._id);

  res.status(200).json({ success: true });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  await securityService.verifyEmail(token);

  res.status(200).json({ success: true });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  await securityService.forgotPassword(email);

  res.status(200).json({ success: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  await securityService.resetPassword(token, password);

  res.status(200).json({ success: true });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await securityService.changePassword(
    req.user._id,
    currentPassword,
    newPassword,
  );

  res.status(200).json({ success: true });
});

const getSettings = asyncHandler(async (req, res) => {
  const settings = await securityService.getSettings(req.user._id);

  res.status(200).json({ success: true, data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await securityService.updateSettings(req.user._id, req.body);

  res.status(200).json({ success: true, data: settings });
});

module.exports = {
  sendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getSettings,
  updateSettings,
};
