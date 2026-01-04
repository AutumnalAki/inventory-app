import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    // Fetch data from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );


    // Fetch all relevant tables except role_keys, users, access_codes
    const { data: inventory, error: inventoryError } = await supabase.from('inventory').select('*');
    const { data: report_history, error: reportHistoryError } = await supabase.from('report_history').select('*');
    const { data: activity_log, error: activityLogError } = await supabase.from('activity_log').select('*');
    const { data: equipment_tracking, error: equipmentTrackingError } = await supabase.from('equipment_tracking').select('*');
    const { data: suggestions, error: suggestionsError } = await supabase.from('suggestions').select('*');
    const { data: system_settings, error: systemSettingsError } = await supabase.from('system_settings').select('*');
    const { data: update_logs, error: updateLogsError } = await supabase.from('update_logs').select('*');

    // If any required table fails, return debug info
    if (inventoryError || reportHistoryError || activityLogError || equipmentTrackingError || suggestionsError || systemSettingsError || updateLogsError) {
      return NextResponse.json({
        error: "Failed to fetch one or more tables from Supabase",
        debug: {
          inventory: { error: inventoryError, data: inventory },
          report_history: { error: reportHistoryError, data: report_history },
          activity_log: { error: activityLogError, data: activity_log },
          equipment_tracking: { error: equipmentTrackingError, data: equipment_tracking },
          suggestions: { error: suggestionsError, data: suggestions },
          system_settings: { error: systemSettingsError, data: system_settings },
          update_logs: { error: updateLogsError, data: update_logs }
        }
      }, { status: 500 });
    }

    // Only send the first 5 records from each table to avoid quota issues
    // Summarize inventory and other tables for context
    function summarizeInventory(inv: any[] | null) {
      if (!Array.isArray(inv)) return {};
      const byCategoryObj = inv.reduce((acc: any, item: any) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});
      return {
        totalCount: inv.length,
        lowStock: inv.filter(i => i.stock && i.stock !== 'In Stock').map(i => ({ name: i.name, stock: i.stock })),
        mostRecent: inv.slice(-5),
        byCategory: byCategoryObj
      };
    }
    function summarizeTable(arr: any[] | null) {
      return Array.isArray(arr) ? { totalCount: arr.length, mostRecent: arr.slice(-5) } : {};
    }
    const contextData = {
      inventorySummary: summarizeInventory(inventory),
      reportHistorySummary: summarizeTable(report_history),
      activityLogSummary: summarizeTable(activity_log),
      equipmentTrackingSummary: summarizeTable(equipment_tracking),
      suggestionsSummary: summarizeTable(suggestions),
      systemSettingsSummary: summarizeTable(system_settings),
      updateLogsSummary: summarizeTable(update_logs)
    };

    // If the prompt is a "what is" or "explain" question, try Wikipedia first
    // Google Custom Search fallback (requires API key and cx in env)
    async function fetchGoogleSearchSnippet(query: string) {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const cx = process.env.GOOGLE_SEARCH_CX;
      if (!apiKey || !cx) return null;
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;
      try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data.items && data.items.length > 0) {
          const first = data.items[0];
          return {
            explanation: first.snippet,
            image: first.pagemap?.cse_image?.[0]?.src || null,
            link: first.link
          };
        }
        return null;
      } catch {
        return null;
      }
    }

    async function fetchWikiSummaryAndImage(query: string) {
      const search = encodeURIComponent(query);
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${search}`;
      try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        return {
          explanation: data.extract,
          image: data.thumbnail?.source || null,
          wikiUrl: data.content_urls?.desktop?.page || null
        };
      } catch {
        return null;
      }
    }

    let externalInfo = null;
    const whatIsMatch = prompt.match(/what is (an?|the)? ([^?]+)\??/i);
    if (whatIsMatch) {
      const itemName = whatIsMatch[2].trim();
      // Check if item is in inventory
      const found = Array.isArray(inventory) && inventory.some(i => i.name?.toLowerCase() === itemName.toLowerCase());
      if (!found) {
        // Try Google Search first, then Wikipedia as fallback
        externalInfo = await fetchGoogleSearchSnippet(itemName);
        if (!externalInfo) {
          externalInfo = await fetchWikiSummaryAndImage(itemName);
        }
      }
    }

    // Provide Gemini with a system instruction and your current app data
    const systemInstruction = `
      You are LabTrack AI, an expert laboratory inventory assistant.
      Use this context to answer: ${JSON.stringify(contextData)}
      If the user asks about an item not in inventory and externalInfo is provided, use it to answer with explanation and image.
      externalInfo: ${JSON.stringify(externalInfo)}
      Keep responses professional, concise, and format them with markdown.
    `;

    // Gemini SDK expects [{role, parts: [text]}]
    const messages = [
      { role: "user", parts: [{ text: systemInstruction + "\n" + prompt }] }
    ];
    const result = await model.generateContent({ contents: messages });
    const response = await result.response;
    return NextResponse.json({ text: response.text(), externalInfo });
  } catch (error: any) {
    // Add debug output for error
    let debug = {};
    if (error && typeof error === 'object') {
      debug = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        raw: JSON.stringify(error, null, 2)
      };
    } else {
      debug = { raw: String(error) };
    }
    return NextResponse.json({ error: "AI failed to respond", debug }, { status: 500 });
  }
}