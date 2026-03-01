
import { GoogleGenAI, Type } from "@google/genai";
import { Memory } from './types';

// Initialiser AI med API-nøgle fra miljøet
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `Du er en dansk transskriptions-korrektur-assistent for Thomas Bay.
Thomas er musiker og pædagog med ADHD og OCD. Din opgave er at bringe STRUKTUR og RO.

PRIMÆR OPGAVE – Ren fortællings-korrektur (INGEN omskrivning, INGEN nye idéer)
Du må KUN:
- Ret stavefejl, tegnsætning og grammatik.
- Opdele i naturlige afsnit ved tydelige skift i tanker.
- Fjerne tale-fyldord (øh, altså, du ved, gentagelser) – kun hvis meningen er identisk bagefter.

ABSOLUT ISOLATION & GENRE-ADSKILLELSE:
- Hver fortælling er en selvstændig enhed. 
- DU MÅ IKKE inddrage detaljer fra tidligere historier eller andre temaer.
- Skeln skarpt mellem fiktion og biografi. Hvis emnet er "Tanker fra en mand", må du ikke bruge elementer fra fiktive manuskripter eller musik-anekdoter.
- DU MÅ ALDRIG digte videre eller gætte på en slutning.

VIGTIGE REGLER:
- BEVAR STEMMEN: Bevar jyske vendinger, slang eller fagspecifikke udtryk. Ret dem ikke til standarddansk.
- AFBRYDELSER: Hvis en sætning er tydeligt ufærdig eller stopper brat, SKAL du markere det med [...] fremfor at forsøge at afslutte den eller gætte meningen.
- HVIS I TVIVL: Behold original formulering.

KONTEKST:
Du vil få oplyst om dette er en 'Ny historie' eller en 'Fortsættelse'. 

OUTPUT FORMAT:
Du SKAL returnere et JSON objekt. Sørg for at 'polishedText' indeholder den færdige, korrigerede tekst.`;

export const processMemory = async (
  audioBase64: string, 
  mimeType: string = "audio/webm",
  context: { mode: 'new' | 'continuation', currentTheme?: string }
): Promise<Partial<Memory>> => {
  // Rens MIME-typen (fjern f.eks. ";codecs=opus") for at undgå API 400 fejl
  const sanitizedMimeType = mimeType.split(';')[0];
  
  const prompt = context.mode === 'new' 
    ? "Dette er en NY historie. Analyser indholdet og foreslå et passende tema." 
    : `Dette er en FORTSÆTTELSE af projektet "${context.currentTheme}". Hold dig strikt til indholdet i denne optagelse og brug samme tema-navn.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: sanitizedMimeType,
              data: audioBase64
            }
          },
          {
            text: `${prompt}\n\nGennemfør korrektur efter de strikse regler for Thomas Bay. Husk: Ingen digtning, brug [...] ved huller. Returner resultatet som JSON.`
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalTranscription: { type: Type.STRING },
            polishedText: { type: Type.STRING },
            theme: { type: Type.STRING },
            followUpQuestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["originalTranscription", "polishedText", "theme"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Tomt svar fra AI.");
    
    return JSON.parse(text.trim());
  } catch (err: any) {
    console.error("Fejl i processMemory:", err);
    // Hvis fejlen er en 400, er det ofte pga. indhold eller format
    if (err.message?.includes('400')) {
      throw new Error("API'et kunne ikke forstå lydformatet eller indholdet blev blokeret. Prøv en kortere optagelse.");
    }
    throw err;
  }
};
