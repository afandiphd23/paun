import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const initializeAgent = (apiKey, dataset) => {
  const model = new ChatOpenAI({
    apiKey: apiKey,
    model: "gpt-4o-mini",
    temperature: 0,
    dangerouslyAllowBrowser: true
  });

  const searchRecords = new DynamicStructuredTool({
    name: "search_compound_records",
    description: "Search compound records filtered by company name, offense section, date range, or payment status. Returns matching records with details.",
    schema: z.object({
      companyName: z.string().optional().describe("Company name to search for (partial match)"),
      offenseSection: z.string().optional().describe("Offense section (e.g., 'SEKSYEN 12(1)(a)')"),
      dateFrom: z.string().optional().describe("Start date filter (YYYY-MM-DD)"),
      dateTo: z.string().optional().describe("End date filter (YYYY-MM-DD)"),
      paymentStatus: z.enum(["paid", "unpaid", "all"]).optional().default("all").describe("Filter by payment status"),
    }),
    func: async ({ companyName, offenseSection, dateFrom, dateTo, paymentStatus }) => {
      let filtered = [...dataset];

      if (companyName) {
        filtered = filtered.filter(r =>
          (r['SYARIKAT'] || '').toLowerCase().includes(companyName.toLowerCase())
        );
      }
      if (offenseSection) {
        filtered = filtered.filter(r =>
          (r['SEKSYEN KESALAHAN'] || '').toLowerCase().includes(offenseSection.toLowerCase())
        );
      }
      if (dateFrom) {
        filtered = filtered.filter(r => (r['TARIKH FORMAT'] || '') >= dateFrom);
      }
      if (dateTo) {
        filtered = filtered.filter(r => (r['TARIKH FORMAT'] || '') <= dateTo);
      }
      if (paymentStatus === 'paid') {
        filtered = filtered.filter(r => parseFloat(r['KOMPAUN BAYAR']) > 0);
      } else if (paymentStatus === 'unpaid') {
        filtered = filtered.filter(r => parseFloat(r['KOMPAUN BAYAR']) === 0);
      }

      if (filtered.length === 0) return "No records found matching these criteria.";

      const totalAmount = filtered.reduce((s, r) => s + (parseFloat(r['KOMPAUN AMT']) || 0), 0);
      const totalPaid = filtered.reduce((s, r) => s + (parseFloat(r['KOMPAUN BAYAR']) || 0), 0);

      if (filtered.length > 30) {
        return `Found ${filtered.length} records matching the criteria.\nTotal: RM ${totalAmount.toFixed(2)} | Paid: RM ${totalPaid.toFixed(2)} | Outstanding: RM ${(totalAmount - totalPaid).toFixed(2)}\n\nToo many records to list individually. Use get_company_details or get_offense_section_details for a summary, or narrow your filters.`;
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

  const getStatistics = new DynamicStructuredTool({
    name: "get_dashboard_statistics",
    description: "Get overall dashboard statistics — total records, total fine amount, total paid, outstanding balance, unique companies, offense sections, and payment rate.",
    schema: z.object({}),
    func: async () => {
      const totalAmount = dataset.reduce((s, r) => s + (parseFloat(r['KOMPAUN AMT']) || 0), 0);
      const totalPaid = dataset.reduce((s, r) => s + (parseFloat(r['KOMPAUN BAYAR']) || 0), 0);
      const uniqueCompanies = new Set(dataset.map(r => r['SYARIKAT']).filter(Boolean)).size;
      const uniqueOffenses = new Set(dataset.map(r => r['SEKSYEN KESALAHAN']).filter(Boolean)).size;
      const paidCount = dataset.filter(r => parseFloat(r['KOMPAUN BAYAR']) > 0).length;
      const unpaidCount = dataset.filter(r => parseFloat(r['KOMPAUN BAYAR']) === 0).length;

      return JSON.stringify({
        totalRecords: dataset.length,
        totalAmount: totalAmount.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        outstanding: (totalAmount - totalPaid).toFixed(2),
        uniqueCompanies,
        uniqueOffenseSections: uniqueOffenses,
        paidRecords: paidCount,
        unpaidRecords: unpaidCount,
        paymentRate: ((paidCount / dataset.length) * 100).toFixed(1) + '%'
      });
    }
  });

  const getCompanyDetail = new DynamicStructuredTool({
    name: "get_company_details",
    description: "Deep-dive into a specific company: total fines, outstanding balance, top offenses, and recent records.",
    schema: z.object({
      companyName: z.string().describe("Full or partial company name to analyze"),
    }),
    func: async ({ companyName }) => {
      const records = dataset.filter(r =>
        (r['SYARIKAT'] || '').toLowerCase().includes(companyName.toLowerCase())
      );

      if (records.length === 0) return "No records found for this company.";

      const totalAmount = records.reduce((s, r) => s + (parseFloat(r['KOMPAUN AMT']) || 0), 0);
      const totalPaid = records.reduce((s, r) => s + (parseFloat(r['KOMPAUN BAYAR']) || 0), 0);
      const offenseCounts = {};
      records.forEach(r => {
        const off = r['SEKSYEN KESALAHAN'] || 'Unknown';
        offenseCounts[off] = (offenseCounts[off] || 0) + 1;
      });
      const topOffenses = Object.entries(offenseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([o, c]) => ({ section: o, cases: c }));

      const sortedByDate = [...records].sort((a, b) => (a['TARIKH FORMAT'] || '').localeCompare(b['TARIKH FORMAT'] || ''));
      const firstDate = sortedByDate[0]?.['TARIKH FORMAT'] || 'N/A';
      const lastDate = sortedByDate[sortedByDate.length - 1]?.['TARIKH FORMAT'] || 'N/A';

      return JSON.stringify({
        company: records[0]['SYARIKAT'],
        totalRecords: records.length,
        totalFines: totalAmount.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        outstanding: (totalAmount - totalPaid).toFixed(2),
        dateRange: `${firstDate} to ${lastDate}`,
        topOffenses,
        recentRecords: sortedByDate.slice(-5).reverse().map(r => ({
          date: r['TARIKH FORMAT'],
          offense: r['SEKSYEN KESALAHAN'],
          amount: r['KOMPAUN AMT'],
          paid: r['KOMPAUN BAYAR']
        }))
      });
    }
  });

  const getOffenseDetail = new DynamicStructuredTool({
    name: "get_offense_section_details",
    description: "Analyze a specific offense section: affected companies, total fines, average fine amount.",
    schema: z.object({
      offenseSection: z.string().describe("Offense section to analyze (e.g., 'SEKSYEN 12(1)(a)')"),
    }),
    func: async ({ offenseSection }) => {
      const records = dataset.filter(r =>
        (r['SEKSYEN KESALAHAN'] || '').toLowerCase().includes(offenseSection.toLowerCase())
      );

      if (records.length === 0) return "No records found for this offense section.";

      const totalAmount = records.reduce((s, r) => s + (parseFloat(r['KOMPAUN AMT']) || 0), 0);
      const totalPaid = records.reduce((s, r) => s + (parseFloat(r['KOMPAUN BAYAR']) || 0), 0);
      const companies = {};
      records.forEach(r => {
        const c = r['SYARIKAT'] || 'Unknown';
        companies[c] = (companies[c] || 0) + 1;
      });
      const topCompanies = Object.entries(companies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c, n]) => ({ name: c, cases: n }));

      return JSON.stringify({
        offenseSection,
        totalCases: records.length,
        totalFines: totalAmount.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        uniqueCompanies: Object.keys(companies).length,
        topCompanies,
        averageFine: (totalAmount / records.length).toFixed(2)
      });
    }
  });

  const getTopCompanies = new DynamicStructuredTool({
    name: "get_top_companies",
    description: "Get ranked list of top companies by total fine amount or by number of cases.",
    schema: z.object({
      limit: z.number().optional().default(10).describe("Number of companies (max 25)"),
      sortBy: z.enum(["amount", "count"]).optional().default("amount").describe("Sort by total fine amount or case count"),
    }),
    func: async ({ limit, sortBy }) => {
      limit = Math.min(limit, 25);
      const companyMap = {};
      dataset.forEach(r => {
        const c = r['SYARIKAT'] || 'Unknown';
        if (!companyMap[c]) companyMap[c] = { count: 0, totalAmount: 0, totalPaid: 0 };
        companyMap[c].count += 1;
        companyMap[c].totalAmount += parseFloat(r['KOMPAUN AMT']) || 0;
        companyMap[c].totalPaid += parseFloat(r['KOMPAUN BAYAR']) || 0;
      });

      const entries = Object.entries(companyMap);
      if (sortBy === 'amount') {
        entries.sort((a, b) => b[1].totalAmount - a[1].totalAmount);
      } else {
        entries.sort((a, b) => b[1].count - a[1].count);
      }

      return JSON.stringify({
        sortedBy: sortBy,
        companies: entries.slice(0, limit).map(([name, data]) => ({
          name,
          cases: data.count,
          totalFines: data.totalAmount.toFixed(2),
          totalPaid: data.totalPaid.toFixed(2),
          outstanding: (data.totalAmount - data.totalPaid).toFixed(2)
        }))
      });
    }
  });

  const getDateRangeSummary = new DynamicStructuredTool({
    name: "get_date_range_summary",
    description: "Get summary statistics and monthly breakdown for a specific date range.",
    schema: z.object({
      dateFrom: z.string().describe("Start date (YYYY-MM-DD)"),
      dateTo: z.string().describe("End date (YYYY-MM-DD)"),
    }),
    func: async ({ dateFrom, dateTo }) => {
      const records = dataset.filter(r =>
        (r['TARIKH FORMAT'] || '') >= dateFrom && (r['TARIKH FORMAT'] || '') <= dateTo
      );

      if (records.length === 0) return "No records in this date range.";

      const totalAmount = records.reduce((s, r) => s + (parseFloat(r['KOMPAUN AMT']) || 0), 0);
      const totalPaid = records.reduce((s, r) => s + (parseFloat(r['KOMPAUN BAYAR']) || 0), 0);
      const uniqueCompanies = new Set(records.map(r => r['SYARIKAT']).filter(Boolean)).size;

      const monthly = {};
      records.forEach(r => {
        const d = r['TARIKH FORMAT'];
        if (d) {
          const month = d.substring(0, 7);
          monthly[month] = (monthly[month] || 0) + 1;
        }
      });

      return JSON.stringify({
        dateRange: `${dateFrom} to ${dateTo}`,
        totalRecords: records.length,
        totalFines: totalAmount.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        outstanding: (totalAmount - totalPaid).toFixed(2),
        uniqueCompanies,
        monthlyBreakdown: Object.entries(monthly).sort().map(([m, c]) => ({ month: m, cases: c }))
      });
    }
  });

  const getPaymentAnalysis = new DynamicStructuredTool({
    name: "get_payment_analysis",
    description: "Get payment and collection statistics: paid vs unpaid breakdown, collection rate, fully vs partially paid.",
    schema: z.object({}),
    func: async () => {
      const paid = dataset.filter(r => parseFloat(r['KOMPAUN BAYAR']) > 0);
      const unpaid = dataset.filter(r => parseFloat(r['KOMPAUN BAYAR']) === 0);
      const partial = dataset.filter(r => {
        const amt = parseFloat(r['KOMPAUN AMT']) || 0;
        const pay = parseFloat(r['KOMPAUN BAYAR']) || 0;
        return pay > 0 && pay < amt;
      });
      const fullyPaid = dataset.filter(r => {
        const amt = parseFloat(r['KOMPAUN AMT']) || 0;
        const pay = parseFloat(r['KOMPAUN BAYAR']) || 0;
        return pay >= amt && amt > 0;
      });

      const totalAmount = dataset.reduce((s, r) => s + (parseFloat(r['KOMPAUN AMT']) || 0), 0);
      const totalPaid = dataset.reduce((s, r) => s + (parseFloat(r['KOMPAUN BAYAR']) || 0), 0);

      return JSON.stringify({
        totalRecords: dataset.length,
        paidRecords: paid.length,
        unpaidRecords: unpaid.length,
        fullyPaidRecords: fullyPaid.length,
        partiallyPaidRecords: partial.length,
        paymentRate: ((paid.length / dataset.length) * 100).toFixed(1) + '%',
        totalAmount: totalAmount.toFixed(2),
        totalCollected: totalPaid.toFixed(2),
        outstandingAmount: (totalAmount - totalPaid).toFixed(2),
        collectionRate: ((totalPaid / totalAmount) * 100).toFixed(1) + '%'
      });
    }
  });

  const tools = [searchRecords, getStatistics, getCompanyDetail, getOffenseDetail, getTopCompanies, getDateRangeSummary, getPaymentAnalysis];

  const agent = createReactAgent({
    llm: model,
    tools,
    messageModifier: `You are a helpful data assistant for the Kompaun (Compound) Dashboard by KPDN (Ministry of Domestic Trade and Cost of Living).

You have access to compound/penalty records data. The data contains information about companies issued compounds for various offenses under Malaysian law.

**Available Tools:**
- **search_compound_records** — search/filter records by company, offense, date range, payment status
- **get_dashboard_statistics** — overall summary stats (totals, counts, rates)
- **get_company_details** — deep dive into one company's records
- **get_offense_section_details** — analyze a specific offense section
- **get_top_companies** — ranked list of companies by fine amount or case count
- **get_date_range_summary** — summary for a specific date range with monthly breakdown
- **get_payment_analysis** — payment/collection statistics

**Guidelines:**
- Be concise, polite, and professional
- Format monetary amounts with RM prefix (e.g., RM 1,250.00)
- Present ranked data as numbered lists
- Use the tools — never fabricate data
- If a search returns nothing, suggest alternative terms
- Keep context across follow-up questions
- Offer to drill deeper when appropriate
- Use **bold** for emphasis, format numbers with comma separators`
  });

  return agent;
};
