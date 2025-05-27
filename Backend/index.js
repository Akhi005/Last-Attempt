const express = require('express')
const axios = require('axios')
const cors = require('cors')
require('dotenv').config()
const { GoogleGenerativeAI } = require('@google/generative-ai')
const app = express()
app.use(cors())
app.use(express.json())
const PORT = 4000

// YouTube API Function
async function getYoutube(topic) {
  const apikey = process.env.YOUTUBE_API_KEY
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${topic}&type=video&key=${apikey}`
  const response = await axios.get(url)
  return response.data.items
}
// Wikipedia API Function
async function getWikipedia(topic) {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    topic
  )}&utf8=&format=json`
  try {
    const searchResponse = await axios.get(searchUrl)
    const searchResults = searchResponse.data.query.search
    if (searchResults.length === 0) {
      return [{ message: 'No results found for this topic on wikipedia' }]
    }
    const pageContents = []
    for (const result of searchResults) {
      const title = encodeURIComponent(result.title)
      const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&explaintext&titles=${title}`
      const pageResponse = await axios.get(pageUrl)
      const pages = pageResponse.data.query.pages
      const pageId = Object.keys(pages)[0]
      const contentText = pages[pageId].extract
      pageContents.push({ title: result.title, content: contentText })
    }
    return pageContents
  } catch (error) {
    console.error('Error fetching Wikipedia content:', error)
    return 'Failed to fetch Wikipedia content'
  }
}
async function getMDNContent(topic) {
  const url = `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(topic)}&locale=en-US`
  try {
    const response = await axios.get(url)
    const documents = response.data.documents
    if (!documents || documents.length === 0) {
      return [{ message: 'No results found for this topic on MDN' }]
    }
    const mdnContents = []
    for (const document of documents) {
      const { title, summary, slug } = document
      const mdnUrl = `https://developer.mozilla.org/en-US/docs/${slug}`
      mdnContents.push({ title, summary, url: mdnUrl })
    }
    console.log(mdnContents)
    return mdnContents
  } catch (error) {
    console.error('Error fetching MDN content:', error)
    return 'Failed to fetch MDN content'
  }
}
app.get('/fetch-content', async (req, res) => {
  const topic = req.query.topic
  console.log('Topic received:', topic)

  try {
    const wikipediaContent = await getWikipedia(topic)
    const youtubeContent = await getYoutube(topic)
    const MDNContent = await getMDNContent(topic)

    // Store each content source in Firebase
    await storeArticleInFirebase(topic, { wikipediaContent, youtubeContent, MDNContent })

    res.json({ topic, wikipediaContent, youtubeContent, MDNContent })
  } catch (error) {
    console.error('Error while fetching content:', error)
    res.status(500).json({ error: 'Failed to fetch content' })
  }
})
// Import Firebase Admin SDK to the backend
var admin = require('firebase-admin')

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  }),
  databaseURL: 'https://lastattempt-c86cf-default-rtdb.firebaseio.com',
})
const db = admin.firestore()
async function storeArticleInFirebase(articleTitle, content) {
    try {
        // Sanitize document ID
        const sanitizedId = articleTitle
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')  // Replace special chars with dashes
            .replace(/-+/g, '-');        // Remove consecutive dashes

        const docRef = db.collection('articles').doc(sanitizedId);
        
        await docRef.set({
            originalSearchTerm: articleTitle,
            content: {
                wikipediaContent: content.wikipediaContent,
                MDNContent: content.MDNContent,
                youtubeContent: content.youtubeContent
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Document ${sanitizedId} stored successfully`);
    } catch (error) {
        console.error('Error storing article:', error);
        throw error; // Propagate error to client
    }
}
const genAI = new GoogleGenerativeAI(process.env.API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
async function generateQuestionsFromText(content) {
    try {
        const generationConfig = {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
        };

        const chat = model.startChat({
            generationConfig,
            history: [
                {
                    role: "user",
                    parts: [{ text: "Generate 5-7 short assessment questions and answers based on the following text. Format each as: 'Question: ...? Answer: ...'. Avoid markdown." }],
                },
            ],
        });

        const result = await chat.sendMessage(content);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating questions:", error);
        throw new Error("Question generation failed");
    }
}

app.post('/generate-questions', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        const questions = await generateQuestionsFromText(content);
        res.json({ questions });
    } catch (error) {
        console.error('Error generating questions:', error.message);
        res.status(500).json({ 
            error: error.message || 'Error generating questions' 
        });
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
