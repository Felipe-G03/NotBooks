// Generates a 32x32 clean notebook icon PNG for the Windows system tray
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createNotebookPng() {
  const width = 32;
  const height = 32;
  const buffer = Buffer.alloc(width * height * 4); // RGBA

  // Notebook shape: rect from x:6 to 26, y:3 to 29
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Inside book bounds
      if (x >= 5 && x <= 26 && y >= 3 && y <= 28) {
        // Spine (left side x:5..8)
        if (x <= 8) {
          buffer[idx] = 220;     // R
          buffer[idx + 1] = 38;  // G
          buffer[idx + 2] = 38;  // B (Crimson red)
          buffer[idx + 3] = 255; // A
        } 
        // Golden bookmark line at x: 9
        else if (x === 9) {
          buffer[idx] = 245;
          buffer[idx + 1] = 158;
          buffer[idx + 2] = 11; // Amber
          buffer[idx + 3] = 255;
        }
        // Pages area (x:10..24)
        else if (x <= 24) {
          // Lines on pages
          if ((y === 8 || y === 13 || y === 18 || y === 23) && x >= 12 && x <= 22) {
            buffer[idx] = 180;
            buffer[idx + 1] = 185;
            buffer[idx + 2] = 195;
            buffer[idx + 3] = 255;
          } else {
            // Paper cream/white
            buffer[idx] = 248;
            buffer[idx + 1] = 246;
            buffer[idx + 2] = 240;
            buffer[idx + 3] = 255;
          }
        } 
        // Right cover edge
        else {
          buffer[idx] = 200;
          buffer[idx + 1] = 30;
          buffer[idx + 2] = 30;
          buffer[idx + 3] = 255;
        }
      } 
      // Book corners subtle rounding
      else {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0; // Transparent
      }
    }
  }

  // Create raw PNG
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // Filter type 0 (None)
    buffer.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(rawData);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Simple CRC32 table
  function crc32(buf) {
    let c = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
      c = (c ^ buf[n]) >>> 0;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const png = Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', deflated),
    createChunk('IEND', Buffer.alloc(0))
  ]);

  const outDir = path.join(__dirname, '../electron');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'tray-icon.png'), png);
  console.log('Tray icon successfully generated at electron/tray-icon.png');
}

createNotebookPng();
