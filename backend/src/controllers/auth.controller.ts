import { CREATED, OK, UNAUTHORIZED } from "../constants/http";
import SessionModel from "../models/session.model";
import { createAccount, loginUser, refreshUserAccessToken, resetPassword, sendPasswordResetEmail, verifyEmail } from "../services/auth.service";
import appAssert from "../utils/appAssert";
import catchError from "../utils/catchError";
import { clearAuthCookies, getAccessTokenCookieOptions, getRefreshTokenCookieOptions, setAuthCookies } from "../utils/cookies";
import { verifyToken } from "../utils/jwt";
import { emailSchema, loginSchema, registerSchema, resetPassworSchema, verificationCodeSchema } from "./auth.schemas";

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


export const verifyEmailHandler = catchError(async (req, res) => {
    // validate the request
    const verificationCode = verificationCodeSchema.parse(req.params.code);

    // call service
    await verifyEmail(verificationCode);

    return res.status(OK).json({
        message: "Email was successfully verified",
    });
});

export const sendPasswordResetHandler = catchError(async (req, res) => {
    // grab the email
    const email = emailSchema.parse(req.body.email);

    // call service
    await sendPasswordResetEmail(email);

    return res.status(OK).json({
        message: "Password reset email sent",
    });

});

export const resetPasswordHandler = catchError(async (req, res) => {
    const request = resetPassworSchema.parse(req.body);

    // call service
    await resetPassword(request);

    return clearAuthCookies(res)
        .status(OK)
        .json({
            message: "Password reset successful"
        });
});