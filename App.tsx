
import React, { useState, useEffect, useRef } from 'react';
import { Book, MessageCircle, Music, Feather, User, Upload, FileAudio, ChevronDown, PlusCircle } from 'lucide-react';
import Recorder from './components/Recorder';
import BookShelf from './components/BookShelf';
import { Memory, ChatMessage, View } from './types';
import { processMemory } from './geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('chat');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('new');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Goddag, Thomas. Jeg sidder klar med pennen. Vælg et projekt forneden, eller start en helt ny historie. Hvad har du på hjertet?'
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themes = Array.from(new Set(memories.map(m => m.theme))).filter(Boolean);

  useEffect(() => {
    const saved = localStorage.getItem('biograf_memories');
    if (saved) setMemories(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('biograf_memories', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const processAudioData = async (base64: string, blob: Blob, isUpload: boolean = false) => {
    if (!base64 || base64.length < 100) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Optagelsen virker for kort eller tom. Prøv at tale lidt længere.' 
      }]);
      return;
    }

    setIsProcessing(true);
    const mode = selectedTheme === 'new' ? 'new' : 'continuation';
    
    setChatHistory(prev => [...prev, { 
      role: 'user', 
      content: isUpload 
        ? `Uploader lydfil til "${selectedTheme === 'new' ? 'Ny historie' : selectedTheme}"...` 
        : `Sender lydoptagelse til "${selectedTheme === 'new' ? 'Ny historie' : selectedTheme}"...`, 
      isAudio: true 
    }]);

    try {
      const result = await processMemory(base64, blob.type, {
        mode,
        currentTheme: selectedTheme === 'new' ? undefined : selectedTheme
      });
      
      if (result && result.polishedText) {
        const finalTheme = mode === 'continuation' ? selectedTheme : (result.theme || 'Usorteret');
        const newMemory: Memory = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          originalTranscription: result.originalTranscription || '',
          polishedText: result.polishedText,
          theme: finalTheme,
          audioUrl: URL.createObjectURL(blob),
          followUpQuestions: result.followUpQuestions
        };

        setMemories(prev => [newMemory, ...prev]);

        let assistantContent = `Jeg har arkiveret din ${mode === 'new' ? 'nye fortælling' : 'fortsættelse'} under projektet **"${finalTheme}"**:\n\n${result.polishedText}`;
        
        if (result.followUpQuestions && result.followUpQuestions.length > 0) {
          assistantContent += `\n\n---\n\n**Thomas, for at bevare tråden i "${finalTheme}":**\n` + 
            result.followUpQuestions.map(q => `• ${q}`).join('\n');
        }

        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: assistantContent,
          memoryData: newMemory
        }]);

        if (mode === 'new') setSelectedTheme(finalTheme);
      } else {
        throw new Error("Ingen tekst blev genereret.");
      }
    } catch (err: any) {
      console.error("App fejl:", err);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Der opstod en teknisk forstyrrelse: ${err.message || 'Ukendt fejl'}. Jeg har gemt din stemme lokalt, men kunne ikke få den korrigeret lige nu. Prøv igen om et øjeblik.`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordingComplete = (base64: string, blob: Blob) => {
    processAudioData(base64, blob, false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      processAudioData(base64, file, true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const deleteMemory = (id: string) => {
    if (confirm("Er du sikker på, at du vil slette dette minde?")) {
      setMemories(prev => prev.filter(m => m.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto px-4 sm:px-6">
      <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

      <header className="py-8 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-900/20 rounded-lg">
            <Feather className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-amber-50">Thomas Bay</h1>
            <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-medium italic">Ghostwriter & Biograf</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-2 glass p-1 rounded-xl">
          <button onClick={() => setView('chat')} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${view === 'chat' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline font-medium text-sm">Samtale</span>
          </button>
          <button onClick={() => setView('library')} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${view === 'library' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Book className="w-4 h-4" />
            <span className="hidden sm:inline font-medium text-sm">Manuskripter</span>
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto py-8">
        {view === 'chat' ? (
          <div className="flex flex-col gap-8 pb-64">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] sm:max-w-2xl flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-700' : 'bg-amber-900/30'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Feather className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className={`space-y-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`p-6 rounded-2xl leading-relaxed whitespace-pre-wrap shadow-xl ${msg.role === 'user' ? 'bg-amber-700 text-white rounded-tr-none' : 'glass text-slate-200 rounded-tl-none border-l-4 border-l-amber-500/50'}`}>
                        {msg.isAudio && <div className="flex items-center gap-2 mb-2 italic text-xs opacity-70"><Music className="w-3 h-3"/> {msg.content}</div>}
                        {!msg.isAudio && (
                          <div className={msg.role === 'assistant' ? 'serif text-lg leading-relaxed' : ''}>
                            {msg.content.split('\n').map((line, idx) => (
                              <p key={idx} className={line.startsWith('#') ? 'text-amber-400 font-bold mb-2 mt-4 text-xl' : 'mb-2'}>{line}</p>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        ) : (
          <BookShelf memories={memories} onDelete={deleteMemory} />
        )}
      </main>

      {view === 'chat' && (
        <div className="fixed bottom-0 left-0 right-0 py-8 px-6 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/95 to-transparent pointer-events-none">
          <div className="max-w-5xl mx-auto flex flex-col items-center gap-4 pointer-events-auto">
            <div className="relative group w-full max-w-md">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                {selectedTheme === 'new' ? <PlusCircle className="w-4 h-4 text-amber-500" /> : <Book className="w-4 h-4 text-amber-500" />}
              </div>
              <select 
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block p-3 pl-11 appearance-none cursor-pointer shadow-lg transition-all hover:bg-slate-750"
              >
                <option value="new">Start en ny historie...</option>
                {themes.map(t => <option key={t} value={t}>Fortsæt på: {t}</option>)}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none"><ChevronDown className="w-4 h-4 text-slate-500" /></div>
            </div>

            <div className="glass p-5 rounded-3xl shadow-2xl w-full max-w-md flex items-center justify-between border border-amber-500/20 gap-4">
              <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-all border border-slate-700 disabled:opacity-50" title="Upload lydfil">
                <Upload className="text-amber-500 w-5 h-5" />
              </button>
              <div className="flex-1 flex flex-col items-center">
                <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
              </div>
              <div className="w-12 h-12 flex items-center justify-center opacity-40"><FileAudio className="text-amber-500 w-5 h-5" /></div>
            </div>
          </div>
        </div>
      )}

      <footer className="py-4 text-center text-slate-700 text-[10px] uppercase tracking-[0.3em] font-medium">Thomas Bay &bull; Det Strukturerede Arkiv</footer>
    </div>
  );
};

export default App;
