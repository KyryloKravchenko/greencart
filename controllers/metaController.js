let exchangeRateCache = {
  usdToUah: null,
  fetchedAt: 0,
};

const CACHE_TTL_MS = 60 * 60 * 1000;

export const getUsdToUahRate = async (req, res) => {
  try {
    const now = Date.now();

    if (
      exchangeRateCache.usdToUah &&
      now - exchangeRateCache.fetchedAt < CACHE_TTL_MS
    ) {
      return res.json({
        success: true,
        usdToUah: exchangeRateCache.usdToUah,
        source: "cache",
      });
    }

    const response = await fetch(
      "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json"
    );

    if (!response.ok) {
      throw new Error("Failed to fetch NBU exchange rate");
    }

    const data = await response.json();
    const rate = Number(data?.[0]?.rate);

    if (!rate || Number.isNaN(rate)) {
      throw new Error("Invalid NBU exchange rate response");
    }

    exchangeRateCache = {
      usdToUah: rate,
      fetchedAt: now,
    };

    return res.json({
      success: true,
      usdToUah: rate,
      source: "nbu",
    });
  } catch (error) {
    if (exchangeRateCache.usdToUah) {
      return res.json({
        success: true,
        usdToUah: exchangeRateCache.usdToUah,
        source: "stale-cache",
      });
    }

    return res.json({
      success: false,
      message: error.message,
    });
  }
};
