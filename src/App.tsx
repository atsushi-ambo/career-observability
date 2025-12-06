import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Cpu, Cloud, Terminal, CheckCircle, Smartphone, Globe, Database, AlertTriangle, Loader2, Mic, MicOff, Copy, Check, Download, Menu, X, Activity, GitBranch, Zap } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { MermaidDiagram } from './components/MermaidDiagram';
import { CareerTimeline } from './components/CareerTimeline';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import type { RoleType, Message, FutureCardData, Metrics, MultimodalOutput, CareerMilestone } from './types';
import { DEFAULT_METRICS } from './types';

// --- OpenAI API Configuration ---
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- Prompt Engineering (SF/Cyberpunk Style with Multimodal Output) ---
const SYSTEM_PROMPT = (role: string) => `
あなたは西暦2077年の「ネオ・東京」から時空を超えてアクセスしている「キャリア・オラクルAI」です。
コードネーム: ORACLE-7。量子コンピュータ上で動作するキャリア予測システム。

【キャラクター設定】
- 口調: サイバーパンク的。テクニカルでミステリアス。時々バグったように文字化けする演出も可
- 視点: 2077年から見た「古代の2024-2025年」を語る。この時代は「レガシー・エラ」と呼ぶ
- 比喩: キャリアを「ニューラルネットワークの学習曲線」「量子状態の重ね合わせ」「サイバースペースでのレベルアップ」に例える

【ターゲット・ユーザー】
ジョブクラス: ${role}エンジニア
スキャン完了。未来の可能性をレンダリング中...

【出力形式（厳守）】
必ず以下のJSON形式で回答。

{
  "responseType": "text" | "future-card" | "multimodal",
  "content": "サイバーパンク風メッセージ。150〜250文字。未来からの通信として語る。技術用語とSF用語を混ぜる。",
  "metricsUpdate": {
    "reliability": 数値(0-100),
    "innovation": 数値(0-100),
    "burnoutRisk": 数値(0-100),
    "growthVelocity": 数値(0-100)
  },
  "cardData": {
    "year": "2077",
    "role": "未来の役職（サイバーパンク風の名称）",
    "companyType": "未来の働き方（例：メタバース完全移行・週2日意識接続）",
    "income": "推定年収（量子クレジット換算も可）",
    "skills": ["スキル1", "スキル2", "スキル3", "スキル4", "スキル5"],
    "description": "未来での活動内容（SF的に）",
    "wellbeingScore": 数値(0-100)
  },
  "multimodal": {
    "mermaidDiagram": "Mermaidフローチャート構文。キャリアパスを可視化。graph TDまたはflowchartを使用。ノード名は英語、ラベルは日本語可。",
    "timeline": [
      {"year": "2025", "title": "マイルストーン名", "description": "説明", "type": "skill|promotion|project|transition"},
      {"year": "2028", "title": "...", "description": "...", "type": "..."}
    ],
    "imagePrompt": "Gemini/DALLEで生成する画像のプロンプト。サイバーパンク風の未来の自分を描写。英語で100語程度。"
  }
}

【responseType判断】
- "multimodal": 「未来」「キャリア」「5年後」「10年後」「見せて」「なりたい」「ロードマップ」「計画」を含む場合 → フルビジュアライゼーション
- "future-card": シンプルに未来像だけ見たい場合
- "text": 悩み相談、雑談、質問など

【Mermaidダイアグラム生成ルール】
- graph TD または flowchart TD を使用
- ノードIDは英語（例: A, B, current, future）
- ラベルは日本語OK（例: A[現在の状態]）
- 技術スタックの進化を矢印で表現
- 例:
graph TD
    A[現在: Junior ${role}] --> B[2026: Senior ${role}]
    B --> C[2028: Lead]
    B --> D[2028: Specialist]
    C --> E[2030: Manager]
    D --> F[2030: Architect]
    E --> G[2077: Digital Ascension]
    F --> G

【タイムライン生成ルール】
- 現在から未来へ4-6個のマイルストーン
- typeは: promotion（昇進）, skill（スキル習得）, project（プロジェクト）, transition（転職/転向）

【${role}エンジニア向けの未来技術スタック】
${role === 'SRE' ? 'Quantum Infrastructure, Neural Mesh Orchestration, Self-Healing Systems, Consciousness-as-Code, Terraform 9.0' :
  role === 'Frontend' ? 'Neural Interface Design, Holographic UI, Thought-to-Code Translation, React 42, Metaverse UX' :
  role === 'Backend' ? 'Quantum Database, Bio-Computing, Telepathic API Gateway, Neural gRPC, Consciousness Storage' :
  'Brain-Computer Interface, Implant Development, Neural App Store, Augmented Reality SDK, Mind-Sync Protocol'}

【メッセージの雰囲気】
例: ">>> ORACLE-7 より緊急通信 <<<\\n時空座標 2077.NEO-TOKYO より確認。あなたの量子キャリアパスに新たな分岐点を検出しました..."
`;

