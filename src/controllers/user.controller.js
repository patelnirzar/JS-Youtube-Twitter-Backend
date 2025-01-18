import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";


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
    const coverImageLocalPath = "" ?? req?.files?.coverImage[0]?.path; //?? is the nullish coalescing operator. It returns the right-hand operand if the left-hand operand is null or undefined, otherwise it returns the left-hand operand.

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

export { registerUser }