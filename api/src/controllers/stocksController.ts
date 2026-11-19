import type { RequestHandler } from "express";
import { getStock, getStockHistory, searchStocks } from "../services/stockService.js";

export const getStockSearch: RequestHandler = async (req, res) => {
  res.json(await searchStocks(req.query.q));
};

export const getStockDetail: RequestHandler = async (req, res) => {
  res.json(await getStock(req.params.symbol));
};

export const getStockHistoryHandler: RequestHandler = async (req, res) => {
  res.json(await getStockHistory(req.params.symbol, req.query.range));
};
