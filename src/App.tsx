import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Schedules from './pages/Schedules';
import Chatbot from './pages/Chatbot';
import Contacts from './pages/Contacts';
import History from './pages/History';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="chatbot" element={<Chatbot />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="history" element={<History />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
