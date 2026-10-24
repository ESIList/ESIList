//  PROCEDIMIENTO

// cd C:\Users\User\Documents\GitHub\ESIList
// node updatePositionHistory.js "reason"
// git add -A
// git commit -m "Update list positions"
// git push

const fs = require("fs");
const path = require("path");

const DATA_DIR = "./data";
const LIST_FILE = "_list.json";
const OLD_LIST_FILE = "_list.previous.json";
const reasonFromCLI = process.argv.slice(2).join(" ") || "Moved";

// Get today's date in DD-MM-YYYY format
const now = new Date();
const today = String(now.getDate()).padStart(2, "0") + "-" +
              String(now.getMonth() + 1).padStart(2, "0") + "-" +
              now.getFullYear();

// Load lists
const newList = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, LIST_FILE))
);

const oldList = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, OLD_LIST_FILE))
);

// Map old positions
const oldPositions = {};
oldList.forEach((name, i) => {
  oldPositions[name] = i + 1;
});

// Process new list
newList.forEach((name, index) => {
  const newPosition = index + 1;
  const levelPath = path.join(DATA_DIR, `${name}.json`);

  if (!fs.existsSync(levelPath)) {
    console.warn(`Missing level file: ${name}.json`);
    return;
  }

  const level = JSON.parse(fs.readFileSync(levelPath));
  level.positionHistory = level.positionHistory || [];

  // New level
  if (!(name in oldPositions)) {
    level.positionHistory.push({
      date: today,
      change: null,
      position: newPosition,
      reason: "Added to list"
    });
  } 
  // Moved level
  else {
    const diff = oldPositions[name] - newPosition;
    if (diff !== 0) {
      level.positionHistory.push({
        date: today,
        change: diff,
        position: newPosition,
        reason: reasonFromCLI
      });
    }
  }

  fs.writeFileSync(levelPath, JSON.stringify(level, null, 4));
});

console.log("Position history updated.");