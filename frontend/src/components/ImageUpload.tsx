import React, { useState } from 'react';
import { Upload, Image, Loader } from 'lucide-react';

interface ImageUploadProps {
  setImageUrl: (url: string) => void;
  imageUrl: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ setImageUrl, imageUrl }) => {
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageGeneration = async () => {
    setIsGeneratingImage(true);
    try {
      // Here you would typically call your AI image generation API
      // For this example, we'll use a placeholder
      await new Promise(resolve => setTimeout(resolve, 2000));
      setImageUrl(`https://picsum.photos/400/400?random=${Math.random()}`);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <div className="flex-1">
          <label htmlFor="image-upload" className="block mb-2 text-sm font-medium text-white">
            Upload Image
          </label>
          <div className="flex items-center justify-center w-full h-32 border-2 border-white border-dashed rounded-lg cursor-pointer hover:border-gray-300">
            <label htmlFor="image-upload" className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-white" />
              <p className="text-xs text-white">Click to upload</p>
            </label>
            <input id="image-upload" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
          </div>
        </div>
        <div className="flex-1">
          <label htmlFor="image-prompt" className="block mb-2 text-sm font-medium text-white">
            Generate Image
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="image-prompt"
              placeholder="Enter prompt"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="flex-1 bg-white bg-opacity-20 p-2 rounded-lg text-white placeholder-gray-300"
            />
            <button
              type="button"
              onClick={handleImageGeneration}
              disabled={isGeneratingImage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              {isGeneratingImage ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Image className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
      {imageUrl && (
        <div className="mt-4">
          <img src={imageUrl} alt="Memecoin" className="w-full h-48 object-cover rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
