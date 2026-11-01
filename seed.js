const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const Pet = require('./models/pet.models');

const mongoURI =
  process.env.MONGODB_URI ||
  `mongodb://${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || 'petdb'}`;

// Directory where the PNG asset files are located
const assetsDir = path.resolve(__dirname, 'assets', 'images');

// Helper to convert an image file to raw base64 string
const toRawBase64 = (filename) => {
  const filePath = path.join(assetsDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Warning: File not found at ${filePath}`);
    return null;
  }
  return fs.readFileSync(filePath).toString('base64');
};

const seedPetsData = [
  {
    name: 'Luna',
    species: 'cat',
    isFavorite: true,
    file: 'icons8-cat-94.png'
  },
  {
    name: 'Milo',
    species: 'dog',
    isFavorite: true,
    file: 'icons8-puppy-94.png'
  },
  {
    name: 'Thumper',
    species: 'rabbit',
    isFavorite: false,
    file: 'icons8-rabbit-94.png'
  },
  {
    name: 'Rio',
    species: 'bird',
    isFavorite: true,
    file: 'icons8-parrot-speaking-94.png'
  },
  {
    name: 'Barnaby',
    species: 'bird',
    isFavorite: false,
    file: 'icons8-owl-94.png'
  },
  {
    name: 'Echo',
    species: 'fish',
    isFavorite: false,
    file: 'icons8-dolphin-94.png'
  },
  {
    name: 'Pippa',
    species: 'poultry',
    isFavorite: false,
    file: 'icons8-chicken-94.png'
  },
  {
    name: 'Raja',
    species: 'wild',
    isFavorite: false,
    file: 'icons8-tiger-94.png'
  }
];

async function run() {
  const isCleanOnly = process.argv.includes('--clean');

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(mongoURI);
  console.log('✅ Connected to MongoDB:', mongoURI);

  try {
    // 1. Truncate existing collection
    const deleteResult = await Pet.deleteMany({});
    console.log(`🧹 Truncated pets collection (removed ${deleteResult.deletedCount} existing documents).`);

    if (isCleanOnly) {
      console.log('✨ Clean operation finished successfully.');
      return;
    }

    // 2. Prepare documents with raw base64 images
    console.log('📦 Encoding PNG icons to raw Base64 and preparing documents...');
    const documents = seedPetsData.map((item) => {
      const rawBase64 = toRawBase64(item.file);
      return {
        name: item.name,
        species: item.species,
        isFavorite: item.isFavorite,
        image: rawBase64
      };
    });

    // 3. Insert into MongoDB
    const inserted = await Pet.insertMany(documents);
    console.log(`🎉 Successfully seeded ${inserted.length} pets!\n`);

    console.table(
      inserted.map((p, idx) => ({
        '#': idx + 1,
        ID: p._id.toString(),
        Name: p.name,
        Species: p.species,
        Favorite: p.isFavorite ? '❤️ Yes' : '🤍 No',
        'Image Base64 Length': p.image ? `${p.image.length} chars` : 'none',
        'Source File': seedPetsData[idx].file
      }))
    );

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
    
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

run();
