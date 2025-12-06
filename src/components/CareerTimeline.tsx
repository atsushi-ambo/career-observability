import { Briefcase, Code, Rocket, ArrowRight } from 'lucide-react';
import type { CareerMilestone } from '../types';

interface CareerTimelineProps {
  milestones: CareerMilestone[];
}

const getMilestoneIcon = (type: CareerMilestone['type']) => {
  switch (type) {
    case 'promotion':
      return <Briefcase size={16} />;
    case 'skill':
      return <Code size={16} />;
    case 'project':
      return <Rocket size={16} />;
    case 'transition':
      return <ArrowRight size={16} />;
  }
};

const getMilestoneColor = (type: CareerMilestone['type']) => {
  switch (type) {
    case 'promotion':
      return 'from-yellow-500 to-orange-500';
    case 'skill':
      return 'from-cyan-500 to-blue-500';
    case 'project':
      return 'from-purple-500 to-pink-500';
    case 'transition':
      return 'from-green-500 to-emerald-500';
  }
};

export const CareerTimeline = ({ milestones }: CareerTimelineProps) => {
  return (
    <div className="relative">
      {/* タイムラインの縦線（グロー効果付き） */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-indigo-500 to-purple-500">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500 via-indigo-500 to-purple-500 blur-sm" />
      </div>

      <div className="space-y-6">
        {milestones.map((milestone, index) => (
          <div
            key={index}
            className="relative pl-16 animate-fade-in"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            {/* マイルストーンノード */}
            <div className={`absolute left-4 w-5 h-5 rounded-full bg-gradient-to-br ${getMilestoneColor(milestone.type)} flex items-center justify-center shadow-lg`}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
              <span className="text-white">{getMilestoneIcon(milestone.type)}</span>
            </div>

            {/* パルスリング */}
            <div className={`absolute left-4 w-5 h-5 rounded-full bg-gradient-to-br ${getMilestoneColor(milestone.type)} animate-ping opacity-30`} />

            {/* カード */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-indigo-500/50 transition-all group">
              {/* 年 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded">
                  {milestone.year}
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  {milestone.type}
                </span>
              </div>

              {/* タイトル */}
              <h3 className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                {milestone.title}
              </h3>

              {/* 説明 */}
              <p className="text-sm text-slate-400 mt-1">
                {milestone.description}
              </p>

              {/* デコレーション */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 未来へ続く矢印 */}
      <div className="relative pl-16 mt-6">
        <div className="absolute left-4 w-5 h-5 flex items-center justify-center text-indigo-400">
          <ArrowRight size={20} className="animate-bounce" />
        </div>
        <div className="text-sm text-slate-500 italic">
          未来は続く...
        </div>
      </div>
    </div>
  );
};
