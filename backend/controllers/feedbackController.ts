import { Request, Response } from "express";
import Feedback from "../models/feedback";
import { sendNotificationEmail } from "../utils/grpc";

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const {
      email,
      browserExtensionEase,
      cliEase,
      renardUnderstanding,
      contextUnderstanding,
      summarizationQuality,
      contextScalability,
      knowledgeGraphClarity,
      overallRating,
      experience,
      improvements,
    } = req.body;

    if (!experience || !improvements) {
      return res
        .status(400)
        .json({ error: "Written feedback fields are required." });
    }

    const newFeedback = new Feedback({
      email,
      browserExtensionEase,
      cliEase,
      renardUnderstanding,
      contextUnderstanding,
      summarizationQuality,
      contextScalability,
      knowledgeGraphClarity,
      overallRating,
      experience,
      improvements,
    });

    await newFeedback.save();
    try {
      await sendNotificationEmail("hello", email, "FEEDBACK", {});
    } catch (error) {
      console.error("Failed to queue Welcome email:", error);
    }

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
    });
  } catch (error) {
    console.error("Feedback Submission Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
};
