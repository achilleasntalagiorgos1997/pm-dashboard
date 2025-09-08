import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject"; // new page
import ProjectDetails from "./pages/ProjectDetails";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/projects/new" element={<NewProject />} />
      </Routes>
    </Router>
  );
}
