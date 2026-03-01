
import React from 'react';
import { Memory, Chapter } from '../types';
import { BookOpen, Calendar, Trash2, Download, FileText, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface BookShelfProps {
  memories: Memory[];
  onDelete: (id: string) => void;
}

const BookShelf: React.FC<BookShelfProps> = ({ memories, onDelete }) => {
  const themes = Array.from(new Set(memories.map(m => m.theme))) as string[];
  
  const organizedMemories: Chapter[] = themes.map(theme => ({
    title: theme,
    description: `En samling af tanker om ${theme.toLowerCase()}.`,
    memories: memories.filter(m => m.theme === theme).sort((a, b) => b.timestamp - a.timestamp)
  }));

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const downloadMarkdown = () => {
    let content = `# Thomas Bay - Samlede Manuskripter\n*Genereret d. ${new Date().toLocaleDateString('da-DK')}*\n\n---\n\n`;

    organizedMemories.forEach(chapter => {
      content += `# ${chapter.title}\n\n`;
      chapter.memories.forEach(memory => {
        const dateStr = new Date(memory.timestamp).toLocaleDateString('da-DK', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        });
        content += `### ${dateStr}\n\n`;
        content += `> ${memory.polishedText}\n\n---\n\n`;
      });
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thomas-bay-manuskript-${getTodayDate()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.text("Thomas Bay - Manuskript", margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Genereret d. ${new Date().toLocaleDateString('da-DK')}`, margin, y);
    y += 15;

    organizedMemories.forEach((chapter, cIdx) => {
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setFontSize(18);
      doc.setTextColor(150, 100, 0); // Amber-ish color
      doc.text(chapter.title, margin, y);
      y += 10;
      doc.setTextColor(0, 0, 0);

      chapter.memories.forEach((memory, mIdx) => {
        const dateStr = new Date(memory.timestamp).toLocaleDateString('da-DK', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        });
        
        if (y > 250) { doc.addPage(); y = 20; }
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(dateStr, margin, y);
        y += 7;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(memory.polishedText, maxLineWidth);
        
        lines.forEach((line: string) => {
          if (y > 280) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += 6;
        });
        
        y += 10;
      });
      y += 5;
    });

    doc.save(`thomas-bay-manuskript-${getTodayDate()}.pdf`);
  };

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
        <BookOpen className="w-12 h-12 mb-4 opacity-20" />
        <p>Din biograf er tom. Begynd at fortælle din historie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24">
      {/* Export Controls */}
      <div className="flex flex-wrap items-center justify-end gap-4 glass p-4 rounded-2xl border-amber-500/10">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mr-auto ml-2">Eksporter dit værk</span>
        <button 
          onClick={downloadMarkdown}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-100 rounded-lg text-sm transition-all border border-slate-700 shadow-lg"
        >
          <FileText className="w-4 h-4 text-amber-500" />
          <span>Markdown (.md)</span>
        </button>
        <button 
          onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-100 rounded-lg text-sm transition-all border border-slate-700 shadow-lg"
        >
          <FileDown className="w-4 h-4 text-amber-500" />
          <span>PDF</span>
        </button>
      </div>

      {organizedMemories.map((chapter, idx) => (
        <section key={idx} className="space-y-6">
          <div className="border-b border-amber-900/30 pb-2">
            <h2 className="text-3xl text-amber-100 font-serif italic">{chapter.title}</h2>
            <p className="text-slate-400 text-sm mt-1">{chapter.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {chapter.memories.map((memory) => (
              <div 
                key={memory.id} 
                className="parchment p-8 rounded-sm shadow-2xl relative group transform transition-transform hover:-rotate-1"
              >
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => onDelete(memory.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 uppercase tracking-widest font-semibold">
                  <Calendar className="w-3 h-3" />
                  {new Date(memory.timestamp).toLocaleDateString('da-DK', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="prose prose-slate prose-lg max-w-none">
                  <p className="serif text-xl leading-relaxed italic opacity-90">
                    "{memory.polishedText}"
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center italic text-sm text-slate-400">
                  <span>Side {Math.floor(Math.random() * 200) + 1}</span>
                  <div className="w-8 h-px bg-slate-300"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default BookShelf;
