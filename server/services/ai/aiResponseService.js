const formatProducts = (products = [], locale = "uk") => {
  if (!products.length) return locale === "uk" ? "Нічого не знайдено." : "No items found.";

  return products
    .map((item) => {
      const name = locale === "uk" ? item.nameUk || item.name : item.name || item.nameUk;
      return `- ${name} x${item.quantity} (${item.offerPrice})`;
    })
    .join("\n");
};

export const buildPlainReply = (payload, locale = "uk") => {
  const isUk = locale === "uk";

  if (payload.action === "semantic_search") {
    return isUk
      ? `Ось релевантні товари:\n${formatProducts(payload.products, locale)}`
      : `Here are relevant products:\n${formatProducts(payload.products, locale)}`;
  }

  if (payload.action === "recipe_from_products") {
    const steps = (payload.recipe?.steps || []).map((step, idx) => `${idx + 1}. ${step}`).join("\n");
    return isUk
      ? `Рецепт: ${payload.recipe?.title}\nКроки:\n${steps}\n\nТовари:\n${formatProducts(payload.products, locale)}`
      : `Recipe: ${payload.recipe?.title}\nSteps:\n${steps}\n\nProducts:\n${formatProducts(payload.products, locale)}`;
  }

  if (payload.action === "products_for_dish") {
    return isUk
      ? `Для страви "${payload.dish}" рекомендую:\n${formatProducts(payload.products, locale)}`
      : `For "${payload.dish}" I recommend:\n${formatProducts(payload.products, locale)}`;
  }

  if (payload.action === "dinners_budget") {
    const meals = (payload.meals || [])
      .map((meal, idx) => `${idx + 1}. ${meal.title} (${meal.estimatedCost})`)
      .join("\n");

    return isUk
      ? `План на ${payload.dinnersCovered}/${payload.dinnersRequested} вечері в межах ${payload.budget}:\n${meals}\n\nКупити:\n${formatProducts(payload.products, locale)}`
      : `Plan for ${payload.dinnersCovered}/${payload.dinnersRequested} dinners within ${payload.budget}:\n${meals}\n\nTo buy:\n${formatProducts(payload.products, locale)}`;
  }

  return isUk ? "Запит оброблено." : "Query processed.";
};
