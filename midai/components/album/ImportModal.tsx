'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<{ imported: number; skipped: number; errors: string[] }>;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setResult(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      const res = await onImport(file);
      setResult(res);
      if (res.errors.length === 0) {
        setTimeout(() => {
          onClose();
          setFile(null);
          setResult(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Albums">
      <div className="space-y-4">
        {!result ? (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                file
                  ? 'border-accent bg-accent/5'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText size={24} className="text-accent" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground-primary">{file.name}</p>
                    <p className="text-xs text-foreground-secondary">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto mb-3 text-foreground-muted" />
                  <p className="text-sm text-foreground-secondary mb-2">
                    Drop your CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Supports: title, artist, release_date, genre, length, label, tag, comment, cover
                  </p>
                </>
              )}
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-input"
              />
              {!file && (
                <label htmlFor="csv-input">
                  <Button type="button" variant="secondary" className="mt-4 cursor-pointer">
                    Select File
                  </Button>
                </label>
              )}
            </div>

            {file && (
              <Button
                onClick={handleImport}
                isLoading={isLoading}
                className="w-full"
              >
                {isLoading ? 'Importing...' : 'Import Albums'}
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
              <CheckCircle size={24} className="text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-400">
                  Import completed!
                </p>
                <p className="text-xs text-foreground-secondary">
                  {result.imported} imported, {result.skipped} skipped
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle size={16} />
                  <span className="text-sm">Some errors occurred:</span>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs text-foreground-muted space-y-1 p-2 bg-red-500/5 rounded-lg">
                  {result.errors.map((error, i) => (
                    <p key={i}>{error}</p>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
