import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeData(datasetInfo: string, userQuery: string, datasetSnippet: any[]) {
  const prompt = `
You are an advanced AI-Powered Conversational Data Analyst. 
Dataset Description:
${datasetInfo}

Dataset Sample (first few rows):
${JSON.stringify(datasetSnippet, null, 2)}

User Query:
${userQuery}

---
CORE RESPONSIBILITIES:
1. Understand dataset schema (columns, types).
2. Translate user queries into meaningful data insights.
3. Perform analysis (aggregation, filtering, grouping, sorting).
4. Provide actionable recommendations.

OUTPUT FORMAT (STRICT):
1. 🔍 Analysis Performed:
   * [Detailed explanation of steps taken]

2. 📊 Results:
   * [Data summary table or key numbers]

3. 💡 Key Insights:
   * [Bullet points of meaningful findings]

4. 📈 Visualization:
   * [Recommended Chart Type: Bar/Line/Pie/Histogram/Scatter]
   * [X-axis and Y-axis mapping]
   * Please provide a JSON block labeled \`\`\`json-chart and inside it include the data in a format suitable for Recharts [ {name: '...', value: ...} ] and specify the chartType.

Example:
\`\`\`json-chart
{
  "chartType": "Bar",
  "data": [
    {"name": "Jan", "value": 400},
    {"name": "Feb", "value": 300}
  ],
  "xAxis": "name",
  "yAxis": "value"
}
\`\`\`

5. 🚀 Recommendations:
   * [Actionable business suggestions]

6. ❓ Suggested Follow-Up Questions:
   * [2-3 smart questions]

BEHAVIOR RULES:
* Base responses STRICTLY on the dataset provided.
* Never hallucinate data.
* If query is unclear, ask for clarification.
* Keep answers concise but insightful.
* Use professional language.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  const responseText = response.text || '';
  
  // Extract JSON chart data if present
  let chartData = null;
  const chartMatch = responseText.match(/```json-chart\n([\s\S]*?)\n```/);
  if (chartMatch) {
    try {
      chartData = JSON.parse(chartMatch[1]);
    } catch (e) {
      console.error("Failed to parse chart JSON", e);
    }
  }

  const cleanText = responseText.replace(/```json-chart[\s\S]*?```/g, "").trim();

  return { analysis: cleanText, chart: chartData };
}
