import { CookieOptions, Response } from "express";
import { fifteenMinutesFromNow, thirtyDaysFromNow } from "./data";

const secure = process.env.NODE_ENV !== "development";

const defaults: CookieOptions = {
    sameSite: "strict",
    httpOnly: true,
    secure,
};

const getAccessTokenCookieOptions = (): CookieOptions => ({
    ...defaults,
    expires: fifteenMinutesFromNow()
});

const getRefreshTokenCookieOptions = (): CookieOptions => ({
    ...defaults,
    expires: thirtyDaysFromNow(),
    path: "/auth/refresh"
});

type Params = {
    res: Response;
    accessToken: string;
    refreshToken: string;
};

export const setAuthCookies = ({ res, accessToken, refreshToken }: Params) =>
    res
        .cookie("access_token", accessToken, getAccessTokenCookieOptions())
        .cookie("refresh_token", refreshToken, getRefreshTokenCookieOptions());