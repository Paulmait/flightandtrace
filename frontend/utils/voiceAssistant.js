// Voice Assistant Integration for FlightTrace
// Supports Siri Shortcuts, Google Assistant, and Alexa

import { NativeModules, Platform } from 'react-native';

class VoiceAssistantManager {
  constructor() {
    this.shortcuts = [];
    this.voiceCommands = new Map();
    this.initializeAssistants();
  }

  initializeAssistants() {
    if (Platform.OS === 'ios') {
      this.initializeSiri();
    } else if (Platform.OS === 'android') {
      this.initializeGoogleAssistant();
    }
    
    // Initialize Alexa Skills Kit
    this.initializeAlexa();
  }

  // Siri Shortcuts (iOS)
  initializeSiri() {
    const { SiriShortcuts } = NativeModules;
    
    if (!SiriShortcuts) return;

    // Define available shortcuts
    this.shortcuts = [
      {
        id: 'track_flight',
        title: 'Track Flight',
        phrase: 'Track my flight',
        description: 'Get real-time updates on your tracked flights'
      },
      {
        id: 'flight_status',
        title: 'Flight Status',
        phrase: "Where's Dad's plane",
        description: 'Check the status of a family member\'s flight'
      },
      {
        id: 'eta_check',
        title: 'Check ETA',
        phrase: 'When will the flight land',
        description: 'Get estimated arrival time for tracked flights'
      },
      {
        id: 'share_location',
        title: 'Share Flight',
        phrase: 'Share my flight location',
        description: 'Send current flight location to family'
      }
    ];

    // Register shortcuts
    this.shortcuts.forEach(shortcut => {
      SiriShortcuts.presentShortcut({
        id: shortcut.id,
        phrase: shortcut.phrase,
        title: shortcut.title,
        description: shortcut.description,
        isEligibleForSearch: true,
        isEligibleForPrediction: true
      });
    });
  }

  // Google Assistant (Android)
  initializeGoogleAssistant() {
    const { GoogleAssistant } = NativeModules;
    
    if (!GoogleAssistant) return;

    // Define App Actions
    const appActions = [
      {
        intent: 'actions.intent.GET_FLIGHT_STATUS',
        fulfillment: 'app://flighttrace/flight/status',
        parameters: [
          {
            name: 'tailNumber',
            type: 'SchemaOrg_Text',
            required: false
          }
        ]
      },
      {
        intent: 'actions.intent.TRACK_FLIGHT',
        fulfillment: 'app://flighttrace/flight/track',
        parameters: [
          {
            name: 'flightIdentifier',
            type: 'SchemaOrg_Text',
            required: true
          }
        ]
      }
    ];

    GoogleAssistant.registerAppActions(appActions);
  }

  // Alexa Skills
  initializeAlexa() {
    // Alexa skill endpoints would be handled server-side
    // This registers local handlers for deep linking from Alexa
    this.registerAlexaHandlers();
  }

  registerAlexaHandlers() {
    const handlers = {
      'FlightStatusIntent': this.handleFlightStatus.bind(this),
      'TrackFlightIntent': this.handleTrackFlight.bind(this),
      'FamilyFlightIntent': this.handleFamilyFlight.bind(this),
      'ETAIntent': this.handleETA.bind(this)
    };

    Object.entries(handlers).forEach(([intent, handler]) => {
      this.voiceCommands.set(intent, handler);
    });
  }

  // Intent Handlers
  async handleFlightStatus(params) {
    const { tailNumber } = params;
    
    try {
      const response = await fetch(`/api/flights/${tailNumber}/status`);
      const data = await response.json();
      
      return {
        speech: this.generateStatusSpeech(data),
        displayText: `${tailNumber}: ${data.status}`,
        data: data
      };
    } catch (error) {
      return {
        speech: "I couldn't find that flight. Please check the tail number.",
        displayText: "Flight not found"
      };
    }
  }

