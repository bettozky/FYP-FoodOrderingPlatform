// A dish's photo (uploaded by the merchant to Supabase Storage), or its emoji when there is no photo.
import React from "react";
import { Image, Text, type ImageStyle, type StyleProp, type TextStyle } from "react-native";
import type { Dish } from "../api/types";

type Props = {
  dish: Pick<Dish, "image" | "imageUrl">;
  imageStyle: StyleProp<ImageStyle>;
  emojiStyle?: StyleProp<TextStyle>;
};

export default function DishImage({ dish, imageStyle, emojiStyle }: Props) {
  if (dish.imageUrl) return <Image source={{ uri: dish.imageUrl }} style={imageStyle} resizeMode="cover" />;
  return <Text style={emojiStyle}>{dish.image}</Text>;
}
