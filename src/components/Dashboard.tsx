import { useEffect, useState, useRef } from 'react';
import { Activity, AlertTriangle, Gauge, Terminal, TrendingUp, Shield } from 'lucide-react';
import type { Metrics } from '../types';

interface DashboardProps {
  metrics: Metrics;
}

type LogEntry = {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  timestamp: string;
};

const getReliabilityColor = (value: number): string => {
  if (value >= 99) return 'text-green-400';
  if (value >= 95) return 'text-yellow-400';
  if (value >= 90) return 'text-orange-400';
  return 'text-red-400';
};

const getBurnoutColor = (value: number): string => {
  if (value <= 30) return 'bg-green-500';
  if (value <= 50) return 'bg-yellow-500';
  if (value <= 70) return 'bg-orange-500';
  return 'bg-red-500';
};

const getVelocityColor = (value: number): string => {
  if (value >= 80) return 'text-cyan-400';
  if (value >= 60) return 'text-blue-400';
  if (value >= 40) return 'text-indigo-400';
  return 'text-purple-400';
};

export const Dashboard = ({ metrics }: DashboardProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [displayMetrics, setDisplayMetrics] = useState(metrics);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // メトリクス変更時のアニメーション効果
  useEffect(() => {
    const duration = 1000;
    const steps = 20;
    const stepDuration = duration / steps;

    const startMetrics = { ...displayMetrics };
    const targetMetrics = { ...metrics };

    let currentStep = 0;

    const animate = () => {
      currentStep++;
      const progress = currentStep / steps;

      setDisplayMetrics({
        reliability: startMetrics.reliability + (targetMetrics.reliability - startMetrics.reliability) * progress,
        innovation: startMetrics.innovation + (targetMetrics.innovation - startMetrics.innovation) * progress,
        burnoutRisk: startMetrics.burnoutRisk + (targetMetrics.burnoutRisk - startMetrics.burnoutRisk) * progress,
        growthVelocity: startMetrics.growthVelocity + (targetMetrics.growthVelocity - startMetrics.growthVelocity) * progress,
      });

      if (currentStep < steps) {
        setTimeout(animate, stepDuration);
      }
    };

    animate();
  }, [metrics]);

  // ログ生成
  useEffect(() => {
    const generateLog = (): LogEntry => {
      const messages: { level: LogEntry['level']; message: string }[] = [
        { level: 'INFO', message: 'Career path analysis in progress...' },
        { level: 'INFO', message: 'Scanning future timeline data...' },
        { level: 'INFO', message: 'Reliability metrics updated' },
        { level: 'SUCCESS', message: 'Growth velocity calculated' },
        { level: 'INFO', message: 'Innovation index refreshed' },
      ];

      if (metrics.burnoutRisk > 50) {
        messages.push(
          { level: 'WARN', message: 'Elevated stress levels detected' },
          { level: 'WARN', message: 'Error budget consumption rising' },
          { level: 'ERROR', message: 'ALERT: Burnout risk threshold exceeded' }
        );
      }

      if (metrics.reliability < 90) {
        messages.push(
          { level: 'WARN', message: 'Career stability below SLO target' },
          { level: 'WARN', message: 'Reliability degradation observed' }
        );
      }

      if (metrics.growthVelocity > 80) {
        messages.push(
          { level: 'SUCCESS', message: 'Exceptional growth trajectory detected' },
          { level: 'INFO', message: 'Career momentum accelerating' }
        );
      }

      const selected = messages[Math.floor(Math.random() * messages.length)];
      const now = new Date();
      return {
        id: Date.now().toString(),
        ...selected,
        timestamp: now.toLocaleTimeString('ja-JP', { hour12: false }),
      };
    };

    const interval = setInterval(() => {
      setLogs(prev => [...prev.slice(-9), generateLog()]);
    }, 2000);

    // 初期ログ
    setLogs([generateLog()]);

    return () => clearInterval(interval);
  }, [metrics.burnoutRisk, metrics.reliability, metrics.growthVelocity]);

  // ログ自動スクロール
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const reliabilitySLO = 90 + (displayMetrics.reliability / 10);
  const isBurnoutCritical = displayMetrics.burnoutRisk > 70;

  return (
    <div className="h-full bg-slate-950 border-l border-slate-800 p-4 flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <Activity size={18} className="text-cyan-400" />
        <h2 className="text-sm font-bold text-cyan-400 tracking-wider">OBSERVABILITY DASHBOARD</h2>
        <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>

      {/* Career Availability (SLO) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-slate-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Career Availability (SLO)</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-mono font-bold ${getReliabilityColor(reliabilitySLO)}`}>
            {reliabilitySLO.toFixed(2)}%
          </span>
          <span className="text-xs text-slate-500">target: 99.9%</span>
        </div>
        <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${reliabilitySLO >= 99 ? 'bg-green-500' : reliabilitySLO >= 95 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(reliabilitySLO, 100)}%` }}
          />
        </div>
      </div>

      {/* Error Budget (Burnout Risk) */}
      <div className={`bg-slate-900/50 border rounded-lg p-4 ${isBurnoutCritical ? 'border-red-500/50 animate-alert-pulse' : 'border-slate-800'}`}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className={isBurnoutCritical ? 'text-red-400' : 'text-slate-400'} />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Error Budget (Burnout Risk)</span>
          {isBurnoutCritical && <span className="text-xs text-red-400 ml-auto animate-pulse">CRITICAL</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getBurnoutColor(displayMetrics.burnoutRisk)} ${isBurnoutCritical ? 'animate-pulse' : ''}`}
                style={{ width: `${displayMetrics.burnoutRisk}%` }}
              />
            </div>
          </div>
          <span className={`text-2xl font-mono font-bold ${isBurnoutCritical ? 'text-red-400' : 'text-slate-300'}`}>
            {displayMetrics.burnoutRisk.toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Remaining budget: {(100 - displayMetrics.burnoutRisk).toFixed(0)}%
        </p>
      </div>

      {/* Velocity & Innovation */}
      <div className="grid grid-cols-2 gap-3">
        {/* Growth Velocity */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-cyan-400" />
            <span className="text-xs text-slate-400">Velocity</span>
          </div>
          <div className={`text-2xl font-mono font-bold ${getVelocityColor(displayMetrics.growthVelocity)}`}>
            {displayMetrics.growthVelocity.toFixed(0)}
          </div>
          <div className="text-xs text-slate-500">deploys/quarter</div>
        </div>

        {/* Innovation Index */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Gauge size={14} className="text-purple-400" />
            <span className="text-xs text-slate-400">Innovation</span>
          </div>
          <div className="text-2xl font-mono font-bold text-purple-400">
            {displayMetrics.innovation.toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500">tech adoption</div>
        </div>
      </div>

      {/* Live Logs */}
      <div className="flex-1 bg-black/50 border border-slate-800 rounded-lg overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/50">
          <Terminal size={14} className="text-green-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Live Logs</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2 animate-fade-in">
              <span className="text-slate-600">{log.timestamp}</span>
              <span className={
                log.level === 'ERROR' ? 'text-red-400' :
                log.level === 'WARN' ? 'text-yellow-400' :
                log.level === 'SUCCESS' ? 'text-green-400' :
                'text-slate-400'
              }>
                [{log.level}]
              </span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};
