import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function VideoDemo({ platform = 'mobile' }) {
  // Replace with your actual demo video URLs
  const videoUrl = platform === 'web'
    ? 'https://www.youtube.com/embed/your-web-demo-id'
    : 'https://www.youtube.com/embed/your-mobile-demo-id';
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{platform === 'web' ? 'Web Demo' : 'Mobile Demo'}</Text>
      <WebView
        style={styles.video}
        source={{ uri: videoUrl }}
        allowsFullscreenVideo
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', marginVertical: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#0099ff' },
  video: { width: 320, height: 180, borderRadius: 12, overflow: 'hidden' },
});
