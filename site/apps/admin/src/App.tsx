import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import FisheryForm from './pages/FisheryForm';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminFisheries from './pages/admin/AdminFisheries';
import AdminRequests from './pages/admin/AdminRequests';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminReviews from './pages/admin/AdminReviews';
import AdminPois from './pages/admin/AdminPois';
import AdminReservations from './pages/admin/AdminReservations';
import AdminCatches from './pages/admin/AdminCatches';
import AdminDataQuality from './pages/admin/AdminDataQuality';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  const { session, loading, isAdmin, signOut, user } = useAuth();

  if (loading) return <div className="loader">Ładowanie…</div>;

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // zalogowany, ale nie-admin → brak dostępu (twarda bramka; baza i tak chroni przez is_admin())
  if (!isAdmin) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, margin: 0 }}>Brak dostępu</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 18px' }}>Konto <b>{user?.email}</b> nie ma uprawnień administratora.</p>
          <button className="btn ghost" onClick={() => signOut()}>Wyloguj się</button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/lowiska" element={<AdminFisheries />} />
        <Route path="/lowiska/nowe" element={<FisheryForm admin />} />
        <Route path="/lowiska/:id" element={<FisheryForm admin />} />
        <Route path="/poi" element={<AdminPois />} />
        <Route path="/jakosc" element={<AdminDataQuality />} />
        <Route path="/rezerwacje" element={<AdminReservations />} />
        <Route path="/wnioski" element={<AdminRequests />} />
        <Route path="/uzytkownicy" element={<AdminUsers />} />
        <Route path="/uzytkownik/:id" element={<AdminUserDetail />} />
        <Route path="/opinie" element={<AdminReviews />} />
        <Route path="/polowy" element={<AdminCatches />} />
        <Route path="/ogloszenia" element={<AdminAnnouncements />} />
        <Route path="/ustawienia" element={<AdminSettings />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
