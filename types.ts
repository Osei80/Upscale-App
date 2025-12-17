export type UpscaleResolution = '1K' | '2K' | '4K' | '8K';
export type AspectRatio = 'Original' | '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type MediaType = 'image' | 'video';
export type VideoModelType = 'nano-banana' | 'gemini-3-pro';

export interface AppState {
  activeTab: MediaType;
  inputContent: string | null; // Data URI for input image or video
  inputType: MediaType | null; // Track if input is image or video
  processedContent: string | null; // URL for output image or video
  isProcessing: boolean;
  progress: string; 
  error: string | null;
  
  // Image Settings
  selectedResolution: UpscaleResolution;
  selectedAspectRatio: AspectRatio;
  
  // Video Settings
  videoPrompt: string;
  videoModel: VideoModelType;
  
  apiKeyValid: boolean;
}