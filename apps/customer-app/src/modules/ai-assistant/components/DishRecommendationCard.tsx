import React, { useState } from "react";
import i18n from "i18next";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Dish, Merchant } from "../../../shared/api/types";
import { isPhoto, mediaUrl } from "../../../shared/media";
import { colors, radius, spacing, font } from "../../../shared/theme/theme";

export type Recommendation = {
  dish: Dish;
  merchant: Merchant;
};

type Props = {
  recommendation: Recommendation;
  disabled: boolean;
  status?: string;
  onAdd: (recommendation: Recommendation) => void;
};

export default function DishRecommendationCard({
  recommendation,
  disabled,
  status,
  onAdd,
}: Props) {
  const { dish, merchant } = recommendation;
  const [imageFailed, setImageFailed] = useState(false);

  const photoUri = mediaUrl(dish.image);
  const hasPhoto = isPhoto(photoUri) && !imageFailed;

  const unavailable = dish.soldOut || !merchant.openNow;

  return (
    <View style={styles.card}>
      {hasPhoto ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          accessibilityLabel={dish.name}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.muted}>{i18n.t("ai.noPhoto")}</Text>
        </View>
      )}

      <Text style={styles.name}>{dish.name}</Text>

      <Text style={styles.muted}>{merchant.name}</Text>

      <Text style={styles.price}>
        RM{dish.price.toFixed(2)}
      </Text>

      <Text style={styles.muted}>
        Per dish · delivery fees excluded
      </Text>

      {!!dish.description && (
        <Text style={styles.description}>
          {dish.description}
        </Text>
      )}

      <Text style={styles.muted}>
        Allergen information is unverified. Check with the restaurant.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={i18n.t("dish.addToCartLabel", { name: dish.name })}
        disabled={disabled || unavailable}
        onPress={() => onAdd(recommendation)}
        style={[
          styles.button,
          (disabled || unavailable) && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {unavailable
            ? i18n.t("ai.unavailable")
            : disabled
              ? i18n.t("ai.wait")
              : i18n.t("ai.addToCart")}
        </Text>
      </Pressable>

      {!!status && (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.description}
        >
          {status}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 340,
    marginTop: spacing.md,
    padding: spacing.md,
    gap: 6,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    width: "100%",
    height: 145,
    borderRadius: radius.md,
  },
  placeholder: {
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    borderRadius: radius.md,
  },
  name: {
    ...font.display,
    fontSize: 16,
    color: colors.ink,
  },
  muted: {
    ...font.serif,
    fontSize: 12,
    color: colors.stone,
  },
  description: {
    ...font.serif,
    fontSize: 13,
    color: colors.ink,
  },
  price: {
    ...font.display,
    fontSize: 18,
    color: colors.turmericDeep,
  },
  button: {
    marginTop: 6,
    padding: 11,
    alignItems: "center",
    backgroundColor: colors.herb,
    borderRadius: radius.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...font.display,
    fontSize: 13,
    color: colors.white,
  },
});