import React from 'react';
import './LegalPages.css';

const SecurityPolicy = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <h1>Security Policy</h1>
          <div className="legal-dates">
            <p><strong>Effective Date:</strong> August 24, 2025</p>
            <p><strong>Last Updated:</strong> September 8, 2025</p>
          </div>
        </header>

        <div className="legal-content">
          <p className="legal-intro">
            At Cien Rios LLC d/b/a Flight and Trace, we take the protection of user data seriously. 
            This Security Policy outlines our practices.
          </p>

          <section className="legal-section">
            <h2>1. Infrastructure Security</h2>
            <ul>
              <li>Hosted on secure, industry-standard cloud providers with physical and network safeguards.</li>
              <li>Encrypted connections (HTTPS/TLS 1.2+) for all traffic.</li>
              <li>Firewalls and intrusion detection systems actively monitored.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>2. Application Security</h2>
            <ul>
              <li>All sensitive data encrypted in transit and at rest.</li>
              <li>Passwords hashed using strong one-way algorithms (bcrypt or Argon2).</li>
              <li>Role-based access control for internal admin tools.</li>
              <li>Optional two-factor authentication (2FA) for user accounts.</li>
              <li>Regular security audits, penetration tests, and dependency patching.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Data Protection</h2>
            <ul>
              <li>Minimal collection of personal data.</li>
              <li>No storage of raw payment card data (Stripe, Apple, Google handle payments).</li>
              <li>Daily backups stored securely and tested periodically.</li>
              <li>Subprocessors (e.g., cloud hosting, analytics) are vetted and bound by confidentiality obligations.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Responsible Disclosure</h2>
            <p>We welcome security researchers to responsibly report vulnerabilities.</p>
            <p><strong>Email:</strong> <a href="mailto:security@cienrios.com">security@cienrios.com</a></p>
            <p>
              Please include steps to reproduce, impact assessment, and your contact details. 
              We will acknowledge reports within 72 hours.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Incident Response</h2>
            <ul>
              <li>Continuous monitoring of system logs and anomalies.</li>
              <li>Defined incident response plan with escalation procedures.</li>
              <li>Users will be notified promptly of any data breach that poses a risk to their privacy.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Policy Updates</h2>
            <p>
              We may update this Security Policy from time to time. The updated version will always be 
              available at /legal/security-policy.
            </p>
          </section>

          <section className="legal-section">
            <div className="contact-info">
              <p><strong>Cien Rios LLC d/b/a Flight and Trace</strong></p>
              <p>17113 Miramar Parkway, Miramar FL 33027</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SecurityPolicy;