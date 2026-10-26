// Lets AI search ScootMeal's actual menu and 
import type { FunctionTool } from "openai/resources/responses/responses.js";
import { getAssistantContext } from "./ai-assistant.data.js";

export type AssistantContext = ReturnType<typeof getAssistantContext>;

// understands the request and asks to call the search_menu.
export type MenuSearchFilters = {
  dish?: string;
  budget?: number;
  diet?: string[];
  allergen?: string[];
};

export function searchMenu(
  context: AssistantContext,
  filters: MenuSearchFilters
) {
  const query = filters.dish?.trim().toLowerCase() ?? "";
  const words = query.split(/\s+/).filter(Boolean);

  const diet = (filters.diet ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  const allergens = (filters.allergen ?? [])
    .map((allergen) => allergen.trim().toLowerCase())
    .filter(Boolean);

  if (
    filters.budget !== undefined &&
    (!Number.isFinite(filters.budget) || filters.budget < 0)
  ) {
    throw new Error("Budget must be a non-negative number.");
  }

  // The current database has no verified allergen lists.
  // Missing information must never mean a dish is allergy-safe.
  if (
    allergens.length > 0 ||
    diet.some((tag) => /allerg|free.from/.test(tag))
  ) {
    return {
      dishes: [],
      totalMatches: 0,
      note:
        "Verified allergen information is unavailable. " +
        "No allergy-safe matches can be confirmed. " +
        "Please check with the restaurant.",
    };
  }

  // Only include dishes from currently open merchants.
  const openMerchantIds = new Set(
    context.merchants
      .filter((merchant) => merchant.openNow)
      .map((merchant) => merchant.id)
  );

  const matches = context.dishes
    .filter((dish) => {
      if (!openMerchantIds.has(dish.merchantId)) return false;
      if (dish.soldOut) return false;

      if (
        filters.budget !== undefined &&
        dish.price > filters.budget
      ) {
        return false;
      }

      // Every requested dietary condition must match.
      const matchesDiet = diet.every((tag) =>
        tag === "spicy"
          ? dish.spicy
          : dish.dietary.includes(tag)
      );

      if (!matchesDiet) return false;

      const searchableText =
        `${dish.name} ${dish.description} ${dish.category}`.toLowerCase();

      return words.every((word) => searchableText.includes(word));
    })
    .sort(
      (a, b) =>
        a.price - b.price || a.id.localeCompare(b.id)
    );

  return {
    dishes: matches.slice(0, 6),
    totalMatches: matches.length,
    note:
      "Results are sorted by lowest price. " +
      "Prices are per dish in RM, excluding delivery fees. " +
      "Allergen information is unverified.",
  };
}

// Tool definition sent to OpenAI.
// The execution handler will validate arguments and convert a null
// budget to undefined before passing the filters to searchMenu().
export const AI_TOOLS: FunctionTool[] = [
  {
    type: "function",
    name: "search_menu",
    description:
      "Search ScootMeal's available dishes from open restaurants. " +
      "Use this tool for food recommendations. " +
      "Apply every budget, dietary, and allergen constraint requested. " +
      "Translate generic food keywords into English, but preserve dish names. " +
      "Do not silently remove constraints when no dishes match.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        dish: {
          type: "string",
          description:
            "Only actual dish names, ingredients, or food categories, " +
            "such as chicken, rice, noodles, or nasi lemak. " +
            "Do not include request words such as food, something, recommend, or want. " +
            "Do not include dietary or taste filters such as spicy, vegetarian, or halal; " +
            "put those in diet instead. " +
            "Use an empty string if no specific dish, ingredient, or category is requested. " +
            "Examples: 'nak something 辣' => dish: '', diet: ['spicy']; " +
            "'spicy chicken' => dish: 'chicken', diet: ['spicy'].",
        },
        budget: {
          type: ["number", "null"],
          description:
            "Maximum price per dish in Malaysian Ringgit, excluding delivery. " +
            "Use null when the customer has not specified a budget.",
        },
        diet: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Required dietary tags, such as vegetarian, plant_based, " +
            "halal, or spicy. Use an empty array when none are requested. " +
            "Never infer halal certification from a restaurant name.",
        },
        allergen: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Allergens the customer needs to avoid, such as peanuts or milk. " +
            "Use an empty array when none are mentioned. " +
            "The current data has no verified allergen lists.",
        },
      },
      required: ["dish", "budget", "diet", "allergen"],
    },
  },
];

function validateStringList(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 10 ||
    value.some(
      (item) => typeof item !== "string" || item.length > 100
    )
  ) {
    throw new Error(`Invalid ${field} filter.`);
  }

  return value
    .map((item: string) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function executeAssistantTool(
  name: string,
  argumentsJson: string,
  context: AssistantContext
) {
  // Only explicitly supported tools may run.
  if (name !== "search_menu") {
    throw new Error("Unsupported AI tool.");
  }

  const parsed: unknown = JSON.parse(argumentsJson);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error("Invalid tool arguments.");
  }

  const args = parsed as Record<string, unknown>;

  const allowedFields = ["dish", "budget", "diet", "allergen"];

  if (Object.keys(args).some((key) => !allowedFields.includes(key))) {
    throw new Error("Unexpected tool argument.");
  }

  if (typeof args.dish !== "string" || args.dish.length > 200) {
    throw new Error("Invalid dish search.");
  }

  if (
    args.budget !== null &&
    (
      typeof args.budget !== "number" ||
      !Number.isFinite(args.budget) ||
      args.budget < 0
    )
  ) {
    throw new Error("Invalid budget.");
  }

  const diet = validateStringList(args.diet, "diet");
  const allergen = validateStringList(args.allergen, "allergen");

  return searchMenu(context, {
    dish: args.dish,
    budget: args.budget === null ? undefined : (args.budget as number),
    diet,
    allergen,
  });
}