const PricingService = require('../../services/PricingService');
const db = require('../../db');

// In-memory catalog store with sample inventory
const productCatalogStore = new Map([
  [
    'prod-1',
    {
      id: 'prod-1',
      name: 'Veg Biryani',
      category: 'Rice & Meals',
      description: 'Fragrant basmati rice cooked with fresh seasonal vegetables and aromatic spices',
      originalPrice: 100.0,
      isAvailable: true,
      inStock: true,
      vendorId: 'vendor-1',
      imageUrl: null,
      ...PricingService.calculateRestaurantPricing(100.0),
    },
  ],
  [
    'prod-2',
    {
      id: 'prod-2',
      name: 'Butter Chicken',
      category: 'Main Course',
      description: 'Tender chicken simmered in rich creamy tomato and butter gravy',
      originalPrice: 200.0,
      isAvailable: true,
      inStock: true,
      vendorId: 'vendor-1',
      imageUrl: null,
      ...PricingService.calculateRestaurantPricing(200.0),
    },
  ],
  [
    'prod-3',
    {
      id: 'prod-3',
      name: 'Amul Milk',
      category: 'Dairy',
      description: 'Fresh pasteurized full cream milk 500ml pouch',
      originalPrice: 35.0,
      isAvailable: true,
      inStock: true,
      vendorId: 'vendor-dairy',
      imageUrl: null,
      ...PricingService.calculateRestaurantPricing(35.0),
    },
  ],
  [
    'prod-4',
    {
      id: 'prod-4',
      name: 'Toned Milk',
      category: 'Dairy',
      description: 'Pasteurized homogenized toned milk with reduced fat 500ml',
      originalPrice: 30.0,
      isAvailable: false, // Out of stock
      inStock: false,
      vendorId: 'vendor-dairy',
      imageUrl: null,
      ...PricingService.calculateRestaurantPricing(30.0),
    },
  ],
  [
    'prod-5',
    {
      id: 'prod-5',
      name: 'Paneer Tikka',
      category: 'Starters',
      description: 'Marinated cottage cheese cubes grilled to perfection',
      originalPrice: 150.0,
      isAvailable: true,
      inStock: true,
      vendorId: 'vendor-1',
      imageUrl: null,
      ...PricingService.calculateRestaurantPricing(150.0),
    },
  ],
  [
    'prod-6',
    {
      id: 'prod-6',
      name: 'Almond Milk',
      category: 'Beverages',
      description: 'Unsweetened dairy-free plant milk made from real California almonds',
      originalPrice: 90.0,
      isAvailable: false, // Out of stock
      inStock: false,
      vendorId: 'vendor-dairy',
      imageUrl: null,
      ...PricingService.calculateRestaurantPricing(90.0),
    },
  ],
]);

/**
 * Standard Levenshtein Distance calculation
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = [];
  for (let i = 0; i <= b.length; i++) {
    row[i] = i;
  }

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Normalizes text: lowercase, strip punctuation, collapse whitespace
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes text into word array
 */
