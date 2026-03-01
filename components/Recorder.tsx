
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, Trash2, Check, RotateCcw } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (base64: string, blob: Blob) => void;
  isProcessing: boolean;
}

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    setError(null);
    setRecordedBlob(null);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Din browser understøtter ikke lydoptagelse.");
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioInput = devices.some(device => device.kind === 'audioinput');
      
      if (!hasAudioInput) {
        setError("Ingen mikrofon fundet.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
        
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mikrofon fejl:", err);
      setError("Kunne ikke få adgang til mikrofonen.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleDiscard = () => {
    setRecordedBlob(null);
    setDuration(0);
  };

  const handleApprove = () => {
    if (!recordedBlob) return;
    
    const reader = new FileReader();
    reader.readAsDataURL(recordedBlob);
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      onRecordingComplete(base64, recordedBlob);
      setRecordedBlob(null);
      setDuration(0);
    };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/40 border border-red-500/50 p-3 rounded-xl mb-2 text-center max-w-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex items-center gap-6">
        {!isRecording && !recordedBlob ? (
          <button
            onClick={startRecording}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
            title="Start optagelse"
          >
            <Mic className="text-white w-8 h-8" />
          </button>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="w-16 h-16 rounded-full bg-red-600 animate-pulse flex items-center justify-center transition-all shadow-lg"
            title="Stop optagelse"
          >
            <Square className="text-white fill-current w-6 h-6" />
          </button>
        ) : recordedBlob ? (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={handleDiscard}
              className="w-12 h-12 rounded-full bg-slate-700 hover:bg-red-900/40 text-slate-300 hover:text-red-400 flex items-center justify-center transition-all border border-slate-600 shadow-md"
              title="Slet og prøv igen"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center px-4">
              <span className="text-amber-400 font-mono text-sm mb-1">Klar til arkivering</span>
              <span className="text-slate-500 text-[10px] uppercase tracking-widest">{formatTime(duration)}</span>
            </div>

            <button
              onClick={handleApprove}
              className="w-12 h-12 rounded-full bg-amber-600 hover:bg-green-600 text-white flex items-center justify-center transition-all shadow-lg hover:scale-110"
              title="Godkend og send"
            >
              <Check className="w-6 h-6" />
            </button>
          </div>
        ) : null}
      </div>
      
      {isRecording && (
        <div className="flex flex-col items-center gap-2">
            <span className="text-amber-400 font-mono text-xl">{formatTime(duration)}</span>
            <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-1 bg-amber-500 rounded-full animate-bounce" 
                        style={{ height: '12px', animationDelay: `${i * 0.1}s` }}
                    />
                ))}
            </div>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-amber-200">
          <Loader2 className="animate-spin w-5 h-5" />
          <span className="text-sm font-medium italic">Færdiggør din fortælling...</span>
        </div>
      )}
    </div>
  );
};

export default Recorder;
