import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--border-color)' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></span>
            {entry.name}: <span style={{ fontWeight: 600 }}>{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function MonthlyTrendChart({ data }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Compounds Issued Over Time</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis 
            dataKey="month" 
            stroke="var(--text-secondary)" 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="var(--text-secondary)" 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Line 
            type="monotone" 
            dataKey="count" 
            name="Compounds" 
            stroke="var(--accent-primary)" 
            strokeWidth={3}
            dot={{ fill: 'var(--bg-primary)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--accent-primary)', stroke: 'var(--bg-primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopCompaniesChart({ data }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Top Companies by Compound Amount</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
          <XAxis 
            type="number" 
            stroke="var(--text-secondary)" 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            stroke="var(--text-secondary)" 
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={150}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar 
            dataKey="amount" 
            name="Amount (RM)" 
            fill="var(--accent-secondary)" 
            radius={[0, 4, 4, 0]}
            barSize={20}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OffenseSectionChart({ data }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Breakdown by Offense Section</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            stroke="var(--bg-primary)"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
