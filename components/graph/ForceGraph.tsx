'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, Album, CollectionItemType } from '@/types';
import { parseGenres, getGenreColor } from '@/lib/genres';
import { GraphLegend } from './GraphLegend';
import { ZoomIn, ZoomOut, Maximize, RefreshCw, Loader2, Home } from 'lucide-react';

interface ForceGraphProps {
  albums: Album[];
  onNodeClick?: (item: Album) => void;
  highlightedItemId?: number | null;
  highlightedItemType?: CollectionItemType | null;
  onReloadCovers?: () => void;
  isReloading?: boolean;
}

export function ForceGraph({
  albums,
  onNodeClick,
  highlightedItemId,
  highlightedItemType,
  onReloadCovers,
  isReloading = false
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const nodeGroupsRef = useRef<any>(null);
  const linksRef = useRef<any>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  const { width, height } = dimensions;

  // 同步外部高亮状态
  useEffect(() => {
    if (highlightedItemType === 'album' && highlightedItemId) {
      setSelectedAlbumId(highlightedItemId);
      // 高亮时移动视口到该节点
      const albumNodeId = `album-${highlightedItemId}`;
      const node = nodes.find(n => n.id === albumNodeId);
      if (node && zoomRef.current && svgRef.current) {
        const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.2)
          .translate(-node.x!, -node.y!);
        d3.select(svgRef.current)
          .transition().duration(500)
          .call(zoomRef.current.transform, transform);
      }
    } else if (!highlightedItemId) {
      // 取消高亮
      setSelectedAlbumId(null);
      setSelectedGenre(null);
    }
  }, [highlightedItemId, highlightedItemType, width, height]);

  // 准备数据
  const { nodes, links, genres } = useMemo(() => {
    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];
    const genreSet = new Set<string>();

    // 创建专辑节点 - 初始位置在中心附近
    albums.forEach((album, i) => {
      const albumGenres = parseGenres(album.genre);
      
      // 使用螺旋布局作为初始位置
      const angle = i * 0.5; // 每个节点间隔 0.5 弧度
      const radius = 30 + Math.sqrt(i) * 25; // 螺旋向外

      graphNodes.push({
        id: `album-${album.id}`,
        type: 'album',
        albumId: album.id,
        artist: album.artist,
        genre: albumGenres,
        coverUrl: album.coverUrl,
        r: 18,
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });

      albumGenres.forEach((genre) => {
        genreSet.add(genre);
        graphLinks.push({
          source: `album-${album.id}`,
          target: `genre-${genre}`,
        });
      });
    });

    // 流派节点 - 放在更中心的位置
    Array.from(genreSet).forEach((genre, i) => {
      const count = genreSet.size;
      const angle = (i / count) * Math.PI * 2;
      const radius = 80; // 流派节点更靠近中心

      graphNodes.push({
        id: `genre-${genre}`,
        type: 'genre',
        genre: [genre],
        color: getGenreColor(genre),
        r: 12,
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    });

    return { nodes: graphNodes, links: graphLinks, genres: Array.from(genreSet) };
  }, [albums]);

  // 初始化
  useEffect(() => {
    if (!svgRef.current || albums.length === 0 || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // 主容器 - 使用无限大的组
    const g = svg.append('g');
    gRef.current = g;

    // 缩放行为 - 允许更大的缩放范围
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // 力仿真 - Obsidian 风格的柔和力
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(100) // 更大的连接距离
        .strength(0.3) // 更弱的连接力，让节点更自由
      )
      .force('charge', d3.forceManyBody()
        .strength(-150) // 适中的排斥力
        .distanceMax(500) // 限制排斥距离，避免无限飞散
      )
      // 中心引力 - 让所有节点保持在中心附近，但不强制
      .force('center', d3.forceCenter(0, 0).strength(0.05))
      // 碰撞检测 - 防止节点重叠
      .force('collision', d3.forceCollide<GraphNode>()
        .radius(d => (d.r || 18) + 10)
        .strength(0.7)
      )
      // 向心引力 - 让远离中心的节点慢慢被拉回来
      .force('radial', d3.forceRadial(200, 0, 0)
        .strength(0.02) // 非常弱的径向力
      )
      .velocityDecay(0.3) // 更低的速度衰减，让运动更流畅
      .alpha(0.3) // 初始较低的 alpha
      .alphaDecay(0.005) // 非常慢的衰减，让布局更自然
      .alphaMin(0.001);

    simulationRef.current = simulation;

    // 连线
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'graph-link')
      .attr('stroke', 'rgba(100, 180, 255, 0.4)')
      .attr('stroke-width', 1.5);

    linksRef.current = link;

    // 节点组
    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node-group')
      .attr('data-id', d => d.id)
      .style('cursor', 'pointer');

    nodeGroupsRef.current = nodeGroup;

    // 发光层
    nodeGroup.append('circle')
      .attr('class', 'glow-circle')
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
      .attr('class', 'node-image')
      .attr('xlink:href', d => d.coverUrl || '')
      .attr('x', d => -(d.r || 18))
      .attr('y', d => -(d.r || 18))
      .attr('width', d => (d.r || 18) * 2)
      .attr('height', d => (d.r || 18) * 2)
      .attr('clip-path', d => `circle(${(d.r || 18)}px)`);

    // 标签
    nodeGroup.append('text')
      .attr('class', 'node-label')
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
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag as any);

    // 交互
    nodeGroup
      .on('mouseenter', (event, d) => setHoveredNodeId(d.id))
      .on('mouseleave', (event, d) => setHoveredNodeId(null))
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.type === 'genre') {
          const genre = d.id.replace('genre-', '');
          handleGenreClick(genre);
        } else if (d.type === 'album') {
          const albumId = parseInt(d.id.replace('album-', ''));
          handleAlbumClick(albumId);
        }
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        if (d.type === 'album') {
          const albumId = parseInt(d.id.replace('album-', ''));
          const album = albums.find(a => a.id === albumId);
          if (album && onNodeClick) onNodeClick(album);
        }
      });

    // 更新
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // 初始视图 - 自适应所有节点
    const initialTransform = calculateFitTransform(nodes, width, height);
    svg.call(zoom.transform, initialTransform);

    return () => {
      simulation.stop();
    };
  }, [albums, width, height]);

  // 计算自适应视图的 transform
  const calculateFitTransform = (nodes: GraphNode[], width: number, height: number) => {
    if (nodes.length === 0) return d3.zoomIdentity;
    
    const xExtent = d3.extent(nodes, d => d.x!);
    const yExtent = d3.extent(nodes, d => d.y!);
    
    const xRange = (xExtent[1]! - xExtent[0]!) || 100;
    const yRange = (yExtent[1]! - yExtent[0]!) || 100;
    
    const padding = 100;
    const scale = Math.min(
      (width - padding * 2) / xRange,
      (height - padding * 2) / yRange,
      1.5 // 最大缩放 1.5x
    );
    
    const centerX = (xExtent[0]! + xExtent[1]!) / 2;
    const centerY = (yExtent[0]! + yExtent[1]!) / 2;
    
    return d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);
  };

  // 处理流派点击
  const handleGenreClick = (genre: string) => {
    setSelectedGenre(prev => prev === genre ? null : genre);
    setSelectedAlbumId(null);
  };

  // 处理专辑点击
  const handleAlbumClick = (albumId: number) => {
    setSelectedAlbumId(prev => prev === albumId ? null : albumId);
    setSelectedGenre(null);
  };

  // 处理空白处点击
  const handleBackgroundClick = () => {
    setSelectedGenre(null);
    setSelectedAlbumId(null);
  };

  // 回到中心
  const handleHome = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const transform = calculateFitTransform(nodes, width, height);
    d3.select(svgRef.current)
      .transition().duration(500)
      .call(zoomRef.current.transform, transform);
  };

  // 高亮效果
  useEffect(() => {
    if (!nodeGroupsRef.current || !linksRef.current) return;
    
    if (selectedGenre) {
      const genreNodeId = `genre-${selectedGenre}`;
      
      nodeGroupsRef.current.transition().duration(300)
        .style('opacity', (d: any) => {
          if (d.id === genreNodeId) return 1;
          if (d.type === 'album' && d.genre?.includes(selectedGenre)) return 1;
          return 0.15;
        });

      nodeGroupsRef.current.select('.main-circle').transition().duration(300)
        .attr('stroke', (d: any) => {
          if (d.id === genreNodeId) return '#fff';
          if (d.type === 'album' && d.genre?.includes(selectedGenre)) return (d.color || '#888');
          return 'rgba(150, 180, 220, 0.2)';
        })
        .attr('stroke-width', (d: any) => {
          if (d.id === genreNodeId) return 3;
          if (d.type === 'album' && d.genre?.includes(selectedGenre)) return 2;
          return 1;
        });

      linksRef.current.transition().duration(300)
        .attr('stroke', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          return (sid === genreNodeId || tid === genreNodeId) ? 'rgba(100, 230, 255, 0.9)' : 'rgba(100, 180, 255, 0.1)';
        })
        .attr('stroke-width', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          return (sid === genreNodeId || tid === genreNodeId) ? 2.5 : 0.5;
        })
        .style('opacity', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          return (sid === genreNodeId || tid === genreNodeId) ? 1 : 0.15;
        });
    }
    else if (selectedAlbumId) {
      const albumNodeId = `album-${selectedAlbumId}`;
      
      const albumNode = nodes.find(n => n.id === albumNodeId);
      const albumGenres = albumNode?.genre || [];
      
      nodeGroupsRef.current.transition().duration(300)
        .style('opacity', (d: any) => {
          if (d.id === albumNodeId) return 1;
          if (d.type === 'genre' && albumGenres.includes(d.genre?.[0] || '')) return 1;
          return 0.15;
        });
      
      nodeGroupsRef.current.select('.main-circle').transition().duration(300)
        .attr('stroke', (d: any) => {
          if (d.id === albumNodeId) return '#fff';
          if (d.type === 'genre' && albumGenres.includes(d.genre?.[0] || '')) return '#fff';
          return 'rgba(150, 180, 220, 0.2)';
        })
        .attr('stroke-width', (d: any) => {
          if (d.id === albumNodeId) return 4;
          if (d.type === 'genre' && albumGenres.includes(d.genre?.[0] || '')) return 3;
          return 1;
        });

      linksRef.current.transition().duration(300)
        .attr('stroke', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          return (sid === albumNodeId || tid === albumNodeId) ? 'rgba(100, 230, 255, 0.9)' : 'rgba(100, 180, 255, 0.1)';
        })
        .attr('stroke-width', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          return (sid === albumNodeId || tid === albumNodeId) ? 2.5 : 0.5;
        })
        .style('opacity', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          return (sid === albumNodeId || tid === albumNodeId) ? 1 : 0.15;
        });
    }
    else {
      nodeGroupsRef.current.transition().duration(300).style('opacity', 1);
      nodeGroupsRef.current.select('.main-circle').transition().duration(300)
        .attr('stroke', (d: any) => d.type === 'genre' ? (d.color || '#888') : 'rgba(150, 180, 220, 0.6)')
        .attr('stroke-width', (d: any) => d.type === 'album' ? 2 : 0)
        .style('filter', (d: any) => d.type === 'genre' ? `drop-shadow(0 0 8px ${d.color || '#888'})` : 'drop-shadow(0 0 4px rgba(100,150,255,0.3))');

      linksRef.current?.transition().duration(300)
        .attr('stroke', 'rgba(100, 180, 255, 0.4)')
        .attr('stroke-width', 1.5)
        .style('opacity', 1);
    }
  }, [selectedGenre, selectedAlbumId, nodes]);

  // 悬停效果
  useEffect(() => {
    if (!nodeGroupsRef.current) return;

    const hasSelection = selectedGenre || selectedAlbumId;

    if (hoveredNodeId) {
      nodeGroupsRef.current.each(function(this: SVGGElement, d: any) {
        const el = d3.select(this);
        if (d.id === hoveredNodeId) {
          el.transition().duration(150)
            .attr('transform', `translate(${d.x},${d.y}) scale(1.15)`);
          el.select('.glow-circle').transition().duration(150)
            .attr('opacity', 0.5)
            .style('filter', 'blur(10px)');
          el.select('.main-circle').transition().duration(150)
            .attr('stroke', '#fff')
            .attr('stroke-width', d.type === 'album' ? 4 : 2);
        } else if (!hasSelection) {
          el.transition().duration(150)
            .style('opacity', 0.5);
        }
      });
    } else {
      nodeGroupsRef.current.each(function(this: SVGGElement, d: any) {
        const el = d3.select(this);
        el.transition().duration(150)
          .attr('transform', `translate(${d.x},${d.y}) scale(1)`);
        el.select('.glow-circle').transition().duration(150)
          .attr('opacity', d.type === 'genre' ? 0.2 : 0)
          .style('filter', 'blur(4px)');
      });

      if (!hasSelection) {
        nodeGroupsRef.current.transition().duration(150).style('opacity', 1);
        nodeGroupsRef.current.select('.main-circle').transition().duration(150)
          .attr('stroke', (d: any) => d.type === 'genre' ? (d.color || '#888') : 'rgba(150, 180, 220, 0.6)')
          .attr('stroke-width', (d: any) => d.type === 'album' ? 2 : 0);
      } else {
        setTimeout(() => {
          if (selectedGenre) {
            const genreNodeId = `genre-${selectedGenre}`;
            nodeGroupsRef.current.style('opacity', (d: any) => {
              if (d.id === genreNodeId) return 1;
              if (d.type === 'album' && d.genre?.includes(selectedGenre)) return 1;
              return 0.15;
            });
            nodeGroupsRef.current.select('.main-circle')
              .attr('stroke', (d: any) => {
                if (d.id === genreNodeId) return '#fff';
                if (d.type === 'album' && d.genre?.includes(selectedGenre)) return (d.color || '#888');
                return 'rgba(150, 180, 220, 0.2)';
              })
              .attr('stroke-width', (d: any) => {
                if (d.id === genreNodeId) return 3;
                if (d.type === 'album' && d.genre?.includes(selectedGenre)) return 2;
                return 1;
              });
          } else if (selectedAlbumId) {
            const albumNodeId = `album-${selectedAlbumId}`;
            const albumNode = nodes.find(n => n.id === albumNodeId);
            const albumGenres = albumNode?.genre || [];
            
            nodeGroupsRef.current.style('opacity', (d: any) => {
              if (d.id === albumNodeId) return 1;
              if (d.type === 'genre' && albumGenres.includes(d.genre?.[0] || '')) return 1;
              return 0.15;
            });
            nodeGroupsRef.current.select('.main-circle')
              .attr('stroke', (d: any) => {
                if (d.id === albumNodeId) return '#fff';
                if (d.type === 'genre' && albumGenres.includes(d.genre?.[0] || '')) return '#fff';
                return 'rgba(150, 180, 220, 0.2)';
              })
              .attr('stroke-width', (d: any) => {
                if (d.id === albumNodeId) return 4;
                if (d.type === 'genre' && albumGenres.includes(d.genre?.[0] || '')) return 3;
                return 1;
              });
          }
        }, 160);
      }
    }
  }, [hoveredNodeId, selectedGenre, selectedAlbumId, nodes]);

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
    const transform = calculateFitTransform(nodes, width, height);
    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, transform);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <div className="absolute inset-0 rounded-2xl overflow-hidden glass-panel" onClick={handleBackgroundClick}>
        <svg ref={svgRef} className="w-full h-full" style={{ display: 'block' }} onClick={(e) => e.stopPropagation()} />
      </div>

      {/* 缩放和Home按钮 */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button onClick={handleHome} className="p-2 rounded-lg bg-background-elevated/80 hover:bg-background-elevated text-foreground-primary transition-colors shadow-lg" title="回到中心">
            <Home size={18} />
          </button>
          <button onClick={handleZoomIn} className="p-2 rounded-lg bg-background-elevated/80 hover:bg-background-elevated text-foreground-primary transition-colors shadow-lg">
            <ZoomIn size={18} />
          </button>
          <button onClick={handleZoomOut} className="p-2 rounded-lg bg-background-elevated/80 hover:bg-background-elevated text-foreground-primary transition-colors shadow-lg">
            <ZoomOut size={18} />
          </button>
          <button onClick={handleReset} className="p-2 rounded-lg bg-background-elevated/80 hover:bg-background-elevated text-foreground-primary transition-colors shadow-lg" title="适应视图">
            <Maximize size={18} />
          </button>
        </div>
        {/* Reload Cover 按钮 */}
        {onReloadCovers && (
          <button
            onClick={onReloadCovers}
            disabled={isReloading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-background-elevated/80 hover:bg-background-elevated text-foreground-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg border border-border-color"
            title="强制重新获取所有封面"
          >
            {isReloading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Reload Cover
          </button>
        )}
      </div>

      {/* 图例 */}
      <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
        <GraphLegend 
          genres={genres} 
          selectedGenre={selectedGenre}
          onGenreClick={handleGenreClick}
        />
      </div>
    </div>
  );
}
