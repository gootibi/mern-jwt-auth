import express, { Router } from 'express';
import { getUserHandler } from '../controllers/user.controller';
const userRoutes: Router = express.Router();

// prefix: /users
userRoutes.get("/", getUserHandler);

export default userRoutes;