  async handleTrackFlight(params) {
    const { flightIdentifier } = params;
    
    // Start tracking the flight
    await this.startTracking(flightIdentifier);
    
    return {
      speech: `Now tracking ${flightIdentifier}. I'll notify you of any changes.`,
      displayText: `Tracking ${flightIdentifier}`,
      action: 'OPEN_FLIGHT_DETAIL',
      actionParams: { tailNumber: flightIdentifier }
    };
  }

  async handleFamilyFlight(params) {
    const { familyMember } = params;
    
    try {
      const flights = await this.getFamilyMemberFlights(familyMember);
      
      if (flights.length === 0) {
        return {
          speech: `I don't see any active flights for ${familyMember}.`,
          displayText: "No active flights"
        };
      }
      
      const flight = flights[0]; // Most recent
      return {
        speech: this.generateFamilyFlightSpeech(familyMember, flight),
        displayText: `${familyMember}'s flight: ${flight.status}`,
        data: flight
      };
    } catch (error) {
      return {
        speech: "I had trouble checking that flight. Please try again.",
        displayText: "Error checking flight"
      };
    }
  }

  async handleETA(params) {
    const { tailNumber } = params;
    
    try {
      const response = await fetch(`/api/flights/${tailNumber}/eta`);
      const data = await response.json();
      
      const etaTime = new Date(data.estimated_arrival);
      const now = new Date();
      const minutesUntilArrival = Math.round((etaTime - now) / 60000);
      
      let speech;
      if (minutesUntilArrival < 0) {
        speech = `${tailNumber} has already landed.`;
      } else if (minutesUntilArrival < 60) {
        speech = `${tailNumber} will arrive in about ${minutesUntilArrival} minutes.`;
      } else {
        const hours = Math.floor(minutesUntilArrival / 60);
        const minutes = minutesUntilArrival % 60;
        speech = `${tailNumber} will arrive in ${hours} hours and ${minutes} minutes.`;
      }
      
      return {
        speech: speech,
        displayText: `ETA: ${etaTime.toLocaleTimeString()}`,
        data: data
      };
    } catch (error) {
      return {
        speech: "I couldn't get the arrival time for that flight.",
        displayText: "ETA unavailable"
      };
    }
  }

  // Speech Generation
  generateStatusSpeech(flightData) {
    const { tail_number, status, altitude, speed, departure_airport, arrival_airport } = flightData;
    
    let speech = `${tail_number} is currently ${status}`;
    
    if (status === 'airborne' || status === 'in_flight') {
      speech += ` at ${altitude.toLocaleString()} feet`;
      if (speed) {
        speech += `, traveling at ${speed} knots`;
      }
      speech += ` from ${departure_airport} to ${arrival_airport}`;
    } else if (status === 'landed') {
      speech += ` at ${arrival_airport}`;
    }
    
    speech += '.';
    return speech;
  }

  generateFamilyFlightSpeech(memberName, flight) {
    const { status, altitude, estimated_arrival } = flight;
    
    let speech = `${memberName}'s flight is ${status}`;
    
    if (status === 'airborne') {
      speech += ` at ${altitude.toLocaleString()} feet`;
      
      if (estimated_arrival) {
        const eta = new Date(estimated_arrival);
        const timeStr = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        speech += ` and should arrive at ${timeStr}`;
      }
    }
    
    speech += '.';
    return speech;
  }

  // Siri Shortcut Donation
  donateSiriShortcut(type, params) {
    if (Platform.OS !== 'ios') return;
    
    const { SiriShortcuts } = NativeModules;
    if (!SiriShortcuts) return;
    
    const shortcut = this.shortcuts.find(s => s.id === type);
    if (!shortcut) return;
    
    SiriShortcuts.donateShortcut({
      id: shortcut.id,
      phrase: shortcut.phrase,
      params: params
    });
  }

