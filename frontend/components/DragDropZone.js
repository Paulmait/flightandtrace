import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DragDropZone({ onDrop }) {
  const dropRef = useRef();

  // Web only: use native drag events
  React.useEffect(() => {
    const node = dropRef.current;
    if (!node || typeof window === 'undefined') return;
    function handleDrop(e) {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) {
        onDrop && onDrop(e.dataTransfer.files);
      }
    }
    function handleDragOver(e) { e.preventDefault(); }
    node.addEventListener('drop', handleDrop);
    node.addEventListener('dragover', handleDragOver);
    return () => {
      node.removeEventListener('drop', handleDrop);
      node.removeEventListener('dragover', handleDragOver);
    };
  }, [onDrop]);

  return (
    <View ref={dropRef} style={styles.zone}>
      <Text style={styles.text}>Drag & Drop files here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    borderWidth: 2,
    borderColor: '#0099ff',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#f0f8ff',
  },
  text: {
    color: '#0099ff',
    fontWeight: 'bold',
  },
});
