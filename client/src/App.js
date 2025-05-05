import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import CreateRoom from "./components/CreateRoom";
import Room from "./components/Room";
import logo from "./webrtc_logo.png";
import process from "process";
window.process = process;

function App() {
  return (
    <Router>
      <div className="app">
        <header>
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <img
              src={logo}
              alt="WebRTC File Sharing"
              style={{ width: "80%", maxWidth: "500px", margin: "1rem 0" }}
              // style={{ height: "50px" }}
            />
          </Link>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<CreateRoom />} />
            <Route path="/room/:roomID" element={<Room />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
