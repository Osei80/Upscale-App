import React from 'react';
import { UpscaleResolution, AspectRatio } from '../types';

interface ResProps {
  selected: UpscaleResolution;
  onSelect: (res: UpscaleResolution) => void;
  disabled: boolean;
}

export const ResolutionSelector: React.FC<ResProps> = ({ selected, onSelect, disabled }) => {
  const options: UpscaleResolution[] = ['1K', '2K', '4K', '8K'];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">
        Output Resolution
      </label>
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            disabled={disabled}
            className={`
              flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-200
              ${selected === option 
                ? 'bg-white text-black shadow-sm ring-1 ring-black/5' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {option}
          </button>
        ))}
      </div>
      {selected === '1K' && (
          <p className="text-[10px] text-gray-400 ml-1">
              Standard resize without significant upscaling.
          </p>
      )}
      {selected === '8K' && (
          <p className="text-[10px] text-gray-400 ml-1">
              *8K support enhances detail for large displays (Experimental).
          </p>
      )}
    </div>
  );
};

interface RatioProps {
  selected: AspectRatio;
  onSelect: (res: AspectRatio) => void;
  disabled: boolean;
}

export const AspectRatioSelector: React.FC<RatioProps> = ({ selected, onSelect, disabled }) => {
    const options: { value: AspectRatio, label: string }[] = [
        { value: 'Original', label: 'Original' },
        { value: '1:1', label: 'Square' },
        { value: '16:9', label: 'Landscape' },
        { value: '9:16', label: 'Portrait' },
        { value: '4:3', label: 'Classic' },
    ];
  
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">
          Aspect Ratio (Generative Fill)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              disabled={disabled}
              className={`
                py-2.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 border
                ${selected === option.value 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {option.label}
              <span className="block text-[10px] opacity-60 font-normal">{option.value}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };
