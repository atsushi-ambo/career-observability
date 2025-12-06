import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  diagram: string;
}

// Mermaid初期化（SF/サイバーパンクテーマ）
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#818cf8',
    lineColor: '#818cf8',
    secondaryColor: '#1e1b4b',
    tertiaryColor: '#0f172a',
    background: '#020617',
    mainBkg: '#1e1b4b',
    nodeBorder: '#818cf8',
    clusterBkg: '#1e1b4b',
    clusterBorder: '#6366f1',
    titleColor: '#c7d2fe',
    edgeLabelBackground: '#1e1b4b',
  },
  flowchart: {
    curve: 'basis',
    padding: 20,
  },
  timeline: {
    disableMulticolor: false,
  },
});

export const MermaidDiagram = ({ diagram }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !diagram) return;

      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, diagram);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('ダイアグラムの生成に失敗しました');
      }
    };

    renderDiagram();
  }, [diagram]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* ホログラム風のグロー効果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />

      {/* スキャンライン効果 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
        <div className="scanline-overlay" />
      </div>

      {/* ダイアグラム本体 */}
      <div
        ref={containerRef}
        className="relative bg-slate-900/80 border border-indigo-500/30 rounded-xl p-4 overflow-x-auto backdrop-blur-sm"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {/* コーナーアクセント */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
    </div>
  );
};
