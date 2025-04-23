#!/usr/bin/env node

const { findCharacterById, listCharactersWithInfo } = require('../dist/characters');

// List all characters with their IDs
console.log('Available Characters:');
const characters = listCharactersWithInfo();
console.log(JSON.stringify(characters, null, 2));

// Test finding a character by ID (using the first character's ID)
if (characters.length > 0) {
  const firstCharacterId = characters[0].id;
  console.log(`\nFinding character by ID: ${firstCharacterId}`);
  
  const character = findCharacterById(firstCharacterId);
  if (character) {
    console.log(`Found: ${character.name} (${character.id})`);
  } else {
    console.log('Character not found!');
  }
} else {
  console.log('\nNo characters available to test ID lookup');
}

// Test the endpoints using curl
console.log('\nAPI Endpoints Test:');
console.log('------------------');
console.log('1. To test the character selection endpoint:');
console.log('curl -X POST http://localhost:8080/character -H "Content-Type: application/json" -d \'{"characterId": "CHARACTER_ID_HERE"}\'');

console.log('\n2. To list all characters with their IDs:');
console.log('curl http://localhost:8080/characters');

console.log('\n3. To test character selection by name (backward compatibility):');
console.log('curl -X POST http://localhost:8080/character -H "Content-Type: application/json" -d \'{"characterName": "sherlock"}\''); 