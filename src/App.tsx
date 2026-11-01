import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/Auth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schedules from './pages/Schedules';
import Chatbot from './pages/Chatbot';
import Contacts from './pages/Contacts';
import History from './pages/History';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="login" element={<Login />} />
      <Route path="app" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="chatbot" element={<Chatbot />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
