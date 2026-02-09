import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BrowsePage from './pages/BrowsePage';
import StudyPage from './pages/StudyPage';

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/browse" element={<BrowsePage />} />
                {/* /learning 경로는 BrowsePage와 동일하게 취급하거나 필요 시 분리 */}
                <Route path="/learning" element={<BrowsePage />} />
                <Route path="/study/:id" element={<StudyPage />} />
            </Routes>
        </Router>
    );
}