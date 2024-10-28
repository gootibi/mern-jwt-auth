import { APP_ORIGIN } from "../constants/env";
import { CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, TO_MANY_REQUESTS, UNAUTHORIZED } from "../constants/http";
import VerificationCodeType from "../constants/verificationCodeTypes";
import SessionModel from "../models/session.model";
import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verificationCode.model";
import appAssert from "../utils/appAssert";
import { hashValue } from "../utils/bcrypt";
import { fiveMinutesAgo, ONE_DAY_MS, oneHourFromNow, oneYearFromNow, thirtyDaysFromNow } from "../utils/data";
import { getPasswordResetTemplate, getVerifyEmailTemplate } from "../utils/emailTemplates";
import { RefreshTokenPayload, refreshTokenSignOptions, signToken, verifyToken } from "../utils/jwt";
import { sendMail } from "../utils/sendMail";

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
    const url = `${APP_ORIGIN}/email/verify/${verificationCode._id}`;

    const { error } = await sendMail({
        to: user.email,
        ...getVerifyEmailTemplate(url),
    });

    // ignore email errors for now
    if (error) {
        console.log(error);
    }

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

export const verifyEmail = async (code: string) => {
    // get the verification code
    const validCode = await VerificationCodeModel.findOne({
        _id: code,
        type: VerificationCodeType.EmailVerification,
        expiresAt: { $gt: new Date() },
    })
    appAssert(validCode, NOT_FOUND, "Invalid or expired verification code");

    // gett user by id  and update user to verified true
    const updatedUser = await UserModel.findByIdAndUpdate(
        validCode.userId,
        {
            verified: true,
        },
        { new: true }
    );
    appAssert(updatedUser, INTERNAL_SERVER_ERROR, "Failed to verify email");

    // delete verification code
    await validCode.deleteOne();

    // return the user
    return {
        user: updatedUser.omitPassword(),
    };
};

export const sendPasswordResetEmail = async (email: string) => {
    // get the user by email
    const user = await UserModel.findOne({ email: email });
    appAssert(user, NOT_FOUND, "User not found");

    // check email rate limit
    const fiveMinAgo = fiveMinutesAgo();
    const count = await VerificationCodeModel.countDocuments({
        userId: user._id,
        type: VerificationCodeType.PasswordReset,
        createdAt: { $gt: fiveMinAgo }
    });

    appAssert(count <= 1, TO_MANY_REQUESTS, "Too many requests, please try again later");

    // create verification code 
    const expiresAt = oneHourFromNow();

    const verificationCode = await VerificationCodeModel.create({
        userId: user._id,
        type: VerificationCodeType.PasswordReset,
        expiresAt,
    });

    // send verification email
    const url = `${APP_ORIGIN}/password/reset?code=${verificationCode._id}&exp=${expiresAt.getTime()}`

    const { data, error } = await sendMail({
        to: user.email,
        ...getPasswordResetTemplate(url),
    });
    appAssert(data?.id, INTERNAL_SERVER_ERROR, `${error?.name} - ${error?.message}`)

    // return success
    return {
        url,
        emailId: data.id,
    }
};

type ResetPasswordParams = {
    password: string,
    verificationCode: string,
};

export const resetPassword = async (
    { password, verificationCode }: ResetPasswordParams
) => {
    // get the verification code
    const valideCode = await VerificationCodeModel.findOne({
        _id: verificationCode,
        type: VerificationCodeType.PasswordReset,
        expiresAt: { $gt: new Date() },
    });

    appAssert(valideCode, NOT_FOUND, "Invalid or expired valification code");

    // update the users password
    const updatedUser = await UserModel.findByIdAndUpdate(
        valideCode.userId,
        { password: await hashValue(password) }
    );
    appAssert(updatedUser, INTERNAL_SERVER_ERROR, "Failed to reset password");

    // delete the verification code
    await valideCode.deleteOne();

    // delete all sessions
    await SessionModel.deleteMany({
        userId: updatedUser._id,
    });

    return {
        user: updatedUser.omitPassword(),
    };
};