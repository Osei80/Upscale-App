import { GoogleGenAI } from "@google/genai";
import { UpscaleResolution, AspectRatio, VideoModelType } from "../types";

const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview'; // Nano Banana Pro

// Video Models
const VEO_FAST = 'veo-3.1-fast-generate-preview';
const VEO_PRO = 'veo-3.1-generate-preview';

export const checkApiKey = async (): Promise<boolean> => {
  const aistudio = (window as any).aistudio;
  if (aistudio && aistudio.hasSelectedApiKey) {
    return await aistudio.hasSelectedApiKey();
  }
  return true; 
};

export const promptForApiKey = async (): Promise<void> => {
  const aistudio = (window as any).aistudio;
  if (aistudio && aistudio.openSelectKey) {
    await aistudio.openSelectKey();
  } else {
    console.warn("AI Studio key selection not available in this environment.");
  }
};

export const upscaleImage = async (
  base64Image: string,
  resolution: UpscaleResolution,
  aspectRatio: AspectRatio
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const apiResolution = resolution === '8K' ? '4K' : resolution;
  
  let prompt = resolution === '8K' 
    ? "Upscale this image to maximum ultra-high definition fidelity. Enhance details significantly for an 8K-like appearance."
    : `Upscale this image to ${resolution} resolution. Enhance clarity, sharpness, and details while maintaining the original artistic intent.`;

  if (aspectRatio !== 'Original') {
    prompt += ` Resize the image to ${aspectRatio} aspect ratio. creatively fill in any empty space to match the scene naturally (outpainting).`;
  }

  const cleanBase64 = base64Image.split(',')[1] || base64Image;

  const config: any = {
    imageConfig: {
      imageSize: apiResolution,
    },
  };

  if (aspectRatio !== 'Original') {
    config.imageConfig.aspectRatio = aspectRatio;
  }

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
        ],
      },
      config: config,
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data found in response.");
  } catch (error: any) {
    console.error("Upscale failed:", error);
    throw new Error(error.message || "Failed to upscale image.");
  }
};

// Helper to extract first frame from video base64
const extractFirstFrame = async (videoDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.src = videoDataUrl;

        video.onloadeddata = () => {
            video.currentTime = 0.1; // Seek slightly to ensure frame
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameData = canvas.toDataURL('image/jpeg', 0.95);
            resolve(frameData);
            // Cleanup
            video.removeAttribute('src'); 
            video.load();
        };

        video.onerror = (e) => reject(new Error("Failed to load video for frame extraction"));
    });
};

export const generateVideo = async (
  inputContent: string,
  inputType: 'image' | 'video',
  promptText: string,
  modelType: VideoModelType = 'nano-banana'
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Select Model
    const model = modelType === 'gemini-3-pro' ? VEO_PRO : VEO_FAST;

    // Default Prompt
    const prompt = promptText || "Cinematic, high resolution, photorealistic, 4k detail.";

    // Prepare Image Bytes for Veo (Image-to-Video)
    let cleanImageBase64 = '';
    
    if (inputType === 'video') {
        // If video input, we extract the first frame to "re-generate" or "upscale" it
        // This simulates video-to-video upscaling using Veo's generation capabilities
        try {
            console.log("Extracting frame from video...");
            const frameDataUrl = await extractFirstFrame(inputContent);
            cleanImageBase64 = frameDataUrl.split(',')[1];
        } catch (e) {
            console.error("Frame extraction failed", e);
            throw new Error("Could not process video input. Please try an image instead.");
        }
    } else {
        cleanImageBase64 = inputContent.split(',')[1] || inputContent;
    }

    try {
        console.log(`Generating video with model: ${model}`);
        
        let operation = await ai.models.generateVideos({
            model: model,
            prompt: prompt,
            image: {
                imageBytes: cleanImageBase64,
                mimeType: 'image/jpeg',
            },
            config: {
                numberOfVideos: 1,
                resolution: '1080p',
                aspectRatio: '16:9'
            }
        });

        // Polling loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
            operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("Video generation failed to return a URI.");

        // Fetch the actual video bytes using the URI + API Key
        const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) throw new Error("Failed to download generated video.");
        
        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error: any) {
        console.error("Video generation failed:", error);
        throw new Error(error.message || "Failed to generate video.");
    }
}