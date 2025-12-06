export type RoleType = 'SRE' | 'Frontend' | 'Backend' | 'Mobile';

// SREのメタファーを用いたキャリア健全性指標
export type Metrics = {
  reliability: number;    // キャリアの安定性・信頼性 (SLO: 99.9%)
  innovation: number;     // 技術的挑戦度・モダン技術採用率
  burnoutRisk: number;    // エラーバジェット消費率 (高いほど危険)
  growthVelocity: number; // 成長速度 (デプロイ頻度のようなもの)
};

export type FutureCardData = {
  year: string;
  role: string;
  companyType: string;
  income: string;
  skills: string[];
  description: string;
  wellbeingScore: number;
};

// キャリアタイムラインのマイルストーン
export type CareerMilestone = {
  year: string;
  title: string;
  description: string;
  type: 'promotion' | 'skill' | 'project' | 'transition';
};

// マルチモーダル出力データ
export type MultimodalOutput = {
  // Mermaidダイアグラム（キャリアパス）
  mermaidDiagram?: string;
  // キャリアタイムライン
  timeline?: CareerMilestone[];
  // 画像プロンプト（Gemini用）
  imagePrompt?: string;
  // 生成された画像URL
  generatedImageUrl?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  type?: 'text' | 'future-card' | 'multimodal' | 'error';
  cardData?: FutureCardData;
  multimodal?: MultimodalOutput;
  metricsUpdate?: Metrics; // AIの回答ごとにメトリクスを更新
};

// Default metrics values
export const DEFAULT_METRICS: Metrics = {
  reliability: 85,
  innovation: 70,
  burnoutRisk: 30,
  growthVelocity: 65,
};