  // Voice Feedback
  speak(text, options = {}) {
    const { Speech } = NativeModules;
    if (!Speech) return;
    
    Speech.speak(text, {
      language: options.language || 'en-US',
      pitch: options.pitch || 1.0,
      rate: options.rate || 1.0
    });
  }

  // Natural Language Processing
  async processNaturalLanguage(text) {
    // Simple intent detection
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('track') || lowerText.includes('follow')) {
      // Extract tail number
      const tailNumberMatch = lowerText.match(/\b[A-Z0-9]{1,6}\b/i);
      if (tailNumberMatch) {
        return {
          intent: 'TrackFlightIntent',
          params: { flightIdentifier: tailNumberMatch[0].toUpperCase() }
        };
      }
    }
    
    if (lowerText.includes('status') || lowerText.includes('where')) {
      // Check for family member names
      const familyKeywords = ['dad', 'mom', 'parents', 'family'];
      const foundKeyword = familyKeywords.find(keyword => lowerText.includes(keyword));
      
      if (foundKeyword) {
        return {
          intent: 'FamilyFlightIntent',
          params: { familyMember: foundKeyword }
        };
      }
    }
    
    if (lowerText.includes('land') || lowerText.includes('arrive') || lowerText.includes('eta')) {
      return {
        intent: 'ETAIntent',
        params: {}
      };
    }
    
    return null;
  }

  // Contextual Suggestions
  async getContextualSuggestions(context) {
    const suggestions = [];
    
    // Time-based suggestions
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 10) {
      suggestions.push({
        text: "Check morning departures",
        action: "VIEW_DEPARTURES"
      });
    }
    
    // Location-based suggestions
    if (context.nearAirport) {
      suggestions.push({
        text: `View flights at ${context.nearAirport}`,
        action: "VIEW_AIRPORT_FLIGHTS",
        params: { airport: context.nearAirport }
      });
    }
    
    // Active flight suggestions
    if (context.activeFlights && context.activeFlights.length > 0) {
      const flight = context.activeFlights[0];
      suggestions.push({
        text: `Check ${flight.tail_number} status`,
        action: "CHECK_STATUS",
        params: { tailNumber: flight.tail_number }
      });
    }
    
    return suggestions;
  }

  // Voice-Activated Features
  enableVoiceActivation() {
    const { VoiceActivation } = NativeModules;
    if (!VoiceActivation) return;
    
    VoiceActivation.enable({
      wakeWord: "Hey FlightTrace",
      sensitivity: 0.5,
      onWakeWordDetected: () => {
        this.startListening();
      }
    });
  }

  async startListening() {
    const { SpeechRecognition } = NativeModules;
    if (!SpeechRecognition) return;
    
    try {
      const result = await SpeechRecognition.start({
        language: 'en-US',
        continuous: false,
        interimResults: false
      });
      
      if (result.text) {
        const intent = await this.processNaturalLanguage(result.text);
        if (intent) {
          const response = await this.voiceCommands.get(intent.intent)(intent.params);
          this.speak(response.speech);
        }
      }
    } catch (error) {
      console.error('Speech recognition error:', error);
    }
  }

  // Utility Functions
  async startTracking(tailNumber) {
    // Implementation to start tracking a flight
    await fetch('/api/flights/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tail_number: tailNumber })
    });
  }

  async getFamilyMemberFlights(memberName) {
    // Implementation to get family member's flights
    const response = await fetch(`/api/family/flights?member=${memberName}`);
    return response.json();
  }
}

// Export singleton instance
export default new VoiceAssistantManager();

// Voice UI Components
export const VoiceButton = ({ onPress, isListening }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
    >
      <Ionicons 
        name={isListening ? "mic" : "mic-outline"} 
        size={24} 
        color={isListening ? "#FF0000" : "#FFFFFF"} 
      />
    </TouchableOpacity>
  );
};

const styles = {
  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  voiceButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF0000',
  }
};