require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function addIndexes() {
  try {
    console.log('Adding userId index...');
    await client.createPayloadIndex('activities', {
      field_name: 'userId',
      field_schema: 'keyword',
    });
    console.log('✓ userId index created');

    console.log('Adding teamId index...');
    await client.createPayloadIndex('activities', {
      field_name: 'teamId',
      field_schema: 'keyword',
    });
    console.log('✓ teamId index created');

    console.log('\n✓ All indexes added successfully!');
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('✓ Indexes already exist');
    } else {
      console.error('Error adding indexes:', error);
    }
  }
}

addIndexes();