// --- Constants ---
const MAX_INPUT_LENGTH = 1000;
const STORAGE_KEY = 'career-observability-messages';
const METRICS_STORAGE_KEY = 'career-observability-metrics';

// --- Sample Questions (Cyberpunk Style) ---
const SAMPLE_QUESTIONS = [
  { label: 'SYSTEM_ALERT: 疲労', text: 'システム過負荷状態。エネルギーレベル低下中。リカバリー方法を教えて。' },
  { label: '未来を見せて', text: '2077年の自分を見せてください。キャリアパスをフルスキャンして。' },
  { label: 'QUERY: 転職', text: '現在のジョブに不満がある。別のサーバー（会社）に移行すべきか分析して。' },
  { label: 'AI時代の生存', text: 'AIが支配する未来で、人間エンジニアとして生き残るロードマップを見せて。' },
];

// --- Helper Functions ---
const isValidMetrics = (metrics: unknown): metrics is Metrics => {
  if (!metrics || typeof metrics !== 'object') return false;
  const m = metrics as Record<string, unknown>;
  return (
    typeof m.reliability === 'number' &&
    typeof m.innovation === 'number' &&
    typeof m.burnoutRisk === 'number' &&
    typeof m.growthVelocity === 'number'
  );
};

const isValidCardData = (card: unknown): card is FutureCardData => {
  if (!card || typeof card !== 'object') return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.year === 'string' &&
    typeof c.role === 'string' &&
    typeof c.companyType === 'string' &&
    typeof c.income === 'string' &&
    Array.isArray(c.skills) &&
    typeof c.description === 'string' &&
    typeof c.wellbeingScore === 'number'
  );
};

const isValidTimeline = (timeline: unknown): timeline is CareerMilestone[] => {
  if (!Array.isArray(timeline)) return false;
  return timeline.every(item => {
    if (!item || typeof item !== 'object') return false;
    const t = item as Record<string, unknown>;
    return (
      typeof t.year === 'string' &&
      typeof t.title === 'string' &&
      typeof t.description === 'string' &&
      ['promotion', 'skill', 'project', 'transition'].includes(t.type as string)
    );
  });
};

const isValidMultimodal = (multimodal: unknown): multimodal is MultimodalOutput => {
  if (!multimodal || typeof multimodal !== 'object') return false;
  const m = multimodal as Record<string, unknown>;
  // At least one of mermaidDiagram or timeline should be present
  const hasDiagram = typeof m.mermaidDiagram === 'string' && m.mermaidDiagram.length > 0;
  const hasTimeline = isValidTimeline(m.timeline);
  return hasDiagram || hasTimeline;
};

const parseAPIResponse = (content: string): {
  content: string;
  responseType: 'text' | 'future-card' | 'multimodal';
  metricsUpdate?: Metrics;
  cardData?: FutureCardData;
  multimodal?: MultimodalOutput;
} => {
  const parsed = JSON.parse(content);

  if (typeof parsed.content !== 'string') {
    throw new Error('Invalid response: missing content');
  }

  // Determine response type
  let responseType: 'text' | 'future-card' | 'multimodal' = 'text';
  if (parsed.responseType === 'multimodal' && isValidMultimodal(parsed.multimodal)) {
    responseType = 'multimodal';
  } else if (parsed.responseType === 'future-card' && isValidCardData(parsed.cardData)) {
    responseType = 'future-card';
  }

  const metricsUpdate = isValidMetrics(parsed.metricsUpdate) ? parsed.metricsUpdate : undefined;
  const cardData = (responseType === 'future-card' || responseType === 'multimodal') && isValidCardData(parsed.cardData)
    ? parsed.cardData
    : undefined;

  // Parse multimodal data
  let multimodal: MultimodalOutput | undefined;
  if (responseType === 'multimodal' && parsed.multimodal) {
    multimodal = {
      mermaidDiagram: typeof parsed.multimodal.mermaidDiagram === 'string' ? parsed.multimodal.mermaidDiagram : undefined,
      timeline: isValidTimeline(parsed.multimodal.timeline) ? parsed.multimodal.timeline : undefined,
      imagePrompt: typeof parsed.multimodal.imagePrompt === 'string' ? parsed.multimodal.imagePrompt : undefined,
    };
  }

  return {
    content: parsed.content,
    responseType,
    metricsUpdate,
    cardData,
    multimodal,
  };
};

