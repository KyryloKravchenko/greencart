import Product from "../../models/Product.js";

const tokenize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

const asText = (value) => {
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  return String(value || "");
};

const includeById = (products, ids = []) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return products;
  }

  const idSet = new Set(ids.map(String));
  return products.filter((product) => idSet.has(String(product._id)));
};

export const loadCatalog = async (options = {}) => {
  const { onlyInStock = true, includeProductIds = [] } = options;

  const filter = {};
  if (onlyInStock) {
    filter.inStock = true;
  }

  const products = await Product.find(filter)
    .select("name nameUk description descriptionUk category offerPrice image inStock")
    .lean();

  return includeById(products, includeProductIds);
};

export const rankProductsBySemanticQuery = (products, query, limit = 8) => {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  const scored = products
    .map((product) => {
      const indexText = [
        product.name,
        product.nameUk,
        asText(product.description),
        asText(product.descriptionUk),
        product.category,
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      for (const token of queryTokens) {
        if (indexText.includes(token)) {
          score += token.length > 4 ? 3 : 2;
        }

        if ((product.category || "").toLowerCase() === token) {
          score += 4;
        }
      }

      return { product, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.product);

  return scored;
};

export const productToChatItem = (product, quantity = 1) => ({
  productId: String(product._id),
  name: product.name,
  nameUk: product.nameUk,
  category: product.category,
  offerPrice: product.offerPrice,
  quantity,
  image: Array.isArray(product.image) && product.image.length > 0 ? product.image[0] : "",
});

export const findBestProductByHint = (products, hint) => {
  const hintTokens = tokenize(hint);
  if (hintTokens.length === 0) {
    return null;
  }

  let winner = null;
  let bestScore = 0;

  for (const product of products) {
    const text = `${product.name || ""} ${product.nameUk || ""} ${asText(product.description)} ${asText(product.descriptionUk)}`.toLowerCase();

    let score = 0;
    for (const token of hintTokens) {
      if (text.includes(token)) {
        score += token.length > 4 ? 3 : 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      winner = product;
    }
  }

  return bestScore > 0 ? winner : null;
};
