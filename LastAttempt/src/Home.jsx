import { useState } from "react";
import axios from 'axios';
import './Home.css';
import { doc, getDoc } from 'firebase/firestore';
import db from './firebaseConfig';
import { useNavigate } from "react-router-dom";

const Home = () => {
    const [syllabus, setSyllabus] = useState(null);
    const [topic, setTopic] = useState('');
    const navigate = useNavigate();
    const fetchArticleFromFirebase = async (topic, articleTitle, contentOwner) => {
        try {
            const docRef = doc(db, "articles", topic);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const content = docSnap.data().content;
                const result = contentOwner === "wikipedia" ? syllabus.wikipediaContent : syllabus.MDNContent;
                console.log(content);
                const matchedArticle = result.find(item => item.title === articleTitle);
                return matchedArticle || null;
            } else {
                console.log("No such document!");
                return null;
            }
        } catch (error) {
            console.error("Error fetching article from Firebase:", error);
            return null;
        }
    };
    const handleTest = async (articleTitle, contentOwner) => {
        try {
            const content = await fetchArticleFromFirebase(topic, articleTitle, contentOwner);
            if (content) {
                const response = await axios.post(`https://last-attempt-backend.vercel.app/generate-questions`, { content });
                const questions = response.data.questions;
                const questionArray = questions.split('\n');
                console.log(articleTitle,questionArray);
                navigate('/questions', { state: { questions: questionArray, title: articleTitle } });
            }
            else {
                console.log(`No content found for ${articleTitle}`);
            }
        } catch (error) {
            console.error("Error fetching article content or generating questions:", error);
        }
    };
    const fetchContent = async () => {
        try {
            const res = await axios.get('https://last-attempt-backend.vercel.app/fetch-content', { params: { topic } });
            setSyllabus(res.data);
        } catch (error) {
            console.log("Failed to fetch data:", error);
        }
    };
    const filterArticles = (articles) => {
        return articles.filter(article => {
            const articleDescription = article.description ? article.description.toLowerCase() : '';
            const matchesTitle = topic.toLowerCase().split(" ").every(token => article.title.toLowerCase().includes(token));
            const matchesDescription = topic.toLowerCase().split(" ").every(token => articleDescription.includes(token));
            return matchesTitle || matchesDescription;
        });
    };
    return (
        <div>
            <h1 className="text-2xl flex justify-center my-2 py-2 text-white font-xl bg-sky-400 mx-24">Content Search</h1>
            <input
                className=" border-2 bg-slate-200 p-2 ml-96 w-[400px]"
                type="text"
                placeholder="Enter a topic (e.g., JavaScript Basics)"
                onChange={(e) => setTopic(e.target.value)}
            />
            <button className="bg-blue-500 p-2 text-white rounded-lg" onClick={fetchContent}>Search</button>

            {syllabus && (
                <>
                    {syllabus.wikipediaContent && (
                        <div>
                            <h2 className="my-3 font-bold text-xl ml-2">Wikipedia Articles:</h2>
                            <ul className="ml-24 flex flex-wrap">
                                {filterArticles(syllabus.wikipediaContent).map((article) => (
                                    <div key={article.pageid} className="my-3 relative">
                                        <li className="text-xl bg-gradient-to-r from-cyan-500 to-blue-500 mx-3 w-[200px] p-3 text-center bg-gray-200 rounded border border-3">
                                            <a className="card-title h-[70px]" href={`https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer">
                                                {article.title}
                                            </a>
                                        </li>
                                        <button className="absolute bg-orange-300 bottom-1 right-1 p-2 rounded" onClick={() => handleTest(article.title, "wikipedia")}>
                                            Give Test
                                        </button>
                                    </div>
                                ))}
                            </ul>
                        </div>
                    )}
                    {syllabus.MDNContent && (
                        <div>
                            <h2 className="my-3 font-bold text-xl ml-2">MDN Articles:</h2>
                            <ul className="flex flex-wrap ml-24">
                                {filterArticles(syllabus.MDNContent).map((doc) => (
                                    <div key={doc.slug} className="relative">
                                        <li className="h-[120px] text-xl bg-gradient-to-r from-sky-400 to-indigo-400 mx-3 p-3 w-[200px] text-center my-5 bg-gray-200 rounded border border-3">
                                            <a className="card-title" href={`https://developer.mozilla.org${doc.mdn_url}`} target="_blank" rel="noopener noreferrer">
                                                {doc.title}
                                            </a>
                                        </li>
                                       
                                    </div>
                                ))}
                            </ul>
                        </div>
                    )}

                    {syllabus.youtubeContent && (
                        <div>
                            <h2 className="my-3 font-bold text-xl ml-2">YouTube Videos:</h2>
                            <ul className="flex flex-wrap ml-24">
                                {syllabus.youtubeContent.map((video) => (
                                    <li key={video.id.videoId} className="bg-gradient-to-r from-violet-400 to-fuchsia-200 mx-3 w-[200px] text-center my-5 bg-gray-200 rounded border border-3">
                                        <a href={`https://www.youtube.com/watch?v=${video.id.videoId}`} target="_blank" rel="noopener noreferrer">
                                            <img className="w-[270px] h-[150px]" src={video.snippet.thumbnails.default.url} alt="" />
                                            <p className="p-1 card-title">{video.snippet.title}</p>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Home;
