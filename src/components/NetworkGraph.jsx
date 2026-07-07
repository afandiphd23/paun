import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function NetworkGraph({ data }) {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const containerRef = useRef();
  
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);

  // Precompute neighbors for faster hover effects
  const neighbors = useMemo(() => {
    const map = new Map();
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (!map.has(sourceId)) map.set(sourceId, new Set());
      if (!map.has(targetId)) map.set(targetId, new Set());
      
      map.get(sourceId).add(targetId);
      map.get(targetId).add(sourceId);
    });
    return map;
  }, [data]);

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
    if (fgRef.current && data.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current.zoomToFit(800, 50);
      }, 800);
    }
  }, [data]);

  const handleNodeHover = node => {
    setHoverNode(node || null);

    const newHighlightNodes = new Set();
    const newHighlightLinks = new Set();

    if (node) {
      newHighlightNodes.add(node.id);
      
      // Highlight neighbors
      const nodeNeighbors = neighbors.get(node.id) || new Set();
      nodeNeighbors.forEach(neighborId => newHighlightNodes.add(neighborId));

      // Highlight links
      data.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === node.id || targetId === node.id) {
          newHighlightLinks.add(link);
        }
      });
    }

    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
  };

  const handleNodeClick = node => {
    // Center/zoom on node
    fgRef.current.centerAt(node.x, node.y, 1000);
    fgRef.current.zoom(8, 2000);
  };

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const mutedColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '600px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>Company & Offense Analytics Network</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Interactive map showing connections between top companies and offenses. <strong>Hover</strong> to trace connections. <strong>Click</strong> to zoom.
      </p>
      
      {/* Legend */}
      <div style={{ position: 'absolute', top: '5.5rem', right: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.6)', padding: '0.75rem', borderRadius: 'var(--radius-md)', zIndex: 10, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }}></div>
          <span style={{ fontSize: '0.875rem', color: '#f8fafc' }}>Company</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></div>
          <span style={{ fontSize: '0.875rem', color: '#f8fafc' }}>Offense Section</span>
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)' }}>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          nodeLabel="name"
          nodeRelSize={6}
          linkColor={link => highlightLinks.has(link) ? (isLight ? '#333' : '#fff') : mutedColor}
          linkWidth={link => highlightLinks.has(link) ? 3 : 1}
          linkDirectionalParticles={link => highlightLinks.has(link) ? 4 : 0}
          linkDirectionalParticleWidth={4}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onNodeDragEnd={node => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          backgroundColor="transparent"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isHovered = node === hoverNode;
            const isHighlighted = highlightNodes.has(node.id);
            const isDimmed = hoverNode && !isHighlighted;
            
            const label = node.name.length > 25 && !isHovered ? node.name.substring(0, 25) + '...' : node.name;
            const fontSize = node.group === 1 ? 14 / globalScale : 11 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            const color = node.group === 1 ? '#ef4444' : '#3b82f6';
            
            // Draw circle with glow
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fillStyle = isDimmed ? 'rgba(150,150,150,0.2)' : color;
            
            if (isHighlighted || isHovered) {
              ctx.shadowColor = color;
              ctx.shadowBlur = 15;
            } else {
              ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow

            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (isDimmed) {
              ctx.fillStyle = 'rgba(150,150,150,0.2)';
            } else if (isHovered) {
              ctx.fillStyle = isLight ? '#000' : '#fff';
            } else {
              ctx.fillStyle = textColor;
            }
            
            ctx.fillText(label, node.x, node.y + node.val + (8 / globalScale));
          }}
        />
      </div>
    </div>
  );
}
