import type { RequestHandler } from "express";
import { getAuth } from "../middlewares/auth.js";
import { getMyProfile, submitMyRiskProfile } from "../services/profileService.js";

export const getMe: RequestHandler = async (req, res) => {
  const { user, token } = getAuth(req);
  res.json(await getMyProfile(user, token));
};

export const putRiskProfile: RequestHandler = async (req, res) => {
  const { user, token } = getAuth(req);
  res.json(await submitMyRiskProfile(user, token, req.body));
};
