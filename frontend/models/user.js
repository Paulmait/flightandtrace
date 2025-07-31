// User schema for Firebase Firestore
export const userSchema = {
  email: '',
  name: '',
  people: [
    // { id: 'uuid', name: 'Mom', flights: ['N12345', 'AA100'] }
  ],
  sharedDashboardUUID: '',
  plan: 'Free', // or 'Premium', 'Family', 'Enterprise'
};