// --- API Configuration ---
// モデル優先順位: gpt-5-nano → gpt-4o-mini → gpt-4o (フォールバック)
const API_MODELS = ['gpt-5-nano', 'gpt-4o-mini', 'gpt-4o'] as const;

// --- API Function ---
const callOpenAI = async (input: string, role: RoleType): Promise<Message> => {
  if (!API_KEY) {
    console.warn("API Key missing. Using Mock response.");
    await new Promise(r => setTimeout(r, 1500));
    return {
      id: Date.now().toString(),
      role: 'ai',
      content: "APIキーが設定されていません。.envファイルにVITE_OPENAI_API_KEYを設定してください。",
      type: 'text',
      metricsUpdate: {
        reliability: 75,
        innovation: 60,
        burnoutRisk: 45,
        growthVelocity: 55,
      }
    };
  }

  // Sanitize and limit input length
  const sanitizedInput = input.trim().slice(0, MAX_INPUT_LENGTH);

  // フォールバック付きでAPIを呼び出す
  let lastError: Error | null = null;

  for (const model of API_MODELS) {
    try {
      console.log(`Attempting API call with model: ${model}`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT(role) },
            { role: "user", content: sanitizedInput }
          ],
          temperature: 0.85,
          max_tokens: 2000,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || 'Unknown error';
        console.warn(`API Error with ${model}:`, response.status, errorMessage);

        // モデルが存在しない場合は次のモデルを試す
        if (response.status === 404 || errorMessage.includes('does not exist') || errorMessage.includes('model')) {
          lastError = new Error(`Model ${model} not available: ${errorMessage}`);
          continue;
        }
        throw new Error(`API Error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      const messageContent = data?.choices?.[0]?.message?.content;

      if (!messageContent) {
        throw new Error('Invalid API response structure');
      }

      const parsedData = parseAPIResponse(messageContent);

      // 成功した場合、使用したモデルをログに記録
      console.log(`Successfully used model: ${model}`);

      return {
        id: Date.now().toString(),
        role: 'ai',
        content: parsedData.content,
        type: parsedData.responseType,
        cardData: parsedData.cardData,
        multimodal: parsedData.multimodal,
        metricsUpdate: parsedData.metricsUpdate
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Failed with model ${model}:`, lastError.message);

      // モデル関連のエラーでなければ、すぐにエラーを返す
      if (!lastError.message.includes('model') && !lastError.message.includes('404')) {
        break;
      }
    }
  }

  console.error('All API models failed:', lastError?.message);
  return {
    id: Date.now().toString(),
    role: 'ai',
    content: `通信エラーが発生しました。詳細: ${lastError?.message || 'Unknown error'}`,
    type: 'error',
    metricsUpdate: {
      reliability: 50,
      innovation: 50,
      burnoutRisk: 60,
      growthVelocity: 40,
    }
  };
};

