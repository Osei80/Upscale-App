import React, { useState, useEffect, useRef } from 'react';
import { checkApiKey, promptForApiKey, upscaleImage, generateVideo } from './services/geminiService';
import { AppState, UpscaleResolution, AspectRatio, MediaType } from './types';
import { ResolutionSelector, AspectRatioSelector } from './components/ResolutionSelector';
import { UploadIcon, DownloadIcon, SparklesIcon, XIcon, AlertIcon, VideoIcon, ImageIcon } from './components/Icons';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    activeTab: 'image',
    inputContent: null,
    inputType: null,
    processedContent: null,
    isProcessing: false,
    progress: '',
    error: null,
    selectedResolution: '4K',
    selectedAspectRatio: 'Original',
    videoPrompt: '',
    videoModel: 'nano-banana',
    apiKeyValid: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const verifyKey = async () => {
      const valid = await checkApiKey();
      setState(prev => ({ ...prev, apiKeyValid: valid }));
    };
    verifyKey();
  }, []);

  const handleApiKeyRequest = async () => {
    try {
      await promptForApiKey();
      const valid = await checkApiKey();
      setState(prev => ({ ...prev, apiKeyValid: valid }));
    } catch (e) {
      console.error("API Key selection cancelled or failed", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (state.activeTab === 'image' && !isImage) {
          setState(prev => ({ ...prev, error: "Please upload an image file (JPG, PNG)." }));
          return;
      }
      
      // For video tab, we accept both images (for img2video) and videos (for vid2vid/upscale)
      if (state.activeTab === 'video' && !isImage && !isVideo) {
           setState(prev => ({ ...prev, error: "Please upload an image or video file." }));
           return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({
          ...prev,
          inputContent: reader.result as string,
          inputType: isVideo ? 'video' : 'image',
          processedContent: null,
          error: null
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!state.inputContent || !state.apiKeyValid) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 'Initializing...' }));

    try {
      // Re-check key
      const keyValid = await checkApiKey();
      if (!keyValid) {
         await promptForApiKey();
         if (!(await checkApiKey())) throw new Error("API Key is required.");
      }

      if (state.activeTab === 'image') {
          setState(prev => ({ ...prev, progress: 'Upscaling & Refining...' }));
          const result = await upscaleImage(
              state.inputContent!, 
              state.selectedResolution, 
              state.selectedAspectRatio
          );
          setState(prev => ({ ...prev, processedContent: result }));
      } else if (state.activeTab === 'video') {
          // Handle Video Generation (Image-to-Video or Video-to-Video)
          const actionText = state.inputType === 'video' ? 'Enhancing Video' : 'Generating Video';
          setState(prev => ({ ...prev, progress: `${actionText} (this may take a minute)...` }));
          
          if (state.inputContent) {
            const result = await generateVideo(
                state.inputContent, 
                state.inputType || 'image',
                state.videoPrompt,
                state.videoModel
            );
            setState(prev => ({ ...prev, processedContent: result }));
          }
      }

    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || "An unexpected error occurred."
      }));
    } finally {
        setState(prev => ({ ...prev, isProcessing: false, progress: '' }));
    }
  };

  const handleDownload = () => {
    if (state.processedContent) {
      const link = document.createElement('a');
      link.href = state.processedContent;
      link.download = state.activeTab === 'image' 
        ? `banana-scale-${Date.now()}.png`
        : `banana-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setState(prev => ({
        ...prev,
        inputContent: null,
        inputType: null,
        processedContent: null,
        error: null,
        isProcessing: false
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const switchTab = (tab: MediaType) => {
      if (state.isProcessing) return;
      setState(prev => ({
          ...prev,
          activeTab: tab,
          error: null,
          processedContent: null,
          // Reset input if switching tabs to avoid confusion (e.g. video file in image tab)
          inputContent: null,
          inputType: null
      }));
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans">
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-400 flex items-center justify-center text-xs font-bold text-black shadow-sm">
                    B
                </div>
                <h1 className="text-lg font-semibold tracking-tight text-gray-900">
                    BananaScale
                </h1>
            </div>
            {!state.apiKeyValid ? (
                <button 
                    onClick={handleApiKeyRequest}
                    className="text-xs bg-black text-white px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors font-medium"
                >
                    Connect API Key
                </button>
            ) : (
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-medium text-gray-500">Connected</span>
                </div>
            )}
        </div>
      </nav>

      <main className="pt-24 pb-12 px-6 max-w-5xl mx-auto min-h-screen flex flex-col">
        
        {/* Error Notification */}
        {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 shadow-sm animate-in fade-in slide-in-from-top-2">
                <AlertIcon />
                <p className="text-sm font-medium">{state.error}</p>
                <button onClick={() => setState(s => ({...s, error: null}))} className="ml-auto hover:text-red-800">
                    <XIcon />
                </button>
            </div>
        )}

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
            <div className="bg-gray-200/50 p-1 rounded-full inline-flex relative">
                 <button 
                    onClick={() => switchTab('image')}
                    className={`relative z-10 flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${state.activeTab === 'image' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <ImageIcon /> Image Upscale
                 </button>
                 <button 
                    onClick={() => switchTab('video')}
                    className={`relative z-10 flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${state.activeTab === 'video' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <VideoIcon /> Video Enhance
                 </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
            
            {/* Left Panel: Configuration */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Upload Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-semibold uppercase text-gray-400 tracking-wide">Input</h2>
                        {state.inputContent && (
                             <button onClick={handleReset} className="text-gray-400 hover:text-red-500 transition-colors">
                                 <XIcon />
                             </button>
                        )}
                    </div>

                    {!state.inputContent ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-48 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer flex flex-col items-center justify-center gap-3 transition-all group"
                        >
                            <div className="p-3 rounded-full bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                                <UploadIcon />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-gray-600">Click to upload</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {state.activeTab === 'image' ? 'JPG, PNG' : 'Image or Video (MP4)'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video group flex items-center justify-center bg-black">
                            {state.inputType === 'image' ? (
                                <img 
                                    src={state.inputContent} 
                                    alt="Input" 
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <video 
                                    src={state.inputContent} 
                                    controls 
                                    className="max-w-full max-h-full"
                                />
                            )}
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept={state.activeTab === 'image' ? "image/*" : "image/*,video/*"}
                    />
                </div>

                {/* Settings Card */}
                <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-500 ${!state.inputContent ? 'opacity-50 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
                    <div className="mb-4">
                         <h2 className="text-sm font-semibold uppercase text-gray-400 tracking-wide">Settings</h2>
                    </div>
                    
                    {state.activeTab === 'image' ? (
                        <div className="space-y-6">
                            <ResolutionSelector 
                                selected={state.selectedResolution}
                                onSelect={(r) => setState(s => ({...s, selectedResolution: r}))}
                                disabled={state.isProcessing}
                            />
                            <div className="h-px bg-gray-100 w-full"></div>
                            <AspectRatioSelector 
                                selected={state.selectedAspectRatio}
                                onSelect={(r) => setState(s => ({...s, selectedAspectRatio: r}))}
                                disabled={state.isProcessing}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Model Selector for Video */}
                             <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">
                                    AI Model
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setState(s => ({...s, videoModel: 'nano-banana'}))}
                                        disabled={state.isProcessing}
                                        className={`
                                            py-3 px-2 rounded-lg text-sm font-medium transition-all border
                                            ${state.videoModel === 'nano-banana' 
                                                ? 'bg-yellow-50 border-yellow-400 text-yellow-700' 
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}
                                        `}
                                    >
                                        Nano Banana
                                        <span className="block text-[10px] opacity-70">Fast Generation</span>
                                    </button>
                                    <button
                                        onClick={() => setState(s => ({...s, videoModel: 'gemini-3-pro'}))}
                                        disabled={state.isProcessing}
                                        className={`
                                            py-3 px-2 rounded-lg text-sm font-medium transition-all border
                                            ${state.videoModel === 'gemini-3-pro' 
                                                ? 'bg-blue-50 border-blue-400 text-blue-700' 
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}
                                        `}
                                    >
                                        Gemini 3 Pro
                                        <span className="block text-[10px] opacity-70">High Quality</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="h-px bg-gray-100 w-full"></div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1 mb-2 block">
                                    Enhancement Prompt
                                </label>
                                <textarea
                                    value={state.videoPrompt}
                                    onChange={(e) => setState(s => ({...s, videoPrompt: e.target.value}))}
                                    placeholder={state.inputType === 'video' ? "Describe desired improvements (e.g. 'Sharpen, enhance detail, make cinematic')..." : "Describe the motion or scene enhancement..."}
                                    className="w-full p-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[100px] resize-none"
                                    disabled={state.isProcessing}
                                />
                            </div>
                            <p className="text-xs text-gray-400">
                                {state.inputType === 'video' 
                                    ? `Input video will be re-generated frame-by-frame using ${state.videoModel === 'gemini-3-pro' ? 'Gemini 3 Pro (Veo HQ)' : 'Nano Banana (Veo Fast)'}.` 
                                    : `Generates 1080p high-fidelity clips from your image using ${state.videoModel === 'gemini-3-pro' ? 'Veo High Quality' : 'Veo Fast'}.`}
                            </p>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-8">
                         {!state.apiKeyValid ? (
                            <button
                                onClick={handleApiKeyRequest}
                                className="w-full py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
                            >
                                Select API Key
                            </button>
                         ) : (
                            <button
                                onClick={handleProcess}
                                disabled={state.isProcessing}
                                className={`
                                    w-full py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2
                                    transition-all duration-300
                                    ${state.isProcessing 
                                        ? 'bg-gray-100 text-gray-400 cursor-wait' 
                                        : 'bg-[#0071E3] text-white hover:bg-[#0077ED] hover:scale-[1.02]'}
                                `}
                            >
                                {state.isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                                        {state.activeTab === 'image' ? 'Upscale Image' : (state.inputType === 'video' ? 'Enhance Video' : 'Generate Video')}
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon />
                                        {state.activeTab === 'image' ? 'Upscale Image' : (state.inputType === 'video' ? 'Enhance Video' : 'Generate Video')}
                                    </>
                                )}
                            </button>
                         )}
                         {state.isProcessing && (
                             <p className="text-center text-xs text-gray-400 mt-3 animate-pulse">
                                 {state.progress}
                             </p>
                         )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Preview */}
            <div className="lg:col-span-8">
                 <div className="h-full bg-white rounded-3xl border border-gray-100 shadow-sm p-3 min-h-[600px] flex flex-col relative overflow-hidden">
                    {state.processedContent ? (
                        <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-700">
                            <div className="flex-1 relative rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 bg-black">
                                {state.activeTab === 'image' ? (
                                    <img 
                                        src={state.processedContent} 
                                        alt="Processed" 
                                        className="max-w-full max-h-[75vh] object-contain shadow-sm"
                                    />
                                ) : (
                                    <video 
                                        src={state.processedContent} 
                                        controls
                                        autoPlay
                                        loop
                                        className="max-w-full max-h-[75vh] shadow-sm rounded-lg"
                                    />
                                )}
                            </div>
                            <div className="p-4 flex justify-between items-center mt-2">
                                <div>
                                    <h3 className="text-gray-900 font-semibold">
                                        {state.activeTab === 'image' ? 'Image Enhanced' : 'Video Generated'}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {state.activeTab === 'image' 
                                            ? `${state.selectedResolution} • ${state.selectedAspectRatio}`
                                            : `1080p • 16:9 • ${state.videoModel === 'gemini-3-pro' ? 'Gemini 3 Pro' : 'Nano Banana'}`}
                                    </p>
                                </div>
                                <button 
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
                                >
                                    <DownloadIcon />
                                    Download
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-6">
                            <div className="w-24 h-24 rounded-[2rem] bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                                {state.activeTab === 'image' ? <ImageIcon /> : <VideoIcon />}
                            </div>
                            <div className="text-center max-w-sm px-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {state.activeTab === 'image' ? 'Studio Quality Upscale' : 'Cinematic Video Enhancement'}
                                </h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {state.activeTab === 'image' 
                                        ? 'Select your preferred resolution and aspect ratio. BananaScale intelligently fills empty space.'
                                        : 'Upload an image to generate video, or upload a video to enhance its quality using Veo (Nano Banana / Gemini 3 Pro).'}
                                </p>
                            </div>
                        </div>
                    )}
                 </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;