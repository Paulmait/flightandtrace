import React, { useState } from 'react';
import './Legal.css';

const Legal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('terms');

  if (!isOpen) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="legal-header">
          <h2>Legal Information</h2>
          <div className="legal-tabs">
            <button 
              className={`tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => setActiveTab('terms')}
            >
              Terms of Service
            </button>
            <button 
              className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              Privacy Policy
            </button>
            <button 
              className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </div>
        </div>

        <div className="legal-content">
          {activeTab === 'terms' && (
            <div className="legal-section">
              <h3>Terms of Service</h3>
              <p className="legal-date">Effective Date: August 24, 2025</p>
              
              <p>Welcome to Flight and Trace, provided by <strong>Cien Rios LLC d/b/a Flight and Trace</strong>. By using our Services, you agree to these Terms.</p>
              
              <h4>1. Eligibility</h4>
              <p>You must be at least 13 years old to use Flight and Trace.</p>
              
              <h4>2. Services Provided</h4>
              <p>Flight and Trace provides real-time aviation data and analytics. Data is based on public sources and estimates; we do <strong>not guarantee accuracy</strong> and it should not be used for navigation.</p>
              
              <h4>3. Acceptable Use</h4>
              <p>You agree not to use the Services for unlawful purposes, interfere with operations, or scrape/resell data beyond permitted limits.</p>
              
              <h4>4. Payments</h4>
              <p>Premium features may require payment via Stripe, Apple, or Google. Refunds are handled by the payment platform.</p>
              
              <h4>5. Disclaimers</h4>
              <p>Services are provided "AS IS" without warranties. We are not responsible for losses from reliance on the Services.</p>
              
              <h4>6. Governing Law</h4>
              <p>These Terms are governed by Florida law.</p>
              
              <div className="legal-contact">
                <strong>Contact:</strong><br />
                Cien Rios LLC d/b/a Flight and Trace<br />
                17113 Miramar Parkway, Miramar FL 33027<br />
                Email: support@cienrios.com
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="legal-section">
              <h3>Privacy Policy</h3>
              <p className="legal-date">Effective Date: August 24, 2025</p>
              
              <h4>1. Information We Collect</h4>
              <ul>
                <li><strong>Flight Data:</strong> Public aviation data (non-personal)</li>
                <li><strong>Account Info:</strong> Email, username, optional profile details</li>
                <li><strong>Device Data:</strong> IP address, browser type, usage metrics</li>
                <li><strong>Payments:</strong> Processed by third-parties (we don't store card data)</li>
              </ul>
              
              <h4>2. How We Use Information</h4>
              <ul>
                <li>Provide and operate the Services</li>
                <li>Display aviation insights and CO₂ estimates</li>
                <li>Improve performance and user experience</li>
                <li>Communicate updates and support</li>
              </ul>
              
              <h4>3. Data Sharing</h4>
              <p>We do <strong>not</strong> sell your personal data. We share limited data only with trusted vendors, when required by law, or during business transfers.</p>
              
              <h4>4. Your Rights</h4>
              <p>You may request to access, correct, or delete your data by contacting us.</p>
              
              <h4>5. Children's Privacy</h4>
              <p>Flight and Trace is not directed to children under 13.</p>
              
              <div className="legal-contact">
                <strong>Contact:</strong><br />
                Cien Rios LLC d/b/a Flight and Trace<br />
                17113 Miramar Parkway, Miramar FL 33027<br />
                Email: support@cienrios.com
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="legal-section">
              <h3>Security Policy</h3>
              <p className="legal-date">Effective Date: August 24, 2025</p>
              
              <h4>1. Infrastructure Security</h4>
              <ul>
                <li>Secure cloud hosting with safeguards</li>
                <li>Encrypted connections (HTTPS/TLS 1.2+)</li>
                <li>Firewalls and intrusion detection</li>
              </ul>
              
              <h4>2. Application Security</h4>
              <ul>
                <li>Data encrypted in transit and at rest</li>
                <li>Passwords hashed with bcrypt/Argon2</li>
                <li>Regular security audits and patching</li>
              </ul>
              
              <h4>3. Data Protection</h4>
              <ul>
                <li>Minimal personal data collection</li>
                <li>No raw payment card storage</li>
                <li>Daily secure backups</li>
              </ul>
              
              <h4>4. Responsible Disclosure</h4>
              <p>Security researchers can report vulnerabilities to <strong>security@cienrios.com</strong>. We acknowledge reports within 48 hours.</p>
              
              <h4>5. Compliance</h4>
              <p>We comply with GDPR, CCPA, and industry best practices for aviation data.</p>
              
              <div className="legal-contact">
                <strong>Security Contact:</strong> security@cienrios.com<br />
                <strong>General Contact:</strong> support@cienrios.com
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Legal;