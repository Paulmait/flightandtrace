/**
 * Secure Environment Variable Loader
 * This file safely loads and validates environment variables
 * without exposing sensitive values
 */

class SecureEnvLoader {
  constructor() {
    this.requiredVars = {
      // API Keys - NEVER log actual values
      OPENSKY_USERNAME: { type: 'string', sensitive: true },
      OPENSKY_PASSWORD: { type: 'string', sensitive: true },
      OPENWEATHER_API_KEY: { type: 'string', sensitive: true },
      
      // Stripe Keys
      STRIPE_SECRET_KEY: { type: 'string', sensitive: true },
      FLIGHTTRACE_STRIPE_PUBLISHABLE_KEY: { type: 'string', sensitive: true },
      FLIGHTTRACE_STRIPE_WEBHOOK_SECRET: { type: 'string', sensitive: true },
      
      // Firebase (optional but recommended)
      FIREBASE_SERVICE_ACCOUNT: { type: 'string', sensitive: true, optional: true },
      
      // Application
      NODE_ENV: { type: 'string', sensitive: false },
    };
    
    this.config = {};
  }

  /**
   * Load and validate environment variables
   */
  load() {
    const errors = [];
    const warnings = [];
    
    Object.entries(this.requiredVars).forEach(([key, settings]) => {
      const value = process.env[key];
      
      if (!value && !settings.optional) {
        errors.push(`Missing required environment variable: ${key}`);
        return;
      }
      
      if (!value && settings.optional) {
        warnings.push(`Optional environment variable not set: ${key}`);
        return;
      }
      
      // Validate format without exposing value
      if (value) {
        if (settings.type === 'string' && typeof value !== 'string') {
          errors.push(`Invalid type for ${key}: expected string`);
        }
        
        // Check for placeholder values
        if (this.isPlaceholder(value)) {
          errors.push(`Environment variable ${key} contains placeholder value`);
        }
        
        // Store validated value
        this.config[key] = value;
      }
    });
    
    // Log validation results without exposing values
    if (warnings.length > 0) {
      console.warn('⚠️  Environment warnings:', warnings);
    }
    
    if (errors.length > 0) {
      console.error('❌ Environment validation failed:', errors);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Environment validation failed. Check server logs.');
      }
    } else {
      console.log('✅ Environment validation passed');
      this.logSafeConfig();
    }
    
    return this.config;
  }
  
  /**
   * Check if value is a placeholder
   */
  isPlaceholder(value) {
    const placeholders = [
      'your_',
      'YOUR_',
      'xxx',
      'XXX',
      'demo',
      'DEMO',
      'test',
      'TEST',
      'placeholder',
      'PLACEHOLDER',
      'example',
      'EXAMPLE',
      'change_me',
      'CHANGE_ME',
      'todo',
      'TODO',
      'fake',
      'FAKE'
    ];
    
    return placeholders.some(placeholder => 
      value.toLowerCase().includes(placeholder.toLowerCase())
    );
  }
  
  /**
   * Log configuration safely without exposing sensitive values
   */
  logSafeConfig() {
    const safeConfig = {};
    
    Object.entries(this.config).forEach(([key, value]) => {
      const settings = this.requiredVars[key];
      
      if (settings && settings.sensitive) {
        // Mask sensitive values
        if (value && value.length > 0) {
          safeConfig[key] = `${value.substring(0, 3)}***${value.slice(-3)}`;
        } else {
          safeConfig[key] = '***';
        }
      } else {
        safeConfig[key] = value;
      }
    });
    
    console.log('Loaded configuration (sensitive values masked):', safeConfig);
  }
  
  /**
   * Get a configuration value
   */
  get(key) {
    if (!this.config[key]) {
      throw new Error(`Environment variable ${key} not loaded`);
    }
    return this.config[key];
  }
  
  /**
   * Check if running in production
   */
  isProduction() {
    return this.config.NODE_ENV === 'production';
  }
  
  /**
   * Check if all required services are configured
   */
  isFullyConfigured() {
    const required = Object.entries(this.requiredVars)
      .filter(([_, settings]) => !settings.optional)
      .map(([key]) => key);
    
    return required.every(key => this.config[key] && !this.isPlaceholder(this.config[key]));
  }
}

// Singleton instance
const envLoader = new SecureEnvLoader();

// Auto-load on import
if (process.env.NODE_ENV !== 'test') {
  envLoader.load();
}

module.exports = envLoader;