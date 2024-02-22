import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshedAccessToken,
  registerUser,
  updataUserAvatar,
  updataUserCoverImage,
  updateUserDetail,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
router.route("/login").post(loginUser);

//secure routes

router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(refreshedAccessToken);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/current-user").get(verifyJwt, getCurrentUser);
router.route("/update-account").patch(verifyJwt, updateUserDetail);

router
  .route("/avatar")
  .patch(verifyJwt, upload.single("avatar"), updataUserAvatar);
router
  .route("/cover-imager")
  .patch(verifyJwt, upload.single("coverImage"), updataUserCoverImage);

export default router;
