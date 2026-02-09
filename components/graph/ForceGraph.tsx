'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, Album } from '@/types';
import { parseGenres, getGenreColor } from '@/lib/genres';
import { GraphLegend } from './GraphLegend';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ForceGraphProps {
  albums: Album[];
  onNodeClick?: (album: Album) => void;
  highlightedAlbumId?: number | null;
}

export function ForceGraph({ albums, onNodeClick, highlightedAlbumId }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);
  const nodeGroupsRef = useRef<any>(null);
  const linksRef = useRef<any>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const { width, height } = dimensions;

  // 准备数据 - 初始位置靠近中心
  const { nodes, links, genres } = useMemo(() => {
    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];
    const genreSet = new Set<string>();

    const centerX = width / 2;
    const centerY = height / 2;

    albums.forEach((album, i) => {
      const albumGenres = parseGenres(album.genre);
      
      // 专辑节点：在中心附近随机分布，半径较小
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 80; // 0-80px 范围内
      
      graphNodes.push({
        id: `album-${album.id}`,
        type: 'album',
        artist: album.artist,
        genre: albumGenres,
        coverUrl: album.coverUrl,
        r: 18,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });

      albumGenres.forEach((genre) => {
        genreSet.add(genre);
        graphLinks.push({
          source: `album-${album.id}`,
          target: `genre-${genre}`,
        });
      });
    });

    // 流派节点：放在中心区域
    Array.from(genreSet).forEach((genre, i) => {
      const count = genreSet.size;
      // 在中心小范围内均匀分布
      const angle = (i / count) * Math.PI * 2;
      const radius = 30 + (i % 3) * 15; // 30-60px 范围内
      
      graphNodes.push({
        id: `genre-${genre}`,
        type: 'genre',
        genre: [genre],
        color: getGenreColor(genre),
        r: 12,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    return { nodes: graphNodes, links: graphLinks, genres: Array.from(genreSet) };
  }, [albums, width, height]);

  // 初始化
  useEffect(() => {
    if (!svgRef.current || albums.length === 0 || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    // 网格背景
    const gridGroup = svg.append('g').style('opacity', 0.05);
    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      gridGroup.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', height).attr('stroke', 'var(--text-primary)');
    }
    for (let y = 0; y <= height; y += gridSize) {
      gridGroup.append('line').attr('x1', 0).attr('y1', y).attr('x2', width).attr('y2', y).attr('stroke', 'var(--text-primary)');
    }

    // 主容器
    const g = svg.append('g');

    // 缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    const centerX = width / 2;
    const centerY = height / 2;

    // 力仿真
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(60)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(-200)
        .distanceMax(Math.min(width, height) * 0.4)
      )
      .force('center', d3.forceCenter(centerX, centerY).strength(0.15)) // 更强的中心引力
      .force('collision', d3.forceCollide<GraphNode>()
        .radius(d => (d.r || 18) + 5)
        .strength(0.8)
      )
      // 边界力
      .force('boundary', () => {
        const margin = 50;
        nodes.forEach(node => {
          const r = node.r || 18;
          if (node.x! < margin + r) node.vx! += 0.8;
          if (node.x! > width - margin - r) node.vx! -= 0.8;
          if (node.y! < margin + r) node.vy! += 0.8;
          if (node.y! > height - margin - r) node.vy! -= 0.8;
        });
      })
      .velocityDecay(0.4)
      .alpha(1) // 从较高 alpha 开始，让节点从中心慢慢展开
      .alphaDecay(0.02)
      .alphaMin(0.001);

    simulationRef.current = simulation;

    // 连线
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(100, 180, 255, 0.5)')
      .attr('stroke-width', 1.5);

    linksRef.current = link;

    // 节点组
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', d => d.type === 'album' ? 'pointer' : 'default');

    nodeGroupsRef.current = nodeGroup;

    // 发光层
    nodeGroup.append('circle')
      .attr('r', d => (d.r || 18) + 3)
      .attr('fill', d => d.type === 'genre' ? (d.color || '#888') : 'transparent')
      .attr('opacity', d => d.type === 'genre' ? 0.2 : 0)
      .style('filter', 'blur(4px)');

    // 主圆
    nodeGroup.append('circle')
      .attr('class', 'main-circle')
      .attr('r', d => d.r || 18)
      .attr('fill', d => d.type === 'genre' ? (d.color || '#888') : '#252a3d')
      .attr('stroke', d => d.type === 'genre' ? (d.color || '#888') : 'rgba(150, 180, 220, 0.6)')
      .attr('stroke-width', d => d.type === 'album' ? 2 : 0)
      .style('filter', d => d.type === 'genre' ? `drop-shadow(0 0 8px ${d.color || '#888'})` : 'drop-shadow(0 0 4px rgba(100,150,255,0.3))');

    // 封面
    nodeGroup.filter(d => d.type === 'album' && !!d.coverUrl)
      .append('image')
      .attr('xlink:href', d => d.coverUrl || '')
      .attr('x', d => -(d.r || 18))
      .attr('y', d => -(d.r || 18))
      .attr('width', d => (d.r || 18) * 2)
      .attr('height', d => (d.r || 18) * 2)
      .attr('clip-path', d => `circle(${(d.r || 18)}px)`);

    // 标签
    nodeGroup.append('text')
      .text(d => d.type === 'genre' ? d.id.replace('genre-', '') : '')
      .attr('x', d => (d.r || 18) + 6)
      .attr('y', 3)
      .attr('font-size', '10px')
      .attr('fill', 'var(--text-primary)')
      .style('text-shadow', '0 1px 4px rgba(0,0,0,0.8)');

    // 拖拽节点
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        const r = d.r || 18;
        const margin = 10;
        d.fx = Math.max(margin + r, Math.min(width - margin - r, event.x));
        d.fy = Math.max(margin + r, Math.min(height - margin - r, event.y));
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag as any);

    // 交互
    nodeGroup
      .on('mouseenter', function(event, d) {
        d3.select(this).select('.main-circle').transition().duration(150).attr('r', (d.r || 18) + 2);
        link.transition().duration(150)
          .attr('stroke', (l: any) => {
            const sid = l.source.id || l.source;
            const tid = l.target.id || l.target;
            return (sid === d.id || tid === d.id) ? 'rgba(100, 230, 255, 0.9)' : 'rgba(100, 180, 255, 0.2)';
          })
          .attr('stroke-width', (l: any) => {
            const sid = l.source.id || l.source;
            const tid = l.target.id || l.target;
            return (sid === d.id || tid === d.id) ? 2.5 : 1;
          });
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('.main-circle').transition().duration(200).attr('r', d.r || 18);
        link.transition().duration(200).attr('stroke', 'rgba(100, 180, 255, 0.5)').attr('stroke-width', 1.5);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.type === 'album') {
          const albumId = parseInt(d.id.replace('album-', ''));
          const album = albums.find(a => a.id === albumId);
          if (album && onNodeClick) onNodeClick(album);
        }
      });

    // 更新
    simulation.on('tick', () => {
      const margin = 10;
      nodes.forEach(d => {
        const r = d.r || 18;
        d.x = Math.max(margin + r, Math.min(width - margin - r, d.x!));
        d.y = Math.max(margin + r, Math.min(height - margin - r, d.y!));
      });

      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // 初始缩放
    svg.call(zoom.transform, d3.zoomIdentity);

    return () => {
      simulation.stop();
    };
  }, [albums, width, height]);

  // 高亮
  useEffect(() => {
    if (!nodeGroupsRef.current || !highlightedAlbumId) return;

    const nodeId = `album-${highlightedAlbumId}`;
    
    nodeGroupsRef.current.select('.main-circle').transition().duration(300)
      .attr('stroke', (d: any) => d.id === nodeId ? '#00d4aa' : 'rgba(150, 180, 220, 0.6)')
      .attr('stroke-width', (d: any) => d.id === nodeId ? 3 : 2)
      .style('filter', (d: any) => d.id === nodeId ? 'drop-shadow(0 0 12px #00d4aa)' : (d.type === 'genre' ? `drop-shadow(0 0 8px ${d.color})` : 'drop-shadow(0 0 4px rgba(100,150,255,0.3))'));

    linksRef.current?.transition().duration(300)
      .attr('stroke', (d: any) => {
        const sid = d.source.id || d.source;
        const tid = d.target.id || d.target;
        return (sid === nodeId || tid === nodeId) ? '#00d4aa' : 'rgba(100, 180, 255, 0.5)';
      })
      .attr('stroke-width', (d: any) => {
        const sid = d.source.id || d.source;
        const tid = d.target.id || d.target;
        return (sid === nodeId || tid === nodeId) ? 3 : 1.5;
      });
  }, [highlightedAlbumId]);

  // 缩放控制
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  };

  const handleReset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <div className="absolute inset-0 rounded-2xl overflow-hidden glass-panel">
        <svg ref={svgRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>

      {/* 缩放按钮 */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <button onClick={handleZoomIn} className="p-2 rounded-lg bg-background-elevated/80 hover:bg-background-elevated text-foreground-primary transition-colors shadow-lg">
          <ZoomIn size={18} />
        </button>
        <button onClick={handleZoomOut} className="p-2 rounded-lg bg-background-elevated/80 hover:bg-background-elevated text-foreground-primary transition-colors shadow-lg">
          <ZoomOut size={18} />
        </button>
        <button onClick={handleReset} className="p-2 rounded-lg bg-background-elevated/80 hover:bg-background-elevated text-foreground-primary transition-colors shadow-lg">
          <Maximize size={18} />
        </button>
      </div>

      {/* 图例 */}
      <div className="absolute top-4 left-4">
        <GraphLegend genres={genres} />
      </div>
    </div>
  );
}
