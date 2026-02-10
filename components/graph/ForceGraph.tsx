'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, Album, Track, CollectionItemType } from '@/types';
import { parseGenres, getGenreColor } from '@/lib/genres';
import { GraphLegend } from './GraphLegend';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ForceGraphProps {
  albums: Album[];
  tracks?: Track[];
  onNodeClick?: (item: Album | Track) => void;
  highlightedItemId?: number | null;
  highlightedItemType?: CollectionItemType | null;
  expandedAlbumId?: number | null;
  onAlbumExpand?: (albumId: number | null) => void;
}

export function ForceGraph({
  albums,
  tracks = [],
  onNodeClick,
  highlightedItemId,
  highlightedItemType,
  expandedAlbumId,
  onAlbumExpand
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);
  const nodeGroupsRef = useRef<any>(null);
  const linksRef = useRef<any>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
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

    // 创建专辑节点
    albums.forEach((album, i) => {
      const albumGenres = parseGenres(album.genre);

      // 专辑节点：在中心附近随机分布，半径较小
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 80; // 0-80px 范围内

      graphNodes.push({
        id: `album-${album.id}`,
        type: 'album',
        albumId: album.id,
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

    // 创建单曲节点 - 聚合模式：只有展开的专辑才显示其单曲
    tracks.forEach((track, i) => {
      // 查找对应的专辑
      const parentAlbum = albums.find(a =>
        a.title.toLowerCase() === track.albumName.toLowerCase() ||
        track.albumName.toLowerCase().includes(a.title.toLowerCase())
      );

      const trackGenres = parseGenres(track.genre);
      trackGenres.forEach(g => genreSet.add(g));

      // 聚合逻辑：
      // 1. 如果单曲有所属专辑，只有该专辑被展开时才显示单曲
      // 2. 如果单曲没有所属专辑，直接连接到流派节点
      if (parentAlbum) {
        // 只有展开的专辑才显示其单曲
        if (expandedAlbumId === parentAlbum.id) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 50 + Math.random() * 40; // 围绕专辑周围

          graphNodes.push({
            id: `track-${track.id}`,
            type: 'track',
            trackId: track.id,
            artist: track.artist,
            genre: trackGenres,
            coverUrl: track.coverUrl,
            albumName: track.albumName,
            r: 8, // 比专辑小
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });

          graphLinks.push({
            source: `track-${track.id}`,
            target: `album-${parentAlbum.id}`,
          });
        }
      } else {
        // 没有专辑的单曲，直接连接到流派
        const angle = Math.random() * Math.PI * 2;
        const radius = 100 + Math.random() * 80;

        graphNodes.push({
          id: `track-${track.id}`,
          type: 'track',
          trackId: track.id,
          artist: track.artist,
          genre: trackGenres,
          coverUrl: track.coverUrl,
          albumName: track.albumName,
          r: 10,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });

        // 未找到专辑，直接连接到流派
        trackGenres.forEach((genre) => {
          graphLinks.push({
            source: `track-${track.id}`,
            target: `genre-${genre}`,
          });
        });
      }
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
  }, [albums, tracks, width, height, expandedAlbumId]);

  // 计算节点是否与当前选中状态相关
  const isNodeRelated = (node: GraphNode): boolean => {
    if (selectedGenre) {
      const genreNodeId = `genre-${selectedGenre}`;
      if (node.id === genreNodeId) return true;
      if ((node.type === 'album' || node.type === 'track') && node.genre?.includes(selectedGenre)) return true;
      return false;
    }
    if (selectedAlbumId) {
      const albumNodeId = `album-${selectedAlbumId}`;
      if (node.id === albumNodeId) return true;
      const albumNode = nodes.find(n => n.id === albumNodeId);
      const albumGenres = albumNode?.genre || [];
      if (node.type === 'genre' && albumGenres.includes(node.genre?.[0] || '')) return true;
      // 单曲如果属于该专辑也相关
      if (node.type === 'track' && node.albumName && albumNode) {
        return node.albumName.toLowerCase() === albumNode.id.replace('album-', '').toLowerCase();
      }
      return false;
    }
    return true; // 无选中状态时所有节点都相关
  };

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
      .force('center', d3.forceCenter(centerX, centerY).strength(0.15))
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
      .alpha(1)
      .alphaDecay(0.02)
      .alphaMin(0.001);

    simulationRef.current = simulation;

    // 连线
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'graph-link')
      .attr('stroke', 'rgba(100, 180, 255, 0.5)')
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

    // 封面 - 专辑和单曲都可以有
    nodeGroup.filter(d => (d.type === 'album' || d.type === 'track') && !!d.coverUrl)
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

    // 交互 - 鼠标悬停、单击高亮、双击打开编辑
    nodeGroup
      .on('mouseenter', (event, d) => {
        setHoveredNodeId(d.id);
      })
      .on('mouseleave', (event, d) => {
        setHoveredNodeId(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.type === 'genre') {
          // 点击流派节点，高亮该流派
          const genre = d.id.replace('genre-', '');
          handleGenreClick(genre);
        } else if (d.type === 'album') {
          // 点击专辑节点，切换展开/收起状态
          const albumId = parseInt(d.id.replace('album-', ''));
          if (onAlbumExpand) {
            // 如果点击的是已展开的专辑，则收起；否则展开
            onAlbumExpand(expandedAlbumId === albumId ? null : albumId);
          }
          handleAlbumClick(albumId);
        } else if (d.type === 'track') {
          // 点击单曲节点，高亮该单曲
          const trackId = parseInt(d.id.replace('track-', ''));
          handleTrackClick(trackId);
        }
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        if (d.type === 'album') {
          const albumId = parseInt(d.id.replace('album-', ''));
          const album = albums.find(a => a.id === albumId);
          if (album && onNodeClick) onNodeClick(album);
        } else if (d.type === 'track') {
          const trackId = parseInt(d.id.replace('track-', ''));
          const track = tracks.find(t => t.id === trackId);
          if (track && onNodeClick) onNodeClick(track);
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

  // 处理流派点击（图例或节点）
  const handleGenreClick = (genre: string) => {
    setSelectedGenre(prev => prev === genre ? null : genre);
    setSelectedAlbumId(null); // 取消专辑选择
    setSelectedTrackId(null); // 取消单曲选择
  };

  // 处理专辑点击
  const handleAlbumClick = (albumId: number) => {
    setSelectedAlbumId(prev => prev === albumId ? null : albumId);
    setSelectedTrackId(null); // 取消单曲选择
    setSelectedGenre(null); // 取消流派选择
  };

  // 处理单曲点击
  const handleTrackClick = (trackId: number) => {
    setSelectedTrackId(prev => prev === trackId ? null : trackId);
    setSelectedAlbumId(null); // 取消专辑选择
    setSelectedGenre(null); // 取消流派选择
  };

  // 处理空白处点击，取消选中
  const handleBackgroundClick = () => {
    setSelectedGenre(null);
    setSelectedAlbumId(null);
    setSelectedTrackId(null);
  };

  // 高亮效果（流派或专辑）
  useEffect(() => {
    if (!nodeGroupsRef.current || !linksRef.current) return;
    
    if (selectedGenre) {
      // 流派高亮模式
      const genreNodeId = `genre-${selectedGenre}`;
      
      // 节点样式
      nodeGroupsRef.current.transition().duration(300)
        .style('opacity', (d: any) => {
          if (d.id === genreNodeId) return 1;
          if ((d.type === 'album' || d.type === 'track') && d.genre?.includes(selectedGenre)) return 1;
          return 0.15;
        });

      // 节点圆圈样式
      nodeGroupsRef.current.select('.main-circle').transition().duration(300)
        .attr('stroke', (d: any) => {
          if (d.id === genreNodeId) return '#fff';
          if ((d.type === 'album' || d.type === 'track') && d.genre?.includes(selectedGenre)) return (d.color || '#888');
          return 'rgba(150, 180, 220, 0.2)';
        })
        .attr('stroke-width', (d: any) => {
          if (d.id === genreNodeId) return 3;
          if ((d.type === 'album' || d.type === 'track') && d.genre?.includes(selectedGenre)) return 2;
          return 1;
        });

      // 连线样式
      linksRef.current.transition().duration(300)
        .attr('stroke', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          const isConnected = sid === genreNodeId || tid === genreNodeId;
          return isConnected ? 'rgba(100, 230, 255, 0.9)' : 'rgba(100, 180, 255, 0.1)';
        })
        .attr('stroke-width', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          const isConnected = sid === genreNodeId || tid === genreNodeId;
          return isConnected ? 2.5 : 0.5;
        })
        .style('opacity', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          return (sid === genreNodeId || tid === genreNodeId) ? 1 : 0.15;
        });
    }
    else if (selectedAlbumId) {
      // 专辑高亮模式
      const albumNodeId = `album-${selectedAlbumId}`;
      
      // 获取该专辑的流派
      const albumNode = nodes.find(n => n.id === albumNodeId);
      const albumGenres = albumNode?.genre || [];
      
      // 节点样式
      nodeGroupsRef.current.transition().duration(300)
        .style('opacity', (d: any) => {
          if (d.id === albumNodeId) return 1;
          if (d.type === 'genre' && albumGenres.includes(d.genre?.[0] || '')) return 1;
          return 0.15;
        });
      
      // 节点圆圈样式
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

      // 连线样式
      linksRef.current.transition().duration(300)
        .attr('stroke', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          const isConnected = sid === albumNodeId || tid === albumNodeId;
          return isConnected ? 'rgba(100, 230, 255, 0.9)' : 'rgba(100, 180, 255, 0.1)';
        })
        .attr('stroke-width', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          const isConnected = sid === albumNodeId || tid === albumNodeId;
          return isConnected ? 2.5 : 0.5;
        })
        .style('opacity', (d: any) => {
          const sid = d.source.id || d.source;
          const tid = d.target.id || d.target;
          return (sid === albumNodeId || tid === albumNodeId) ? 1 : 0.15;
        });
    }
    // 无高亮，恢复正常
    else {
      nodeGroupsRef.current.transition().duration(300).style('opacity', 1);
      nodeGroupsRef.current.select('.main-circle').transition().duration(300)
        .attr('stroke', (d: any) => d.type === 'genre' ? (d.color || '#888') : 'rgba(150, 180, 220, 0.6)')
        .attr('stroke-width', (d: any) => d.type === 'album' ? 2 : 0)
        .style('filter', (d: any) => d.type === 'genre' ? `drop-shadow(0 0 8px ${d.color || '#888'})` : 'drop-shadow(0 0 4px rgba(100,150,255,0.3))');

      linksRef.current?.transition().duration(300)
        .attr('stroke', 'rgba(100, 180, 255, 0.5)')
        .attr('stroke-width', 1.5)
        .style('opacity', 1);
    }
  }, [selectedGenre, selectedAlbumId, selectedTrackId, nodes]);

  // 悬停效果
  useEffect(() => {
    if (!nodeGroupsRef.current) return;

    // 如果当前有选中状态，悬停效果需要与选中状态共存
    const hasSelection = selectedGenre || selectedAlbumId || selectedTrackId;

    if (hoveredNodeId) {
      const hoveredNode = nodes.find(n => n.id === hoveredNodeId);
      const isRelated = hoveredNode ? isNodeRelated(hoveredNode) : false;
      
      nodeGroupsRef.current.each(function(this: SVGGElement, d: any) {
        const el = d3.select(this);
        
        if (d.id === hoveredNodeId) {
          // 悬停的节点放大
          el.transition().duration(150)
            .attr('transform', `translate(${d.x},${d.y}) scale(1.15)`);
          
          // 增强发光效果
          el.select('.glow-circle').transition().duration(150)
            .attr('opacity', 0.5)
            .style('filter', 'blur(10px)');
          
          // 增强边框
          el.select('.main-circle').transition().duration(150)
            .attr('stroke', '#fff')
            .attr('stroke-width', d.type === 'album' ? 4 : d.type === 'track' ? 3 : 2);
        } else if (!hasSelection) {
          // 无选中状态时，其他节点轻微淡化
          el.transition().duration(150)
            .style('opacity', 0.5);
        }
        // 有选中状态时，非悬停节点保持高亮/淡化状态不变
      });
    } else {
      // 恢复 - 需要考虑当前选中状态
      nodeGroupsRef.current.each(function(this: SVGGElement, d: any) {
        const el = d3.select(this);
        el.transition().duration(150)
          .attr('transform', `translate(${d.x},${d.y}) scale(1)`);
        
        el.select('.glow-circle').transition().duration(150)
          .attr('opacity', d.type === 'genre' ? 0.2 : 0)
          .style('filter', 'blur(4px)');
      });

      if (!hasSelection) {
        // 无选中状态，全部恢复
        nodeGroupsRef.current.transition().duration(150).style('opacity', 1);
        nodeGroupsRef.current.select('.main-circle').transition().duration(150)
          .attr('stroke', (d: any) => d.type === 'genre' ? (d.color || '#888') : 'rgba(150, 180, 220, 0.6)')
          .attr('stroke-width', (d: any) => d.type === 'album' ? 2 : d.type === 'track' ? 1.5 : 0);
      } else {
        // 有选中状态，重新应用选中样式
        // 延迟执行确保恢复动画完成
        setTimeout(() => {
          if (selectedGenre) {
            const genreNodeId = `genre-${selectedGenre}`;
            nodeGroupsRef.current.style('opacity', (d: any) => {
              if (d.id === genreNodeId) return 1;
              if ((d.type === 'album' || d.type === 'track') && d.genre?.includes(selectedGenre)) return 1;
              return 0.15;
            });
            nodeGroupsRef.current.select('.main-circle')
              .attr('stroke', (d: any) => {
                if (d.id === genreNodeId) return '#fff';
                if ((d.type === 'album' || d.type === 'track') && d.genre?.includes(selectedGenre)) return (d.color || '#888');
                return 'rgba(150, 180, 220, 0.2)';
              })
              .attr('stroke-width', (d: any) => {
                if (d.id === genreNodeId) return 3;
                if ((d.type === 'album' || d.type === 'track') && d.genre?.includes(selectedGenre)) return 2;
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
  }, [hoveredNodeId, selectedGenre, selectedAlbumId, selectedTrackId, nodes]);

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
      <div className="absolute inset-0 rounded-2xl overflow-hidden glass-panel" onClick={handleBackgroundClick}>
        <svg ref={svgRef} className="w-full h-full" style={{ display: 'block' }} onClick={(e) => e.stopPropagation()} />
      </div>

      {/* 缩放按钮 */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