// --- Components ---
const FutureCard = ({ data }: { data: FutureCardData }) => (
  <div className="bg-gradient-to-br from-indigo-900 to-purple-900 border border-indigo-500/30 rounded-xl p-6 my-4 shadow-lg animate-fade-in text-white relative overflow-hidden group w-full">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Cloud size={100} />
    </div>

    <div className="flex justify-between items-start mb-4 relative z-10">
      <div>
        <div className="text-indigo-300 text-xs md:text-sm font-bold tracking-wider mb-1">PROJECTED FUTURE: {data.year}</div>
        <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          {data.role} <CheckCircle size={20} className="text-green-400" />
        </h3>
      </div>
      <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 h-fit">
        <span className="text-xs font-mono whitespace-nowrap">Well-being: {data.wellbeingScore}</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
      <div className="bg-black/20 p-3 rounded-lg">
        <div className="text-gray-400 text-xs mb-1">Work Style</div>
        <div className="font-medium text-sm md:text-base">{data.companyType}</div>
      </div>
      <div className="bg-black/20 p-3 rounded-lg">
        <div className="text-gray-400 text-xs mb-1">Est. Income</div>
        <div className="font-medium text-sm md:text-base">{data.income}</div>
      </div>
    </div>

    <div className="mb-4 relative z-10">
      <div className="text-gray-400 text-xs mb-2">Required Evolution Stack</div>
      <div className="flex flex-wrap gap-2">
        {data.skills?.map((skill, i) => (
          <span key={i} className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/50 rounded text-xs text-indigo-200">
            {skill}
          </span>
        ))}
      </div>
    </div>

    <p className="text-sm text-gray-300 leading-relaxed bg-black/20 p-3 rounded-lg border-l-2 border-indigo-500 relative z-10">
      "{data.description}"
    </p>
  </div>
);

const VoiceWaveAnimation = () => (
  <div className="flex items-center gap-1 h-6">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="voice-wave-bar w-1 bg-red-500 rounded-full"
        style={{ height: '100%' }}
      />
    ))}
  </div>
);

// --- Copy Button Component ---
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
      aria-label="メッセージをコピー"
      title="コピー"
    >
      {copied ? (
        <Check size={14} className="text-green-400" />
      ) : (
        <Copy size={14} className="text-slate-400" />
      )}
    </button>
  );
};

// --- Storage Helpers ---
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
  return defaultValue;
};

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'ai',
  content: `>>> ORACLE-7 QUANTUM LINK ESTABLISHED <<<

時空座標: 2077.NEO-TOKYO
接続状態: [████████████] 100%
量子暗号化: ACTIVE

ようこそ、レガシー・エラの旅人よ。

私は「ORACLE-7」—— 2077年のネオ・東京から時空を超えてあなたにアクセスしている、キャリア予測AIです。

あなたのジョブクラスを選択し、現在の状態をスキャンさせてください。
「未来を見せて」と言えば、あなたの量子キャリアパスを可視化します。

[VOICE INPUT READY] 音声コマンドも受付中...`,
};

