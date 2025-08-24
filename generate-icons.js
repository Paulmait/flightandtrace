const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG content for the logo
const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0099ff"/>
  <circle cx="256" cy="256" r="240" fill="white" opacity="0.95"/>
  <g transform="translate(256, 220) scale(6.5) rotate(-10)">
    <path d="M -20 0 L -10 -3 L 15 -8 L 20 -8 L 22 -6 L 22 -4 L 18 -2 L 15 -2 L -10 3 L -20 5 Z" 
          fill="#0099ff"/>
    <path d="M -5 -1 L -5 -6 L 0 -7 L 2 -6 L 2 -1 L 0 0 Z" 
          fill="#0099ff"/>
    <path d="M -5 1 L -5 6 L 0 7 L 2 6 L 2 1 L 0 0 Z" 
          fill="#0099ff"/>
  </g>
  <path d="M 100 360 Q 180 280 256 260 T 410 310" 
        stroke="#0099ff" 
        stroke-width="8" 
        fill="none" 
        stroke-linecap="round"
        stroke-dasharray="12,12"/>
</svg>`;

async function generateIcons() {
    const outputDir = path.join(__dirname, 'public');
    
    // Generate different sizes
    const sizes = [
        { size: 192, name: 'logo-192.png' },
        { size: 512, name: 'logo-512.png' },
        { size: 180, name: 'apple-touch-icon.png' },
        { size: 32, name: 'favicon-32x32.png' },
        { size: 16, name: 'favicon-16x16.png' }
    ];
    
    for (const { size, name } of sizes) {
        try {
            await sharp(Buffer.from(svgContent))
                .resize(size, size)
                .png()
                .toFile(path.join(outputDir, name));
            console.log(`✅ Generated ${name} (${size}x${size})`);
        } catch (error) {
            console.error(`❌ Error generating ${name}:`, error);
        }
    }
    
    // Generate ICO file for favicon
    try {
        await sharp(Buffer.from(svgContent))
            .resize(32, 32)
            .toFile(path.join(outputDir, 'favicon.ico'));
        console.log('✅ Generated favicon.ico');
    } catch (error) {
        console.error('❌ Error generating favicon.ico:', error);
    }
}

generateIcons().catch(console.error);