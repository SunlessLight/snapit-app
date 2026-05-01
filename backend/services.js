// services.js
const { GoogleGenAI, Type } = require('@google/genai');
const axios = require('axios');
const FormData = require('form-data');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateMarketingCopy(imageBuffer, mimeType, params) {
    const { price, outputLanguage, tone, posterStyle } = params;

    const prompt = `
        You are an expert digital marketing copywriter and an AI image prompt engineer. 
        Analyze the uploaded food product image and the requested Visual Poster Style Context.

        Task 1: Marketing Copy
        Write professional marketing copy for the product.
        Price: ${price}
        Output Language: ${outputLanguage}
        Tone: ${tone}

        Task 2: Background Generation Prompt
        Based on the Visual Poster Style Context: "${posterStyle}", write a highly detailed, photorealistic prompt for a generative background AI.
        
        CRITICAL RULES FOR BACKGROUND PROMPT:
        - DO NOT describe the food itself. The food is already cut out.
        - Describe ONLY the surface the food sits on, the environment behind it, the lighting, and the depth of field.
        - Example Good: "A rustic oak wood table surface, softly blurred bustling Italian cafe in the background, warm sunset lighting coming from a window on the left, high resolution."
        - Example Bad: "A pepperoni pizza on a table." (Never mention the main subject).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            // FIX: Defect 3 - Explicitly structured text part
            { text: prompt },
            {
                inlineData: {
                    data: imageBuffer.toString("base64"),
                    mimeType: mimeType
                }
            }
        ],
        // FIX: Defect 4 - Removed unsupported 'signal' parameter
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    caption: { type: Type.STRING },
                    backgroundPrompt: { type: Type.STRING }
                },
                required: ["title", "description", "caption", "backgroundPrompt"]
            }
        }
    });

    // FIX: Defect 5 - Validate existence of text before parsing to handle safety blocks
    if (!response || !response.text) {
        throw new Error("AI generation blocked by safety settings or returned an empty response.");
    }

    const cleanText = response.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleanText);
}

async function processImageBackground(imageBuffer, originalName, backgroundPrompt, abortSignal) {
    const formData = new FormData();
    formData.append('imageFile', imageBuffer, { filename: originalName || 'upload.png' });
    formData.append('background.prompt', backgroundPrompt);
    formData.append('referenceBox', 'originalImage');
    formData.append('background.expandPrompt.mode', 'ai.never')

    const response = await axios.post(process.env.IMAGE_PROCESSING_API_URL, formData, {
        headers: {
            'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
            'x-api-key': `${process.env.IMAGE_PROCESSING_API_KEY}`,
            'pr-ai-background-model-version': `background-studio-beta-2025-03-17`,
        },
        responseType: 'arraybuffer',
        timeout: 15000,
        signal: abortSignal
    });

    return Buffer.from(response.data, 'binary').toString('base64');
}

module.exports = {
    generateMarketingCopy,
    processImageBackground
};