import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateRefreshTokenAndAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.genrateAccessToken();
    const refreshToken = user.generateRefreshToken();

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
  console.log(username, email, password, typeof (email, password));
  if (!email && !username) {
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

  console.log(" password is correct :", isPassValid);
  const { accessToken, refreshToken } =
    await generateRefreshTokenAndAccessToken(user._id);

  const loginedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

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

const refreshedAccessToken = asyncHandler(async (req, res) => {
  const incomingRefresToken = req.cookies.refreshToken;
  if (!incomingRefresToken) {
    throw new ApiError(401, "unauthorized access");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefresToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(402, "invalid refresh token");
    }

    if (incomingRefresToken !== user.refreshToken) {
      throw new ApiError(403, "token is expired");
    }

    const option = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateRefreshTokenAndAccessToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "access token has been refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  const isPasswordValid = user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiResponse(405, "invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password is changes successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "user fetched successfully"));
});

const updateUserDetail = asyncHandler(async (req, res) => {
  const { username, fullName } = req.body;

  if (!username || !fullName) {
    throw new ApiError(400, "all field are required");
  }
  const user = await User.findById(
    req.user.id,
    {
      $set: {
        fullName,
        username,
      },
    },
    { new: true }
  ).select("-password");
  return res.status(200).json(200, user, "detail is updated successfully");
});

const updataUserAvatar = asyncHandler(async (req, res) => {
  const localAvatarPath = req.file?.path;

  if (!localAvatarPath) {
    throw new ApiError(400, "missing avatar file");
  }
  const avatar = await uploadOnCloudinary(localAvatarPath);
  if (!avatar.url) {
    throw new ApiError(401, "something went wrong while uploading avatar");
  }
  const user = await User.findById(req.user._id).select("-password");
  let deleteAvtar = user.avatar;
  user.avatar = avatar.url;
  user.save({ validateBeforeSave: false });
  deleteOnCloudinary(deleteAvtar).catch((error) => console.log(error));
  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar update is successful"));
});
const updataUserCoverImage = asyncHandler(async (req, res) => {
  const localCoverImage = req.file?.path;

  if (!localCoverImage) {
    throw new ApiError(400, "missing cover image file");
  }
  const coverImage = await uploadOnCloudinary(localCoverImage);
  if (!coverImage.url) {
    throw new ApiError(401, "something went wrong while uploading converImage");
  }
  const user = await User.findById(req.user._id).select("-password");
  let deleteCoverImage = user.coverImage;
  user.coverImage = coverImage.url;
  user.save({ validateBeforeSave: false });
  deleteOnCloudinary(deleteCoverImage).catch((error) => console.log(error));
  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover Image update is successful"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshedAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updataUserAvatar,
  updateUserDetail,
  updataUserCoverImage,
};
