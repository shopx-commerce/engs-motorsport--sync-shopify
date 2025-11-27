import getAccessories from "./getAccessories.js";
import getExistingProductData from "./getExistingProductData.js";

/**
 * @typedef {Object} Product
 * @property {BigInt} id - Unique identifier
 * @property {string|null} title - Product title
 * @property {string|null} url_handle - URL handle for the product
 * @property {string|null} description - Product description
 * @property {number|null} no_login_price - Price shown without login
 * @property {number|null} buy_price - Purchase price
 * @property {number|null} sales_price - Selling price
 * @property {string|null} currency_sign - Currency symbol
 * @property {string|null} currency - Currency code
 * @property {boolean|null} in_stock - Stock availability
 * @property {string[]} image_urls - Array of image URLs
 * @property {string|null} sku - Stock keeping unit
 * @property {string|null} shelf_space - Storage location
 * @property {string|null} specification - Product specifications
 * @property {string|null} shipping_class - Shipping category
 * @property {number|null} max_shipping_weight - Maximum shipping weight
 * @property {string|null} option_name - Name of product option
 * @property {Object[]} option_values - Array of option values
 * @property {Date|null} created_at - Creation timestamp
 * @property {Date|null} updated_at - Last update timestamp
 * @property {'create'|'update'|'delete'|null} action_required - Required action
 * @property {string|null} original_title - Original product title
 * @property {string|null} original_description - Original product description
 * @property {string|null} original_specification - Original product specification
 * @property {string|null} original_shipping_class - Original shipping class
 * @property {string|null} original_option_name - Original option name
 * @property {string|null} weight_unit - Weight measurement unit
 * @property {number|null} actual_weight - Actual product weight
 * @property {string[]|null} tags - Array of product tags
 * @property {string[]|null} accessories - Array of accessory product handles
 */

const generateProductSetInput = async (product) => {
  const identifier =
    product.action_required === "update" || product.action_required === "delete"
      ? {
          handle: product.url_handle,
        }
      : null;

  const option_values =
    product.option_values.length > 0 ? product.option_values : null;

  const productOptions = [
    {
      position: 1,
      name: product.option_name || "Title",
      values:
        option_values !== null
          ? option_values.map((option) => ({
              name: option.variant_value,
            }))
          : [
              {
                name: "Default Title",
              },
            ],
    },
  ];

  const { wholesaleTag, variants: existingVariants } = identifier
    ? await getExistingProductData(product.url_handle, true)
    : { wholesaleTag: "wholesale::18", variants: [] };

  const variants =
    option_values !== null
      ? option_values.map((option) => {
          const currentVariant = existingVariants.find(
            (variant) => variant.sku === option.sku
          );

          return {
            optionValues: {
              name: option.variant_value,
              optionName: product.option_name,
            },
            price: option.sales_price,
            inventoryItem: {
              tracked: true,
              sku: option.sku,
              cost: option.buy_price,
              measurement: product.actual_weight
                ? {
                    weight: {
                      value: product.actual_weight,
                      unit: "GRAMS",
                    },
                  }
                : null,
            },
            inventoryPolicy:
              currentVariant?.inventoryQuantity > 0 || option.in_stock
                ? "CONTINUE"
                : "DENY",
            metafields: [
              {
                key: "in_stock",
                namespace: "custom",
                value: option.in_stock ? "true" : "false",
                type: "boolean",
              },
              {
                key: "shelf_space",
                namespace: "custom",
                value: option.shelf_space || "",
                type: "single_line_text_field",
              },
              {
                key: "specification",
                namespace: "custom",
                value: product.specification || "",
                type: "single_line_text_field",
              },
              {
                key: "shipping_class",
                namespace: "custom",
                value: product.shipping_class || "",
                type: "single_line_text_field",
              },
              {
                key: "shipping_class_weight",
                namespace: "custom",
                value: product.max_shipping_weight.toString() || "",
                type: "single_line_text_field",
              },
            ],
          };
        })
      : [
          {
            optionValues: [
              {
                name: "Default Title",
                optionName: "Title",
              },
            ],
            price: product.sales_price,
            inventoryItem: {
              tracked: true,
              sku: product.sku,
              cost: product.buy_price,
              measurement: product.actual_weight
                ? {
                    weight: {
                      value: product.actual_weight,
                      unit: "GRAMS",
                    },
                  }
                : null,
            },
            inventoryPolicy:
              (existingVariants.length > 0 &&
                existingVariants[0]?.inventoryQuantity > 0) ||
              product.in_stock
                ? "CONTINUE"
                : "DENY",
            metafields: [
              {
                key: "in_stock",
                namespace: "custom",
                value: product.in_stock ? "true" : "false",
                type: "boolean",
              },
              {
                key: "shelf_space",
                namespace: "custom",
                value: product.shelf_space || "",
                type: "single_line_text_field",
              },
              {
                key: "specification",
                namespace: "custom",
                value: product.specification || "",
                type: "single_line_text_field",
              },
              {
                key: "shipping_class",
                namespace: "custom",
                value: product.shipping_class || "",
                type: "single_line_text_field",
              },
              {
                key: "shipping_class_weight",
                namespace: "custom",
                value: `${product.max_shipping_weight} ${
                  product.weight_unit === "g" ? "GRAMS" : product.weight_unit
                }`,
                type: "single_line_text_field",
              },
            ],
          },
        ];

  const accessories =
    product.accessories?.length > 0
      ? await getAccessories(product.accessories)
      : [];

  return {
    identifier,
    input: {
      title: product.title,
      descriptionHtml: product.description,
      files: product.image_urls.map((image) => ({
        contentType: "IMAGE",
        originalSource: image,
      })),
      handle: product.url_handle,
      status: product.action_required === "delete" ? "DRAFT" : "ACTIVE",
      metafields: [
        {
          key: "accessories",
          namespace: "custom",
          value: accessories || [],
          type: "list.product_reference",
        },
      ],
      // prefix product tags with filter::
      tags: [
        wholesaleTag,
        product.shipping_class,
        ...(product.tags || []).map((tag) => `filter::${tag}`),
      ].filter(Boolean),
      productOptions,
      variants,
    },
  };
};

export default generateProductSetInput;
