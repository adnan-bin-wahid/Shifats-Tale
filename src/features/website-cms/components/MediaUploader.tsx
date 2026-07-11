"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { generateCloudinarySignature, finalizeMediaUpload } from "../actions/media-actions";

type AllowedFolder = "BRANDING" | "HERO" | "COURSES" | "RESULTS" | "MONTHLY_STARS" | "TESTIMONIALS" | "GALLERY" | "ABOUT" | "PROJECTS" | "PUBLICATIONS" | "CONTACT" | "MATERIALS" | "ACADEMIC_CALENDAR" | "CLASS_ROUTINE";

interface CloudinaryUploadResponse {
  public_id: string;
  asset_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  version: number;
  width: number;
  height: number;
  bytes: number;
  original_filename: string;
  signature: string;
}

interface MediaUploaderProps {
  folderKey: AllowedFolder;
  onUploadSuccess?: (mediaId: string, secureUrl: string) => void;
  onUploadError?: (error: string) => void;
}

export function MediaUploader({ 
  folderKey, 
  onUploadSuccess, 
  onUploadError
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronized with Server Limits
  const MAX_SIZE_MB = 10;
  const ACCEPTED_FORMATS = "image/jpeg, image/png, image/webp, image/avif, application/pdf";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Client-Side Validation
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      const errorMsg = `File size exceeds the ${MAX_SIZE_MB}MB limit.`;
      if (onUploadError) onUploadError(errorMsg);
      else alert(errorMsg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Local Preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);
    setProgress(0);

    try {
      // 2. Fetch secure signature from our Server Action
      const sigData = await generateCloudinarySignature(folderKey);
      
      // 3. Upload directly to Cloudinary via XMLHttpRequest for progress tracking
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);

      const cloudinaryData = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error("Failed to upload to Cloudinary."));
          }
        };

        xhr.onerror = () => reject(new Error("Network error occurred during upload."));
        xhr.send(formData);
      });

      // 4. Finalize upload and save metadata to Supabase via Server Action
      const finalizeRes = await finalizeMediaUpload({
        publicId: cloudinaryData.public_id,
        version: cloudinaryData.version,
        signature: cloudinaryData.signature,
        folder: sigData.folder,
      });

      if (finalizeRes.success) {
        setPreviewUrl(finalizeRes.secureUrl);
        if (onUploadSuccess) onUploadSuccess(finalizeRes.mediaId, finalizeRes.secureUrl);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("Upload error:", error);
      if (onUploadError) onUploadError(message);
      setPreviewUrl(null); // Reset preview on failure
    } finally {
      setIsUploading(false);
      setProgress(0);
      URL.revokeObjectURL(objectUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="media-uploader border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden bg-gray-50/50 hover:bg-gray-50 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        onChange={handleFileChange}
        disabled={isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
      />
      
      {previewUrl ? (
        <div className="relative w-full aspect-video max-h-64 rounded-md overflow-hidden bg-black/5 pointer-events-none">
          <Image 
            src={previewUrl} 
            alt="Upload preview" 
            fill 
            className={`object-contain transition-opacity duration-300 ${isUploading ? 'opacity-50 blur-sm' : 'opacity-100'}`} 
          />
        </div>
      ) : (
        <div className="text-center pointer-events-none">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WEBP or AVIF (max. {MAX_SIZE_MB}MB)</p>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-20">
          <div className="w-2/3 max-w-xs bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden">
            <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm font-medium text-primary font-mono">{progress}%</p>
          <p className="text-xs text-gray-600 mt-1">Uploading...</p>
        </div>
      )}
    </div>
  );
}
