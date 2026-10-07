import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./components/LandingPage";
import { TimelineApp } from "./components/TimelineApp";
import { AnalysisOverviewPage } from "./components/AnalysisOverviewPage";
import { EntryPage } from "./components/EntryPage";
import { DefinitionsApp } from "./components/DefinitionsApp";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/linia-temps/resum" element={<AnalysisOverviewPage />} />
      <Route path="/linia-temps/tecnologia/:id" element={<EntryPage />} />
      <Route path="/linia-temps/*" element={<TimelineApp />} />
      <Route path="/definicions/*" element={<DefinitionsApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
