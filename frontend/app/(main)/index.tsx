import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri1, setPhotoUri1] = useState<string | null>(null);
  const [photoUri2, setPhotoUri2] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

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
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  async function takePicture() {
  if (cameraRef.current) {
    const photo = await cameraRef.current.takePictureAsync();
    if (!photoUri2) {
      setPhotoUri2(photo.uri); // take Face to Swap first
    } else if (!photoUri1) {
      setPhotoUri1(photo.uri); // then take Your Face
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
    if (!photoUri2) {
      setPhotoUri2(uri); // pick Face to Swap first
    } else if (!photoUri1) {
      setPhotoUri1(uri); // then Your Face
    }
  }
}

  function resetFlow() {
    setPhotoUri1(null);
    setPhotoUri2(null);
    setResultUri(null);
    setLoading(false);
  }

  async function callApi() {
    if (!photoUri1 || !photoUri2) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file1", {
        uri: photoUri1,
        name: "file1.jpg",
        type: "image/jpeg",
      } as any);
      formData.append("file2", {
        uri: photoUri2,
        name: "file2.jpg",
        type: "image/jpeg",
      } as any);

      const response = await fetch("http://192.168.1.9:8000/faceswap", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.image) throw new Error("No image in response");

      const base64Uri = "data:image/jpeg;base64," + data.image;
      setResultUri(base64Uri);
    } catch (err) {
      console.error("API error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

      {/* Final Result */}
      {resultUri ? (
        <View style={styles.overlay}>
          <Text style={styles.finalMessage}>🎭 Face Swap Result</Text>
          <Image source={{ uri: resultUri }} style={styles.resultImage} />
          <TouchableOpacity style={styles.actionButton} onPress={resetFlow}>
            <Text style={styles.actionButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      ) : photoUri1 && photoUri2 ? (
        <View style={styles.overlay}>
          <Text style={styles.finalMessage}>Both images ready!</Text>
          <View style={styles.finalPreviewRow}>
            <Image source={{ uri: photoUri1 }} style={styles.finalPreviewImage} />
            <Image source={{ uri: photoUri2 }} style={styles.finalPreviewImage} />
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={() => callApi()}>
              <Text style={styles.actionButtonText}>Swap Faces</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={resetFlow}>
            <Text style={styles.secondaryButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
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
      {!photoUri2 ? (
        <Text style={styles.prompt}>Face You Want to Swap</Text>
      ) : !photoUri1 ? (
        <Text style={styles.prompt}>Your Face</Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    paddingTop: StatusBar.currentHeight || 16,
    paddingBottom: 16,
  },
  camera: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  finalMessage: {
    textAlign: "center",
    padding: 12,
    color: "#ffd700",
    fontSize: 22,
    fontWeight: "700",
  },
  finalPreviewRow: {
    flexDirection: "row",
    marginVertical: 20,
  },
  finalPreviewImage: {
    width: 150,
    height: 200,
    borderRadius: 12,
    marginHorizontal: 8,
    resizeMode: "cover",
  },
  resultImage: {
    width: 300,
    height: 400,
    borderRadius: 12,
    marginVertical: 16,
    resizeMode: "contain",
  },
  controls: {
    position: "absolute",
    bottom: 0, // stick to bottom
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 12,
    borderRadius: 30,
  },
  iconButtonText: {
    fontSize: 22,
    color: "white",
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  actionButton: {
    marginTop: 16,
    backgroundColor: "#1e90ff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 14,
  },
  prompt: {
    position: "absolute",
    top: 64,
    width: "100%",
    textAlign: "center",
    fontSize: 20,
    color: "white",
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 6,
  },
});