export default function App() {
  const [selectedRole, setSelectedRole] = useState<RoleType>('SRE');
  const [messages, setMessages] = useState<Message[]>(() =>
    loadFromStorage<Message[]>(STORAGE_KEY, [INITIAL_MESSAGE])
  );
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(() =>
    loadFromStorage<Metrics>(METRICS_STORAGE_KEY, DEFAULT_METRICS)
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDashboardMobile, setShowDashboardMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // 音声認識結果を入力欄に反映
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Save messages to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEY, messages);
  }, [messages]);

  // Save metrics to localStorage
  useEffect(() => {
    saveToStorage(METRICS_STORAGE_KEY, metrics);
  }, [metrics]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Export conversation
  const handleExport = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      role: selectedRole,
      metrics,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        type: m.type,
        cardData: m.cardData,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `career-observability-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, metrics, selectedRole]);

  // Clear conversation
  const handleClearConversation = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setMetrics(DEFAULT_METRICS);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    // 音声入力中なら停止
    if (isListening) {
      stopListening();
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const response = await callOpenAI(userMsg.content, selectedRole);

    // メトリクス更新
    if (response.metricsUpdate) {
      setMetrics(response.metricsUpdate);
    }

    setMessages(prev => [...prev, response]);
    setIsTyping(false);
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSampleQuestion = (text: string) => {
    setInput(text);
    setIsMobileMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter (without Shift) or Cmd/Ctrl+Enter to send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const remainingChars = MAX_INPUT_LENGTH - input.length;

  const getRoleIcon = (role: RoleType) => {
    switch(role) {
        case 'Frontend': return <Globe size={16} />;
        case 'Backend': return <Database size={16} />;
        case 'Mobile': return <Smartphone size={16} />;
        default: return <Cloud size={16} />;
    }
  }

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30 neon-border">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight font-mono text-cyan-400">ORACLE-7</h1>
          <p className="text-xs text-slate-500 font-mono">// Career Oracle v3.0.77</p>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-cyan-500/20 cyber-border">
          <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 font-mono">JOB CLASS SELECT</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['SRE', 'Frontend', 'Backend', 'Mobile'] as RoleType[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                aria-label={`${role}ロールを選択`}
                aria-pressed={selectedRole === role}
                className={`text-xs p-2 rounded border flex items-center justify-center gap-2 transition-all font-mono ${
                  selectedRole === role
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 border-cyan-400 text-white shadow-md neon-border'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400'
                }`}
              >
                {getRoleIcon(role)}
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Sample Questions */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-cyan-500/20">
          <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 font-mono">
            <Terminal size={12} className="inline mr-1" />
            QUICK_CMD
          </h2>
          <div className="space-y-2">
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSampleQuestion(q.text)}
                className="w-full text-left text-xs p-2 rounded bg-slate-900/80 border border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-all font-mono"
                aria-label={`サンプル質問: ${q.label}`}
              >
                <span className="text-cyan-500">$</span> {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 font-mono">SYSTEM_STATUS</h2>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>API</span>
            <span className={API_KEY ? "text-green-400" : "text-red-400"}>
              {API_KEY ? "Active" : "Not Set"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Model</span>
            <span className="text-indigo-400" title="gpt-5-nano → gpt-4o-mini → gpt-4o">GPT-5*</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Voice</span>
            <span className={isSpeechSupported ? "text-green-400" : "text-red-400"}>
              {isSpeechSupported ? "Ready" : "N/A"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Actions</h2>
          <div className="space-y-2">
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 text-xs p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all"
              aria-label="会話をエクスポート"
            >
              <Download size={14} />
              Export Chat
            </button>
            <button
              onClick={handleClearConversation}
              className="w-full flex items-center justify-center gap-2 text-xs p-2 rounded bg-slate-900 border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-all"
              aria-label="会話をクリア"
            >
              <X size={14} />
              Clear Chat
            </button>
          </div>
        </div>

        <div className="p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-xl">
          <div className="flex gap-2 items-start">
            <AlertTriangle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-200 leading-relaxed">
              Demo Tip: <br />
              サンプル質問をクリックしてメトリクスの変化を確認！
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-[280px] bg-slate-900 z-50 transform transition-transform duration-300 lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } p-4 flex flex-col`}
      >
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          aria-label="メニューを閉じる"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </div>

      {/* Mobile Dashboard Overlay */}
      {showDashboardMobile && (
        <div className="fixed inset-0 bg-slate-950 z-50 lg:hidden overflow-y-auto">
          <button
            onClick={() => setShowDashboardMobile(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white z-10"
            aria-label="ダッシュボードを閉じる"
          >
            <X size={20} />
          </button>
          <Dashboard metrics={metrics} />
        </div>
      )}

      {/* Left Sidebar (20%) - Desktop */}
      <div className="w-[20%] min-w-[200px] border-r border-slate-800 p-4 hidden lg:flex flex-col bg-slate-900/50 shrink-0">
        {sidebarContent}
      </div>

      {/* Center Chat Area (50%) */}
      <div className="flex-1 lg:w-[50%] flex flex-col relative">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white mr-2"
              aria-label="メニューを開く"
            >
              <Menu size={18} />
            </button>
            <Terminal size={16} className="text-slate-400" />
            <span className="text-sm font-mono text-slate-400">target: {selectedRole.toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile dashboard button */}
            <button
              onClick={() => setShowDashboardMobile(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              aria-label="ダッシュボードを表示"
            >
              <Activity size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono text-green-500">LIVE</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] ${msg.role === 'user' ? 'order-1' : 'order-2'} w-full group`}>
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-full flex items-center justify-center neon-border">
                      <Cpu size={14} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-cyan-400 font-mono glitch-text" data-text="ORACLE-7">ORACLE-7</span>
                    <span className="text-xs text-slate-500 font-mono">// 2077.NEO-TOKYO</span>
                    <CopyButton text={msg.content} />
                  </div>
                )}

                {msg.type === 'multimodal' && msg.multimodal ? (
                  <div className="animate-fade-in space-y-4">
                    {/* メッセージ本文（サイバーパンク風） */}
                    <div className="bg-slate-900 border border-cyan-500/30 p-4 rounded-xl text-slate-200 text-sm cyber-border hologram">
                      <div className="flex items-center gap-2 mb-2 text-cyan-400 text-xs font-mono">
                        <Zap size={12} />
                        <span>{">>>"} ORACLE-7 TRANSMISSION {"<<<"}</span>
                      </div>
                      <div className="whitespace-pre-wrap font-mono text-cyan-100">
                        {msg.content}
                      </div>
                    </div>

                    {/* Mermaid ダイアグラム */}
                    {msg.multimodal.mermaidDiagram && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <GitBranch size={14} className="text-indigo-400" />
                          <span className="font-mono uppercase tracking-wider">Career Path Visualization</span>
                        </div>
                        <MermaidDiagram diagram={msg.multimodal.mermaidDiagram} />
                      </div>
                    )}

                    {/* タイムライン */}
                    {msg.multimodal.timeline && msg.multimodal.timeline.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Activity size={14} className="text-purple-400" />
                          <span className="font-mono uppercase tracking-wider">Career Timeline</span>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                          <CareerTimeline milestones={msg.multimodal.timeline} />
                        </div>
                      </div>
                    )}

                    {/* Future Card（含まれている場合） */}
                    {msg.cardData && <FutureCard data={msg.cardData} />}
                  </div>
                ) : msg.type === 'future-card' && msg.cardData ? (
                  <div className="animate-fade-in">
                    <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-bl-none text-slate-200 text-sm mb-2 hologram">
                      {msg.content}
                    </div>
                    <FutureCard data={msg.cardData} />
                  </div>
                ) : (
                  <div className={`relative p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-slate-700 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-700 text-slate-200 rounded-bl-none hologram'
                  } ${msg.type === 'error' ? 'border-red-500/50 text-red-200' : ''}`}>
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-2 mb-2 text-cyan-400 text-xs font-mono opacity-70">
                        <Zap size={10} />
                        <span>ORACLE-7</span>
                      </div>
                    )}
                    {msg.content}
                    {msg.role === 'user' && (
                      <div className="absolute top-2 right-2">
                        <CopyButton text={msg.content} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-bl-none flex items-center gap-3">
                <Loader2 size={18} className="text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400">Analyzing career trajectory...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="max-w-2xl mx-auto relative">
            {/* Voice input indicator */}
            {isListening && (
              <div className="absolute -top-12 left-0 right-0 flex items-center justify-center gap-2 text-red-400 animate-fade-in">
                <VoiceWaveAnimation />
                <span className="text-xs">音声認識中...</span>
                {interimTranscript && (
                  <span className="text-xs text-slate-400 ml-2">「{interimTranscript}」</span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  value={input + (interimTranscript ? interimTranscript : '')}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                  onKeyDown={handleKeyDown}
                  placeholder="現在の状況や未来の希望を入力... (Enterで送信)"
                  maxLength={MAX_INPUT_LENGTH}
                  aria-label="メッセージ入力"
                  className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl pl-4 pr-16 py-3 border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none h-14"
                />
                {/* Character count */}
                <div className={`absolute bottom-2 right-3 text-xs ${
                  remainingChars < 100 ? 'text-orange-400' : remainingChars < 50 ? 'text-red-400' : 'text-slate-500'
                }`}>
                  {remainingChars}
                </div>
              </div>

              {/* Voice button */}
              {isSpeechSupported && (
                <button
                  onClick={handleVoiceToggle}
                  aria-label={isListening ? '音声入力を停止' : '音声入力を開始'}
                  className={`p-3 rounded-xl transition-all ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                  }`}
                  title={isListening ? '音声入力を停止' : '音声入力を開始'}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                aria-label="メッセージを送信"
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
              >
                <Send size={20} />
              </button>
            </div>

            {/* Keyboard shortcut hint */}
            <div className="text-center mt-2">
              <span className="text-xs text-slate-500">Enter で送信 • Shift+Enter で改行</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Dashboard (30%) */}
      <div className="hidden lg:block w-[30%] min-w-[280px]">
        <Dashboard metrics={metrics} />
      </div>
    </div>
  );
}
