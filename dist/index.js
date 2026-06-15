import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
async function braveSearch(query, count) {
    if (!BRAVE_API_KEY) {
        throw new Error("BRAVE_API_KEY environment variable is not set");
    }
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": BRAVE_API_KEY,
        },
    });
    if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return data.web?.results ?? [];
}
function formatResults(results) {
    if (results.length === 0)
        return "No results found.";
    return results
        .map((r, i) => `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.description}`)
        .join("\n\n");
}
const server = new Server({ name: "search-parallel", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "search",
            description: "Search the web using Brave Search API",
            inputSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search query" },
                    count: { type: "number", description: "Number of results (default: 10)", default: 10 },
                },
                required: ["query"],
            },
        },
        {
            name: "search_parallel",
            description: "Run multiple web searches in parallel using Brave Search API",
            inputSchema: {
                type: "object",
                properties: {
                    queries: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of search queries to run in parallel",
                    },
                    count: { type: "number", description: "Number of results per query (default: 10)", default: 10 },
                },
                required: ["queries"],
            },
        },
    ],
}));
const SearchSchema = z.object({ query: z.string(), count: z.number().optional().default(10) });
const SearchParallelSchema = z.object({
    queries: z.array(z.string()).min(1),
    count: z.number().optional().default(10),
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "search") {
            const { query, count } = SearchSchema.parse(args);
            const results = await braveSearch(query, count);
            return {
                content: [{ type: "text", text: formatResults(results) }],
            };
        }
        if (name === "search_parallel") {
            const { queries, count } = SearchParallelSchema.parse(args);
            const results = await Promise.all(queries.map((q) => braveSearch(q, count).catch((err) => ({ error: err.message, query: q }))));
            const sections = queries.map((query, i) => {
                const result = results[i];
                if ("error" in result) {
                    return `## Query: "${query}"\nError: ${result.error}`;
                }
                return `## Query: "${query}"\n${formatResults(result)}`;
            });
            return {
                content: [{ type: "text", text: sections.join("\n\n---\n\n") }],
            };
        }
        return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
