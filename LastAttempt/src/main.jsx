import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from './App.jsx'
import './index.css'
import {createBrowserRouter,RouterProvider} from "react-router-dom";
import Home from "./Home.jsx";
import GenerateQuestion from "./GenerateQuestion.jsx";
const router = createBrowserRouter([
  {
    path: "/",
    element: <App/>,
    children:[
       {
        path:'/',
        element:<Home/>
       },{
        path:'/questions',
        element:<GenerateQuestion/>
       }
    ]
  },
]);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);