import { CONFLICT, UNAUTHORIZED } from "../constants/http";
import VerificationCodeType from "../constants/verificationCodeTypes";
import SessionModel from "../models/session.model";
import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verificationCode.model";
import appAssert from "../utils/appAssert";
import { oneYearFromNow } from "../utils/data";
import { refreshTokenSignOptions, signToken } from "../utils/jwt";

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