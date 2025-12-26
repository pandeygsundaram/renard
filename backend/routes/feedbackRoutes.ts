import { Router } from "express";
import {
  getAllFeedback,
  submitFeedback,
} from "../controllers/feedbackController";

const router = Router();

router.post("/submit", submitFeedback);

router.get("/get", getAllFeedback);

export default router;
