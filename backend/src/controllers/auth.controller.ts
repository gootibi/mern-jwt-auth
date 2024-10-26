import { CREATED, OK, UNAUTHORIZED } from "../constants/http";
import SessionModel from "../models/session.model";
import { createAccount, loginUser, refreshUserAccessToken } from "../services/auth.service";
import appAssert from "../utils/appAssert";
import catchError from "../utils/catchError";
import { clearAuthCookies, getAccessTokenCookieOptions, getRefreshTokenCookieOptions, setAuthCookies } from "../utils/cookies";
import { verifyToken } from "../utils/jwt";
import { loginSchema, registerSchema } from "./auth.schemas";

export const registerHandler = catchError(async (req, res) => {
    // validate the request
    const request = registerSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"],
    })

    // call service
    const { user, accessToken, refreshToken } = await createAccount(request);

    // return response
    return setAuthCookies({ res, accessToken, refreshToken })
        .status(CREATED)
        .json(user);
});

export const loginHandler = catchError(async (req, res) => {
    // validate the request
    const request = loginSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"],
    });

    // call service
    const { accessToken, refreshToken } = await loginUser(request);

    // return response
    return setAuthCookies({ res, accessToken, refreshToken })
        .status(OK)
        .json({ message: 'Login successful' });
});

export const logoutHandler = catchError(async (req, res) => {
    // grab the access token
    const accessToken = req.cookies.accessToken as string | undefined;
    const { payload } = verifyToken(accessToken ?? "");

    if (payload) {
        //remove session from db
        await SessionModel.findByIdAndDelete(payload.sessionId);
    }

    // clear the cookie
    return clearAuthCookies(res)
        .status(OK)
        .json({ message: 'Logout successful' });
});

export const refreshHandler = catchError(async (req, res) => {
    // grab the refresh token
    const refreshToken = req.cookies.refreshToken as string | undefined;
    appAssert(refreshToken, UNAUTHORIZED, "Missing refresh token");

    const {
        accessToken,
        newRefreshToken
    } = await refreshUserAccessToken(refreshToken);

    if (newRefreshToken) {
        res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions());
    }

    return res
        .status(OK)
        .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
        .json({
            message: "Access token refreshed",
        });
});