import express from "express";
import { queryAssistant } from "../controllers/aiController.js";

const aiRouter = express.Router();

aiRouter.post("/query", queryAssistant);

export default aiRouter;
