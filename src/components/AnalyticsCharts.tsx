import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface SessionTrend {
  title: string;
  bugs: number;
  date: string;
}

interface SeverityTrend {
  title: string;
  blocker: number;
  major: number;
  minor: number;
  enhancement: number;
}

interface ReporterData {
  name: string;
  bugs: number;
  avgQuality: number;
}

interface SourceData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  sessionTrend: SessionTrend[];
  severityTrend: SeverityTrend[];
  topReporters: ReporterData[];
  sourceData: SourceData[];
  resolutionData: SourceData[];
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#1a1a24', border: '1px solid #242430', borderRadius: '8px', fontSize: '12px' },
  itemStyle: { color: '#f1f5f9' },
};

export default function AnalyticsCharts({
  sessionTrend, severityTrend, topReporters, sourceData, resolutionData,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Row 1: Bugs per session + Severity stacked bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111118] border border-[#242430] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Bugs por Sessão</h3>
          {sessionTrend.length === 0 ? (
            <p className="text-[#64748b] text-sm text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sessionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242430" />
                <XAxis dataKey="title" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="bugs" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} name="Bugs" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[#111118] border border-[#242430] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Severidade por Sessão</h3>
          {severityTrend.length === 0 ? (
            <p className="text-[#64748b] text-sm text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={severityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242430" />
                <XAxis dataKey="title" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="blocker" stackId="a" fill="#ef4444" name="Bloqueante" radius={[0, 0, 0, 0]} />
                <Bar dataKey="major" stackId="a" fill="#f97316" name="Grave" />
                <Bar dataKey="minor" stackId="a" fill="#eab308" name="Menor" />
                <Bar dataKey="enhancement" stackId="a" fill="#22c55e" name="Melhoria" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Source breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111118] border border-[#242430] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Widget vs Plataforma</h3>
          {sourceData.length === 0 ? (
            <p className="text-[#64748b] text-sm text-center py-12">Sem dados</p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={2}>
                    {sourceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {sourceData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-[#94a3b8]">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Top reporters + Resolution funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111118] border border-[#242430] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Top Participantes</h3>
          {topReporters.length === 0 ? (
            <p className="text-[#64748b] text-sm text-center py-8">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {topReporters.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-[#eab308]/20 text-[#eab308]' :
                    i === 1 ? 'bg-[#94a3b8]/20 text-[#94a3b8]' :
                    i === 2 ? 'bg-[#cd7f32]/20 text-[#cd7f32]' :
                    'bg-[#242430] text-[#64748b]'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f1f5f9] truncate">{r.name}</p>
                  </div>
                  <span className="text-sm font-bold text-[#f1f5f9]">{r.bugs}</span>
                  <span className="text-xs text-[#64748b]">bugs</span>
                  {r.avgQuality > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e]">{r.avgQuality.toFixed(0)}q</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111118] border border-[#242430] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Funil de Resolução</h3>
          {resolutionData.length === 0 ? (
            <p className="text-[#64748b] text-sm text-center py-8">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {resolutionData.map(d => {
                const maxVal = Math.max(...resolutionData.map(r => r.value), 1);
                const pct = (d.value / maxVal) * 100;
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#94a3b8]">{d.name}</span>
                      <span className="text-xs font-bold text-[#f1f5f9]">{d.value}</span>
                    </div>
                    <div className="w-full bg-[#242430] rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
