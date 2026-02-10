/**
 * 生成示例单曲数据并添加到数据库
 * 这些单曲来自已存在的专辑
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 示例单曲数据 - 基于数据库中已有的专辑
const sampleTracks = [
  // Kendrick Lamar - To Pimp a Butterfly
  {
    title: 'Alright',
    artist: 'Kendrick Lamar',
    albumName: 'To Pimp a Butterfly',
    releaseDate: '2015-03-15',
    genre: 'Hip Hop',
    length: '3:39',
    label: 'Top Dawg Entertainment',
  },
  {
    title: 'King Kunta',
    artist: 'Kendrick Lamar',
    albumName: 'To Pimp a Butterfly',
    releaseDate: '2015-03-15',
    genre: 'Hip Hop',
    length: '4:07',
    label: 'Top Dawg Entertainment',
  },
  {
    title: 'The Blacker the Berry',
    artist: 'Kendrick Lamar',
    albumName: 'To Pimp a Butterfly',
    releaseDate: '2015-03-15',
    genre: 'Hip Hop',
    length: '5:28',
    label: 'Top Dawg Entertainment',
  },
  // Miles Davis - Kind of Blue
  {
    title: 'So What',
    artist: 'Miles Davis',
    albumName: 'Kind of Blue',
    releaseDate: '1959-08-17',
    genre: 'Jazz',
    length: '9:22',
    label: 'Columbia Records',
  },
  {
    title: 'Freddie Freeloader',
    artist: 'Miles Davis',
    albumName: 'Kind of Blue',
    releaseDate: '1959-08-17',
    genre: 'Jazz',
    length: '9:46',
    label: 'Columbia Records',
  },
  {
    title: 'Blue in Green',
    artist: 'Miles Davis',
    albumName: 'Kind of Blue',
    releaseDate: '1959-08-17',
    genre: 'Jazz',
    length: '5:37',
    label: 'Columbia Records',
  },
  // The Beatles - Abbey Road
  {
    title: 'Come Together',
    artist: 'The Beatles',
    albumName: 'Abbey Road',
    releaseDate: '1969-09-26',
    genre: 'Rock',
    length: '4:19',
    label: 'Apple Records',
  },
  {
    title: 'Something',
    artist: 'The Beatles',
    albumName: 'Abbey Road',
    releaseDate: '1969-09-26',
    genre: 'Rock',
    length: '3:02',
    label: 'Apple Records',
  },
  {
    title: 'Here Comes the Sun',
    artist: 'The Beatles',
    albumName: 'Abbey Road',
    releaseDate: '1969-09-26',
    genre: 'Rock',
    length: '3:05',
    label: 'Apple Records',
  },
  // Radiohead - OK Computer
  {
    title: 'Paranoid Android',
    artist: 'Radiohead',
    albumName: 'OK Computer',
    releaseDate: '1997-05-21',
    genre: 'Alternative Rock',
    length: '6:23',
    label: 'Parlophone',
  },
  {
    title: 'Karma Police',
    artist: 'Radiohead',
    albumName: 'OK Computer',
    releaseDate: '1997-05-21',
    genre: 'Alternative Rock',
    length: '4:21',
    label: 'Parlophone',
  },
  {
    title: 'No Surprises',
    artist: 'Radiohead',
    albumName: 'OK Computer',
    releaseDate: '1997-05-21',
    genre: 'Alternative Rock',
    length: '3:48',
    label: 'Parlophone',
  },
  // Daft Punk - Random Access Memories
  {
    title: 'Get Lucky',
    artist: 'Daft Punk',
    albumName: 'Random Access Memories',
    releaseDate: '2013-05-17',
    genre: 'Electronic',
    length: '6:09',
    label: 'Columbia Records',
  },
  {
    title: 'Instant Crush',
    artist: 'Daft Punk',
    albumName: 'Random Access Memories',
    releaseDate: '2013-05-17',
    genre: 'Electronic',
    length: '5:37',
    label: 'Columbia Records',
  },
  // Bob Dylan - Blood on the Tracks
  {
    title: 'Tangled Up in Blue',
    artist: 'Bob Dylan',
    albumName: 'Blood on the Tracks',
    releaseDate: '1975-01-20',
    genre: 'Folk Rock',
    length: '5:42',
    label: 'Columbia Records',
  },
  {
    title: 'Simple Twist of Fate',
    artist: 'Bob Dylan',
    albumName: 'Blood on the Tracks',
    releaseDate: '1975-01-20',
    genre: 'Folk Rock',
    length: '4:19',
    label: 'Columbia Records',
  },
  // Joni Mitchell - Blue
  {
    title: 'A Case of You',
    artist: 'Joni Mitchell',
    albumName: 'Blue',
    releaseDate: '1971-06-22',
    genre: 'Folk',
    length: '4:20',
    label: 'Reprise Records',
  },
  {
    title: 'River',
    artist: 'Joni Mitchell',
    albumName: 'Blue',
    releaseDate: '1971-06-22',
    genre: 'Folk',
    length: '4:00',
    label: 'Reprise Records',
  },
  // Stevie Wonder - Songs in the Key of Life
  {
    title: 'Sir Duke',
    artist: 'Stevie Wonder',
    albumName: 'Songs in the Key of Life',
    releaseDate: '1976-09-28',
    genre: 'Soul',
    length: '3:52',
    label: 'Tamla',
  },
  {
    title: 'Isn\'t She Lovely',
    artist: 'Stevie Wonder',
    albumName: 'Songs in the Key of Life',
    releaseDate: '1976-09-28',
    genre: 'Soul',
    length: '6:33',
    label: 'Tamla',
  },
  // Pink Floyd - The Dark Side of the Moon
  {
    title: 'Time',
    artist: 'Pink Floyd',
    albumName: 'The Dark Side of the Moon',
    releaseDate: '1973-03-01',
    genre: 'Progressive Rock',
    length: '6:53',
    label: 'Harvest Records',
  },
  {
    title: 'Money',
    artist: 'Pink Floyd',
    albumName: 'The Dark Side of the Moon',
    releaseDate: '1973-03-01',
    genre: 'Progressive Rock',
    length: '6:22',
    label: 'Harvest Records',
  },
  // Led Zeppelin - Led Zeppelin IV
  {
    title: 'Stairway to Heaven',
    artist: 'Led Zeppelin',
    albumName: 'Led Zeppelin IV',
    releaseDate: '1971-11-08',
    genre: 'Hard Rock',
    length: '8:02',
    label: 'Atlantic Records',
  },
  {
    title: 'Black Dog',
    artist: 'Led Zeppelin',
    albumName: 'Led Zeppelin IV',
    releaseDate: '1971-11-08',
    genre: 'Hard Rock',
    length: '4:54',
    label: 'Atlantic Records',
  },
  // Michael Jackson - Thriller
  {
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    albumName: 'Thriller',
    releaseDate: '1982-11-30',
    genre: 'Pop',
    length: '4:54',
    label: 'Epic Records',
  },
  {
    title: 'Beat It',
    artist: 'Michael Jackson',
    albumName: 'Thriller',
    releaseDate: '1982-11-30',
    genre: 'Pop',
    length: '4:18',
    label: 'Epic Records',
  },
  // Prince - Purple Rain
  {
    title: 'Purple Rain',
    artist: 'Prince',
    albumName: 'Purple Rain',
    releaseDate: '1984-06-25',
    genre: 'Pop Rock',
    length: '8:41',
    label: 'Warner Bros. Records',
  },
  {
    title: 'When Doves Cry',
    artist: 'Prince',
    albumName: 'Purple Rain',
    releaseDate: '1984-06-25',
    genre: 'Pop Rock',
    length: '5:52',
    label: 'Warner Bros. Records',
  },
  // Nirvana - Nevermind
  {
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    albumName: 'Nevermind',
    releaseDate: '1991-09-24',
    genre: 'Grunge',
    length: '5:01',
    label: 'DGC Records',
  },
  {
    title: 'Come as You Are',
    artist: 'Nirvana',
    albumName: 'Nevermind',
    releaseDate: '1991-09-24',
    genre: 'Grunge',
    length: '3:39',
    label: 'DGC Records',
  },
  // The Doors - The Doors
  {
    title: 'Light My Fire',
    artist: 'The Doors',
    albumName: 'The Doors',
    releaseDate: '1967-01-04',
    genre: 'Psychedelic Rock',
    length: '7:06',
    label: 'Elektra Records',
  },
  {
    title: 'Break On Through (To the Other Side)',
    artist: 'The Doors',
    albumName: 'The Doors',
    releaseDate: '1967-01-04',
    genre: 'Psychedelic Rock',
    length: '2:29',
    label: 'Elektra Records',
  },
];

async function seedTracks() {
  console.log('🎵 Starting to seed sample tracks...\n');

  try {
    // 获取默认用户
    const defaultUser = await prisma.user.findFirst({
      where: { email: 'test@example.com' },
    });

    if (!defaultUser) {
      console.log('❌ No default user found. Please run the app first to create a user.');
      process.exit(1);
    }

    console.log(`✓ Found user: ${defaultUser.name || defaultUser.email} (${defaultUser.id})\n`);

    let created = 0;
    let skipped = 0;

    for (const trackData of sampleTracks) {
      try {
        // 检查是否已存在
        const existing = await prisma.track.findFirst({
          where: {
            userId: defaultUser.id,
            artist: trackData.artist,
            albumName: trackData.albumName,
            title: trackData.title,
          },
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${trackData.title} by ${trackData.artist} (already exists)`);
          skipped++;
          continue;
        }

        // 创建单曲
        await prisma.track.create({
          data: {
            ...trackData,
            userId: defaultUser.id,
          },
        });

        console.log(`✓ Created: ${trackData.title} by ${trackData.artist} (${trackData.albumName})`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating ${trackData.title}:`, error);
      }
    }

    console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);

    // 显示统计
    const totalTracks = await prisma.track.count({
      where: { userId: defaultUser.id },
    });

    console.log(`📊 Total tracks in database: ${totalTracks}`);

  } catch (error) {
    console.error('❌ Error seeding tracks:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTracks();
