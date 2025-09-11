import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Plus, Trash2, Edit, Check, X, AlertCircle, Plane, MapPin, Clock } from 'lucide-react';

const FlightAlerts = ({ 
  subscription = 'free',
  userId,
  onAlertTriggered 
}) => {
  const [alerts, setAlerts] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check if alerts are available for user's subscription
  const isAvailable = subscription === 'pro' || subscription === 'enterprise';
  const maxAlerts = {
    pro: 10,
    enterprise: 50
  }[subscription] || 0;

  useEffect(() => {
    if (isAvailable && userId) {
      loadAlerts();
      checkNotificationPermission();
    }
  }, [isAvailable, userId]);

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
      }
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      // Load mock data for demo
      setAlerts(getMockAlerts());
    }
  };

  const getMockAlerts = () => {
    return [
      {
        id: '1',
        name: 'Boeing 747 Alert',
        type: 'aircraft_type',
        criteria: {
          aircraftType: 'B747',
          area: null
        },
        active: true,
        created: new Date().toISOString()
      },
      {
        id: '2',
        name: 'JFK Airport Traffic',
        type: 'airport',
        criteria: {
          airport: 'KJFK',
          radius: 50,
          eventType: 'all'
        },
        active: true,
        created: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Emergency Squawk',
        type: 'squawk',
        criteria: {
          squawkCode: '7700',
          global: true
        },
        active: true,
        created: new Date().toISOString()
      }
    ];
  };

  const createAlert = async (alertData) => {
    if (alerts.length >= maxAlerts) {
      alert(`Maximum ${maxAlerts} alerts allowed for ${subscription} plan`);
      return;
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(alertData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts([...alerts, data.alert]);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      // Add mock alert for demo
      const mockAlert = {
        id: Date.now().toString(),
        ...alertData,
        created: new Date().toISOString()
      };
      setAlerts([...alerts, mockAlert]);
      setShowCreateForm(false);
    }
  };

  const updateAlert = async (alertId, updates) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        setAlerts(alerts.map(a => 
          a.id === alertId ? { ...a, ...updates } : a
        ));
        setEditingAlert(null);
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      // Update locally for demo
      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, ...updates } : a
      ));
      setEditingAlert(null);
    }
  };

  const deleteAlert = async (alertId) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId));
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      // Delete locally for demo
      setAlerts(alerts.filter(a => a.id !== alertId));
    }
  };

  const toggleAlert = async (alertId) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      await updateAlert(alertId, { active: !alert.active });
    }
  };

  const sendNotification = (title, body, icon = '/icon-192.png') => {
    if (notificationsEnabled && 'Notification' in window) {
      new Notification(title, {
        body,
        icon,
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        tag: 'flight-alert'
      });
    }
    
    // Also add to in-app notifications
    const notification = {
      id: Date.now().toString(),
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [notification, ...prev].slice(0, 10));
    
    if (onAlertTriggered) {
      onAlertTriggered(notification);
    }
  };

  // Simulate alert checking (in production, this would be server-side)
  useEffect(() => {
    if (!isAvailable || alerts.length === 0) return;

    const checkAlerts = () => {
      alerts.forEach(alert => {
        if (!alert.active) return;
        
        // Simulate random alert triggers for demo
        if (Math.random() < 0.01) {
          switch (alert.type) {
            case 'aircraft_type':
              sendNotification(
                `Aircraft Alert: ${alert.criteria.aircraftType}`,
                `A ${alert.criteria.aircraftType} has been detected in your monitored area`
              );
              break;
            case 'airport':
              sendNotification(
                `Airport Alert: ${alert.criteria.airport}`,
                `New activity detected at ${alert.criteria.airport}`
              );
              break;
            case 'squawk':
              sendNotification(
                `Emergency Squawk ${alert.criteria.squawkCode}`,
                `Aircraft broadcasting emergency code ${alert.criteria.squawkCode}`
              );
              break;
          }
        }
      });
    };

    const interval = setInterval(checkAlerts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [alerts, isAvailable]);

  if (!isAvailable) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Flight Alerts</h3>
          <p className="text-gray-600 mb-4">
            Get notified about specific flights, aircraft types, or airport activity
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Available with Pro and Enterprise plans
          </p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Flight Alerts
          <span className="text-sm text-gray-500">
            ({alerts.length}/{maxAlerts})
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`p-2 rounded ${
              notificationsEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100'
            }`}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={alerts.length >= maxAlerts}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            New Alert
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-4 max-h-40 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Recent Notifications</h4>
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-2 mb-1 rounded text-sm ${
                notif.read ? 'bg-gray-50' : 'bg-blue-50 border-l-4 border-blue-500'
              }`}
            >
              <div className="font-medium">{notif.title}</div>
              <div className="text-gray-600 text-xs">{notif.body}</div>
              <div className="text-gray-400 text-xs mt-1">
                {new Date(notif.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert List */}
      <div className="space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`p-3 border rounded-lg ${
              alert.active ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
            }`}
          >
            {editingAlert === alert.id ? (
              <AlertEditForm
                alert={alert}
                onSave={(updates) => updateAlert(alert.id, updates)}
                onCancel={() => setEditingAlert(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <span className="font-medium">{alert.name}</span>
                    {alert.active && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {getAlertDescription(alert)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className="p-1 hover:bg-white rounded"
                  >
                    {alert.active ? 
                      <BellOff className="w-4 h-4 text-gray-600" /> : 
                      <Bell className="w-4 h-4 text-gray-600" />
                    }
                  </button>
                  <button
                    onClick={() => setEditingAlert(alert.id)}
                    className="p-1 hover:bg-white rounded"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-1 hover:bg-white rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Alert Form */}
      {showCreateForm && (
        <AlertCreateForm
          onSave={createAlert}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

// Helper components
const AlertCreateForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'aircraft_type',
    criteria: {},
    active: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Create New Alert</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Alert Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Alert Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="aircraft_type">Aircraft Type</option>
              <option value="flight">Specific Flight</option>
              <option value="airport">Airport Activity</option>
              <option value="route">Route</option>
              <option value="squawk">Squawk Code</option>
              <option value="altitude">Altitude Change</option>
            </select>
          </div>

          {/* Dynamic criteria fields based on type */}
          {formData.type === 'aircraft_type' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Aircraft Type Code</label>
              <input
                type="text"
                placeholder="e.g., B747, A380"
                onChange={(e) => setFormData({
                  ...formData,
                  criteria: { ...formData.criteria, aircraftType: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {formData.type === 'airport' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Airport Code</label>
                <input
                  type="text"
                  placeholder="e.g., KJFK, EGLL"
                  onChange={(e) => setFormData({
                    ...formData,
                    criteria: { ...formData.criteria, airport: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Radius (km)</label>
                <input
                  type="number"
                  placeholder="50"
                  onChange={(e) => setFormData({
                    ...formData,
                    criteria: { ...formData.criteria, radius: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AlertEditForm = ({ alert, onSave, onCancel }) => {
  const [name, setName] = useState(alert.name);

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 px-2 py-1 border rounded"
      />
      <button
        onClick={() => onSave({ name })}
        className="p-1 text-green-600 hover:bg-green-100 rounded"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={onCancel}
        className="p-1 text-red-600 hover:bg-red-100 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const getAlertIcon = (type) => {
  switch (type) {
    case 'aircraft_type':
    case 'flight':
      return <Plane className="w-4 h-4 text-blue-500" />;
    case 'airport':
    case 'route':
      return <MapPin className="w-4 h-4 text-green-500" />;
    case 'squawk':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'altitude':
      return <Clock className="w-4 h-4 text-orange-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

const getAlertDescription = (alert) => {
  switch (alert.type) {
    case 'aircraft_type':
      return `Alert when ${alert.criteria.aircraftType} aircraft detected`;
    case 'airport':
      return `Monitor ${alert.criteria.airport} within ${alert.criteria.radius}km`;
    case 'squawk':
      return `Alert for squawk code ${alert.criteria.squawkCode}`;
    default:
      return 'Custom alert criteria';
  }
};

export default FlightAlerts;