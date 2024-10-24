import VerificationCodeType from "../constants/verificationCodeTypes";
import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verificationCode.model";
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

    if (exisitingUser) {
        throw new Error("User already exists");
    }

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
    // sign access token and refresh token
    // return user and token
};