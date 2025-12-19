import operation from "../operations/productByIdentifier.js";
import client from "../helpers/shopifyAdmin.js";

async function getExistingProductData(handle, includeVariants = false) {
  const variables = { handle, includeVariants };
  const { data } = await client.request(operation, { variables });
  const product = data?.productByIdentifier;

  if (!product) {
    return {
      wholesaleTag: "wholesale::18",
      variants: [],
      tags: [],
    };
  }

  const tags = product.tags || [];
  const wholesaleTag =
    tags?.find((tag) => tag.startsWith("wholesale::")) || "wholesale::18";

  const variants =
    product.variants?.nodes?.map((variant) => {
      const inStockMetafield = variant?.metafield?.value ? true : false;

      return {
        id: variant.id,
        sku: variant.sku,
        inventoryPolicy: variant.inventoryPolicy,
        inventoryQuantity: variant.inventoryQuantity,
        inStock: inStockMetafield,
      };
    }) || [];

  return {
    wholesaleTag,
    variants,
    tags,
  };
}

export default getExistingProductData;
