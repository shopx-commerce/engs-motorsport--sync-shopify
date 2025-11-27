const operation = `
  query getProductByIdentifier($handle: String!, $includeVariants: Boolean!) {
    productByIdentifier(identifier: {handle: $handle}) {
      id
      tags
      variants(first: 250) @include(if: $includeVariants) {
        nodes {
          id
          inventoryPolicy
          inventoryQuantity
          metafield(namespace: "custom", key: "in_stock") {
            key
            value
          }
          sku
        }
      }
    }
  }
`;

export default operation;
