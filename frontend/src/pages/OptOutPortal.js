/**
 * Opt-Out Portal
 * FlightAware-inspired privacy portal for aircraft owners
 */

import React, { useState } from 'react';

const OptOutPortal = () => {
  const [requestType, setRequestType] = useState('');
  const [formData, setFormData] = useState({
    aircraftRegistration: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    companyName: '',
    reason: '',
    documentation: null,
    requestScope: 'full', // full, partial, temporary
    effectiveDate: '',
    additionalInfo: ''
  });
  const [submitStatus, setSubmitStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const requestTypes = {
    block_aircraft: {
      title: 'Block Aircraft from Public Display',
      description: 'Completely remove your aircraft from public tracking displays',
      requirements: 'Proof of aircraft ownership required'
    },
    limit_data: {
      title: 'Limit Data Display',
      description: 'Show limited information (position only, no details)',
      requirements: 'Ownership verification required'
    },
    delay_tracking: {
      title: 'Add Tracking Delay',
      description: 'Display position with a 5-minute delay',
      requirements: 'Basic verification required'
    },
    temporary_block: {
      title: 'Temporary Block',
      description: 'Block tracking for a specific time period',
      requirements: 'Ownership verification and valid reason required'
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) { // 5MB limit
      setFormData(prev => ({
        ...prev,
        documentation: file
      }));
    } else {
      alert('File must be under 5MB');
    }
  };

  const validateForm = () => {
    const required = ['aircraftRegistration', 'ownerName', 'ownerEmail', 'reason'];
    return required.every(field => formData[field]?.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitStatus('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setSubmitStatus('');

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null) {
          submitData.append(key, value);
        }
      });
      submitData.append('requestType', requestType);

      const response = await fetch('/api/privacy/opt-out-request', {
        method: 'POST',
        body: submitData
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus(`Request submitted successfully. Reference ID: ${result.requestId}`);
        setFormData({
          aircraftRegistration: '',
          ownerName: '',
          ownerEmail: '',
          ownerPhone: '',
          companyName: '',
          reason: '',
          documentation: null,
          requestScope: 'full',
          effectiveDate: '',
          additionalInfo: ''
        });
        setRequestType('');
      } else {
        setSubmitStatus(result.message || 'Failed to submit request. Please try again.');
      }
    } catch (error) {
      setSubmitStatus('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="opt-out-portal">
      <div className="portal-header">
        <h1>Aircraft Privacy Portal</h1>
        <p className="portal-subtitle">
          Request to block or limit your aircraft's display on FlightTrace
        </p>
      </div>

      <div className="portal-content">
        <div className="info-section">
          <h2>Privacy Options</h2>
          <p>
            As an aircraft owner, you have several options to control how your aircraft 
            appears on FlightTrace. We respect privacy rights and work to balance 
            transparency with legitimate privacy concerns.
          </p>
          
          <div className="privacy-options">
            {Object.entries(requestTypes).map(([key, option]) => (
              <div 
                key={key} 
                className={`privacy-option ${requestType === key ? 'selected' : ''}`}
                onClick={() => setRequestType(key)}
              >
                <div className="option-header">
                  <input 
                    type="radio" 
                    name="requestType" 
                    value={key}
                    checked={requestType === key}
                    onChange={() => setRequestType(key)}
                  />
                  <h3>{option.title}</h3>
                </div>
                <p className="option-description">{option.description}</p>
                <p className="option-requirements">
                  <strong>Requirements:</strong> {option.requirements}
                </p>
              </div>
            ))}
          </div>
        </div>

        {requestType && (
          <div className="request-form-section">
            <h2>Privacy Request Form</h2>
            <p className="form-intro">
              Please provide the following information to process your privacy request.
              All information is kept confidential and used only for verification purposes.
            </p>

            <form onSubmit={handleSubmit} className="opt-out-form">
              <div className="form-section">
                <h3>Aircraft Information</h3>
                
                <div className="form-group">
                  <label htmlFor="aircraftRegistration">
                    Aircraft Registration/Tail Number *
                  </label>
                  <input
                    id="aircraftRegistration"
                    type="text"
                    placeholder="e.g., N123AB"
                    value={formData.aircraftRegistration}
                    onChange={(e) => handleInputChange('aircraftRegistration', e.target.value.toUpperCase())}
                    required
                  />
                  <small className="field-help">
                    Enter the complete registration number as it appears on the aircraft
                  </small>
                </div>
              </div>

              <div className="form-section">
                <h3>Owner/Operator Information</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ownerName">Owner/Operator Name *</label>
                    <input
                      id="ownerName"
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) => handleInputChange('ownerName', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="companyName">Company Name (if applicable)</label>
                    <input
                      id="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ownerEmail">Email Address *</label>
                    <input
                      id="ownerEmail"
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="ownerPhone">Phone Number</label>
                    <input
                      id="ownerPhone"
                      type="tel"
                      value={formData.ownerPhone}
                      onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Request Details</h3>
                
                <div className="form-group">
                  <label htmlFor="reason">Reason for Request *</label>
                  <textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    placeholder="Please explain why you're requesting this privacy protection..."
                    rows="4"
                    required
                  />
                </div>

                {requestType === 'temporary_block' && (
                  <div className="form-group">
                    <label htmlFor="effectiveDate">Effective Date Range</label>
                    <input
                      id="effectiveDate"
                      type="text"
                      placeholder="e.g., 2024-01-01 to 2024-01-31"
                      value={formData.effectiveDate}
                      onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="requestScope">Request Scope</label>
                  <select
                    id="requestScope"
                    value={formData.requestScope}
                    onChange={(e) => handleInputChange('requestScope', e.target.value)}
                  >
                    <option value="full">Complete blocking from all displays</option>
                    <option value="partial">Limited information display only</option>
                    <option value="delayed">Show with time delay</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="additionalInfo">Additional Information</label>
                  <textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                    placeholder="Any additional context or special requirements..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Documentation</h3>
                <p className="section-note">
                  To verify ownership, please provide one of the following documents:
                </p>
                <ul className="documentation-list">
                  <li>Aircraft registration certificate</li>
                  <li>Bill of sale</li>
                  <li>Lease agreement</li>
                  <li>Corporate ownership documentation</li>
                </ul>

                <div className="form-group">
                  <label htmlFor="documentation">Upload Documentation</label>
                  <input
                    id="documentation"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                  <small className="field-help">
                    Accepted formats: PDF, JPEG, PNG, DOC, DOCX (max 5MB)
                  </small>
                  {formData.documentation && (
                    <div className="file-selected">
                      ✓ File selected: {formData.documentation.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <div className="important-notes">
                  <h3>Important Information</h3>
                  <ul>
                    <li>Processing time: 5-10 business days after verification</li>
                    <li>You will receive email updates on your request status</li>
                    <li>Fraudulent requests may result in legal action</li>
                    <li>Some safety and security flights may remain visible as required by law</li>
                    <li>Emergency services and law enforcement may still have access to data</li>
                  </ul>
                </div>

                <div className="consent-section">
                  <label className="consent-checkbox">
                    <input type="checkbox" required />
                    <span className="checkmark"></span>
                    I certify that I am the owner or authorized representative of the aircraft 
                    listed above and that the information provided is accurate and complete.
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="submit-btn primary"
                  disabled={isLoading || !validateForm()}
                >
                  {isLoading ? 'Submitting...' : 'Submit Privacy Request'}
                </button>
                
                <button 
                  type="button" 
                  className="cancel-btn secondary"
                  onClick={() => {
                    setRequestType('');
                    setFormData({
                      aircraftRegistration: '',
                      ownerName: '',
                      ownerEmail: '',
                      ownerPhone: '',
                      companyName: '',
                      reason: '',
                      documentation: null,
                      requestScope: 'full',
                      effectiveDate: '',
                      additionalInfo: ''
                    });
                  }}
                >
                  Cancel
                </button>
              </div>

              {submitStatus && (
                <div className={`form-status ${submitStatus.includes('successfully') ? 'success' : 'error'}`}>
                  {submitStatus}
                </div>
              )}
            </form>
          </div>
        )}

        <div className="portal-footer">
          <div className="contact-info">
            <h3>Questions?</h3>
            <p>
              If you have questions about our privacy policies or need assistance 
              with your request, please contact us:
            </p>
            <ul>
              <li>Email: <a href="mailto:privacy@flightandtrace.com">privacy@flightandtrace.com</a></li>
              <li>Phone: 1-800-FLIGHT-1</li>
              <li>Mail: FlightTrace Privacy Department, [Address]</li>
            </ul>
          </div>

          <div className="legal-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/data-sources">Data Sources</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptOutPortal;