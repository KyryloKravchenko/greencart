import express from 'express';
import authUser from "../middlewares/authUser.js";
import { UpdateCart } from "../controllers/cartController.js";


const cartRouter = express.Router();

cartRouter.post('/update', authUser, UpdateCart)

export default cartRouter;