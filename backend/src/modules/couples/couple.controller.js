const { createCouple, joinCouple, getDashboard, getMyCouple } = require("./couple.service");

const create = async (req, res, next) => {
  try {
    const couple = await createCouple(req.user._id);

    res.status(201).json({
      success: true,
      data: couple,
    });
  } catch (error) {
    next(error);
  }
};

const join = async (req, res, next) => {
  try {
    const couple = await joinCouple(req.user._id, req.body.pairCode);

    res.status(200).json({
      success: true,
      data: couple,
    });
  } catch (error) {
    next(error);
  }
};

const dashboard = async (req, res, next) => {
  try {
    const data = await getDashboard(req.user._id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const couple = await getMyCouple(req.user._id);
    res.status(200).json({ success: true, data: couple });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  join,
  dashboard,
  me,
};
