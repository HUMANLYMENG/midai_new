import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../prisma/dev.db');
console.log('Database path:', dbPath);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

async function addSampleTracks() {
  try {
    // 获取第一个用户
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found');
      return;
    }
    console.log('Using user:', user.id);

    // 获取所有专辑
    const albums = await prisma.album.findMany({
      select: { id: true, title: true, artist: true, genre: true }
    });
    console.log('Found albums:', albums.length);

    // 示例单曲数据
    const sampleTracks = [
      // To Pimp a Butterfly - Kendrick Lamar
      { title: "Wesley's Theory", artist: 'Kendrick Lamar', albumName: 'To Pimp a Butterfly', genre: 'Hip Hop', length: '4:47' },
      { title: 'King Kunta', artist: 'Kendrick Lamar', albumName: 'To Pimp a Butterfly', genre: 'Hip Hop', length: '3:54' },
      { title: 'Alright', artist: 'Kendrick Lamar', albumName: 'To Pimp a Butterfly', genre: 'Hip Hop', length: '3:39' },

      // Kind of Blue - Miles Davis
      { title: 'So What', artist: 'Miles Davis', albumName: 'Kind of Blue', genre: 'Jazz', length: '9:22' },
      { title: 'Freddie Freeloader', artist: 'Miles Davis', albumName: 'Kind of Blue', genre: 'Jazz', length: '9:46' },

      // Abbey Road - The Beatles
      { title: 'Come Together', artist: 'The Beatles', albumName: 'Abbey Road', genre: 'Rock', length: '4:19' },
      { title: 'Something', artist: 'The Beatles', albumName: 'Abbey Road', genre: 'Rock', length: '3:03' },

      // OK Computer - Radiohead
      { title: 'Paranoid Android', artist: 'Radiohead', albumName: 'OK Computer', genre: 'Alternative Rock', length: '6:23' },
      { title: 'Karma Police', artist: 'Radiohead', albumName: 'OK Computer', genre: 'Alternative Rock', length: '4:21' },

      // 没有专辑的单曲（独立单曲）
      { title: 'Like a Rolling Stone', artist: 'Bob Dylan', albumName: 'Highway 61 Revisited', genre: 'Folk Rock', length: '6:13' },
      { title: 'Superstition', artist: 'Stevie Wonder', albumName: 'Talking Book', genre: 'Soul', length: '4:26' },
    ];

    let created = 0;
    let skipped = 0;

    for (const track of sampleTracks) {
      try {
        await prisma.track.create({
          data: {
            ...track,
            userId: user.id,
          }
        });
        console.log(`✅ Created: ${track.title}`);
        created++;
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⏭️  Skipped (exists): ${track.title}`);
          skipped++;
        } else {
          console.error(`❌ Error creating ${track.title}:`, error.message);
        }
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);

    // 列出所有tracks
    const allTracks = await prisma.track.findMany();
    console.log(`\nTotal tracks in database: ${allTracks.length}`);
    allTracks.forEach(t => {
      console.log(`  - ${t.title} (${t.albumName})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleTracks();
