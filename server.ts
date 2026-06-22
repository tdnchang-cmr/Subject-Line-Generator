import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import { request } from "https";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Read authDomain from Firebase config in root
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
const fbAuthDomain = firebaseConfig.authDomain || "upheld-guide-19z5m.firebaseapp.com";

// Proxy Firebase Auths to same-origin to prevent third-party cookie blocking in iframes
app.all("/__/auth/*", (req, res) => {
  const targetUrl = `https://${fbAuthDomain}${req.originalUrl}`;
  const proxyReq = request(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: fbAuthDomain,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  req.pipe(proxyReq, { end: true });

  proxyReq.on("error", (err) => {
    console.error("Auth proxy error:", err);
    res.status(500).send("Auth proxy error");
  });
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper for Url-safe Base64 decode from Gmail API
function decodeBase64(data: string): string {
  if (!data) return "";
  const cleaned = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(cleaned, "base64").toString("utf-8");
}

// Helper to construct Url-safe Base64 raw MIME email
function createRawMessage(subject: string, body: string, toEmail?: string): string {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const lines = [
    ...(toEmail ? [`To: ${toEmail}`] : []),
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    "",
    body,
  ];
  const str = lines.join("\r\n");
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper to recursively extract plain text body and html body
function getEmailBody(payload: any): { body: string; isHtml: boolean } {
  if (!payload) return { body: "", isHtml: false };

  // If MIME type is text/plain or text/html at top level
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return { body: decodeBase64(payload.body.data), isHtml: false };
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return { body: decodeBase64(payload.body.data), isHtml: true };
  }

  // If it has parts, recurse
  if (payload.parts && Array.isArray(payload.parts)) {
    let htmlContent = "";
    for (const part of payload.parts) {
      const result = getEmailBody(part);
      if (result.body) {
        if (!result.isHtml) {
          // Plain text is preferred
          return result;
        } else {
          // Keep HTML in case there is no plain text
          htmlContent = result.body;
        }
      }
    }
    if (htmlContent) {
      // Strip some tags for basic text if we only have HTML
      const cleaned = htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return { body: cleaned, isHtml: false };
    }
  }

  return { body: "", isHtml: false };
}

// REST Endpoints
// Analyze style from sent email subjects and snippets
app.post("/api/style/analyze", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    // 1. Fetch search list of sent emails
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:sent&maxResults=25",
      {
        headers: { Authorization: authHeader },
      }
    );

    if (!listRes.ok) {
      const errorMsg = await listRes.text();
      return res.status(listRes.status).json({ error: `Gmail API Error: ${errorMsg}` });
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return res.json({
        hasSentEmails: false,
        styleProfile: {
          overallSummary: "We couldn't find any sent messages in your account, so we'll suggest clear, professional subject lines. You can customize them below!",
          averageLength: "Short to medium",
          capitalizationStyle: "Sentence case",
          punctuationAndEmojis: "Minimal punctuation, no emojis",
          keyCharacteristics: ["Direct", "Professional", "Polite"],
          examples: [],
        },
      });
    }

    // 2. Fetch details for each sent email in parallel
    const detailsPromises = messages.map(async (msg: any) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=To`,
          {
            headers: { Authorization: authHeader },
          }
        );
        if (!detailRes.ok) return null;
        const detailData = await detailRes.json();

        const headers = detailData.payload?.headers || [];
        const subjectHeader = headers.find((h: any) => h.name?.toLowerCase() === "subject");
        const subject = subjectHeader ? subjectHeader.value : "";
        const snippet = detailData.snippet || "";

        return { subject, snippet };
      } catch (err) {
        return null;
      }
    });

    const detailedMessages = (await Promise.all(detailsPromises)).filter(
      (m): m is { subject: string; snippet: string } => m !== null && m.subject !== ""
    );

    if (detailedMessages.length === 0) {
      return res.json({
        hasSentEmails: false,
        styleProfile: {
          overallSummary: "No subjects loaded from emails. Suggesting clear, warm subject lines by default.",
          averageLength: "Short to medium",
          capitalizationStyle: "Sentence case",
          punctuationAndEmojis: "Minimal punctuation, no emojis",
          keyCharacteristics: ["Clear", "Polite", "Simple"],
          examples: [],
        },
      });
    }

    // Prepare content for Gemini analysis
    const samplesText = detailedMessages
      .map((m, index) => `[Email #${index + 1}]\nSubject: ${m.subject}\nSnippet of email: ${m.snippet}`)
      .join("\n\n");

    const prompt = `You are a linguistic analysis agent. I will provide you with a list of subjects and bodies/snippets of emails sent by a user.
Your job is to analyze these to discover their personal "style signature" for writing email subjects.

Please look closely at:
1. Sentence casing, Title Case, lowercase, or dynamic casing.
2. Word count/length (e.g. ultra-short 1-3 words, descriptive, long).
3. Tone and mood (e.g. formal, hyper-casual, direct, warm, urgent, playful).
4. Use of punctuation, emojis, brackets, prefixes (e.g. "Draft:", "Re:", capitalization, exclamation marks).
5. Language pattern (e.g. using first names, action-oriented, noun-focused).

Here are the user's sent emails:
${samplesText}

Analyze this style deeply and output a structured analysis profile following the schema requested. Be warm and supportive!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallSummary: {
              type: Type.STRING,
              description: "A friendly, cohesive synthesis explaining their unique subject-writing persona.",
            },
            averageLength: {
              type: Type.STRING,
              description: "A description of the typical subject length (e.g. 'Short & sweet (2-4 words)', 'Detailed structures').",
            },
            capitalizationStyle: {
              type: Type.STRING,
              description: "Their default spacing or capitalization style (e.g. 'All lowercase for casual touch', 'Sentence case').",
            },
            punctuationAndEmojis: {
              type: Type.STRING,
              description: "Observations on how they employ punctuation or emojis.",
            },
            keyCharacteristics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 to 5 bullet point rules characterizing their style.",
            },
          },
          required: ["overallSummary", "averageLength", "capitalizationStyle", "punctuationAndEmojis", "keyCharacteristics"],
        },
      },
    });

    const parsedStyle = JSON.parse(response.text.trim());

    return res.json({
      hasSentEmails: true,
      styleProfile: {
        ...parsedStyle,
        examples: detailedMessages.slice(0, 5), // Include top 5 examples for reference
      },
    });
  } catch (err: any) {
    console.error("Analysis failed:", err);
    return res.status(500).json({ error: err.message || "Linguistic style analysis failed." });
  }
});

// Suggest subject lines based on draft body and analyzed style
app.post("/api/subject/suggest", async (req, res) => {
  const { draftBody, styleProfile, context } = req.body;
  if (!draftBody) {
    return res.status(400).json({ error: "Draft body is required." });
  }

  try {
    const prompt = `You are an expert copywriter. Your goal is to write 5 varied subject line suggestions for a draft email body.
You MUST write these subject lines to perfectly model the sender's personal email subject-writing style profile.

--- SENDER'S PERSONAL STYLE PROFILE ---
Overall Summary: ${styleProfile.overallSummary}
Length preference: ${styleProfile.averageLength}
Capitalization choice: ${styleProfile.capitalizationStyle}
Punctuation and Emojis: ${styleProfile.punctuationAndEmojis}
Key Characteristics:
${styleProfile.keyCharacteristics ? styleProfile.keyCharacteristics.map((c: string) => `- ${c}`).join("\n") : "None"}

--- DRAFT EMAIL BODY ---
${draftBody}

--- ADDITIONAL CONTEXT OR INSTRUCTIONS FROM THE USER (IF ANY) ---
${context || "None"}

Generate exactly 5 distinct subject line suggestions. For each, describe briefly why it fits their analyzed style or rules. Make sure they feel human, authentic, and naturally blended into the user's personality.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING, description: "The customized subject line." },
              reason: { type: Type.STRING, description: "One elegant phrase stating which exact style rule is being honored." },
            },
            required: ["subject", "reason"],
          },
        },
      },
    });

    const suggestions = JSON.parse(response.text.trim());
    return res.json({ suggestions });
  } catch (err: any) {
    console.error("Suggestions failed:", err);
    return res.status(500).json({ error: err.message || "Error generating subject suggestions." });
  }
});

