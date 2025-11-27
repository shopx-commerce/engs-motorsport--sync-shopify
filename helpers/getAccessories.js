import operation from "../operations/products.js";
import client from "../helpers/shopifyAdmin.js";

async function getAccessories(handleArray) {
  const variables = { query: `handle:${handleArray.toString()}` };
  const { data } = await client.request(operation, {
    variables,
  });

  const nodes = data?.products?.nodes ?? [];
  return nodes.map((node) => node.id);
}

export default getAccessories;
