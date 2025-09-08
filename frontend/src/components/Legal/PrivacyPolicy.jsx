import React from 'react';
import './LegalPages.css';

const PrivacyPolicy = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <h1>Privacy Policy</h1>
          <div className="legal-dates">
            <p><strong>Effective Date:</strong> August 24, 2025</p>
            <p><strong>Last Updated:</strong> September 8, 2025</p>
          </div>
        </header>

        <div className="legal-content">
          <p className="legal-intro">
            Cien Rios LLC, doing business as Flight and Trace ("Flight and Trace," "we," "us," or "our"), 
            is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and 
            safeguard information when you use our services, including our website, mobile apps, and APIs 
            (collectively, the "Services").
          </p>

          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            
            <h3>Flight Data (non-personal)</h3>
            <p>
              Flight and Trace processes public aviation data (e.g., ADS-B, OpenSky, or other sources). 
              This data is not personally identifiable.
            </p>

            <h3>Account Information</h3>
            <p>
              If you create an account, we may collect your email, username, password, and optional profile details.
            </p>

            <h3>Device & Usage Data</h3>
            <p>
              IP address, browser type, operating system, app usage metrics, crash logs, and analytics.
            </p>

            <h3>Payment Information</h3>
            <p>
              If you purchase premium features, payments are processed securely by third-party providers 
              (e.g., Stripe, Apple, Google). We do not store raw payment card data.
            </p>

            <h3>Cookies & Tracking Technologies</h3>
            <p>
              We use cookies and similar technologies to analyze traffic, personalize content, and improve 
              performance. You can control cookie settings in your browser.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Information</h2>
            <ul>
              <li>Provide and operate the Services.</li>
              <li>Estimate fuel/CO₂ usage and display aviation insights.</li>
              <li>Improve performance, reliability, and user experience.</li>
              <li>Communicate with you about updates, new features, and support.</li>
              <li>Detect, investigate, and prevent fraud, abuse, or violations of our Terms.</li>
            </ul>
            <p>
              Some insights and analytics may be generated using automated systems or AI models. 
              These are estimates only and should not be used for navigation or operational decisions.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Data Sharing</h2>
            <p>We do not sell your personal data. We may share limited data:</p>
            <ul>
              <li>With trusted vendors (e.g., cloud hosting, analytics, payment processors) under confidentiality agreements.</li>
              <li>When required by law, regulation, or court order.</li>
              <li>In connection with a business transfer (e.g., merger, acquisition).</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Security</h2>
            <p>
              We implement industry-standard safeguards to protect your data (see Security Policy). 
              However, no system is 100% secure. You are responsible for safeguarding your login credentials.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Data Retention</h2>
            <p>
              We retain account and usage data as long as your account is active or as required by law. 
              You may request deletion at any time by contacting{' '}
              <a href="mailto:support@cienrios.com">support@cienrios.com</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict 
              processing of your data. Contact us to exercise these rights.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Children's Privacy</h2>
            <p>
              Flight and Trace is not directed to children under 13 (or the minimum age in your country). 
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Changes to this Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Updates will be posted here with 
              a new "Last Updated" date.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Contact</h2>
            <div className="contact-info">
              <p><strong>Cien Rios LLC d/b/a Flight and Trace</strong></p>
              <p>17113 Miramar Parkway, Miramar FL 33027</p>
              <p>Email: <a href="mailto:support@cienrios.com">support@cienrios.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;