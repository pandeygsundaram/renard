// src/models/Feedback.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  email: string;
  // Usability
  browserExtensionEase: number;
  cliEase: number;
  renardUnderstanding: number;

  // Intelligence
  contextUnderstanding: number;
  summarizationQuality: number;
  contextScalability: number;
  knowledgeGraphClarity: number;

  // Overall
  overallRating: number;
  experience: string;
  improvements: string;

  // Meta
  createdAt: Date;
}

const FeedbackSchema: Schema = new Schema({
  email: { type: String, required: true },
  browserExtensionEase: { type: Number, required: true, min: 0, max: 10 },
  cliEase: { type: Number, required: true, min: 0, max: 10 },
  renardUnderstanding: { type: Number, required: true, min: 0, max: 10 },

  contextUnderstanding: { type: Number, required: true, min: 0, max: 10 },
  summarizationQuality: { type: Number, required: true, min: 0, max: 10 },
  contextScalability: { type: Number, required: true, min: 0, max: 10 },
  knowledgeGraphClarity: { type: Number, required: true, min: 0, max: 10 },

  overallRating: { type: Number, required: true, min: 0, max: 10 },
  experience: { type: String, required: true },
  improvements: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IFeedback>("Feedback", FeedbackSchema);
