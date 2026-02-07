'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ReactNode, useEffect } from 'react';
import { Disc3, ArrowRight, Music2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { initTheme } from '@/lib/theme';

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-background-secondary/50 border border-border-color hover:border-accent/30 transition-all duration-300 group">
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground-primary mb-2">{title}</h3>
      <p className="text-sm text-foreground-secondary">{description}</p>
    </div>
  );
}

export default function HomePage() {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background-primary">
      {/* Navigation */}
      <nav className="nav-capsule">
        <Link href="/" className="nav-item active">
          Home
        </Link>
        <Link href="/collection" className="nav-item">
          Collection
        </Link>
        <div className="w-px h-6 bg-border-color mx-1" />
        <ThemeToggle />
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 pt-24 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8">
              <Disc3 size={16} />
              <span>Visual Music Collection</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-foreground-primary mb-6 tracking-tight"
          >
            Discover Your
            <br />
            <span className="text-accent">Music Universe</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-foreground-secondary mb-12 max-w-2xl mx-auto"
          >
            Midai helps you organize your album collection and explore connections 
            between artists and genres through an interactive visualization.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/collection">
              <Button size="lg" className="flex items-center gap-2">
                Open Collection
                <ArrowRight size={18} />
              </Button>
            </Link>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20"
          >
            <FeatureCard
              icon={<Disc3 size={24} />}
              title="Organize"
              description="Import and manage your album collection with ease"
            />
            <FeatureCard
              icon={<Music2 size={24} />}
              title="Visualize"
              description="Explore genre connections through interactive graphs"
            />
            <FeatureCard
              icon={<Share2 size={24} />}
              title="Discover"
              description="Find new music based on your collection's genres"
            />
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-color py-6 px-6">
        <div className="max-w-4xl mx-auto text-center text-sm text-foreground-muted">
          <p>Midai - Music Collection & Discovery Platform</p>
        </div>
      </footer>
    </div>
  );
}
