import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { BackHeader } from "../components/Header";
import { isIPad } from "../utilities/securestorage";
import { IMAGES } from "../assets";

interface ImageInfo {
  isVisible: boolean;
  image: any;
  onClose: () => void;
}
const ImagePreview: React.FC<ImageInfo> = ({ isVisible, image, onClose }) => {
  // function ImagePreview(props) {

  __DEV__ && console.log("image", image);

  const formattedImages = image.map((img) => ({
    url: img.url?img.url:img.image_url,
  }));

  __DEV__ && console.log("formattedImages", formattedImages);

  return (
    <Modal visible={isVisible} transparent={true}>
      <View
        style={{
          flex: 1,
          backgroundColor:'white',
          paddingTop: isIPad ? 50 : 30,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 15,
            marginTop: 15,
          }}
        >
          <TouchableOpacity
            style={{
              height: isIPad ? 60 : 48,
              width: isIPad ? 60 : 48,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#F4F4F4",
              borderRadius: isIPad ? 30 : 24,
            }}
            onPress={onClose}
          >
            <Image
              source={IMAGES.left_arrow}
              style={{
                height: isIPad ? 30 : 13.5,
                width: isIPad ? 30 : 15,
                resizeMode: "contain",
              }}
            />
          </TouchableOpacity>
        </View>
        <ImageViewer
          backgroundColor={"white"}
          style={{ flex: 1 }}
          saveToLocalByLongPress={true}
          enablePreload={true} // Preloads images for better quality
          imageUrls={formattedImages}
          onShowModal={false}
          renderIndicator={() => <View></View>}
          loadingRender={() => (
            <ActivityIndicator size={"large"} color={"#223890"} />
          )}
        />
      </View>
    </Modal>
  );
};

export default ImagePreview;

