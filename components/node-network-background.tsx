'use client'

import React from 'react'

interface NodeNetworkBackgroundProps {
  size?: number
  className?: string
  showCenterLogo?: boolean
  centerLogoUrl?: string
}

export default function NodeNetworkBackground({
  size = 260,
  className = '',
  showCenterLogo = false,
  centerLogoUrl = '/pi/pinetwork.png'
}: NodeNetworkBackgroundProps) {
  // Reduced node count for better performance
  const nodes = React.useMemo(() => {
    const nodeCount = 8
    const centerX = size / 2
    const centerY = size / 2
    const radius = size * 0.35
    
    return Array.from({ length: nodeCount }, (_, i) => {
      const angle = (i / nodeCount) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      return { x, y, id: i }
    })
  }, [size])

  // Reduced connections - only connect to nearest neighbors
  const connections = React.useMemo(() => {
    const conns: Array<{ from: number; to: number; delay: number }> = []
    for (let i = 0; i < nodes.length; i++) {
      // Only connect to next 2 nodes (reduced from 3-4)
      for (let j = 1; j <= 2; j++) {
        const nextIndex = (i + j) % nodes.length
        conns.push({
          from: i,
          to: nextIndex,
          delay: i * 0.3 + j * 0.15
        })
      }
    }
    return conns
  }, [nodes])

  return (
    <div
      className={`relative node-network-container ${className}`}
      style={{ 
        width: size, 
        height: size,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform'
      }}
    >
      {/* Dark purple and blue gradient background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(88, 28, 135, 0.25) 0%, rgba(30, 27, 75, 0.4) 40%, rgba(15, 23, 42, 0.7) 70%, rgba(7, 5, 20, 0.9) 100%)',
        }}
      />

      {/* Simplified SVG - no complex filters */}
      <svg
        className="absolute inset-0 node-network-svg"
        width={size}
        height={size}
        style={{ 
          overflow: 'visible',
          transformOrigin: 'center center',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform'
        }}
      >
        {/* Connection lines - simplified, no animated gradients */}
        {connections.map((conn, idx) => {
          const fromNode = nodes[conn.from]
          const toNode = nodes[conn.to]
          return (
            <line
              key={`${conn.from}-${conn.to}-${idx}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="rgba(147, 51, 234, 0.3)"
              strokeWidth="1"
              className="node-network-line"
              style={{
                animationDelay: `${conn.delay}s`,
              }}
            />
          )
        })}

        {/* Simplified nodes - fewer layers, no filters */}
        {nodes.map((node) => (
          <g key={node.id} className="node-network-node-group">
            {/* Main node only - removed outer glow for performance */}
            <circle
              cx={node.x}
              cy={node.y}
              r="4"
              fill="rgba(192, 132, 252, 0.9)"
              className="node-network-main"
              style={{
                animationDelay: `${node.id * 0.2}s`,
              }}
            />
            {/* Inner core */}
            <circle
              cx={node.x}
              cy={node.y}
              r="2"
              fill="rgba(221, 214, 254, 1)"
              className="node-network-core"
              style={{
                animationDelay: `${node.id * 0.15}s`,
              }}
            />
          </g>
        ))}
      </svg>

      {/* Center logo if needed */}
      {showCenterLogo && (
        <img
          src={centerLogoUrl}
          alt="Center logo"
          className="absolute inset-0 m-auto rounded-full object-contain z-10"
          style={{
            width: `${Math.min(size * 0.27, 70)}px`,
            height: `${Math.min(size * 0.27, 70)}px`,
            imageRendering: 'auto',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translate3d(0, 0, 0)',
          }}
        />
      )}
    </div>
  )
}
