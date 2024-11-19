const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');  
const app = express();
app.use(cors());
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
const PORT = 4000;

// YouTube API Function
async function getYoutube(topic) {
    const apikey = process.env.YOUTUBE_API_KEY; // Store your API key in an environment variable
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${topic}&type=video&key=${apikey}`;
    const response = await axios.get(url);
    return response.data.items;
}
// Wikipedia API Function
async function getWikipedia(topic) {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&utf8=&format=json`;
    try {
        const searchResponse = await axios.get(searchUrl);
        const searchResults = searchResponse.data.query.search;
        if (searchResults.length === 0) {  return [{ message: 'No results found for this topic on wikipedia' }]; }
        const pageContents = [];
        for (const result of searchResults) {
            const title = encodeURIComponent(result.title);
            const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&explaintext&titles=${title}`;
            const pageResponse = await axios.get(pageUrl);
            const pages = pageResponse.data.query.pages;
            const pageId = Object.keys(pages)[0];
            const contentText = pages[pageId].extract;
            pageContents.push({ title: result.title, content: contentText });
        }
        return pageContents;
    } catch (error) {
        console.error('Error fetching Wikipedia content:', error);
        return 'Failed to fetch Wikipedia content';
    }
}
async function getMDNContent(topic) {
    const url = `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(topic)}&locale=en-US`;
    try {
        const response = await axios.get(url);
        const documents = response.data.documents;
        if (!documents || documents.length === 0) {  return [{ message: 'No results found for this topic on MDN' }]; }
        const mdnContents = [];
        for (const document of documents) {
            const { title, summary, slug } = document;
            const mdnUrl = `https://developer.mozilla.org/en-US/docs/${slug}`;
            mdnContents.push({title,summary, url: mdnUrl});
        }
        console.log(mdnContents);
        return mdnContents;
    } catch (error) {
        console.error('Error fetching MDN content:', error);
        return 'Failed to fetch MDN content';
    }
}
app.get('/fetch-content', async (req, res) => {
    const topic = req.query.topic;
    console.log("Topic received:", topic);

    try {
        const wikipediaContent = await getWikipedia(topic);
        const youtubeContent = await getYoutube(topic);
        const MDNContent = await getMDNContent(topic);
        
        // Store each content source in Firebase
        await storeArticleInFirebase(topic, { wikipediaContent, youtubeContent, MDNContent });
        
        res.json({ topic, wikipediaContent, youtubeContent, MDNContent });
    } catch (error) {
        console.error("Error while fetching content:", error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});
// Import Firebase Admin SDK to the backend
var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    type:process.env.FIREBASE_type,
    project_id:process.env.FIREBASE_project_id,
    private_key_id:process.env.FIREBASE_private_key_id,
    private_key:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email:process.env.FIREBASE_client_email,
    client_id:process.env.FIREBASE_client_id,
    auth_uri:process.env.FIREBASE_auth_uri,
    token_uri:process.env.FIREBASE_token_uri,
    auth_provider_x509_cert_url:process.env.FIREBASE_auth_provider_x509_cert_url,
    client_x509_cert_url:process.env.FIREBASE_client_x509_cert_url,
    universe_domain:process.env.FIREBASE_universe_domain,
}),
  databaseURL: "https://lastattempt-c86cf-default-rtdb.firebaseio.com" 
});
const db = admin.firestore();
async function storeArticleInFirebase(articleTitle, content) {
    try {
        const docRef = db.collection('articles').doc(articleTitle);
        await docRef.set({
            title: articleTitle,
            content: content,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('Article stored in Firebase');
    } catch (error) {
        console.error('Error storing article:', error);
    }
}
const genAI = new GoogleGenerativeAI(process.env.API_KEY);  
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
async function generateQuestionsFromText(content) {
    try {
        const chat = await model.startChat({
            history: [
                { role: "user", parts: [{ text: "I need help generating questions and answers from this content." }] },
                { role: "model", parts: [{ text: "Sure! Please provide the content, and I'll generate questions and answers for you." }] },
                { role: "user", parts: [{ text: `Here is the content: ${content}` }] }
            ],
        });

        let result = await chat.sendMessage("Generate short questions and answers based on the provided content.");

        console.log("Full AI response:", result);
        let generatedQuestions='';
        if (result && result.response ) {
          generatedQuestions = result.response.candidates[0].content.parts[0].text || 'No questions generated';
        }
        console.log("Generated Questions: ", generatedQuestions);
        return generatedQuestions;
    } catch (error) {
        console.error("Error generating questions:", error);
        throw error;
    }
}
app.post('/generate-questions', async (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    try {
        const questions = await generateQuestionsFromText(content.content);
        console.log("question ",questions);
        res.json({ questions });
    } catch (error) {
        console.error('Error generating questions:', error.message);
        res.status(500).json({ error: 'Error generating questions' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});