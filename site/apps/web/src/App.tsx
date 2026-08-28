import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import Footer from './components/Footer';
import AnnouncementBanner from './components/AnnouncementBanner';
import LoadingScreen from './components/LoadingScreen';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import FisheryDetail from './pages/FisheryDetail';
import MyReservations from './pages/MyReservations';
import MyCatches from './pages/MyCatches';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import { About, Contact, Terms, Privacy } from './pages/Info';

export default function App() {
  const { loading } = useAuth();
  const location = useLocation();
  // splash: 'show' → 'out' (wygaszanie nad gotową treścią) → 'gone'
  const [splash, setSplash] = useState<'show' | 'out' | 'gone'>('show');
  useEffect(() => {
    const t1 = setTimeout(() => setSplash('out'), 1300);
    const t2 = setTimeout(() => setSplash('gone'), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  // Licznik odwiedzin (analityka admina) — jeden wpis na wejście w ścieżkę (anon-safe RPC)
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    void supabase.rpc('log_visit', { p_path: location.pathname }).then(undefined, () => {});
  }, [location.pathname]);
  // auth jeszcze się ładuje → statyczny splash (treści i tak nie ma)
  if (loading) return <LoadingScreen />;
  const isMap = location.pathname === '/mapa';
  return (
    <>
      <Header />
      {!isMap && <AnnouncementBanner />}
      <div className="route-view" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/lowisko/:id" element={<FisheryDetail />} />
          <Route path="/rezerwacje" element={<MyReservations />} />
          <Route path="/polowy" element={<MyCatches />} />
          <Route path="/ulubione" element={<Favorites />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/rejestracja" element={<Register />} />
          <Route path="/o-nas" element={<About />} />
          <Route path="/kontakt" element={<Contact />} />
          <Route path="/regulamin" element={<Terms />} />
          <Route path="/polityka-prywatnosci" element={<Privacy />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isMap && <Footer />}
      {/* Splash jako nakładka, która płynnie znika odsłaniając stronę */}
      {splash !== 'gone' && <LoadingScreen fadeOut={splash === 'out'} />}
    </>
  );
}