// Retrieve lists of draft emails
app.get("/api/drafts", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    const draftsRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=10",
      {
        headers: { Authorization: authHeader },
      }
    );

    if (!draftsRes.ok) {
      const errorMsg = await draftsRes.text();
      return res.status(draftsRes.status).json({ error: `Gmail Drafts Fetch Error: ${errorMsg}` });
    }

    const draftsData = await draftsRes.json();
    const draftsList = draftsData.drafts || [];

    if (draftsList.length === 0) {
      return res.json({ drafts: [] });
    }

    // Fetch details for each draft in parallel
    const detailsPromises = draftsList.map(async (draft: any) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draft.id}`,
          {
            headers: { Authorization: authHeader },
          }
        );
        if (!detailRes.ok) return null;
        const draftDetail = await detailRes.json();

        const message = draftDetail.message || {};
        const headers = message.payload?.headers || [];
        const subjectHeader = headers.find((h: any) => h.name?.toLowerCase() === "subject");
        const subject = subjectHeader ? subjectHeader.value : "(No Subject)";

        const bodyParts = getEmailBody(message.payload);

        return {
          id: draftDetail.id,
          subject,
          snippet: message.snippet || "",
          body: bodyParts.body || message.snippet || "",
        };
      } catch (err) {
        return null;
      }
    });

    const detailedDrafts = (await Promise.all(detailsPromises)).filter((d): d is any => d !== null);
    return res.json({ drafts: detailedDrafts });
  } catch (err: any) {
    console.error("Failed to fetch drafts:", err);
    return res.status(500).json({ error: err.message || "Failed to load Gmail drafts." });
  }
});

// Update draft or Create new draft
app.post("/api/drafts/save", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const { draftId, subject, body, toEmail } = req.body;
  if (!body) {
    return res.status(400).json({ error: "Draft body is required." });
  }

  try {
    const rawMessage = createRawMessage(subject || "", body, toEmail);

    if (draftId) {
      // Update existing draft
      const updateRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
        {
          method: "PUT",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: draftId,
            message: {
              raw: rawMessage,
            },
          }),
        }
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return res.status(updateRes.status).json({ error: `Update draft failed: ${errText}` });
      }

      const updatedDraft = await updateRes.json();
      return res.json({ success: true, isNew: false, draft: updatedDraft });
    } else {
      // Create new draft
      const createRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            raw: rawMessage,
          },
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        return res.status(createRes.status).json({ error: `Create draft failed: ${errText}` });
      }

      const newDraft = await createRes.json();
      return res.json({ success: true, isNew: true, draft: newDraft });
    }
  } catch (err: any) {
    console.error("Save draft failed:", err);
    return res.status(500).json({ error: err.message || "Error saving draft to Gmail." });
  }
});

// Vite server middleware setup for dev & static folder serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
