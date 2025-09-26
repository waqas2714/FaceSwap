import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri1, setPhotoUri1] = useState<string | null>(null);
  const [photoUri2, setPhotoUri2] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.actionButton} onPress={requestPermission}>
          <Text style={styles.actionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  async function takePicture() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (!photoUri1) {
        setPhotoUri1(photo.uri);
      } else if (!photoUri2) {
        setPhotoUri2(photo.uri);
      }
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (!photoUri1) {
        setPhotoUri1(uri);
      } else if (!photoUri2) {
        setPhotoUri2(uri);
      }
    }
  }

  function resetFlow() {
    setPhotoUri1(null);
    setPhotoUri2(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera stays mounted always */}
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

      {/* Overlay controls & UI */}
      {photoUri1 && photoUri2 ? (
        <View style={styles.overlay}>
          <Text style={styles.finalMessage}>✨ Both images captured! ✨</Text>
          <View style={styles.finalPreviewRow}>
            <Image source={{ uri: photoUri1 }} style={styles.finalPreviewImage} />
            <Image source={{ uri: photoUri2 }} style={styles.finalPreviewImage} />
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={resetFlow}>
            <Text style={styles.actionButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
            <Text style={styles.iconButtonText}>↺</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureOuter}>
              <View style={styles.captureInner} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={pickFromGallery}>
            <Text style={styles.iconButtonText}>🖼</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Prompt */}
      {!photoUri1 ? (
        <Text style={styles.prompt}>📸 Give your image</Text>
      ) : !photoUri2 ? (
        <Text style={styles.prompt}>🖼 Now give the image to be merged</Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: StatusBar.currentHeight || 16,
    paddingBottom: 16,
  },
  camera: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    textAlign: 'center',
    padding: 10,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  finalMessage: {
    textAlign: 'center',
    padding: 12,
    color: '#ffd700',
    fontSize: 22,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 32,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 30,
  },
  iconButtonText: {
    fontSize: 22,
    color: 'white',
  },
  captureButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  actionButton: {
    marginTop: 20,
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 30,
    elevation: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  finalPreviewRow: {
    flexDirection: 'row',
    marginVertical: 20,
  },
  finalPreviewImage: {
    width: 150,
    height: 200,
    borderRadius: 12,
    marginHorizontal: 8,
    resizeMode: 'cover',
  },
  prompt: {
    position: 'absolute',
    top: 64,
    width: '100%',
    textAlign: 'center',
    fontSize: 22,
    color: 'white',
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
});
