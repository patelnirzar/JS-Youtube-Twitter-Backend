import cookieParser from 'cookie-parser';
import cors from 'cors'
import express from 'express'


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true}))
app.use(express.static("public"))
app.use(cookieParser())

// router import
import userRouter from './routes/user.routes.js';

//router declaration
app.use("/api/v1/users", userRouter);

export default app;