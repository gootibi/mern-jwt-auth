import { CONFLICT, UNAUTHORIZED } from "../constants/http";
import VerificationCodeType from "../constants/verificationCodeTypes";
import SessionModel from "../models/session.model";
import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verificationCode.model";
import appAssert from "../utils/appAssert";
import { ONE_DAY_MS, oneYearFromNow, thirtyDaysFromNow } from "../utils/data";
import { RefreshTokenPayload, refreshTokenSignOptions, signToken, verifyToken } from "../utils/jwt";

export type CreateAccountParams = {
    email: string;
    password: string;
    userAgent?: string;
};

export const createAccount = async (data: CreateAccountParams) => {
    // verify existing user doesnt exist
    const exisitingUser = await UserModel.exists({
        email: data.email,
    });

    appAssert(!exisitingUser, CONFLICT, "Email already in use");
    // if (exisitingUser) {
    //     throw new Error("User already exists");
    // }

    // create user
    const user = await UserModel.create({
        email: data.email,
        password: data.password,
    });

    const userId = user._id;

    // create verification code
    const verificationCode = await VerificationCodeModel.create({
        userId,
        type: VerificationCodeType.EmailVerification,
        expiresAt: oneYearFromNow(),
    });

    //  send verification email

    // create session
    const session = await SessionModel.create({
        userId,
        userAgent: data.userAgent,
    });

    // sign access token and refresh token
    const refreshToken = signToken(
        { sessionId: session._id },
        refreshTokenSignOptions
    );

    const accessToken = signToken({
        userId,
        sessionId: session._id
    });

    // return user and tokens
    return {
        user: user.omitPassword(),
        accessToken,
        refreshToken,
    };
};

export type LoginParams = {
    email: string;
    password: string;
    userAgent?: string;
};

export const loginUser = async ({ email, password, userAgent }: LoginParams) => {
    // get the user by email
    const user = await UserModel.findOne({ email })
    appAssert(user, UNAUTHORIZED, "Invalide email or password");

    // validate password from the request
    const isValide = await user.comparePassword(password);
    appAssert(isValide, UNAUTHORIZED, "Invalide email or password")

    const userId = user._id;
    // create session
    const session = await SessionModel.create({
        userId,
        userAgent,
    });

    const sessionInfo = {
        sessionId: session._id,
    };

    // sign access token and refresh token
    const refreshToken = signToken(sessionInfo, refreshTokenSignOptions)

    const accessToken = signToken({
        ...sessionInfo,
        userId,
    })

    // return user and tokens
    return {
        use: user.omitPassword(),
        accessToken,
        refreshToken,
    }
};

export const refreshUserAccessToken = async (refreshToken: string) => {
    // validate the refresh token
    const {
        payload
    } = verifyToken<RefreshTokenPayload>(refreshToken, {
        secret: refreshTokenSignOptions.secret,
    });
    appAssert(payload, UNAUTHORIZED, "Invalid refresh token");

    const session = await SessionModel.findById(payload.sessionId);
    const now = Date.now();
    appAssert(
        session && session.expiresAt.getTime() > now,
        UNAUTHORIZED,
        "Session expired"
    );

    // refresh the session if it expires in the next 24 hours
    const sessionNeedsRefresh = session.expiresAt.getTime() - now <= ONE_DAY_MS;

    if (sessionNeedsRefresh) {
        session.expiresAt = thirtyDaysFromNow();
        await session.save();
    }

    // sign the tokens
    const newRefreshToken = sessionNeedsRefresh
        ? signToken(
            {
                sessionId: session._id,
            },
            refreshTokenSignOptions
        )
        : undefined;

    const accessToken = signToken({
        userId: session.userId,
        sessionId: session._id
    });

    // return the tokens
    return {
        accessToken,
        newRefreshToken,
    };
};