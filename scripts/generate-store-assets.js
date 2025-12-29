#!/usr/bin/env node

/**
 * FlightTrace App Store Asset Generator
 *
 * Generates all required screenshots and marketing graphics for:
 * - Apple App Store (iOS, iPad)
 * - Google Play Store (Android)
 *
 * Usage: node scripts/generate-store-assets.js
 *
 * Requirements:
 * - Node.js 18+
 * - sharp (npm install sharp)
 * - puppeteer (npm install puppeteer)
 */

const fs = require('fs');
const path = require('path');

// Asset specifications
const ASSET_SPECS = {
  // Apple App Store
  ios: {
    'iphone-6.5': { width: 1284, height: 2778, name: 'iPhone 6.5"' },
    'iphone-5.5': { width: 1242, height: 2208, name: 'iPhone 5.5"' },
    'ipad-12.9': { width: 2048, height: 2732, name: 'iPad Pro 12.9"' },
    'ipad-11': { width: 1668, height: 2388, name: 'iPad Pro 11"' },
  },
  // Google Play
  android: {
    'phone': { width: 1080, height: 1920, name: 'Phone' },
    'tablet-7': { width: 1200, height: 1920, name: '7" Tablet' },
    'tablet-10': { width: 1920, height: 1200, name: '10" Tablet' },
    'feature-graphic': { width: 1024, height: 500, name: 'Feature Graphic' },
  },
  // App Icon
  icon: {
    'ios-1024': { width: 1024, height: 1024, name: 'iOS App Store' },
    'android-512': { width: 512, height: 512, name: 'Google Play' },
  }
};

// Screenshot content/scenes
const SCREENSHOT_SCENES = [
  {
    id: 'map',
    title: 'Live Flight Tracking',
    subtitle: 'Track aircraft in real-time',
    description: 'Watch flights move across an interactive map',
    bgColor: '#0066CC',
  },
  {
    id: 'detail',
    title: 'Flight Details',
    subtitle: 'Complete flight information',
    description: 'View altitude, speed, and route details',
    bgColor: '#4CAF50',
  },
  {
    id: 'notifications',
    title: 'Smart Alerts',
    subtitle: 'Never miss an update',
    description: 'Get notified about departures and arrivals',
    bgColor: '#FF9800',
  },
  {
    id: 'fuel',
    title: 'Fuel & CO2 Tracking',
    subtitle: 'Environmental insights',
    description: 'Monitor fuel consumption and emissions',
    bgColor: '#9C27B0',
  },
  {
    id: 'history',
    title: 'Flight History',
    subtitle: 'Track your journeys',
    description: 'Review past flights and statistics',
    bgColor: '#00BCD4',
  },
];

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'store');

/**
 * Create SVG template for screenshot frame
 */
