// components/ImagePickerField.tsx
import React from "react";
import { View, TouchableOpacity, Image, ActivityIndicator, Text, Platform } from "react-native";
import { IMAGES, FONTS } from "../assets";

const isIPad = Platform.OS === "ios" && Platform.isPad;

type Props = {
  images: { image1: string; image2: string };
  setImages: (val: { image1: string; image2: string }) => void;
  imageLoading: number;
  isImageUploading: boolean;
  offlineselectMedia: (key: number) => void;
};

const ImagePickerField: React.FC<Props> = ({
  images,
  setImages,
  imageLoading,
  isImageUploading,
  offlineselectMedia,
}) => {
  return (
    <View style={{ marginTop: isIPad ? 30 : 10, flexDirection: "row", alignItems: "center" }}>
      {[1, 2].map((key) => {
        const imgKey = key === 1 ? "image1" : "image2";
        return (
          <View key={key} style={{ marginLeft: key === 2 ? 10 : 0 }}>
            <TouchableOpacity
              style={{ opacity: isImageUploading ? 0.5 : 1 }}
              onPress={() => offlineselectMedia(key)}
              disabled={isImageUploading}
            >
              {imageLoading == key ? (
                <ActivityIndicator style={styles.imgGrey} size="small" color="#223890" />
              ) : (
                <Image
                  resizeMode="contain"
                  style={images[imgKey] ? styles.imgGrey : styles.imgGreyy}
                  source={images[imgKey] ? { uri: images[imgKey] } : IMAGES.galImg}
                />
              )}
            </TouchableOpacity>

            {images[imgKey] ? (
              <TouchableOpacity
                onPress={() => setImages({ ...images, [imgKey]: "" })}
                style={{ alignSelf: "center", marginTop: 10 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image
                  style={{ height: isIPad ? 35 : 17, width: isIPad ? 35 : 17 }}
                  source={IMAGES.delete}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                disabled={isImageUploading}
                style={[styles.addView, { opacity: isImageUploading ? 0.5 : 1 }]}
                onPress={() => offlineselectMedia(key)}
              >
                <Text style={styles.addTxt}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = {
  imgGrey: {
    height: isIPad ? 100 : 100,
    width: isIPad ? 100 : 100,
    borderRadius: 20,
  },
  imgGreyy: {
    height: isIPad ? 100 : 50,
    width: isIPad ? 100 : 50,
    alignSelf: "center",
    borderRadius: 20,
    tintColor: "#989898",
  },
  addView: {
    alignItems: "center",
    marginTop: 5,
  },
  addTxt: {
    fontSize: isIPad ? 16 : 10,
    fontFamily: FONTS.PoppinsRegular,
    color: "#223890",
    textAlign: "center",
    marginTop: 10,
  },
};

export default ImagePickerField;
