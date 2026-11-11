import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./lib/theme";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SemesterProvider } from "./context/SemesterContext.jsx";
import { registerServiceWorker } from "./lib/pwa";

registerServiceWorker();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SemesterProvider>
          <App />
        </SemesterProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
