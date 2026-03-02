import express from "express";
import { getUsdToUahRate } from "../controllers/metaController.js";

const metaRouter = express.Router();

metaRouter.get("/exchange-rate", getUsdToUahRate);

export default metaRouter;
