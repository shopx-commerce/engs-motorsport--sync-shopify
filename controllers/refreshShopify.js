import prisma from "../helpers/prisma.js";
import client from "../helpers/shopifyAdmin.js";
import operation from "../operations/productSet.js";
import generateProductSetInput from "../helpers/generateProductSetInput.js";
import createLogger from "../helpers/logger.js";

// Flag to track if a refresh operation is currently running
let isRefreshInProgress = false;

// Helper function to create a delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const refreshShopify = async (req, res) => {
  // Check if a refresh is already in progress
  if (isRefreshInProgress) {
    return res.status(429).json({
      message:
        "A product refresh is already in progress. Please try again later.",
      status: "busy",
    });
  }

  // Set the flag to indicate a refresh is in progress
  isRefreshInProgress = true;

  // Send an immediate response
  res.status(200).send({
    message: "Product refresh started in the background",
    status: "started",
  });

  // Initialize separate loggers for different response types
  const responseLogger = createLogger("response");

  // Continue with the operation after sending the response
  try {
    // Implement batch processing instead of loading all products at once
    const batchSize = 1000;
    const logFlushInterval = 50; // Flush logs every 50 responses
    let skip = 0;
    let processedCount = 0;
    let hasMoreProducts = true;

    console.log("Starting batch processing of products");

    while (hasMoreProducts) {
      // Fetch a batch of products
      const productBatch = await prisma.products.findMany({
        orderBy: {
          id: "asc",
        },
        skip: skip,
        take: batchSize,
      });

      if (productBatch.length === 0) {
        hasMoreProducts = false;
        console.log(
          `Completed processing all products. Total: ${processedCount}`
        );
        break;
      }

      console.log(
        `Processing batch of ${productBatch.length} products (${skip} to ${skip + productBatch.length})`
      );

      // Process each product in the current batch
      for (const product of productBatch) {
        if (product.action_required === null) {
          continue;
        }

        const result = await generateProductSetInput(product);

        // Check if product should be skipped
        if (result.type === "skip_product") {
          console.log(result.message);
          continue;
        }

        // Process the product with Shopify
        const variables = result.data;
        const response = await client.request(operation, { variables });

        // Add a delay of 1 second after each Shopify request
        await sleep(1000);

        // Buffer the response instead of writing to disk immediately
        responseLogger.logResponse(response);

        processedCount++;

        // Flush logs periodically to avoid memory buildup
        if (responseLogger.getBufferSize() >= logFlushInterval) {
          await responseLogger.flushLogs();
        }
      }

      // Update action_required to null for all products in this batch
      const productIds = productBatch.map((product) => product.id);
      await prisma.products.updateMany({
        where: {
          id: {
            in: productIds,
          },
        },
        data: {
          action_required: null,
        },
      });

      console.log(
        `Set action_required to null for ${productIds.length} products`
      );

      // Flush logs at the end of each batch
      await responseLogger.flushLogs();

      // Move to the next batch
      skip += batchSize;
      console.log(`Processed ${processedCount} products so far`);
    }

    console.log("All products have been successfully updated in Shopify");
  } catch (error) {
    console.error("Error refreshing products:", error);
  } finally {
    await prisma.$disconnect();
    // Always reset the flag when the operation completes, whether successful or not
    isRefreshInProgress = false;
  }
};

export default refreshShopify;
