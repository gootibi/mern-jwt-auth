import assert from "node:assert";
import AppErrorCode from "../constants/appErrorCode";
import { HttpStatusCode } from "../constants/http";
import AppError from "./AppError";

type AppAssert = (
    condition: any,
    HttpStatusCode: HttpStatusCode,
    message: string,
    appErrorCode?: AppErrorCode
) => asserts condition;

/**
 * Assert a condition and throw an AppError if the condition is falsy.
 */
const appAssert: AppAssert = (
    condition,
    HttpStatusCode,
    message,
    appErrorCode
) => assert(condition, new AppError(HttpStatusCode, message, appErrorCode))

export default appAssert;