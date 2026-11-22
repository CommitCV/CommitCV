import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "./home.tsx";
import About from "./about.tsx";
import Editor from "./editor.tsx";
import LegalPage from "./legal-page.tsx";
import privacyPolicy from "../content/legal/privacy.md?raw";
import termsOfUse from "../content/legal/terms.md?raw";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Home />}
                />
                <Route
                    path="/about"
                    element={<About />}
                />
                <Route
                    path="/editor"
                    element={<Editor />}
                />
                <Route
                    path="/privacy"
                    element={<LegalPage source={privacyPolicy} />}
                />
                <Route
                    path="/terms"
                    element={<LegalPage source={termsOfUse} />}
                />
            </Routes>
        </BrowserRouter>
    </StrictMode>,
);
