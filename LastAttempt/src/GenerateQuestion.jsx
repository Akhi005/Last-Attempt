import { useLocation } from 'react-router-dom';

const GenerateQuestion = () => {
    const location = useLocation();
    const { questions, title } = location.state || { questions: [] };
    console.log("Location State:", questions);
    return (
        <div>
            <h1 className="text-2xl flex justify-center my-5">
                Generated Questions on <b className="ml-2">{title}</b>
            </h1>
            <div className="container mx-auto">
                {questions && questions.length > 0 ? (
                    <ul className="list-disc pl-5">
                        {questions.map((item, index) => (
                            item.length ? (
                                <div key={index} >
                                    {item.includes("?") ? (
                                        <>  <p className='font-bold bg-orange-100 p-2'> {item}</p>  </>
                                    ) : (
                                        <> <p className='bg-orange-200 p-2 mb-8'>{item}</p> </>
                                    )}
                                </div>
                            ) : null
                        ))}
                    </ul>
                ) : (
                    <p>No questions and answers were generated.</p>
                )}
            </div>
        </div>
    );
};

export default GenerateQuestion;
