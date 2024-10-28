import { RequestHandler } from "express";
import mongoose from "mongoose";
import AppErrorCode from "../constants/appErrorCode";
import { UNAUTHORIZED } from "../constants/http";
import appAssert from "../utils/appAssert";
import { verifyToken } from "../utils/jwt";

// wrap with catchErrors() if you need this to be async
const authenticate: RequestHandler = (req, res, next) => {
    const accessToken = req.cookies.accessToken as string | undefined;
    appAssert(
        accessToken,
        UNAUTHORIZED,
        "Not authorized",
        AppErrorCode.InvalidAccessToken
    );

    const { error, payload } = verifyToken(accessToken);
    appAssert(
        payload,
        UNAUTHORIZED,
        error === "jwt expired" ? "Token expired" : "Invalid token",
        AppErrorCode.InvalidAccessToken
    );

    req.userId = payload.userId as mongoose.Types.ObjectId;
    req.sessionId = payload.sessionId as mongoose.Types.ObjectId;
    next();
}

export default authenticate;