function createScreenshotSVG(scene, spec, platform) {
  const { width, height } = spec;
  const isLandscape = width > height;

  // Device frame dimensions
  const frameWidth = isLandscape ? width * 0.7 : width * 0.65;
  const frameHeight = isLandscape ? height * 0.65 : height * 0.7;
  const frameX = (width - frameWidth) / 2;
  const frameY = height * 0.15;

  // Text positioning
  const titleY = height * 0.08;
  const subtitleY = titleY + 50;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${scene.bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${adjustColor(scene.bgColor, -30)};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="20" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg-gradient)"/>

  <!-- Title -->
  <text x="${width/2}" y="${titleY}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${width * 0.045}"
        font-weight="bold"
        fill="white"
        text-anchor="middle">
    ${scene.title}
  </text>

  <!-- Subtitle -->
  <text x="${width/2}" y="${subtitleY}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${width * 0.025}"
        fill="rgba(255,255,255,0.9)"
        text-anchor="middle">
    ${scene.subtitle}
  </text>

  <!-- Device Frame -->
  <rect x="${frameX}" y="${frameY}"
        width="${frameWidth}" height="${frameHeight}"
        rx="30" ry="30"
        fill="white"
        filter="url(#shadow)"/>

  <!-- Screen Content Placeholder -->
  <rect x="${frameX + 10}" y="${frameY + 10}"
        width="${frameWidth - 20}" height="${frameHeight - 20}"
        rx="20" ry="20"
        fill="#1a1a1a"/>

  <!-- FlightTrace Logo/Content -->
  <g transform="translate(${frameX + frameWidth/2}, ${frameY + frameHeight/2})">
    <!-- Plane Icon -->
    <path d="M-30,-15 L30,-15 L40,0 L30,15 L-30,15 L-40,0 Z"
          fill="#0066CC"
          transform="rotate(-45)"/>
    <text y="60"
          font-family="system-ui, sans-serif"
          font-size="24"
          fill="white"
          text-anchor="middle">
      ${scene.description}
    </text>
  </g>

  <!-- Bottom Badge -->
  <rect x="${width/2 - 100}" y="${height - 80}"
        width="200" height="40"
        rx="20" ry="20"
        fill="rgba(255,255,255,0.2)"/>
  <text x="${width/2}" y="${height - 52}"
        font-family="system-ui, sans-serif"
        font-size="16"
        fill="white"
        text-anchor="middle">
    FlightTrace
  </text>
</svg>`;
}

/**
 * Create feature graphic SVG
 */
function createFeatureGraphicSVG(width, height) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="feature-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066CC;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#004499;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#feature-bg)"/>

  <!-- World Map Pattern (simplified) -->
  <g opacity="0.1" fill="white">
    <ellipse cx="200" cy="250" rx="150" ry="100"/>
    <ellipse cx="500" cy="200" rx="120" ry="80"/>
    <ellipse cx="800" cy="280" rx="180" ry="120"/>
  </g>

  <!-- Flight Path -->
  <path d="M100,350 Q300,100 500,250 T900,150"
        stroke="white"
        stroke-width="3"
        fill="none"
        stroke-dasharray="10,5"
        opacity="0.5"/>

  <!-- Plane Icon -->
  <g transform="translate(500, 220) rotate(-30)">
    <path d="M0,-40 L15,-20 L15,30 L40,50 L40,55 L15,40 L15,50 L25,60 L25,65 L0,55 L-25,65 L-25,60 L-15,50 L-15,40 L-40,55 L-40,50 L-15,30 L-15,-20 Z"
          fill="white"/>
  </g>

  <!-- App Name -->
  <text x="512" y="420"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="72"
        font-weight="bold"
        fill="white"
        text-anchor="middle">
    FlightTrace
  </text>

  <!-- Tagline -->
  <text x="512" y="470"
        font-family="system-ui, sans-serif"
        font-size="28"
        fill="rgba(255,255,255,0.9)"
        text-anchor="middle">
    Track Flights in Real-Time
  </text>
</svg>`;
}

/**
 * Create app icon SVG
 */
function createAppIconSVG(size) {
  const cornerRadius = size * 0.22; // iOS icon corner radius

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="icon-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0088FF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0044AA;stop-opacity:1" />
    </linearGradient>
    <clipPath id="icon-clip">
      <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}"/>
    </clipPath>
  </defs>

  <g clip-path="url(#icon-clip)">
    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#icon-bg)"/>

    <!-- Radar circles -->
    <circle cx="${size/2}" cy="${size/2}" r="${size*0.35}"
            stroke="rgba(255,255,255,0.1)" stroke-width="2" fill="none"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size*0.25}"
            stroke="rgba(255,255,255,0.15)" stroke-width="2" fill="none"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size*0.15}"
            stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none"/>

    <!-- Plane Icon -->
    <g transform="translate(${size/2}, ${size/2}) scale(${size/200})">
      <path d="M0,-60 L20,-30 L20,45 L60,75 L60,82 L20,60 L20,75 L35,90 L35,97 L0,82 L-35,97 L-35,90 L-20,75 L-20,60 L-60,82 L-60,75 L-20,45 L-20,-30 Z"
            fill="white"/>
    </g>
  </g>
