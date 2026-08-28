import { type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PlanProvider, usePlan } from './context/PlanContext';
import PlanUpsell from './components/PlanUpsell';
import { PLAN_RANK, type PlanId } from './lib/plans';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Fisheries from './pages/Fisheries';
import FisheryForm from './pages/FisheryForm';
import Calendar from './pages/Calendar';
import Reservations from './pages/Reservations';
import Clients from './pages/Clients';
import Catches from './pages/Catches';
import Reviews from './pages/Reviews';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Subscription from './pages/Subscription';
import Account from './pages/Account';
import Notifications from './pages/Notifications';
import { Terms, Privacy } from './pages/Legal';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <div className="loader">Ładowanie…</div>;

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/regulamin" element={<Terms />} />
        <Route path="/polityka-prywatnosci" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <PlanProvider>
    <Routes>
      {/* Strony prawne — pełnoekranowe, bez panelu (sidebar) */}
      <Route path="/regulamin" element={<Terms />} />
      <Route path="/polityka-prywatnosci" element={<Privacy />} />
      <Route path="*" element={
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lowiska" element={<Fisheries />} />
        <Route path="/lowiska/:id" element={<FisheryForm />} />
        <Route path="/kalendarz" element={<PlanGate need="premium" page="Kalendarz" feature="Kalendarz rezerwacji" benefit="Rezerwacje online w czasie rzeczywistym — koniec z overbookingiem i telefonem."><Calendar /></PlanGate>} />
        <Route path="/rezerwacje" element={<PlanGate need="premium" page="Rezerwacje" feature="Rezerwacje online" benefit="Przyjmuj i potwierdzaj rezerwacje wprost z panelu."><Reservations /></PlanGate>} />
        <Route path="/polowy" element={<PlanGate need="premium" page="Połowy" feature="Połowy wędkarzy" benefit="Galeria złowionych ryb na Twoich łowiskach + kontakt do wędkarzy. Żywy dowód społeczny, który sprzedaje rezerwacje."><Catches /></PlanGate>} />
        <Route path="/opinie" element={<Reviews />} />
        <Route path="/klienci" element={<PlanGate need="pro" page="Klienci" feature="Baza klientów (CRM)" benefit="Zobacz kto wraca, historię wizyt i dane kontaktowe."><Clients /></PlanGate>} />
        <Route path="/analityka" element={<PlanGate need="pro" page="Analityka" feature="Analityka i raporty" benefit="Przychody, sezonowość, najlepsze stanowiska i eksport."><Analytics /></PlanGate>} />
        <Route path="/raporty" element={<PlanGate need="pro" page="Raport miesięczny" feature="Raporty miesięczne" benefit="Gotowe podsumowanie miesiąca: przychód, rezerwacje i porównanie m/m — do druku i archiwum."><Reports /></PlanGate>} />
        <Route path="/konto" element={<Account />} />
        <Route path="/powiadomienia" element={<Notifications />} />
        <Route path="/subskrypcja" element={<Subscription />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
      } />
    </Routes>
    </PlanProvider>
  );
}

function PlanGate({ children, need, page, feature, benefit }: { children: ReactNode; need: Exclude<PlanId, 'basic'>; page: string; feature: string; benefit: string }) {
  const { effectivePlan, loading } = usePlan();
  if (loading) return <div className="content"><div className="empty">Ładowanie…</div></div>;
  if (PLAN_RANK[effectivePlan] < PLAN_RANK[need]) {
    return <PlanUpsell plan={need} title={page} sub={`Dostępne w planie ${need === 'pro' ? 'Pro' : 'Premium'}`} feature={feature} benefit={benefit} />;
  }
  return <>{children}</>;
}
