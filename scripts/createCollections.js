/**
 * Firebase Collections Creation Script
 * This creates all required collections with initial data
 * 
 * Run this in Firebase Console or via Node.js
 */

// FOR FIREBASE CONSOLE: Copy everything below this line
// Go to Firebase Console > Firestore > Click "Start Collection" 
// OR run this script with Node.js

const collections = {
  // 1. SYSTEM CONFIGURATION
  system: {
    documents: {
      config: {
        version: "1.0.0",
        maintenanceMode: false,
        maxFlightsPerRequest: 500,
        updateInterval: 30000,
        dataRetentionDays: 30,
        features: {
          liveTracking: true,
          historicalData: true,
          weatherOverlay: true,
          alerts: true,
          multiLanguage: false,
          darkMode: true
        },
        api: {
          openSkyEnabled: true,
          adsbEnabled: false,
          weatherEnabled: true
        },
        createdAt: new Date()
      },
      status: {
        operational: true,
        lastCheck: new Date(),
        services: {
          database: "operational",
          authentication: "operational",
          storage: "operational",
          api: "operational"
        },
        message: "All systems operational"
      }
    }
  },

  // 2. SUBSCRIPTION TIERS
  subscriptionTiers: {
    documents: {
      free: {
        id: "free",
        name: "Free",
        price: 0,
        currency: "USD",
        features: {
          maxTrackedFlights: 5,
          historyDays: 1,
          refreshRate: 60000,
          apiCallsPerDay: 100,
          exportData: false,
          weatherOverlay: false,
          alerts: false,
          savedSearches: 3,
          concurrentDevices: 1
        },
        limits: {
          storageGB: 0.1,
          bandwidthGB: 1
        },
        display: {
          badge: "FREE",
          color: "#95a5a6",
          popular: false
        }
      },
      premium: {
        id: "premium",
        name: "Premium",
        price: 9.99,
        currency: "USD",
        stripePriceId: "price_premium_monthly",
        features: {
          maxTrackedFlights: 50,
          historyDays: 7,
          refreshRate: 30000,
          apiCallsPerDay: 1000,
          exportData: true,
          weatherOverlay: true,
          alerts: true,
          maxAlerts: 10,
          savedSearches: 20,
          concurrentDevices: 3,
          exportFormats: ["CSV", "JSON"],
          prioritySupport: false
        },
        limits: {
          storageGB: 5,
          bandwidthGB: 50
        },
        display: {
          badge: "PREMIUM",
          color: "#3498db",
          popular: true
        }
      },
      professional: {
        id: "professional",
        name: "Professional",
        price: 24.99,
        currency: "USD",
        stripePriceId: "price_professional_monthly",
        features: {
          maxTrackedFlights: "unlimited",
          historyDays: 30,
          refreshRate: 10000,
          apiCallsPerDay: 10000,
          exportData: true,
          weatherOverlay: true,
          alerts: true,
          maxAlerts: "unlimited",
          savedSearches: "unlimited",
          concurrentDevices: 10,
          exportFormats: ["CSV", "JSON", "KML", "GPX"],
          advancedFilters: true,
          apiAccess: true,
          prioritySupport: true,
          customIntegrations: true
        },
        limits: {
          storageGB: 100,
          bandwidthGB: 1000
        },
        display: {
          badge: "PRO",
          color: "#e74c3c",
          popular: false
        }
      }
    }
  },

  // 3. FLIGHTS (Sample data - will be replaced by live data)
  flights: {
    documents: {
      sample_001: {
        icao24: "4b1805",
        callsign: "SWR123",
        registration: "HB-JCL",
        aircraft: {
          model: "Airbus A320-214",
          type: "A320",
          operator: "Swiss International Air Lines",
          operatorIcao: "SWR",
          wakeTurbulence: "M"
        },
        position: {
          latitude: 51.4775,
          longitude: -0.4614,
          altitude: 38000,
          heading: 85,
          speed: 465,
          verticalRate: 0,
          onGround: false
        },
        origin: {
          airport: "LSZH",
          city: "Zurich",
          country: "Switzerland",
          departureTime: new Date(Date.now() - 3600000)
        },
        destination: {
          airport: "EGLL",
          city: "London",
          country: "United Kingdom",
          arrivalTime: new Date(Date.now() + 1800000)
        },
        status: "EN_ROUTE",
        lastUpdate: new Date(),
        source: "OPENSKY",
        route: ["LSZH", "EGLL"],
        squawk: "1234"
      }
    }
  },

  // 4. USERS (Sample user - will be created on signup)
  users: {
    documents: {
      demo_user: {
        email: "demo@flighttrace.com",
        displayName: "Demo User",
        photoURL: null,
        role: "user",
        tier: "free",
        createdAt: new Date(),
        lastLogin: new Date(),
        emailVerified: false,
        preferences: {
          theme: "light",
          units: "metric",
          defaultMap: "streets",
          notifications: {
            email: true,
            push: false,
            alerts: true
          },
          privacy: {
            shareLocation: false,
            publicProfile: false
          }
        },
        stats: {
          totalSearches: 0,
          totalTracked: 0,
          savedFlights: [],
          favoriteAirports: [],
          lastActive: new Date()
        },
        subscription: {
          tier: "free",
          status: "active",
          startDate: new Date(),
          endDate: null,
          autoRenew: false
        }
      }
    }
  },

  // 5. RATE LIMITS
  rateLimits: {
    documents: {
      default: {
        endpoints: {
          "/api/flights": {
            windowMs: 60000,
            maxRequests: 100,
            message: "Too many flight requests"
          },
          "/api/weather": {
            windowMs: 60000,
            maxRequests: 50,
            message: "Too many weather requests"
          },
          "/api/auth/signup": {
            windowMs: 3600000,
            maxRequests: 5,
            message: "Too many signup attempts"
          },
          "/api/auth/login": {
            windowMs: 900000,
            maxRequests: 10,
            message: "Too many login attempts"
          },
          "/api/export": {
            windowMs: 3600000,
            maxRequests: 10,
            message: "Export limit reached"
          }
        },
        globalLimit: {
          windowMs: 60000,
          maxRequests: 500
        },
        ipBlacklist: [],
        ipWhitelist: [],
        createdAt: new Date()
      }
    }
  },

  // 6. DATA SOURCES
  dataSources: {
    documents: {
      config: {
        primary: "opensky",
        fallback: ["adsb", "flightaware"],
        sources: {
          opensky: {
            enabled: true,
            url: "https://opensky-network.org/api",
            rateLimit: 100,
            priority: 1,
            lastCheck: new Date(),
            status: "operational",
            stats: {
              totalCalls: 0,
              successRate: 100,
              avgResponseTime: 250
            }
          },
          adsb: {
            enabled: false,
            url: "https://adsbexchange.com/api",
            rateLimit: 1000,
            priority: 2,
            requiresAuth: true,
            lastCheck: null,
            status: "disabled"
          },
          flightaware: {
            enabled: false,
            url: "https://flightxml.flightaware.com",
            rateLimit: 500,
            priority: 3,
            requiresAuth: true,
            lastCheck: null,
            status: "disabled"
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  },

  // 7. ANALYTICS
  analytics: {
    documents: {
      overview: {
        totalUsers: 0,
        activeUsers: 0,
        totalFlightsTracked: 0,
        totalApiCalls: 0,
        totalSearches: 0,
        lastUpdated: new Date(),
        dailyStats: {
          [new Date().toISOString().split('T')[0]]: {
            users: 0,
            searches: 0,
            apiCalls: 0,
            newSignups: 0
          }
        },
        popularFlights: [],
        popularAirports: [],
        popularRoutes: [],
        usersByTier: {
          free: 0,
          premium: 0,
          professional: 0
        },
        revenue: {
          monthly: 0,
          yearly: 0
        }
      }
    }
  },

  // 8. AIRPORTS (Reference data)
  airports: {
    documents: {
      EGLL: {
        icao: "EGLL",
        iata: "LHR",
        name: "London Heathrow Airport",
        city: "London",
        country: "United Kingdom",
        coordinates: {
          latitude: 51.4700,
          longitude: -0.4543
        },
        elevation: 83,
        timezone: "Europe/London",
        type: "large_airport"
      },
      KJFK: {
        icao: "KJFK",
        iata: "JFK",
        name: "John F Kennedy International Airport",
        city: "New York",
        country: "United States",
        coordinates: {
          latitude: 40.6413,
          longitude: -73.7781
        },
        elevation: 13,
        timezone: "America/New_York",
        type: "large_airport"
      }
    }
  },

  // 9. ALERTS TEMPLATES
  alertTemplates: {
    documents: {
      flightStatus: {
        name: "Flight Status Change",
        type: "status",
        description: "Alert when flight status changes",
        configurable: {
          flightNumber: "string",
          statuses: ["departed", "arrived", "delayed", "cancelled"]
        }
      },
      proximity: {
        name: "Aircraft Proximity",
        type: "proximity",
        description: "Alert when aircraft enters area",
        configurable: {
          center: "coordinates",
          radius: "number",
          units: ["km", "miles"]
        }
      },
      emergency: {
        name: "Emergency Squawk",
        type: "emergency",
        description: "Alert on emergency transponder codes",
        configurable: {
          codes: ["7500", "7600", "7700"]
        }
      }
    }
  },

  // 10. FEATURE FLAGS
  featureFlags: {
    documents: {
      current: {
        newMapEngine: false,
        advancedFilters: true,
        socialSharing: false,
        mobileApp: false,
        darkMode: true,
        multiLanguage: false,
        flightPrediction: false,
        weatherLayers: true,
        trafficLayers: false,
        satelliteView: true,
        threeDView: false,
        arMode: false,
        updatedAt: new Date()
      }
    }
  }
};

// Function to create collections in Firebase
async function createCollections(db) {
  console.log('🚀 Creating Firebase collections...\n');
  
  for (const [collectionName, collectionData] of Object.entries(collections)) {
    console.log(`📁 Creating collection: ${collectionName}`);
    
    for (const [docId, docData] of Object.entries(collectionData.documents)) {
      try {
        await db.collection(collectionName).doc(docId).set(docData);
        console.log(`  ✅ Document '${docId}' created`);
      } catch (error) {
        console.error(`  ❌ Error creating '${docId}':`, error.message);
      }
    }
  }
  
  console.log('\n✨ All collections created successfully!');
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { collections, createCollections };
}

// For Firebase Console, manually create each collection using the structure above