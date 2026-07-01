const asyncHandler = require("../../utils/asyncHandler");
const securityService = require("./security.service");
const { buildContext } = require("./request.context");

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

  const result = await securityService.changePassword(
    req.user._id,
    currentPassword,
    newPassword,
    { ctx: buildContext(req), currentSid: req.sessionId || null },
  );

  res.status(200).json({ success: true, data: result });
});

// ── Security Center ──
const getOverview = asyncHandler(async (req, res) => {
  const data = await securityService.getSecurityOverview(req.user._id);
  res.status(200).json({ success: true, data });
});

const getSessions = asyncHandler(async (req, res) => {
  const data = await securityService.listSessions(
    req.user._id,
    req.sessionId || null,
  );
  res.status(200).json({ success: true, data });
});

const revokeSession = asyncHandler(async (req, res) => {
  const data = await securityService.revokeSession(
    req.user._id,
    req.params.id,
    req.body.password,
    { ctx: buildContext(req), currentSid: req.sessionId || null },
  );
  res.status(200).json({ success: true, data });
});

const logoutOthers = asyncHandler(async (req, res) => {
  const data = await securityService.logoutOtherDevices(
    req.user._id,
    req.body.password,
    { ctx: buildContext(req), currentSid: req.sessionId || null },
  );
  res.status(200).json({ success: true, data });
});

const logoutCurrent = asyncHandler(async (req, res) => {
  const data = await securityService.logoutCurrent(
    req.user._id,
    req.sessionId || null,
    { ctx: buildContext(req) },
  );
  res.status(200).json({ success: true, data });
});

const getActivity = asyncHandler(async (req, res) => {
  const data = await securityService.getActivity(req.user._id, req.query.limit);
  res.status(200).json({ success: true, data });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const data = await securityService.deleteAccount(
    req.user._id,
    req.body.password,
  );
  res.status(200).json({ success: true, data });
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
  getOverview,
  getSessions,
  revokeSession,
  logoutOthers,
  logoutCurrent,
  getActivity,
  deleteAccount,
};
