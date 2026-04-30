const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Read and parse a JSON data file.
 * Returns an empty array if the file doesn't exist yet.
 */
function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return [];
  }
}

/**
 * Write data to a JSON file (atomic overwrite).
 */
function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err.message);
    return false;
  }
}

module.exports = { readJSON, writeJSON };
