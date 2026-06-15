const asyncHandler = require("../../utils/asyncHandler");

const {
  createHistory,

  getMyHistories,

  updateHistory,

  deleteHistory,

  getPartnerHistories,
} = require("./history.service");

const create = asyncHandler(async (req, res) => {
  const history = await createHistory(req.user._id, req.body);

  res.status(201).json({
    success: true,

    data: history,
  });
});

const getMine = asyncHandler(async (req, res) => {
  const histories = await getMyHistories(req.user._id);

  res.json({
    success: true,

    data: histories,
  });
});

const getPartner = asyncHandler(async (req, res) => {
  const histories = await getPartnerHistories(req.user._id);

  res.json({
    success: true,

    data: histories,
  });
});

const update = asyncHandler(async (req, res) => {
  const history = await updateHistory(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,

    data: history,
  });
});

const remove = asyncHandler(async (req, res) => {
  await deleteHistory(req.user._id, req.params.id);

  res.status(200).json({
    success: true,

    message: "History deleted",
  });
});

module.exports = {
  create,
  getMine,
  getPartner,
  update,
  remove,
};
