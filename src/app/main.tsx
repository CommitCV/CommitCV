import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "./home.tsx";
import About from "./about.tsx";
import Editor from "./editor.tsx";
import Library from "./library.tsx";
import { initUmami } from "@analytics/tracker";
import PageTracker from "@components/page-tracker.tsx";
import ErrorBoundary from "@components/error-boundary.tsx";
import LegalPage from "./legal-page.tsx";
import privacyPolicy from "../content/legal/privacy.md?raw";
import termsOfUse from "../content/legal/terms.md?raw";

initUmami();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <PageTracker />
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
                        path="/library"
                        element={<Library />}
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
        </ErrorBoundary>
    </StrictMode>,
);
