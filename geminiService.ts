import { Memory } from './types';

// Backend API URL fra environment variable
const API_URL = import.meta.env.VITE_API_URL || 'https://biografi.baythome.com/api';

export const processMemory = async (
  audioBase64: string, 
  mimeType: string = "audio/webm",
  context: { mode: 'new' | 'continuation', currentTheme?: string }
): Promise<Partial<Memory>> => {
  // Rens MIME-typen (fjern f.eks. ";codecs=opus")
  const sanitizedMimeType = mimeType.split(';')[0];
  
  try {
    // Kald Flask backend i stedet for direkte Gemini
    const response = await fetch(`${API_URL}/process-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_base64: audioBase64,
        mime_type: sanitizedMimeType,
        mode: context.mode,
        current_theme: context.currentTheme
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Backend fejl: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.polishedText) {
      throw new Error("Ingen tekst blev genereret.");
    }
    
    return {
      originalTranscription: data.originalTranscription || '',
      polishedText: data.polishedText,
      theme: data.theme,
      followUpQuestions: data.followUpQuestions || []
    };
    
  } catch (err: any) {
    console.error("Fejl i processMemory:", err);
    
    if (err.message?.includes('Failed to fetch')) {
      throw new Error("Kunne ikke forbinde til backend. Tjek din internetforbindelse.");
    }
    
    throw err;
  }
};
