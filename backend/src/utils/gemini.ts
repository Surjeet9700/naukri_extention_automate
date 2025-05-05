import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function parseResume(resumeText: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
    Analyze this resume and extract the following information in JSON format:
    - Full Name
    - Email
    - Phone Number
    - Current Job Title
    - Years of Experience
    - Skills (as an array)
    - Current Company
    - Education
    - Location

    Resume:
    ${resumeText}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const parsedData = JSON.parse(response.text());
        return parsedData;
    } catch (error) {
        console.error('Error parsing resume with Gemini:', error);
        throw error;
    }
}

export async function handleBotQuestion(question: string, resumeText: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
    Based on the following resume and the question asked during a job application process,
    provide the most appropriate answer. The answer should be truthful and based on the resume content.
    If the question is multiple choice, only return the exact option that best matches the resume.
    If it's a text input question, provide a concise professional response.

    Resume:
    ${resumeText}

    Question:
    ${question}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error processing bot question with Gemini:', error);
        throw error;
    }
}