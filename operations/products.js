const operation = `
  query getProducts($query: String = "") {
    products(first: 250, query: $query) {
      nodes {
        id
      }
    }
  }
`;

export default operation;
