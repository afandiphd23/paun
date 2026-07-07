import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function NetworkGraph({ data }) {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const containerRef = useRef();

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

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '600px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>Company & Offense Analytics Network</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Interactive map showing connections between the top companies and their offenses. Scroll to zoom, drag to pan.
      </p>
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-color)' }}>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          nodeLabel="name"
          nodeRelSize={6}
          linkColor={() => 'rgba(150, 150, 150, 0.3)'}
          linkWidth={1.5}
          backgroundColor="transparent"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name.length > 25 ? node.name.substring(0, 25) + '...' : node.name;
            const fontSize = node.group === 1 ? 14 / globalScale : 11 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Draw circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.group === 1 ? '#ef4444' : '#3b82f6'; // Red for Offense, Blue for Company
            ctx.fill();

            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Simple logic for light/dark mode text color based on document bg
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
            ctx.fillText(label, node.x, node.y + node.val + (6 / globalScale));
          }}
        />
      </div>
    </div>
  );
}
