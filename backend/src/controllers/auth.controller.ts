import { z } from "zod";
import catchError from "../utils/catchError";

const registerSchema = z.object({
    email: z.string().email().min(1).max(255),
    password: z.string().min(6).max(255),
    confirmPassword: z.string().min(6).max(255),
    userAgent: z.string().optional(),
}).refine(
    (data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
}
)

export const registerHandler = catchError(async (req, res) => {
    // validate the request
    const request = registerSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"],
    })

    // call service
    
    // return response
}
);