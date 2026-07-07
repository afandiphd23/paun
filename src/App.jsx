import React, { useState, useMemo } from 'react';
import FileUploader from './components/FileUploader';
import StatCard from './components/StatCard';
import { MonthlyTrendChart, TopCompaniesChart, OffenseSectionChart } from './components/Charts';
import DataTable from './components/DataTable';
import { LayoutDashboard, FileText, DollarSign, Activity, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);

  // Derive stats and chart data
  const { stats, chartData } = useMemo(() => {
    if (!data) return { stats: null, chartData: null };

    let totalAmount = 0;
    let totalPaid = 0;
    const monthlyCounts = {};
    const companyTotals = {};
    const offenseTotals = {};

    data.forEach(row => {
      // Amounts
      const amt = parseFloat(row['KOMPAUN AMT']) || 0;
      const paid = parseFloat(row['KOMPAUN BAYAR']) || 0;
      totalAmount += amt;
      totalPaid += paid;

      // Monthly Trend
      const dateStr = row['TARIKH FORMAT'];
      if (dateStr) {
        try {
          const date = new Date(dateStr);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
        } catch(e) {}
      }

      // Companies
      const company = row['SYARIKAT'] || 'UNKNOWN';
      companyTotals[company] = (companyTotals[company] || 0) + amt;

      // Offenses
      const offenseMatch = (row['SEKSYEN KESALAHAN'] || '').match(/SEKSYEN\s+[\d\w()]+/i);
      const offense = offenseMatch ? offenseMatch[0] : 'OTHER';
      offenseTotals[offense] = (offenseTotals[offense] || 0) + 1;
    });

    const outstanding = totalAmount - totalPaid;

    // Format Data for Charts
    const monthlyData = Object.keys(monthlyCounts).sort().map(key => ({
      month: key,
      count: monthlyCounts[key]
    }));

    const topCompanies = Object.entries(companyTotals)
      .map(([name, amount]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Top 10

    const topOffenses = Object.entries(offenseTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5

    return {
      stats: {
        totalCompounds: data.length,
        totalAmount,
        totalPaid,
        outstanding
      },
      chartData: {
        monthly: monthlyData,
        companies: topCompanies,
        offenses: topOffenses
      }
    };
  }, [data]);

  const formatCurrency = (amount) => `RM ${(amount/1000).toFixed(1)}k`;

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)' }}>
          <LayoutDashboard size={28} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Kompaun<span style={{ color: 'var(--accent-primary)' }}>Analytics</span></h1>
        </header>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileUploader onDataLoaded={setData} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LayoutDashboard size={24} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Kompaun<span style={{ color: 'var(--accent-primary)' }}>Analytics</span></h1>
        </div>
        <button className="button-secondary" onClick={() => setData(null)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Load New File
        </button>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <StatCard 
            title="Total Compounds" 
            value={stats.totalCompounds.toLocaleString()} 
            icon={FileText} 
            colorClass="accent-primary"
          />
          <StatCard 
            title="Total Amount" 
            value={formatCurrency(stats.totalAmount)} 
            icon={DollarSign} 
            colorClass="accent-warning"
          />
          <StatCard 
            title="Total Paid" 
            value={formatCurrency(stats.totalPaid)} 
            icon={Activity} 
            colorClass="accent-success"
          />
          <StatCard 
            title="Outstanding Balance" 
            value={formatCurrency(stats.outstanding)} 
            icon={AlertCircle} 
            colorClass="accent-danger"
          />
        </div>

        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', marginBottom: '2rem', animationDelay: '0.1s' }}>
          <div style={{ gridColumn: 'span 12' }}>
            <MonthlyTrendChart data={chartData.monthly} />
          </div>
          <div style={{ gridColumn: 'span 7' }}>
            <TopCompaniesChart data={chartData.companies} />
          </div>
          <div style={{ gridColumn: 'span 5' }}>
            <OffenseSectionChart data={chartData.offenses} />
          </div>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <DataTable data={data} />
        </div>
      </main>
    </div>
  );
}
