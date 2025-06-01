import { useState } from 'react'
import axios from 'axios'
import './Home.css'
import { doc, getDoc } from 'firebase/firestore'
import db from './firebaseConfig'
import { useNavigate } from 'react-router-dom'
import Loading from '/src/Loading'

const Home = () => {
  const [syllabus, setSyllabus] = useState(null)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const sanitizeTopic = (raw) =>
    raw
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')

  const fetchArticleFromFirebase = async (topic, articleTitle, contentOwner) => {
    try {
      const sanitizedTopic = sanitizeTopic(topic)
      const docRef = doc(db, 'articles', sanitizedTopic)
      const docSnap = await getDoc(docRef)
      console.log(docSnap)
      if (docSnap.exists()) {
        const content = docSnap.data().content
        const result = content[`${contentOwner}Content`]
        const matchedArticle = result.find((item) => item.title === articleTitle)
        return matchedArticle || null
      } else {
        console.log('No such document!')
        return null
      }
    } catch (error) {
      console.error('Error fetching article from Firebase:', error)
      return null
    }
  }

  const handleTest = async (articleTitle, contentOwner) => {
    try {
      const content = await fetchArticleFromFirebase(topic, articleTitle, contentOwner)
      if (content) {
        let contentText
        if (contentOwner === 'wikipedia') {
          contentText = content.content
        } else if (contentOwner === 'MDN') {
          contentText = content.summary
        }
        const response = await axios.post(`http://localhost:4000/generate-questions`, {
          content: contentText,
        })
        const rawQuestions = response.data.questions
        const questionArray = rawQuestions.split('\n').filter((q) => q.trim() !== '')

        navigate('/questions', {
          state: {
            questions: questionArray,
            title: articleTitle,
          },
        })
      }
    } catch (error) {
      console.error('Error generating questions:', error)
      alert('Failed to generate questions. Please try again.')
    }
  }
  const fetchContent = async () => {
    setLoading(true)
    try {
      const res = await axios.get('http://localhost:4000/fetch-content', { params: { topic } })
      setSyllabus(res.data)
    } catch (error) {
      console.log('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }
  const filterArticles = (articles) => {
    return articles.filter((article) => {
      const articleDescription = article.description?.toLowerCase()
      const matchesTitle = topic
        ?.toLowerCase()
        .split(' ')
        .every((token) => article.title?.toLowerCase().includes(token))
      const matchesDescription = topic
        ?.toLowerCase()
        .split(' ')
        .every((token) => articleDescription?.includes(token))
      return matchesTitle || matchesDescription
    })
  }
  return (
    <div>
      <input
        className="rounded-xl bg-slate-200 mt-5 p-4 text-xl w-[600px] ml-5"
        type="text"
        placeholder="Enter a topic (e.g., COVID-19)"
        onChange={(e) => setTopic(e.target.value)}
      />
      <button className="bg-blue-600 px-5 py-4 text-xl ml-3 text-white rounded-xl" onClick={fetchContent}>
        Search
      </button>
      {loading && (
        <Loading/>
      )}
      {syllabus && (
        <>
          {syllabus.wikipediaContent && (
            <div>
              <h2 className="my-4 font-bold text-3xl ml-2 text-center ">Wikipedia Articles</h2>
              <ul className="ml-24 flex flex-wrap">
                {filterArticles(syllabus.wikipediaContent).map((article) => (
                  <div key={article.pageid} className="my-3 relative">
                    <li className="text-2xl bg-blue-900 text-white mx-3 w-[400px] h-[150px] flex items-center justify-center rounded-xl">
                      <a
                        className="card-title h-[70px]"
                        href={`https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {article.title}
                      </a>
                    </li>
                    <button
                      className="absolute bg-orange-300 bottom-1 right-1 p-2 rounded text-xl"
                      onClick={() => handleTest(article.title, 'wikipedia')}
                    >
                      Generate Q/A
                    </button>
                  </div>
                ))}
              </ul>
            </div>
          )}
          {syllabus.MDNContent ? (
            <div>
              <h2 className="my-4 font-bold text-3xl ml-2 text-center ">MDN Articles</h2>
              <ul className="flex flex-wrap ml-24">
                {filterArticles(syllabus.MDNContent).map((doc) => (
                  <div key={doc.slug} className="relative">
                    <li className="h-[120px] text-xl bg-gradient-to-r from-sky-400 to-indigo-400 mx-3 p-3 w-[200px] text-center my-5 bg-gray-200 rounded border border-3">
                      <a
                        className="card-title"
                        href={`https://developer.mozilla.org${doc.mdn_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {doc.title}
                      </a>
                    </li>
                  </div>
                ))}
              </ul>
            </div>
          ) : (
            'No data found'
          )}

          {syllabus.youtubeContent && (
            <div>
              <h2 className="my-4 font-bold text-3xl ml-2 text-center ">YouTube Videos</h2>
              <ul className="flex flex-wrap ml-24">
                {syllabus.youtubeContent.map((video) => (
                  <li
                    key={video.id.videoId}
                    className="bg-blue-900 mx-3 w-[400px] h-[350px] text-center my-5 bg-blue-900 rounded-xl"
                  >
                    <a href={`https://www.youtube.com/watch?v=${video.id.videoId}`} target="_blank" rel="noopener noreferrer">
                      <img className="w-[400px] h-[220px] rounded-xl" src={video.snippet.thumbnails.default.url} alt="" />
                      <p className="p-2 mt-2 font-semibold card-title text-2xl text-white">{video.snippet.title}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Home
