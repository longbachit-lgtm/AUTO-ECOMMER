export interface DesignAnalysis {
  strengths: string[];
  weaknesses: string[];
  conceptName: string;
  keyMessage: string;
  targetAudience: string;
  occasion: string; // e.g., Summer, Tet Holiday, Gift
  reasoning: string; // New: Lý do chiến lược/Tại sao tạo ra sản phẩm này
  optimizedPrompt: string;
}

export interface GeneratedImage {
  id: string;
  // We no longer track a specific source image ID per result, as results are a mix of ALL images
  // But we keep a list of source previews if needed, or just generic logic.
  
  // Analysis Phase
  analyzing: boolean;
  analysis: DesignAnalysis | null;
  
  // Generation Phase
  imageUrl: string | null;
  generatingImage: boolean;
  
  error: string | null;
}

export interface DesignStyle {
  id: string;
  name: string;
  promptModifier: string;
  description: string;
  colorClass: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
export type Resolution = '1K' | '2K'; // 2K only for Pro

export interface AppSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
}