</svg>`;
}

/**
 * Adjust color brightness
 */
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

/**
 * Ensure output directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Main generator function
 */
async function generateAssets() {
  console.log('🚀 FlightTrace Store Asset Generator\n');

  // Create output directories
  const dirs = [
    OUTPUT_DIR,
    path.join(OUTPUT_DIR, 'ios'),
    path.join(OUTPUT_DIR, 'android'),
    path.join(OUTPUT_DIR, 'icons'),
  ];

  dirs.forEach(ensureDir);

  let fileCount = 0;

  // Generate iOS screenshots
  console.log('📱 Generating iOS screenshots...');
  for (const [deviceKey, spec] of Object.entries(ASSET_SPECS.ios)) {
    const deviceDir = path.join(OUTPUT_DIR, 'ios', deviceKey);
    ensureDir(deviceDir);

    for (let i = 0; i < SCREENSHOT_SCENES.length; i++) {
      const scene = SCREENSHOT_SCENES[i];
      const svg = createScreenshotSVG(scene, spec, 'ios');
      const filename = `${i + 1}_${scene.id}.svg`;
      fs.writeFileSync(path.join(deviceDir, filename), svg);
      fileCount++;
    }
    console.log(`  ✓ ${spec.name}: ${SCREENSHOT_SCENES.length} screenshots`);
  }

  // Generate Android screenshots
  console.log('\n🤖 Generating Android screenshots...');
  for (const [deviceKey, spec] of Object.entries(ASSET_SPECS.android)) {
    if (deviceKey === 'feature-graphic') continue;

    const deviceDir = path.join(OUTPUT_DIR, 'android', deviceKey);
    ensureDir(deviceDir);

    for (let i = 0; i < SCREENSHOT_SCENES.length; i++) {
      const scene = SCREENSHOT_SCENES[i];
      const svg = createScreenshotSVG(scene, spec, 'android');
      const filename = `${i + 1}_${scene.id}.svg`;
      fs.writeFileSync(path.join(deviceDir, filename), svg);
      fileCount++;
    }
    console.log(`  ✓ ${spec.name}: ${SCREENSHOT_SCENES.length} screenshots`);
  }

  // Generate feature graphic
  console.log('\n🎨 Generating feature graphic...');
  const featureSpec = ASSET_SPECS.android['feature-graphic'];
  const featureSvg = createFeatureGraphicSVG(featureSpec.width, featureSpec.height);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'android', 'feature-graphic.svg'), featureSvg);
  fileCount++;
  console.log(`  ✓ Feature Graphic (${featureSpec.width}x${featureSpec.height})`);

  // Generate app icons
  console.log('\n🎯 Generating app icons...');
  for (const [iconKey, spec] of Object.entries(ASSET_SPECS.icon)) {
    const iconSvg = createAppIconSVG(spec.width);
    const filename = `icon-${iconKey}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'icons', filename), iconSvg);
    fileCount++;
    console.log(`  ✓ ${spec.name} (${spec.width}x${spec.height})`);
  }

  // Generate metadata file
  const metadata = {
    generated_at: new Date().toISOString(),
    app_name: 'FlightTrace',
    version: '1.0.0',
    assets: {
      ios_screenshots: Object.keys(ASSET_SPECS.ios).length * SCREENSHOT_SCENES.length,
      android_screenshots: (Object.keys(ASSET_SPECS.android).length - 1) * SCREENSHOT_SCENES.length,
      feature_graphic: 1,
      icons: Object.keys(ASSET_SPECS.icon).length,
    },
    scenes: SCREENSHOT_SCENES,
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log('\n✅ Asset generation complete!');
  console.log(`   📁 Output: ${OUTPUT_DIR}`);
  console.log(`   📄 Files: ${fileCount} SVG files + metadata.json`);
  console.log('\n💡 Next steps:');
  console.log('   1. Use a tool like Inkscape or sharp to convert SVGs to PNG');
  console.log('   2. Add actual app screenshots to the device frames');
  console.log('   3. Upload to App Store Connect and Google Play Console');
}

// Run generator
generateAssets().catch(console.error);
