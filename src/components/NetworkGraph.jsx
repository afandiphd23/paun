import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, ZoomIn, ZoomOut, Maximize, Activity, X, Building2, Layers, FileText, DollarSign, AlertCircle } from 'lucide-react';

const OFFENSE_PALETTE = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#f97316', '#14b8a6', '#d946ef', '#84cc16'];

const fmt = (v) => `RM ${Number(v || 0).toLocaleString('en-MY', { maximumFractionDigits: 2 })}`;

// force-graph mutates link.source/target into node object refs after layout;
// resolve ids defensively so lookups stay stable.
const idStr = (n) => (typeof n === 'object' && n !== null ? n.id : n);

export default function NetworkGraph({ data }) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const [hoverNode, setHoverNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);

  const [maxCompanies, setMaxCompanies] = useState(20);
  const [minCases, setMinCases] = useState(1);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [sizeBy, setSizeBy] = useState('cases');
  const [layoutMode, setLayoutMode] = useState('force');
  const [search, setSearch] = useState('');

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const mutedColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
  const panelBg = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.88)';
  const accentBg = isLight ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.3)';
  const controlBg = isLight ? 'rgba(255,255,255,0.88)' : 'rgba(15,23,42,0.82)';
  const controlBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';

  // Stable color per offense section across all slices
  const offenseColorMap = useMemo(() => {
    const offenseNodes = data.all.nodes.filter(n => n.group === 1).sort((a, b) => b.count - a.count);
    const map = new Map();
    offenseNodes.forEach((n, i) => map.set(n.id, OFFENSE_PALETTE[i % OFFENSE_PALETTE.length]));
    return map;
  }, [data]);

  // Year-chip list: All + detected years
  const yearOptions = useMemo(() => ['all', ...data.years.map(String)], [data.years]);

  // Base graph by year
  const baseGraph = useMemo(() => {
    if (selectedYear === 'all') return data.all;
    const key = Number(selectedYear) || selectedYear;
    return data.byYear[key] || data.all;
  }, [data, selectedYear]);

  // Apply company filters + top-N slice
  const graph = useMemo(() => {
    let companies = baseGraph.nodes.filter(n => n.group === 2);
    if (minCases > 1) companies = companies.filter(n => n.count >= minCases);
    if (unpaidOnly) companies = companies.filter(n => n.outstanding > 0);
    companies.sort((a, b) => b.totalAmount - a.totalAmount);
    companies = companies.slice(0, maxCompanies);

    const companyIds = new Set(companies.map(n => n.id));
    const links = baseGraph.links.filter(l => companyIds.has(l.source) && !companyIds.has(l.target));
    const offenseIds = new Set(links.map(l => l.target));
    const offenses = baseGraph.nodes.filter(n => n.group === 1 && offenseIds.has(n.id));

    return { nodes: [...companies, ...offenses], links };
  }, [baseGraph, maxCompanies, minCases, unpaidOnly]);

  // Company -> connected offenses, offense -> connected companies (with link stats)
  const linkConnections = useMemo(() => {
    const byCompany = new Map();
    const byOffense = new Map();
    graph.links.forEach(link => {
      const sourceId = idStr(link.source);
      const targetId = idStr(link.target);
      if (!byCompany.has(sourceId)) byCompany.set(sourceId, []);
      if (!byOffense.has(targetId)) byOffense.set(targetId, []);
      byCompany.get(sourceId).push({ other: data.all.nodes.find(n => n.id === targetId), link });
      byOffense.get(targetId).push({ other: data.all.nodes.find(n => n.id === sourceId), link });
    });
    return { byCompany, byOffense };
  }, [graph, data]);

  // Precompute neighbors for faster hover effects
  const neighbors = useMemo(() => {
    const map = new Map();
    graph.links.forEach(link => {
      const sourceId = idStr(link.source);
      const targetId = idStr(link.target);
      if (!map.has(sourceId)) map.set(sourceId, new Set());
      if (!map.has(targetId)) map.set(targetId, new Set());
      map.get(sourceId).add(targetId);
      map.get(targetId).add(sourceId);
    });
    return map;
  }, [graph]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      setTimeout(() => {
        try {
          fgRef.current.zoomToFit(700, 60);
        } catch {}
      }, 400);
    }
  }, [graph]);

  // Ring layout
  useEffect(() => {
    if (!fgRef.current || layoutMode !== 'ring' || !graph.nodes.length) return;
    const { nodes } = fgRef.current.graphData();
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const R = Math.min(cx, cy) * 0.82;
    const companies = nodes.filter(n => n.group === 2);
    const offenses = nodes.filter(n => n.group === 1);

    companies.forEach((n, i) => {
      const angle = (i / Math.max(companies.length, 1)) * Math.PI * 2 - Math.PI / 2;
      n.fx = cx + R * Math.cos(angle);
      n.fy = cy + R * Math.sin(angle);
      n.x = n.fx;
      n.y = n.fy;
    });
    offenses.forEach(n => {
      n.fx = cx;
      n.fy = cy;
      n.x = cx;
      n.y = cy;
    });
  }, [layoutMode, graph, dimensions]);

  useEffect(() => {
    if (!fgRef.current || layoutMode !== 'force') return;
    fgRef.current.graphData().nodes.forEach(n => {
      n.fx = undefined;
      n.fy = undefined;
    });
    fgRef.current.d3ReheatSimulation();
  }, [layoutMode]);

  // Derive which nodes/links stay bright during hover / selection / search.
  // Link hover is handled separately (star topology makes hub-neighbor expansion meaningless).
  const { hotSet, activeIds } = useMemo(() => {
    const hot = new Set();
    if (hoverNode) hot.add(hoverNode.id);
    if (selectedNode) hot.add(selectedNode.id);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      graph.nodes.forEach(n => {
        if (n.name.toLowerCase().includes(q)) hot.add(n.id);
      });
    }

    const active = new Set(hot);
    hot.forEach(id => {
      const nbs = neighbors.get(id);
      if (nbs) nbs.forEach(n => active.add(n));
    });

    return { hotSet: hot, activeIds: active };
  }, [hoverNode, selectedNode, search, graph, neighbors]);

  useEffect(() => {
    if (selectedNode && !graph.nodes.some(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [graph, selectedNode]);

  const handleNodeHover = node => {
    setHoverNode(node || null);
  };

  const handleNodeClick = node => {
    setSelectedNode(prev => (prev && prev.id === node.id ? null : node));
  };

  const isDimmedNode = node => activeIds.size > 0 && !activeIds.has(node.id);

  const isDimmedLink = link => {
    const srcId = idStr(link.source);
    const tgtId = idStr(link.target);
    if (activeIds.size === 0) return false;
    return !(activeIds.has(srcId) && activeIds.has(tgtId));
  };

  const isHotLink = link => {
    const srcId = idStr(link.source);
    const tgtId = idStr(link.target);
    return hotSet.has(srcId) || hotSet.has(tgtId) || link === hoveredLink;
  };

  const nodeRadius = node => {
    const raw = sizeBy === 'amount' ? node.totalAmount : node.count;
    if (sizeBy === 'amount') {
      return Math.min(14, 5 + Math.log1p(raw) * 0.8);
    }
    return node.val;
  };

  const linkWidth = link => {
    const width = 1 + Math.min(6, Math.log2((link.count || 1) + 1)) * 0.9;
    return isDimmedLink(link)
      ? width * 0.5
      : width * (isHotLink(link) ? 2.4 : 1.3);
  };

  const particlesOnLink = link => {
    const count = link.count || 1;
    if (isDimmedLink(link)) return 0;
    return Math.min(6, Math.round(Math.log2(count + 1))) * (isHotLink(link) ? 1.6 : 0.35);
  };

  const handleZoomIn = () => {
    if (fgRef.current) fgRef.current.zoom((fgRef.current.zoom() || 1) * 1.4);
  };

  const handleZoomOut = () => {
    if (fgRef.current) fgRef.current.zoom((fgRef.current.zoom() || 1) / 1.4);
  };

  const handleFit = () => {
    if (fgRef.current) {
      try {
        fgRef.current.zoomToFit(600, 60);
      } catch {}
    }
  };

  const handleReheat = () => {
    if (fgRef.current) fgRef.current.d3ReheatSimulation();
  };

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return null;
    const list = selectedNode.group === 2
      ? (linkConnections.byCompany.get(selectedNode.id) || [])
      : (linkConnections.byOffense.get(selectedNode.id) || []);
    return list
      .map(({ other, link }) => ({ name: other?.name || other, count: link.count, totalAmount: link.totalAmount, outstanding: link.outstanding }))
      .sort((a, b) => b.count - a.count);
  }, [selectedNode, linkConnections]);

  const pill = (label, active, onClick) => (
    <button key={label} onClick={onClick} style={{
      fontSize: '0.72rem', padding: '0.22rem 0.55rem', borderRadius: '999px',
      border: `1px solid ${active ? 'var(--accent-primary)' : controlBorder}`,
      background: active ? accentBg : 'transparent',
      color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
      cursor: 'pointer', whiteSpace: 'nowrap'
    }}>
      {label}
    </button>
  );

  const legend = (
    <div style={{
      position: 'absolute', top: '5.5rem', right: '1rem', zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
      background: 'rgba(15,23,42,0.72)', padding: '0.75rem',
      borderRadius: 'var(--radius-md)', backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }}></div>
        <span style={{ fontSize: '0.8rem', color: '#f8fafc' }}>Company</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #06b6d4, #10b981)' }}></div>
        <span style={{ fontSize: '0.8rem', color: '#f8fafc' }}>Offense Section</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.5rem' }}>
        <div style={{ width: '22px', height: '3px', background: 'rgba(255,255,255,0.7)' }}></div>
        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>thicker = more cases</span>
      </div>
    </div>
  );

  const controls = (
    <div style={{
      position: 'absolute', top: '5.5rem', left: '1rem', zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '250px',
      maxHeight: `${dimensions.height - 70}px`, overflowY: 'auto', paddingRight: '0.25rem'
    }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search company or offense..."
          style={{
            width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', fontSize: '0.8rem',
            background: controlBg, color: isLight ? '#0f172a' : '#f8fafc',
            border: `1px solid ${controlBorder}`, borderRadius: 'var(--radius-sm)'
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Top N */}
      <div style={{ background: controlBg, padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${controlBorder}`, color: 'var(--text-primary)' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Top companies: <strong>{maxCompanies}</strong>
        </label>
        <input
          type="range"
          min={5}
          max={50}
          value={maxCompanies}
          onChange={e => setMaxCompanies(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#3b82f6' }}
        />
      </div>

      {/* Year chips */}
      <div style={{ background: controlBg, padding: '0.55rem 0.6rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${controlBorder}` }}>
        <label style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Year</label>
        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          {yearOptions.map(y => pill(y === 'all' ? 'All' : y, selectedYear === y, () => setSelectedYear(y)))}
        </div>
      </div>

      {/* Size by */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1, background: controlBg, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${controlBorder}` }}>
          <label style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>Size by</label>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {pill('Cases', sizeBy === 'cases', () => setSizeBy('cases'))}
            {pill('Fines', sizeBy === 'amount', () => setSizeBy('amount'))}
          </div>
        </div>
        <div style={{ flex: 1, background: controlBg, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${controlBorder}` }}>
          <label style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>Layout</label>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {pill('Force', layoutMode === 'force', () => setLayoutMode('force'))}
            {pill('Ring', layoutMode === 'ring', () => setLayoutMode('ring'))}
          </div>
        </div>
      </div>

      {/* Min cases */}
      <div style={{ background: controlBg, padding: '0.55rem 0.6rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${controlBorder}` }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Min cases: <strong>{minCases}</strong>
        </label>
        <input
          type="range"
          min={1}
          max={30}
          value={minCases}
          onChange={e => setMinCases(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#3b82f6' }}
        />
      </div>

      {/* Unpaid only */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem 0' }}>
        <input
          type="checkbox"
          checked={unpaidOnly}
          onChange={e => setUnpaidOnly(e.target.checked)}
          style={{ accentColor: '#3b82f6', width: '14px', height: '14px' }}
        />
        Unpaid only
      </label>
    </div>
  );

  const statsBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
      <span><strong style={{ color: 'var(--text-primary)' }}>{graph.nodes.length}</strong> nodes</span>
      <span><strong style={{ color: 'var(--text-primary)' }}>{graph.links.length}</strong> connections</span>
      <span className="no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
        <Activity size={12} /> drag node to pin · click for details · scroll to zoom
      </span>
    </div>
  );

  const detailPanel = selectedNode && (
    <div style={{
      position: 'absolute', left: '1rem', bottom: '1rem', zIndex: 20,
      width: '300px', maxHeight: '60%', overflowY: 'auto',
      background: panelBg, backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)', padding: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          {selectedNode.group === 2 ? <Building2 size={16} color="#3b82f6" /> : <Layers size={16} color={(offenseColorMap.get(selectedNode.id) || '#8b5cf6')} />}
          <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: selectedNode.group === 2 ? '#3b82f6' : (offenseColorMap.get(selectedNode.id) || '#8b5cf6') }}>
            {selectedNode.group === 2 ? 'Company' : 'Offense Section'}
          </span>
        </div>
        <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
      <h4 style={{ fontSize: '0.9rem', lineHeight: 1.3, marginBottom: '0.75rem', wordBreak: 'break-word' }}>{selectedNode.name}</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <FileText size={13} /> Cases <strong style={{ color: 'var(--text-primary)' }}>{selectedNode.count}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <DollarSign size={13} /> Fines <strong style={{ color: 'var(--text-primary)' }}>{fmt(selectedNode.totalAmount)}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Activity size={13} /> Paid <strong style={{ color: 'var(--text-primary)' }}>{fmt(selectedNode.totalPaid)}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <AlertCircle size={13} /> Outstanding <strong style={{ color: 'var(--accent-danger)' }}>{fmt(selectedNode.outstanding)}</strong>
        </div>
      </div>

      {selectedNode.companiesAffected !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          <Building2 size={13} /> Companies affected <strong style={{ color: 'var(--text-primary)' }}>{selectedNode.companiesAffected}</strong>
        </div>
      )}

      {selectedConnections && selectedConnections.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            {selectedNode.group === 2 ? 'Connected offense sections' : 'Top companies'}
          </p>
          {selectedConnections.slice(0, 8).map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '175px' }}>{c.name}</span>
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{c.count} cases · {fmt(c.totalAmount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>Company &amp; Offense Analytics Network</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
        Bipartite map of companies against offense sections. <strong>Line weight</strong> = record count between the pair. <strong>Hover</strong> links to highlight endpoints, <strong>click</strong> a node for a full breakdown.
      </p>

      {statsBar}

      <div ref={containerRef} style={{ position: 'relative', height: '560px', overflow: 'hidden', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)' }}>
        {legend}
        {controls}

        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graph}
          nodeLabel="name"
          nodeRelSize={6}
          linkColor={link => (isDimmedLink(link) ? mutedColor : (isHotLink(link) ? (isLight ? '#333' : '#fff') : 'rgba(148,163,184,0.55)'))}
          linkWidth={linkWidth}
          linkDirectionalParticles={particlesOnLink}
          linkDirectionalParticleWidth={3}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onNodeDragEnd={node => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          onLinkHover={link => setHoveredLink(link || null)}
          onBackgroundClick={() => setSelectedNode(null)}
          backgroundColor="transparent"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isHovered = node === hoverNode;
            const isSelected = selectedNode && selectedNode.id === node.id;
            const isLinkEndpoint = hoveredLink && (idStr(hoveredLink.source) === node.id || idStr(hoveredLink.target) === node.id);
            const isDimmed = isDimmedNode(node);
            const r = nodeRadius(node);

            const label = node.name.length > 25 && !isHovered ? node.name.substring(0, 25) + '...' : node.name;
            const fontSize = node.group === 1 ? 13 / globalScale : 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;

            let color;
            if (node.group === 1) {
              color = offenseColorMap.get(node.id) || '#8b5cf6';
            } else {
              color = node.outstanding > 0 ? '#3b82f6' : '#64748b';
            }

            // Ring for selected node / hovered link endpoint
            if (isSelected || isLinkEndpoint) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, r + 4 / globalScale, 0, 2 * Math.PI);
              ctx.strokeStyle = isLinkEndpoint ? 'rgba(34,211,238,0.9)' : 'rgba(255,255,255,0.85)';
              ctx.lineWidth = 1.5 / globalScale;
              ctx.stroke();
            }

            // Draw circle with glow
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
            ctx.fillStyle = isDimmed ? 'rgba(150,150,150,0.18)' : color;

            if (isHovered || isSelected) {
              ctx.shadowColor = color;
              ctx.shadowBlur = 18;
            } else {
              ctx.shadowBlur = 0;
            }

            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isDimmed) {
              ctx.fillStyle = 'rgba(150,150,150,0.18)';
            } else if (isHovered || isSelected) {
              ctx.fillStyle = isLight ? '#000' : '#fff';
            } else {
              ctx.fillStyle = textColor;
            }

            ctx.fillText(label, node.x, node.y + r + (8 / globalScale));

            // Hover badge: second line
            if (isHovered) {
              const subSize = 10 / globalScale;
              ctx.font = `${subSize}px Sans-Serif`;
              ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
              const sub = `${node.count} cases · ${fmt(node.totalAmount)}`;
              ctx.fillText(sub, node.x, node.y + r + (8 + 11) / globalScale);
            }
          }}
        />

        {/* Zoom / fit controls */}
        <div style={{
          position: 'absolute', right: '1rem', bottom: '1rem', zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: '0.4rem',
          background: 'rgba(15,23,42,0.72)', padding: '0.4rem',
          borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button onClick={handleZoomIn} title="Zoom in" style={zoomBtnStyle}>
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut} title="Zoom out" style={zoomBtnStyle}>
            <ZoomOut size={16} />
          </button>
          <button onClick={handleFit} title="Fit view" style={zoomBtnStyle}>
            <Maximize size={16} />
          </button>
          <button onClick={handleReheat} title="Resume simulation" style={zoomBtnStyle}>
            <Activity size={16} />
          </button>
        </div>

        {detailPanel}
      </div>
    </div>
  );
}

const zoomBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', color: '#f8fafc', cursor: 'pointer',
  background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)'
};
