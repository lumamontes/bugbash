import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SeverityData {
  name: string;
  value: number;
  color: string;
}

interface ReporterData {
  name: string;
  count: number;
}

interface Props {
  severityData: SeverityData[];
  reporterData: ReporterData[];
  statusData: SeverityData[];
}

export default function ReportCharts({ severityData, reporterData, statusData }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Severity Pie */}
      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Severidade</h3>
        {severityData.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">Sem dados</p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={35}
                  paddingAngle={2}
                >
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-surface-3)', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {severityData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-text-secondary">{d.name}</span>
                  <span className="text-xs font-bold text-text-primary">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Pie */}
      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Status</h3>
        {statusData.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">Sem dados</p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={35}
                  paddingAngle={2}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-surface-3)', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {statusData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-text-secondary">{d.name}</span>
                  <span className="text-xs font-bold text-text-primary">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reporter Bar Chart */}
      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6 md:col-span-2">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Bugs por Participante</h3>
        {reporterData.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={reporterData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-surface-3)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
              />
              <Bar dataKey="count" fill="var(--color-primary-500)" radius={[0, 4, 4, 0]} name="Bugs" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
