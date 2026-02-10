import { PrismaClient } from '@prisma/client';
import path from 'path';

const dbPath = path.resolve(__dirname, '../prisma/dev.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

async function addSampleTracks() {
  // 先找到一些专辑
  const albums = await prisma.album.findMany({
    take: 5,
    select: { id: true, title: true, artist: true, genre: true }
  });

  console.log('Found albums:', albums);

  if (albums.length === 0) {
    console.log('No albums found, cannot add tracks');
    return;
  }

  // 为每个专辑添加一些示例单曲
  const sampleTracks = [
    // To Pimp a Butterfly - Kendrick Lamar
    { title: 'Wesley\'s Theory', artist: 'Kendrick Lamar', albumName: 'To Pimp a Butterfly', genre: 'Hip Hop', length: '4:47' },
    { title: 'King Kunta', artist: 'Kendrick Lamar', albumName: 'To Pimp a Butterfly', genre: 'Hip Hop', length: '3:54' },
    { title: 'Alright', artist: 'Kendrick Lamar', albumName: 'To Pimp a Butterfly', genre: 'Hip Hop', length: '3:39' },
    { title: 'The Blacker the Berry', artist: 'Kendrick Lamar', albumName: 'To Pimp a Butterfly', genre: 'Hip Hop', length: '5:28' },

    // Kind of Blue - Miles Davis
    { title: 'So What', artist: 'Miles Davis', albumName: 'Kind of Blue', genre: 'Jazz', length: '9:22' },
    { title: 'Freddie Freeloader', artist: 'Miles Davis', albumName: 'Kind of Blue', genre: 'Jazz', length: '9:46' },
    { title: 'Blue in Green', artist: 'Miles Davis', albumName: 'Kind of Blue', genre: 'Jazz', length: '5:37' },

    // Abbey Road - The Beatles
    { title: 'Come Together', artist: 'The Beatles', albumName: 'Abbey Road', genre: 'Rock', length: '4:19' },
    { title: 'Something', artist: 'The Beatles', albumName: 'Abbey Road', genre: 'Rock', length: '3:03' },
    { title: 'Here Comes the Sun', artist: 'The Beatles', albumName: 'Abbey Road', genre: 'Rock', length: '3:05' },

    // OK Computer - Radiohead
    { title: 'Paranoid Android', artist: 'Radiohead', albumName: 'OK Computer', genre: 'Alternative Rock', length: '6:23' },
    { title: 'Karma Police', artist: 'Radiohead', albumName: 'OK Computer', genre: 'Alternative Rock', length: '4:21' },
    { title: 'No Surprises', artist: 'Radiohead', albumName: 'OK Computer', genre: 'Alternative Rock', length: '3:48' },

    // Random Access Memories - Daft Punk
    { title: 'Get Lucky', artist: 'Daft Punk', albumName: 'Random Access Memories', genre: 'Electronic', length: '6:09' },
    { title: 'Instant Crush', artist: 'Daft Punk', albumName: 'Random Access Memories', genre: 'Electronic', length: '5:37' },
    { title: 'Touch', artist: 'Daft Punk', albumName: 'Random Access Memories', genre: 'Electronic', length: '8:18' },

    // 一些没有专辑的单曲（独立单曲）
    { title: 'Like a Rolling Stone', artist: 'Bob Dylan', albumName: 'Highway 61 Revisited', genre: 'Folk Rock', length: '6:13' },
    { title: 'Both Sides Now', artist: 'Joni Mitchell', albumName: 'Clouds', genre: 'Folk', length: '4:32' },
    { title: 'Superstition', artist: 'Stevie Wonder', albumName: 'Talking Book', genre: 'Soul', length: '4:26' },
  ];

  // 获取第一个用户作为这些单曲的拥有者
  const user = await prisma.user.findFirst();

  if (!user) {
    console.log('No user found, creating a default user');
    return;
  }

  console.log('Using user:', user.id);

  for (const track of sampleTracks) {
    try {
      await prisma.track.create({
        data: {
          ...track,
          userId: user.id,
        }
      });
      console.log(`Created track: ${track.title} by ${track.artist}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`Track already exists: ${track.title}`);
      } else {
        console.error(`Error creating track ${track.title}:`, error.message);
      }
    }
  }

  console.log('Sample tracks added successfully!');
}

addSampleTracks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
