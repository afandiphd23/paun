import React from 'react';

export default function StatCard({ title, value, icon: Icon, trend, colorClass = "accent-primary" }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>{title}</p>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</h3>
        </div>
        <div style={{ 
          padding: '0.75rem', 
          borderRadius: 'var(--radius-md)', 
          background: `rgba(var(--${colorClass}-rgb, 59, 130, 246), 0.1)`,
          color: `var(--${colorClass})`
        }}>
          <Icon size={24} />
        </div>
      </div>
      
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <span style={{ 
            color: trend.isPositive ? 'var(--accent-success)' : 'var(--accent-danger)',
            display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500
          }}>
            {trend.value}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
