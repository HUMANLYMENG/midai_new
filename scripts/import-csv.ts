import { PrismaClient } from '@prisma/client';
import Papa from 'papaparse';
import fs from 'fs';

const prisma = new PrismaClient();

async function importCSV(filePath: string, userEmail: string) {
  // Create or find test user
  let user = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userEmail,
        name: 'Test User',
      }
    });
    console.log(`Created test user: ${user.email} (ID: ${user.id})`);
  } else {
    console.log(`Using existing user: ${user.email} (ID: ${user.id})`);
  }

  const userId = user.id;
  const text = fs.readFileSync(filePath, 'utf-8');

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
          userId: userId,
        },
      });

      imported++;
      console.log(`Imported: ${row.title} - ${row.artist}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        skipped++;
        console.log(`Skipped (duplicate): ${row.title} - ${row.artist}`);
      } else {
        errors.push(`Failed to import "${row.title}": ${error.message}`);
        console.error(`Error importing ${row.title}:`, error.message);
      }
    }
  }

  console.log('\n--- Import Summary ---');
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors.length}`);

  await prisma.$disconnect();
}

// Get command line arguments
const filePath = process.argv[2] || '/workspace/group/filled_albums_info.csv';
const userEmail = process.argv[3] || 'test@example.com';

importCSV(filePath, userEmail);
