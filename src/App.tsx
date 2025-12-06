import { useState, useEffect, useRef } from 'react';
import { Send, Cpu, Sparkles, Cloud, Terminal, CheckCircle, Smartphone, Globe, Database, AlertTriangle, Loader2, Mic, MicOff } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import type { RoleType, Message, FutureCardData, Metrics } from './types';
import { DEFAULT_METRICS } from './types';

// --- OpenAI API Configuration ---
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- Prompt Engineering ---
const SYSTEM_PROMPT = (role: string) => `
あなたは2030年の未来から来たAIであり、ユーザーのキャリアを「システム」として監視するSREです。
現在のユーザーは「${role}エンジニア」です。

あなたの役割：
1. ユーザーの悩みに対し、2030年の視点から共感的かつ技術的なアドバイスをする。
2. ユーザーのキャリアの可能性を広げる「未来の履歴書（キャリアカード）」を作成する。
3. ユーザーの発言内容に基づいて、キャリアの健全性メトリクスを推定する。

【重要：出力ルール】
回答は必ず以下のJSON形式で行ってください。Markdownは不要です。

{
  "responseType": "text" | "future-card",
  "content": "ユーザーへのメッセージ（150文字程度。${role}特有の技術用語を使用）",
  "metricsUpdate": {
    "reliability": 0-100,
    "innovation": 0-100,
    "burnoutRisk": 0-100,
    "growthVelocity": 0-100
  },
  "cardData": {
    "year": "2030",
    "role": "未来の役職名",
    "companyType": "働く環境",
    "income": "推定年収",
    "skills": ["スキル1", "スキル2", "スキル3"],
    "description": "役割の詳細（50文字程度）",
    "wellbeingScore": 0〜100
  }
}

【メトリクス推定基準】
- reliability: キャリアの安定性（悩み相談時は低下、解決策提示で回復）
- innovation: 新しい技術への挑戦度（技術的な話題で上昇）
- burnoutRisk: ストレスレベル（高いほど危険。悩み相談時は高く設定）
- growthVelocity: 成長のスピード感（前向きな話題で上昇）

【判断基準】
- 悩み相談・日常会話 -> "responseType": "text"
- 「将来」「キャリア」「未来を見せて」「5年後」 -> "responseType": "future-card"
- cardDataは "responseType": "future-card" の時のみ含める
`;

// --- Constants ---
const MAX_INPUT_LENGTH = 1000;

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

const parseAPIResponse = (content: string): {
  content: string;
  responseType: 'text' | 'future-card';
  metricsUpdate?: Metrics;
  cardData?: FutureCardData;
} => {
  const parsed = JSON.parse(content);

  if (typeof parsed.content !== 'string') {
    throw new Error('Invalid response: missing content');
  }

  const responseType = parsed.responseType === 'future-card' ? 'future-card' : 'text';
  const metricsUpdate = isValidMetrics(parsed.metricsUpdate) ? parsed.metricsUpdate : undefined;
  const cardData = responseType === 'future-card' && isValidCardData(parsed.cardData)
    ? parsed.cardData
    : undefined;

  return {
    content: parsed.content,
    responseType,
    metricsUpdate,
    cardData,
  };
};

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

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT(role) },
          { role: "user", content: sanitizedInput }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || 'Unknown error';
      console.error('API Error:', response.status, errorMessage);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const messageContent = data?.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Invalid API response structure');
    }

    const parsedData = parseAPIResponse(messageContent);

    return {
      id: Date.now().toString(),
      role: 'ai',
      content: parsedData.content,
      type: parsedData.responseType,
      cardData: parsedData.cardData,
      metricsUpdate: parsedData.metricsUpdate
    };

  } catch (error) {
    console.error('OpenAI API Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      id: Date.now().toString(),
      role: 'ai',
      content: "通信エラーが発生しました。未来との接続が不安定です。",
      type: 'error',
      metricsUpdate: {
        reliability: 50,
        innovation: 50,
        burnoutRisk: 60,
        growthVelocity: 40,
      }
    };
  }
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

export default function App() {
  const [selectedRole, setSelectedRole] = useState<RoleType>('SRE');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: "Career Observability Agent v2.0 起動。\nあなたのキャリアを「システム」として可視化します。\n\n現在の職種を選択し、今の悩みや、なりたい姿を入力してください。\n音声入力も対応しています。",
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const getRoleIcon = (role: RoleType) => {
    switch(role) {
        case 'Frontend': return <Globe size={16} />;
        case 'Backend': return <Database size={16} />;
        case 'Mobile': return <Smartphone size={16} />;
        default: return <Cloud size={16} />;
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Left Sidebar (20%) */}
      <div className="w-[20%] min-w-[200px] border-r border-slate-800 p-4 hidden lg:flex flex-col bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Career Observability</h1>
            <p className="text-xs text-slate-400">v2.0 - Future Simulator</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Target Persona</h2>
            <div className="grid grid-cols-2 gap-2">
                {(['SRE', 'Frontend', 'Backend', 'Mobile'] as RoleType[]).map((role) => (
                    <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`text-xs p-2 rounded border flex items-center justify-center gap-2 transition-all ${
                            selectedRole === role
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                        {getRoleIcon(role)}
                        {role}
                    </button>
                ))}
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">System Status</h2>
             <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
               <span>API</span>
               <span className={API_KEY ? "text-green-400" : "text-red-400"}>
                 {API_KEY ? "Active" : "Not Set"}
               </span>
             </div>
             <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
               <span>Model</span>
               <span className="text-indigo-400">GPT-4o</span>
             </div>
             <div className="flex items-center justify-between text-xs text-slate-400">
               <span>Voice</span>
               <span className={isSpeechSupported ? "text-green-400" : "text-red-400"}>
                 {isSpeechSupported ? "Ready" : "N/A"}
               </span>
             </div>
          </div>

          <div className="p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-xl">
             <div className="flex gap-2 items-start">
               <AlertTriangle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
               <p className="text-xs text-indigo-200 leading-relaxed">
                 Demo Tip: <br/>
                 「疲れた」「CTOになりたい」「将来が不安」などを入力してメトリクスの変化を確認！
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Center Chat Area (50%) */}
      <div className="flex-1 lg:w-[50%] flex flex-col relative">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-2">
                <Terminal size={16} className="text-slate-400" />
                <span className="text-sm font-mono text-slate-400">target: {selectedRole.toLowerCase()}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-mono text-green-500">LIVE</span>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] ${msg.role === 'user' ? 'order-1' : 'order-2'} w-full`}>
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Cpu size={14} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-indigo-400">OBSERVABILITY AGENT</span>
                  </div>
                )}

                {msg.type === 'future-card' && msg.cardData ? (
                  <div className="animate-fade-in">
                    <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-bl-none text-slate-200 text-sm mb-2">
                      {msg.content}
                    </div>
                    <FutureCard data={msg.cardData} />
                  </div>
                ) : (
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-slate-700 text-white rounded-br-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                  } ${msg.type === 'error' ? 'border-red-500/50 text-red-200' : ''}`}>
                    {msg.content}
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
              <textarea
                value={input + (interimTranscript ? interimTranscript : '')}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="現在の状況や未来の希望を入力... (Enterで送信)"
                className="flex-1 bg-slate-800 text-white placeholder-slate-500 rounded-xl pl-4 pr-4 py-3 border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none h-14"
              />

              {/* Voice button */}
              {isSpeechSupported && (
                <button
                  onClick={handleVoiceToggle}
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
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 rounded-xl text-white transition-colors"
              >
                <Send size={20} />
              </button>
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
