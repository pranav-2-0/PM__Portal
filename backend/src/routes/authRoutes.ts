import { Router } from "express";
import { login, signup, demoLogin } from "../controllers/authController";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/demo-login", demoLogin);

export default router;