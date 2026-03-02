import {
  findBestProductByHint,
  productToChatItem,
  rankProductsBySemanticQuery,
} from "./aiCatalogService.js";

const RECIPE_LIBRARY = [
  {
    id: "veg-pasta",
    title: "Vegetable pasta",
    titleUk: "Овочева паста",
    keywords: ["pasta", "макарони", "спагетті"],
    ingredientHints: ["pasta", "tomato", "onion", "cheese"],
    steps: [
      "Boil pasta until al dente.",
      "Saute onion and tomato for 6-8 minutes.",
      "Combine pasta with sauce and add grated cheese.",
    ],
  },
  {
    id: "potato-omelet",
    title: "Potato omelet",
    titleUk: "Картопляний омлет",
    keywords: ["omelet", "омлет", "breakfast", "сніданок"],
    ingredientHints: ["potato", "onion", "eggs", "cheese"],
    steps: [
      "Lightly fry diced potato and onion.",
      "Whisk eggs and pour over vegetables.",
      "Cook on medium heat and finish with cheese.",
    ],
  },
  {
    id: "rice-bowl",
    title: "Rice veggie bowl",
    titleUk: "Рис з овочами",
    keywords: ["rice", "рис", "bowl"],
    ingredientHints: ["rice", "carrot", "onion", "spinach"],
    steps: [
      "Cook rice separately.",
      "Stir-fry vegetables for 5-7 minutes.",
      "Serve vegetables over warm rice.",
    ],
  },
  {
    id: "simple-salad",
    title: "Fresh salad",
    titleUk: "Свіжий салат",
    keywords: ["salad", "салат", "light", "легкий"],
    ingredientHints: ["tomato", "cucumber", "onion", "spinach"],
    steps: [
      "Slice vegetables and greens.",
      "Add salt, pepper and a spoon of oil.",
      "Mix and serve immediately.",
    ],
  },
];

const detectAction = (text = "") => {
  const value = text.toLowerCase();

  if (/бюджет|budget|ужин|dinner/.test(value)) return "dinners_budget";
  if (/рецепт|recipe|пригот|cook/.test(value)) return "recipe_from_products";
  if (/для страви|for dish|ingredients|інгредієнт/.test(value)) return "products_for_dish";
  if (/знайд|search|пошук|meaning|semantic/.test(value)) return "semantic_search";
  return "semantic_search";
};

const calcTotal = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.offerPrice || 0) * Number(item.quantity || 1), 0);

const uniqueByProductId = (items = []) => {
  const map = new Map();

  for (const item of items) {
    const existing = map.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(item.productId, { ...item });
    }
  }

  return Array.from(map.values());
};

const recipeToPlan = (recipe, catalog) => {
  const items = recipe.ingredientHints
    .map((hint) => findBestProductByHint(catalog, hint))
    .filter(Boolean)
    .map((product) => productToChatItem(product, 1));

  const uniqueItems = uniqueByProductId(items);
  return {
    recipe,
    items: uniqueItems,
    estimatedCost: calcTotal(uniqueItems),
  };
};

export const buildRecipeFromCatalog = (catalog, query, locale = "uk") => {
  const action = detectAction(query);

  let recipe = RECIPE_LIBRARY.find((item) =>
    item.keywords.some((keyword) => query.toLowerCase().includes(keyword)),
  );

  if (!recipe) {
    const productDriven = rankProductsBySemanticQuery(catalog, query, 3);
    if (productDriven.length > 0) {
      recipe = RECIPE_LIBRARY.find((item) =>
        item.ingredientHints.some((hint) =>
          productDriven.some((product) =>
            `${product.name || ""} ${product.nameUk || ""}`.toLowerCase().includes(hint.toLowerCase()),
          ),
        ),
      );
    }
  }

  if (!recipe) {
    recipe = RECIPE_LIBRARY[0];
  }

  const plan = recipeToPlan(recipe, catalog);
  const title = locale === "uk" ? recipe.titleUk : recipe.title;

  return {
    action,
    recipe: {
      id: recipe.id,
      title,
      steps: recipe.steps,
    },
    products: plan.items,
    estimatedCost: Number(plan.estimatedCost.toFixed(2)),
  };
};

export const suggestProductsForDish = (catalog, dishName, locale = "uk") => {
  const recipe = RECIPE_LIBRARY.find((item) =>
    item.keywords.some((keyword) => dishName.toLowerCase().includes(keyword)),
  ) || RECIPE_LIBRARY[0];

  const plan = recipeToPlan(recipe, catalog);

  return {
    action: "products_for_dish",
    dish: locale === "uk" ? recipe.titleUk : recipe.title,
    products: plan.items,
    estimatedCost: Number(plan.estimatedCost.toFixed(2)),
  };
};

export const planDinnersByBudget = (catalog, dinnersCount = 3, budget = 500) => {
  const normalizedDinners = Math.max(1, Number(dinnersCount) || 1);
  const normalizedBudget = Math.max(1, Number(budget) || 1);

  const candidates = RECIPE_LIBRARY.map((recipe) => recipeToPlan(recipe, catalog)).sort(
    (a, b) => a.estimatedCost - b.estimatedCost,
  );

  const chosenMeals = [];
  let total = 0;

  for (let i = 0; i < normalizedDinners; i += 1) {
    const candidate = candidates[i % candidates.length];
    if (total + candidate.estimatedCost > normalizedBudget && chosenMeals.length > 0) {
      break;
    }

    chosenMeals.push(candidate);
    total += candidate.estimatedCost;
  }

  const allItems = uniqueByProductId(
    chosenMeals.flatMap((meal) => meal.items.map((item) => ({ ...item }))),
  );

  const dinnersCovered = chosenMeals.length;

  return {
    action: "dinners_budget",
    dinnersRequested: normalizedDinners,
    dinnersCovered,
    budget: normalizedBudget,
    totalEstimatedCost: Number(total.toFixed(2)),
    meals: chosenMeals.map((meal) => ({
      id: meal.recipe.id,
      title: meal.recipe.titleUk,
      estimatedCost: Number(meal.estimatedCost.toFixed(2)),
    })),
    products: allItems,
  };
};

export const decideAction = (requestAction, message = "") => {
  if (requestAction) {
    return requestAction;
  }

  return detectAction(message);
};
