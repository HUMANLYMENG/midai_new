'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';
import { Disc3, ArrowRight, Music2, Library, Users, Tag, Headphones, Github } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { initTheme } from '@/lib/theme';

interface StatsData {
  counts: { albums: number; tracks: number; artists: number; genres: number };
  topGenres: { name: string; count: number }[];
  recentAlbums: { id: number; title: string; artist: string; coverUrl: string | null }[];
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="p-4 rounded-xl bg-background-secondary/30 border border-border-color/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">{icon}</div>
        <div>
          <div className="text-2xl font-bold text-foreground-primary">{value.toLocaleString()}</div>
          <div className="text-xs text-foreground-secondary">{label}</div>
        </div>
      </div>
    </div>
  );
}

function AlbumCard({ album }: { album: StatsData['recentAlbums'][0] }) {
  return (
    <Link href="/collection" className="flex-shrink-0 w-36 group">
      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-background-secondary">
        {album.coverUrl ? (
          <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-purple-500/20">
            <Disc3 size={36} className="text-accent/50" />
          </div>
        )}
      </div>
      <h4 className="text-sm font-medium text-foreground-primary truncate group-hover:text-accent transition-colors">{album.title}</h4>
      <p className="text-xs text-foreground-secondary truncate">{album.artist}</p>
    </Link>
  );
}

function GenreTag({ genre }: { genre: StatsData['topGenres'][0] }) {
  return (
    <span className="px-3 py-1.5 rounded-full bg-background-secondary/50 border border-border-color/50 hover:border-accent/50 hover:bg-accent/10 transition-all cursor-pointer text-sm text-foreground-secondary hover:text-accent">
      {genre.name}
      <span className="ml-1 text-xs text-foreground-muted">({genre.count})</span>
    </span>
  );
}

export default function HomePage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [titleText, setTitleText] = useState('');
  const fullTitle = 'See How Your Music Connects';

  useEffect(() => {
    initTheme();
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats({
            counts: data.data.counts || { albums: 0, tracks: 0, artists: 0, genres: 0 },
            topGenres: data.data.topGenres || [],
            recentAlbums: data.data.recentAlbums || [],
          });
        }
      });

    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullTitle.length) {
        setTitleText(fullTitle.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 120);
    return () => clearInterval(timer);
  }, []);

  const hasData = stats && stats.counts.albums > 0;

  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background-primary via-background-primary to-accent/5" />
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-gradient-to-r from-accent/10 to-pink-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navigation */}
      <nav className="fixed top-4 left-0 right-0 z-50 flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 nav-capsule">
          <Link href="/" className="nav-item active">Home</Link>
          <Link href="/collection" className="nav-item">Collection</Link>
          <div className="w-px h-6 bg-border-color mx-1" />
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero Section - Compact */}
      <section className="relative pt-32 pb-8 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-bold mb-3 tracking-tight"
          >
            <span className="text-foreground-primary"></span>
            <span className="bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent">
              {titleText}
              <span className="animate-pulse">|</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-foreground-secondary mb-6 max-w-xl mx-auto"
          >
            Your personal sonic map
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/collection">
              <Button size="lg" className="flex items-center gap-2">
                <Library size={18} />
                Open Collection
                <ArrowRight size={18} />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats & Content */}
      {hasData && (
        <section className="relative px-6 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
            >
              <StatCard icon={<Disc3 size={20} />} value={stats.counts.albums} label="Albums" />
              <StatCard icon={<Headphones size={20} />} value={stats.counts.tracks} label="Tracks" />
              <StatCard icon={<Users size={20} />} value={stats.counts.artists} label="Artists" />
              <StatCard icon={<Tag size={20} />} value={stats.counts.genres} label="Genres" />
            </motion.div>

            {/* Recent Albums - No Title */}
            {stats.recentAlbums.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mb-6"
              >
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
                  {stats.recentAlbums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Genre Tags - No Title */}
            {stats.topGenres.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-wrap justify-center gap-2"
              >
                {stats.topGenres.slice(0, 10).map((genre) => (
                  <GenreTag key={genre.name} genre={genre} />
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Features - Compact at bottom */}
      <section className="relative py-6 px-6 border-t border-border-color/30 mt-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-8 md:gap-16">
            {[
              { icon: <Disc3 size={20} />, title: 'Organize' },
              { icon: <ArrowRight size={20} />, title: 'Visualize' },
              { icon: <Music2 size={20} />, title: 'Discover' },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-2 text-foreground-secondary">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">{f.icon}</div>
                <span className="text-sm font-medium">{f.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="relative py-4 px-6 border-t border-border-color/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Left - Text */}
            <div className="text-left space-y-1">
              <p className="text-xs text-foreground-muted">Midai - Music Collection Platform</p>
              <a 
                href="https://getsongbpm.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-foreground-muted hover:text-accent transition-colors block"
              >
                GetSongBPM - Music Tempo Database
              </a>
            </div>
            
            {/* Right - Icons */}
            <div className="flex items-center gap-3">
              {/* Spotify */}
              <a
                href="https://open.spotify.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#1DB954]/10 flex items-center justify-center text-[#1DB954] hover:bg-[#1DB954]/20 transition-colors"
                title="Spotify"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </a>
              
              {/* GitHub */}
              <a
                href="https://github.com/HUMANLYMENG/midai_new"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-foreground-muted/10 flex items-center justify-center text-foreground-muted hover:bg-foreground-muted/20 hover:text-foreground-primary transition-colors"
                title="GitHub"
              >
                <Github size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
