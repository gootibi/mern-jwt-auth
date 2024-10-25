import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";
import { CONFLICT, UNAUTHORIZED } from "../constants/http";
import VerificationCodeType from "../constants/verificationCodeTypes";
import SessionModel from "../models/session.model";
import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verificationCode.model";
import appAssert from "../utils/appAssert";
import { oneYearFromNow } from "../utils/data";

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

    // create verification code
    const verificationCode = await VerificationCodeModel.create({
        userId: user._id,
        type: VerificationCodeType.EmailVerification,
        expiresAt: oneYearFromNow(),
    });

    //  send verification email

    // create session
    const session = await SessionModel.create({
        userId: user._id,
        userAgent: data.userAgent,
    });

    // sign access token and refresh token
    const refreshToken = jwt.sign(
        { sessionId: session._id },
        JWT_REFRESH_SECRET,
        {
            audience: ["user"],
            expiresIn: "30d"
        },
    );

    const accessToken = jwt.sign(
        {
            userId: user._id,
            sessionId: session._id
        },
        JWT_SECRET,
        {
            audience: ["user"],
            expiresIn: "15m"
        },
    );

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
    const refreshToken = jwt.sign(
        sessionInfo,
        JWT_REFRESH_SECRET,
        {
            audience: ["user"],
            expiresIn: "30d"
        },
    );

    const accessToken = jwt.sign(
        {
            ...sessionInfo,
            userId: user._id,
        },
        JWT_SECRET,
        {
            audience: ["user"],
            expiresIn: "15m"
        },
    );

    // return user and tokens
    return {
        use: user.omitPassword(),
        accessToken,
        refreshToken,
    }
};