# FlightTrace Mobile App - Expo Setup Guide

## Prerequisites

1. **Install Node.js** (v16 or later)
   - Download from [nodejs.org](https://nodejs.org/)

2. **Install Expo Go on your iPhone**
   - Download from the App Store: [Expo Go](https://apps.apple.com/app/expo-go/id982107779)

3. **Install Expo CLI** (if not already installed)
   ```bash
   npm install -g expo-cli
   ```

## Setup Instructions

### 1. Install Dependencies

Navigate to the frontend directory and install all dependencies:

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

1. Update the `.env` file in the frontend directory:
   ```
   # Replace with your computer's local IP address
   API_URL=http://192.168.1.XXX:8000
   ```

   To find your local IP address:
   - **Windows**: Run `ipconfig` in Command Prompt
   - **Mac**: Run `ifconfig | grep inet` in Terminal
   - Look for your IPv4 address (usually starts with 192.168.x.x)

2. Update Firebase configuration (optional for now):
   - If you have a Firebase project, add your credentials to `.env`
   - Otherwise, the app will use mock data

### 3. Start the Backend Server

In a separate terminal, start the backend API:

```bash
cd backend
python -m uvicorn src.api.fastapi_app:app --reload --host 0.0.0.0 --port 8000
```

**Important**: Use `--host 0.0.0.0` to make the API accessible from your phone on the same network.

### 4. Start the Expo Development Server

In the frontend directory:

```bash
npm start
# or
expo start
```

This will open the Expo Dev Tools in your browser.

### 5. Run on Your iPhone

1. **Connect to the same Wi-Fi network** as your computer
2. **Open Expo Go** on your iPhone
3. **Scan the QR code** displayed in:
   - The terminal
   - The Expo Dev Tools webpage
   - Or manually enter the URL shown

### 6. Troubleshooting

#### API Connection Issues
- Ensure your firewall allows connections on port 8000
- Verify the API_URL in `.env` matches your computer's IP
- Check that both devices are on the same network

#### Expo Connection Issues
- Try using tunnel mode: Press `d` in the terminal and select "tunnel"
- Clear Expo cache: `expo start -c`
- Restart Expo Go app on your phone

#### Build Errors
- Clear node_modules and reinstall:
  ```bash
  rm -rf node_modules
  npm install
  ```
- Reset Metro bundler cache:
  ```bash
  npx react-native start --reset-cache
  ```

## Development Tips

### Hot Reloading
- Shake your device to open the developer menu
- Enable "Fast Refresh" for instant updates

### Debugging
- Use `console.log()` statements - logs appear in the terminal
- Shake device and select "Debug Remote JS" for Chrome DevTools
- Use React Native Debugger for advanced debugging

### Performance
- The app may run slower in development mode
- For better performance testing, create a development build

## Testing Different Screens

Navigate through the app to test:
1. **Landing Page** - Initial screen
2. **Login/Register** - Authentication flow
3. **Map View** - Flight tracking map
4. **History** - Flight history
5. **Settings** - User preferences

## API Endpoints

The app connects to these main endpoints:
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /flights/live` - Live flight data
- `GET /flights/history` - Flight history

## Notes

- The app uses mock data when API is unavailable
- Premium features are gated behind subscription
- Location permissions are required for nearby flight features
- Push notifications require additional setup

## Next Steps

Once you've verified the app works on Expo Go:
1. Test all main features
2. Report any bugs or issues
3. Consider creating a development build for better performance
4. Set up push notifications (optional)
5. Configure analytics and crash reporting (optional)

## Support

If you encounter issues:
1. Check the console logs in the terminal
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check network connectivity between devices