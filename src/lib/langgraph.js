import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const initializeAgent = (apiKey, dataset) => {
  const model = new ChatOpenAI({
    apiKey: apiKey,
    model: "gpt-4o-mini", // Cost effective, fast, and capable
    temperature: 0,
    dangerouslyAllowBrowser: true // Required since we run purely client-side
  });

  const searchDataTool = new DynamicStructuredTool({
    name: "search_compound_records",
    description: "Search the database of compound records. Returns data on companies, fines, and offenses.",
    schema: z.object({
      companyName: z.string().optional().describe("The name of the company to search for"),
      offenseSection: z.string().optional().describe("The offense section (e.g., 'SEKSYEN 12(1)(a)')"),
    }),
    func: async ({ companyName, offenseSection }) => {
      let filtered = dataset;
      
      if (companyName) {
        filtered = filtered.filter(row => 
          (row['SYARIKAT'] || '').toLowerCase().includes(companyName.toLowerCase())
        );
      }
      if (offenseSection) {
        filtered = filtered.filter(row => 
          (row['SEKSYEN KESALAHAN'] || '').toLowerCase().includes(offenseSection.toLowerCase())
        );
      }
      
      if (filtered.length === 0) return "No records found.";
      if (filtered.length > 50) {
        // Return aggregated summary if too many results
        const totalAmount = filtered.reduce((sum, row) => sum + (parseFloat(row['KOMPAUN AMT']) || 0), 0);
        return `Found ${filtered.length} records. Too many to list individually. Total Compound Amount for these records: RM ${totalAmount.toFixed(2)}. Please be more specific if you need details.`;
      }
      
      return JSON.stringify(filtered.map(r => ({
        company: r['SYARIKAT'],
        offense: r['SEKSYEN KESALAHAN'],
        amount: r['KOMPAUN AMT'],
        paid: r['KOMPAUN BAYAR'],
        date: r['TARIKH FORMAT']
      })));
    }
  });

  const tools = [searchDataTool];
  
  // Create ReAct agent utilizing the tool
  const agent = createReactAgent({
    llm: model,
    tools,
    messageModifier: "You are a helpful data assistant for the Kompaun (Compound) Dashboard. Use the search_compound_records tool to look up data when the user asks questions about specific companies, fines, or offenses. Be concise, polite, and format monetary amounts with RM."
  });

  return agent;
};