function tokenize(text) {
  const normalized = normalizeText(text);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

/**
 * Evaluates token match against target text with substring and Levenshtein <= 2
 */
function scoreTokenMatch(queryToken, targetTokens, fullTargetNorm) {
  if (!queryToken || targetTokens.length === 0) return 0;

  // 1. Exact match with any token in target
  if (targetTokens.includes(queryToken)) {
    return 1.0;
  }

  // 2. Substring match
  if (fullTargetNorm.includes(queryToken)) {
    return 0.85;
  }

  // 3. Typo-tolerant Levenshtein distance <= 2
  let bestTypoScore = 0;
  for (const token of targetTokens) {
    // Only compare tokens with reasonable length similarity
    if (Math.abs(token.length - queryToken.length) <= 2) {
      const dist = levenshtein(queryToken, token);
      if (dist === 1) {
        bestTypoScore = Math.max(bestTypoScore, 0.75);
      } else if (dist === 2) {
        bestTypoScore = Math.max(bestTypoScore, 0.55);
      }
    }
  }

  return bestTypoScore;
}

class ProductsService {
  /**
   * Add or update product in memory store
   */
  static addProduct(product) {
    const orig = Number(product.originalPrice || 100);
    const item = {
      id: product.id || `prod-${Date.now()}`,
      name: product.name,
      category: product.category || 'General',
      description: product.description || '',
      originalPrice: orig,
      isAvailable: product.isAvailable !== undefined ? Boolean(product.isAvailable) : true,
      inStock: product.inStock !== undefined ? Boolean(product.inStock) : (product.isAvailable !== false),
      vendorId: product.vendorId || 'vendor-1',
      imageUrl: product.imageUrl || product.image_url || null,
      ...PricingService.calculateRestaurantPricing(orig),
      ...product,
    };
    productCatalogStore.set(item.id, item);
    return item;
  }

  /**
   * Reset or replace products store (for testing)
   */
  static setProducts(products) {
    productCatalogStore.clear();
    for (const p of products) {
      this.addProduct(p);
    }
  }

  static getCatalog() {
    return productCatalogStore;
  }

  /**
   * Update product image_url
   */
  static updateProductImage(productId, imageUrl) {
    if (productCatalogStore.has(productId)) {
      const p = productCatalogStore.get(productId);
      p.imageUrl = imageUrl;
      p.image_url = imageUrl;
      productCatalogStore.set(productId, p);
      return p;
    }
    return null;
  }

  /**
   * Lists products, optionally filtered by vendorId
   */
  static async listProducts(vendorId) {
    if (db.isConnected()) {
      const query = vendorId
        ? 'SELECT * FROM vendor_products WHERE vendor_id = $1 AND is_available = true'
        : 'SELECT * FROM vendor_products WHERE is_available = true';
      const params = vendorId ? [vendorId] : [];
      const res = await db.query(query, params);
      if (res.rows.length > 0) return res.rows;
    }

    const all = Array.from(productCatalogStore.values());
    if (vendorId) {
      return all.filter((p) => p.vendorId === vendorId);
    }
    return all;
  }

  /**
   * Retrieves single product by id
   */
  static async getProductById(id) {
    if (productCatalogStore.has(id)) {
      return productCatalogStore.get(id);
    }

    if (db.isConnected()) {
      const res = await db.query('SELECT * FROM vendor_products WHERE id = $1', [id]);
      if (res.rows[0]) return res.rows[0];
    }

    // Default stub fallback
    const orig = 150.0;
    const stub = {
      id,
      name: 'Paneer Tikka',
      originalPrice: orig,
      ...PricingService.calculateRestaurantPricing(orig),
      isAvailable: true,
      inStock: true,
    };
    productCatalogStore.set(id, stub);
    return stub;
  }

  /**
   * Fuzzy ranked search algorithm
   * Rules:
   * 1. Normalize & tokenize query
   * 2. Typo-tolerant matching (Levenshtein <= 2 or substring)
   * 3. Field weight scoring: Name (100) > Category (40) > Description (20)
   * 4. Prior-order boost parameter (+50)
   * 5. In-stock items ranked FIRST before out-of-stock items
   *
   * @param {string} query - search query string
   * @param {object} [options]
   * @param {string[]|string} [options.priorProductIds] - list of product IDs from prior customer orders
   * @param {string} [options.vendorId] - optional vendor filter
   * @returns {Promise<Array>} ranked search results
   */
  static async searchProducts(query, options = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }

    const normalizedQuery = normalizeText(query);
    const queryTokens = tokenize(query);

    if (queryTokens.length === 0) {
      return [];
    }

    // Parse prior order boost IDs
    let priorBoostSet = new Set();
    if (options.priorProductIds) {
      if (Array.isArray(options.priorProductIds)) {
        priorBoostSet = new Set(options.priorProductIds);
      } else if (typeof options.priorProductIds === 'string') {
        priorBoostSet = new Set(options.priorProductIds.split(',').map((s) => s.trim()));
      }
    }

    // Retrieve candidate products from DB or memory store
    let candidates = Array.from(productCatalogStore.values());
    if (db.isConnected()) {
      try {
        const dbRes = await db.query('SELECT * FROM vendor_products');
        if (dbRes.rows && dbRes.rows.length > 0) {
          candidates = dbRes.rows.map((row) => ({
            ...row,
            isAvailable: row.is_available !== undefined ? row.is_available : true,
            inStock: row.in_stock !== undefined ? row.in_stock : row.is_available,
            originalPrice: Number(row.original_price || row.price || 100),
          }));
        }
      } catch (e) {
        // Fall back to memory store
      }
    }

    if (options.vendorId) {
      candidates = candidates.filter((p) => p.vendorId === options.vendorId);
    }

    // Scoring weights
    const WEIGHT_NAME = 100;
    const WEIGHT_CATEGORY = 40;
    const WEIGHT_DESCRIPTION = 20;
    const BOOST_PRIOR_ORDER = 50;

    const scoredProducts = [];

    for (const product of candidates) {
      const nameNorm = normalizeText(product.name);
      const nameTokens = tokenize(product.name);

      const categoryNorm = normalizeText(product.category || '');
      const categoryTokens = tokenize(product.category || '');

      const descNorm = normalizeText(product.description || '');
      const descTokens = tokenize(product.description || '');

      let totalScore = 0;
      let matchedAnyToken = false;

      // Full phrase bonus on product name
      if (nameNorm.includes(normalizedQuery)) {
        totalScore += WEIGHT_NAME * 1.2;
        matchedAnyToken = true;
      }

      // Token-by-token matching across fields
      for (const qToken of queryTokens) {
        const nameScore = scoreTokenMatch(qToken, nameTokens, nameNorm);
        const categoryScore = scoreTokenMatch(qToken, categoryTokens, categoryNorm);
        const descScore = scoreTokenMatch(qToken, descTokens, descNorm);

        if (nameScore > 0 || categoryScore > 0 || descScore > 0) {
          matchedAnyToken = true;
          totalScore += nameScore * WEIGHT_NAME;
          totalScore += categoryScore * WEIGHT_CATEGORY;
          totalScore += descScore * WEIGHT_DESCRIPTION;
        }
      }

      if (!matchedAnyToken) {
        continue;
      }

      // Apply prior-order boost
      const hasPriorOrderBoost = priorBoostSet.has(product.id);
      if (hasPriorOrderBoost) {
        totalScore += BOOST_PRIOR_ORDER;
      }

      const isAvailable = product.isAvailable !== false && product.inStock !== false && product.is_available !== false;

      scoredProducts.push({
        ...product,
        searchScore: Math.round(totalScore * 10) / 10,
        priorOrderBoost: hasPriorOrderBoost,
        isAvailable,
      });
    }

    // In-stock first sort:
    // 1. In-stock products always appear before out-of-stock products
    // 2. Within each group, rank by searchScore descending
    scoredProducts.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return b.searchScore - a.searchScore;
    });

    return scoredProducts;
  }
}

module.exports = ProductsService;
