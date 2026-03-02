import { loadCatalog, productToChatItem, rankProductsBySemanticQuery } from "../services/ai/aiCatalogService.js";
import {
  buildRecipeFromCatalog,
  decideAction,
  planDinnersByBudget,
  suggestProductsForDish,
} from "../services/ai/aiPlannerService.js";
import { buildPlainReply } from "../services/ai/aiResponseService.js";
import { canUseOpenAI, generateOpenAIReply } from "../services/ai/openAiChatService.js";

export const queryAssistant = async (req, res) => {
  try {
    const {
      message = "",
      action,
      mode = "chat",
      locale = "uk",
      includeProductIds = [],
      dinnersCount = 3,
      budget = 500,
      dish = "",
    } = req.body || {};

    if (!String(message).trim() && !String(dish).trim() && !action) {
      return res.json({ success: false, message: "message is required" });
    }

    const catalog = await loadCatalog({ includeProductIds });
    const resolvedAction = decideAction(action, message || dish);

    let payload;

    if (resolvedAction === "recipe_from_products") {
      payload = buildRecipeFromCatalog(catalog, message || dish, locale);
    } else if (resolvedAction === "products_for_dish") {
      payload = suggestProductsForDish(catalog, dish || message, locale);
    } else if (resolvedAction === "dinners_budget") {
      payload = planDinnersByBudget(catalog, dinnersCount, budget);
    } else {
      const found = rankProductsBySemanticQuery(catalog, message || dish, 8).map((product) =>
        productToChatItem(product, 1),
      );

      payload = {
        action: "semantic_search",
        products: found,
      };
    }

    const fallbackReply = buildPlainReply(payload, locale);

    let reply = fallbackReply;
    if (mode === "chat" && canUseOpenAI()) {
      try {
        const aiReply = await generateOpenAIReply({
          locale,
          message: message || dish,
          structuredPayload: payload,
        });
        if (aiReply) {
          reply = aiReply;
        }
      } catch (error) {
        console.log(error.message);
      }
    }

    return res.json({
      success: true,
      action: payload.action,
      mode,
      reply,
      data: payload,
    });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};
