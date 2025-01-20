import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const optionsForCookies = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const ACCESS_TOKEN = user.generateAccessToken();
        const REFRESH_TOKEN = user.generateRefreshToken();

        user.refreshToken = REFRESH_TOKEN;
        await user.save({ validateBeforeSave: false })
        
        return {ACCESS_TOKEN,REFRESH_TOKEN}

    } catch (error) {
        throw new ApiError(500,"Somehting went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get data from frontend
    const { userName, email, fullName, password } = req.body;

    //validation - not empty
    if (userName === "" || email === "" || fullName === "" || password === "") {
        throw new ApiError(400, "All field are reqired");
    }

    //check if user already exists
    const existedUser = await User.findOne({
        $or:[{userName},{email}]
    })                                      // using $or oparated finding that any of one field exsits in DB or not
    
    if (existedUser) {
        return res.status(409).json(
            new ApiResponse(409, null, "User with Username or email exists")
        )
        //throw new ApiError(409, "User with Username or email exists");
    }

    //check for images,  avatar is required
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req?.files?.coverImage[0]?.path ?? ""; //?? is the nullish coalescing operator. It returns the right-hand operand if the left-hand operand is null or undefined, otherwise it returns the left-hand operand.

    if (!avatarLocalPath) {
        console.log(avatarLocalPath)
        throw new ApiError(400, "Avatar are reqired");
    }

    //upload to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath); //await coz file may take long to upload
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {                                            //check that img uploaded or not
        throw new ApiError(400, "Avatar are reqired");
    }

    //create user object - create entry in db
    const user = await User.create({
        userName: userName.toLowerCase(),
        email,                                  //if your varName and loacl var name is same so you can write in this way other then email:email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password

    })

    //remove password and refresh token from response
    //check for user creation
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )                                               //by using select method you can deselect filed by - using before filed name
    //bydefault all fileds selcted so deselct using -
    
    if (!createdUser) {
        throw new ApiError(500,"Somehting went wrong while registering user, Please try again!!")
    }

    //return response
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User register successfully")
    )
})

const loginUser = asyncHandler( async (req,res) => {
    //get req.body
    const { userName, email, password } = req.body;
    
    //username or email base login
    if (!(userName || email) && !password) {
        throw new ApiError(400, "Username/Email or Password is required");
    }

    //find user
    const user = await User.findOne({
        $or:[{userName},{email}]
    })

    if (!user) {
        throw new ApiError(400, "User not found, Please register first!!");
    }

    //pwd check
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Password is not valid");
    }

    //access and refresh token generate
    const { ACCESS_TOKEN, REFRESH_TOKEN } = await generateAccessAndRefreshToken(user._id);
    
    //send token in secure cookie
    const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken")
    
    return res
        .status(200)
        .cookie("accessToken", ACCESS_TOKEN, optionsForCookies)
        .cookie("refreshToken", REFRESH_TOKEN, optionsForCookies)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, ACCESS_TOKEN, REFRESH_TOKEN
                },
                "User logged In successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 //this romove filed from DB
            }
        },
        {
            new:true                        //by seting new:true it'll set new return in obj
        }
    )
 
    //clear cookies
    return res
        .status(200)
        .clearCookie("accessToken", optionsForCookies)
        .clearCookie("refreshToken", optionsForCookies)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out!!"
            )
        )
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorised request");
    }

   try {
       const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
 
     // @ts-ignore
     const user = await User.findById(decodedToken?._id);
 
     if (!user) {
         throw new ApiError(401, "Invalid refresh token");
     }
 
     if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh token expried");
     }
 
     //access and refresh token generate
     const { ACCESS_TOKEN, REFRESH_TOKEN } = await generateAccessAndRefreshToken(user._id);
 
     return res
         .status(200)
         .cookie("accessToken", ACCESS_TOKEN, optionsForCookies)
         .cookie("refreshToken", REFRESH_TOKEN, optionsForCookies)
         .json(
             new ApiResponse(
                 200,
                 {
                      ACCESS_TOKEN, REFRESH_TOKEN
                 },
                 "Access token refreshed!!"
             )
         )
   } catch (error) {
       throw new ApiError(401, error?.message || "Access token refreshed failed!!");
   }
})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    if (!(await user.isPasswordCorrect(oldPassword))) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, {}, "Password change successfully")
    )
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current User")
    )
})

const updateAccountDetails = asyncHandler(async (req,res) => {
    const { fullName, email } = req.body;
    
    if (!fullName || !email) {
        throw new ApiError(400, "All fileds are required");
    }

    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { fullName, email }
        },
        { new: true } //return updated obj
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, user, "FullName and email updated successfully")
    )
})

const updateUserAvatar = asyncHandler(async (req,res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(500, "Error while uploading");
    }

    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { avatar : avatar.url }
        },
        { new: true } //return updated obj
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage file missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(500, "Error while uploading");
    }

    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { coverImage: coverImage.url }
        },
        { new: true } //return updated obj
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, user, "Cover Image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async (req,res) => {
    const { userName } = req.params;

    if (!userName?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: { userName : userName?.toLowerCase()}
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as:"subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size:"$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else:false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email:1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Chennel does not exists!!");
    }

    return res.status(200).json(
        new ApiResponse(200, channel[0], "User data fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async (req,res) => {
    
    const user = await User.aggregate([
        {
            $match:{_id : new mongoose.Types.ObjectId(req.user._id)}
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        userName: 1,
                                        fullName: 1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first:"$owner"
                             }
                         }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}
