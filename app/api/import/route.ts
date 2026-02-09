import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (userId instanceof NextResponse) return userId;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    const text = await file.text();

    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        const headerMap: Record<string, string> = {
          'title': 'title',
          'artist': 'artist',
          'release_date': 'releaseDate',
          'release date': 'releaseDate',
          'date': 'releaseDate',
          'genre': 'genre',
          'genres': 'genre',
          'length': 'length',
          'duration': 'length',
          'label': 'label',
          'tag': 'tag',
          'tags': 'tag',
          'comment': 'comment',
          'comments': 'comment',
          'cover': 'coverUrl',
          'cover_url': 'coverUrl',
          'cover url': 'coverUrl',
          'coverUrl': 'coverUrl',
        };
        return headerMap[header.toLowerCase().trim()] || header;
      },
    });

    if (results.errors.length > 0) {
      console.error('CSV parsing errors:', results.errors);
    }

    const albums = results.data as any[];
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of albums) {
      try {
        if (!row.title || !row.artist) {
          skipped++;
          continue;
        }

        await prisma.album.create({
          data: {
            title: row.title,
            artist: row.artist,
            releaseDate: row.releaseDate || null,
            genre: row.genre || null,
            length: row.length || null,
            label: row.label || null,
            tag: row.tag || null,
            comment: row.comment || null,
            coverUrl: row.coverUrl || null,
            userId: userId, // 关联当前用户
          },
        });

        imported++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          skipped++;
        } else {
          errors.push(`Failed to import "${row.title}": ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported,
        skipped,
        errors: errors.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Failed to import CSV:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}
