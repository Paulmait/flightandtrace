import React from 'react';
import './LegalPages.css';

const TermsOfService = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <h1>Terms of Service</h1>
          <div className="legal-dates">
            <p><strong>Effective Date:</strong> August 24, 2025</p>
            <p><strong>Last Updated:</strong> September 8, 2025</p>
          </div>
        </header>

        <div className="legal-content">
          <p className="legal-intro">
            Welcome to Flight and Trace, provided by Cien Rios LLC d/b/a Flight and Trace ("Flight and Trace," 
            "we," "our," or "us"). By accessing or using our Services, you agree to be bound by these Terms of Service ("Terms").
          </p>

          <section className="legal-section">
            <h2>1. Eligibility</h2>
            <p>
              You must be at least 13 years old (or the minimum age in your jurisdiction) to use Flight and Trace. 
              By using the Services, you represent that you meet this requirement.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Services Provided</h2>
            <p>
              Flight and Trace provides real-time and historical aviation data, analytics, and visualization. 
              Flight data is based on public sources and estimates; Flight and Trace does not guarantee accuracy 
              and should not be used for navigation or operational decision-making.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Accounts</h2>
            <ul>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree not to share your account or use another person's account without permission.</li>
              <li>We may suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Services for unlawful, harmful, or abusive purposes.</li>
              <li>Interfere with or disrupt the operation of the Services.</li>
              <li>Scrape, resell, or misuse aviation data beyond permitted limits.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Payments & Subscriptions</h2>
            <ul>
              <li>Premium features may require payment via third-party platforms (Stripe, Apple, Google). All purchases are subject to the terms and policies of those providers.</li>
              <li>Subscriptions may include free trial periods. Unless canceled before the end of the trial, subscriptions automatically renew at the standard rate.</li>
              <li>Refunds, if available, are handled by the platform where you made the purchase.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Intellectual Property</h2>
            <p>
              All intellectual property rights in the Services belong to Flight and Trace or its licensors. 
              You may not copy, modify, or distribute our software, content, or branding without written permission.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Disclaimers</h2>
            <ul>
              <li>The Services are provided "AS IS" without warranties of any kind.</li>
              <li>Flight and Trace does not warrant accuracy, reliability, or completeness of aviation data or estimates (including fuel and CO₂ calculations).</li>
              <li>Flight and Trace is not responsible for losses or damages arising from reliance on the Services.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Flight and Trace and Cien Rios LLC are not liable for 
              indirect, incidental, or consequential damages. Our total liability for any claim shall not exceed 
              the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these Terms. You may also stop using 
              the Services at any time.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Governing Law & Dispute Resolution</h2>
            <ul>
              <li>These Terms are governed by the laws of the State of Florida, without regard to conflict of laws principles.</li>
              <li>Any disputes shall be resolved exclusively in the state or federal courts located in Miami-Dade County, Florida.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>11. Contact</h2>
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

export default TermsOfService;