import {
    createBrowserRouter,
    RouterProvider,
} from "react-router-dom";
import JoinRoom from './routes/joinRoom/JoinRoom';
import Room from "./routes/room/Room";
import SocketWrapper from "./components/SocketWrapper";
import Home from "./routes/home";

const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/joinRoom", // Update the path to "/joinRoom" without the trailing slash
      element: <JoinRoom />,
    },
    {
      path: "/room/:roomId",
      element: <SocketWrapper><Room /></SocketWrapper>,
    },
  ]);
  

function App() {
    return <RouterProvider router={router} />
}

export default App
