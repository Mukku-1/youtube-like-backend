import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateRefreshTokenAndAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.genrateAccessToken();
    const refreshToken = user.genrateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while creating refreshtoken and accesstoken"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get all the user information from front
  //validation of the information that is meeting our requirement
  //checking user is new or already registered
  //checking for avatar and cover image because it is our requirement
  //upload file on cloudinary
  //checking the file upload is success full or not in the local environment or cloud both
  //create a user object -> create entry in db
  //remove password and refresh token from the response field
  //checking for user creation
  //return response
  const { email, fullName, username, password } = req.body;

  if (
    [email, fullName, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all field is required");
  }
  const exitedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (exitedUser) {
    throw new ApiError(409, "email and username is already registered");
  }
  let avatarImageLocal = req.files?.avatar[0]?.path;

  if (!avatarImageLocal) {
    throw new ApiError(403, "Avatar is required");
  }

  let coverImageLocal = null;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocal = req.files.coverImage[0].path;
  }
  const avatar = await uploadOnCloudinary(avatarImageLocal);
  const converImage = await uploadOnCloudinary(coverImageLocal);

  if (!avatar) {
    throw new ApiError(404, "Avatar image is required");
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    converImage: converImage.url,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "something went wrong while creating user try again"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "user created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  //username or email
  //check the password
  //access token and refresh token
  //send cookeis

  const { username, email, password } = req.body;
  if (!username || !email) {
    throw new ApiError(400, "Please provide either email or username");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(400, "user does not exit");
  }

  const isPassValid = await user.isPasswordCorrect(password);
  if (!isPassValid) {
    throw new ApiError(400, "Invalid password");
  }

  const { accessToken, refreshToken } = generateRefreshTokenAndAccessToken(
    user._id
  );

  const loginedUser = User.findById(user._id).select("-password -refreshToken");

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        {
          user: loginedUser,
          accessToken,
          refreshToken,
        },
        "user is logged successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findOneAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "logout successfull"));
});
export { registerUser, loginUser, logoutUser };
